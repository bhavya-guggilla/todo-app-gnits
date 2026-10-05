const crypto = require("crypto");
const { promisify } = require("util");
const User = require("../models/User");
const Session = require("../models/Session");
const {
  clearSessionCookie,
  createSession,
  getCookieToken,
  hashToken,
} = require("../middleware/auth");

const scrypt = promisify(crypto.scrypt);
const PASSWORD_KEY_LENGTH = 64;

const publicUser = (user) => ({ id: user._id, email: user.email });

const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
  return `${salt}:${key.toString("hex")}`;
};

const verifyPassword = async (password, storedHash) => {
  const [salt, savedKey] = storedHash.split(":");
  if (!salt || !savedKey) return false;
  const savedBuffer = Buffer.from(savedKey, "hex");
  const candidate = await scrypt(password, salt, savedBuffer.length);
  return savedBuffer.length === candidate.length && crypto.timingSafeEqual(savedBuffer, candidate);
};

const register = async (req, res) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 128) {
      return res.status(400).json({ message: "Password must be 8 to 128 characters" });
    }

    const user = await User.create({ email, passwordHash: await hashPassword(password) });
    await createSession(req, res, user._id);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "An account with that email already exists" });
    console.error(err);
    res.status(500).json({ message: "Could not create account" });
  }
};

const login = async (req, res) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ message: "Email or password is incorrect" });
    }
    await createSession(req, res, user._id);
    res.status(200).json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not sign in" });
  }
};

const getMe = (req, res) => {
  res.status(200).json({ user: req.user ? publicUser(req.user) : null });
};

const logout = async (req, res) => {
  try {
    const token = getCookieToken(req);
    if (token) await Session.deleteOne({ tokenHash: hashToken(token) });
    clearSessionCookie(req, res);
    res.status(200).json({ message: "Signed out" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not sign out" });
  }
};

module.exports = { getMe, login, logout, register };
