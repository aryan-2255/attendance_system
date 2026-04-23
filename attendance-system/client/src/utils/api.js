import axios from "axios";

import { clearAuth, getToken, getUser, loginPathForRole } from "./auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",
  timeout: 20000
});

api.interceptors.request.use((config) => {
  const pathRole = window.location.pathname.split("/")[1];
  const token = getToken(pathRole);

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const pathRole = window.location.pathname.split("/")[1];
    const isAuthScreen =
      requestUrl.includes("/login") ||
      requestUrl.includes("/register") ||
      window.location.pathname.endsWith("/login") ||
      window.location.pathname.includes("/register");

    if (error.response?.status === 401 && !isAuthScreen) {
      const user = getUser(pathRole);
      const role = user?.role || pathRole;
      clearAuth(role);
      window.location.href = loginPathForRole(role);
    }

    return Promise.reject(error);
  }
);

export default api;
