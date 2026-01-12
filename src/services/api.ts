import { API_ENDPOINTS } from "../constants";
import { User } from "../types";

export const TOKEN_KEY = "logishift_auth_token";
export const USER_KEY = "logishift_user_info";

export const getAuthToken = () => localStorage.getItem(TOKEN_KEY);
export const setAuthToken = (token: string) =>
  localStorage.setItem(TOKEN_KEY, token);

export const getUserInfo = (): User | null => {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    const user = JSON.parse(data);
    return user;
  } catch {
    return null;
  }
};

export const setUserInfo = (user: User) =>
  localStorage.setItem(USER_KEY, JSON.stringify(user));

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const loginUser = async (login: string, password: string) => {
  // Бэкенд на Express ждет обычный JSON, а не FormParams
  const response = await fetch(API_ENDPOINTS.AUTH_LOGIN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: login.trim(), password }),
  });

  if (!response.ok) throw new Error("Ошибка авторизации");

  const data = await response.json();
  if (data.token) {
    setAuthToken(data.token);
    setUserInfo(data.user); // В бэкенде объект user лежит внутри ответа
    return data;
  }
};

export const apiRequest = async (endpoint: string, options: any = {}) => {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");

  const response = await fetch(endpoint, { ...options, headers });

  if (response.status === 401) {
    clearAuth();
    window.location.reload();
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Error ${response.status}`);
  }

  return response.json();
};

// Хелперы для часто используемых методов
export const get = (url: string, params?: Record<string, string>) => {
  let endpoint = url;
  if (params) {
    const search = new URLSearchParams(params).toString();
    endpoint += `?${search}`;
  }
  return apiRequest(endpoint, { method: "GET" });
};

export const post = (url: string, body: any) => {
  return apiRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
};

const api = {
  loginUser,
  apiRequest,
  get,
  post,
  getUserInfo,
  setUserInfo,
  getAuthToken,
  setAuthToken,
  clearAuth,
  TOKEN_KEY,
  USER_KEY,
};

export default api;
