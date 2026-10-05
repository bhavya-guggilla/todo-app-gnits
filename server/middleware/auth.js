const crypto = require("crypto");
const Session = require("../models/Session");
const User = require("../models/User");

const COOKIE_NAME = "todo_session";
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const getCookieToken = (req) => {
  const cookieHeader = req.headers.cookie || "";
  const pair = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return pair ? decodeURIComponent(pair.slice(COOKIE_NAME.length + 1)) : null;
};

const setSessionCookie = (req, res, token) => {
  const secure = req.secure ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${secure}`
  );
};

const clearSessionCookie = (req, res) => {
  const secure = req.secure ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`
  );
};

const createSession = async (req, res, userId) => {
  const token = crypto.randomBytes(32).toString("hex");
  await Session.create({
    user: userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  setSessionCookie(req, res, token);
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = getCookieToken(req);
    if (token) {
      const session = await Session.findOne({
        tokenHash: hashToken(token),
        expiresAt: { $gt: new Date() },
      });
      if (session) req.user = await User.findById(session.user);
    }
    next();
  } catch (err) {
    next(err);
  }
};

const requireAuth = (req, res, next) => {
  optionalAuth(req, res, (err) => {
    if (err) return next(err);
    if (!req.user) return res.status(401).json({ message: "Please sign in" });
    next();
  });
};

module.exports = {
  clearSessionCookie,
  createSession,
  getCookieToken,
  hashToken,
  optionalAuth,
  requireAuth,
};
