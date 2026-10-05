const API_URL = "/api/todos";
const AUTH_URL = "/api/auth";

const request = async (url, options) => {
  const res = await fetch(url, options);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.message || `Request failed: ${res.status}`);
  }
  return data;
};

export const getTodos = () => request(API_URL);

export const createTodo = (title) =>
  request(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });

export const updateTodo = (id, data) =>
  request(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const deleteTodo = (id) =>
  request(`${API_URL}/${id}`, { method: "DELETE" });

export const getCurrentUser = async () => {
  const data = await request(`${AUTH_URL}/me`);
  return data.user;
};

export const login = (email, password) =>
  request(`${AUTH_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

export const register = (email, password) =>
  request(`${AUTH_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

export const logout = () => request(`${AUTH_URL}/logout`, { method: "POST" });
