import { API_ENDPOINTS } from "../constants";

export const TOKEN_KEY = "logishift_auth_token";

export const getAuthToken = () => localStorage.getItem(TOKEN_KEY);
export const setAuthToken = (token: string) =>
  localStorage.setItem(TOKEN_KEY, token);
export const clearAuthToken = () => localStorage.removeItem(TOKEN_KEY);

/**
 * Функция для входа в систему (Login/Password)
 * Использует стандартный формат x-www-form-urlencoded, характерный для OAuth2 в FastAPI.
 */
export const loginUser = async (username: string, password: string) => {
  // Используем URLSearchParams для формирования application/x-www-form-urlencoded
  const params = new URLSearchParams();
  params.append("username", username.trim());
  params.append("password", password);

  const response = await fetch(API_ENDPOINTS.AUTH_LOGIN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || errorData.message || "Ошибка авторизации"
    );
  }

  const data = await response.json();
  // Бэкенд на FastAPI обычно возвращает access_token
  if (data.access_token) {
    setAuthToken(data.access_token);
    return data;
  }

  // Если бэкенд возвращает другой формат (например, просто объект пользователя с токеном)
  if (data.token) {
    setAuthToken(data.token);
    return data;
  }

  throw new Error("Токен не получен");
};

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

/**
 * Универсальный метод для запросов к API с автоматической подстановкой Bearer токена
 */
export const apiRequest = async (
  endpoint: string,
  options: FetchOptions = {}
) => {
  const token = getAuthToken();

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Для обычных запросов оставляем JSON
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let url = endpoint;
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthToken();
    window.location.reload();
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail ||
        errorData.message ||
        `HTTP error! status: ${response.status}`
    );
  }

  return response.json();
};
