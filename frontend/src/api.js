import axios from "axios";

export const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "auth_token";

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ } };

const api = axios.create({ baseURL: API_BASE, timeout: 20000 });
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const errorMessage = (err, fallback = "Unable to complete the request. Please try again.") =>
  err?.response?.data?.message || (err?.code === "ECONNABORTED" ? "The server took too long to respond. Please try again." : err?.request ? "Cannot reach the server. Please check your connection." : fallback);

export default api;
