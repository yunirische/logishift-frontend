import { API_ENDPOINTS } from "../constants";
import { User } from "../types";

export const TOKEN_KEY = "logishift_auth_token";
export const USER_KEY = "logishift_user_info";

export const getAuthToken = () => localStorage.getItem(TOKEN_KEY);
export const setAuthToken = (token: string) =>
  localStorage.setItem(TOKEN_KEY, token);

export const getUserInfo = (): User | null => {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
};

export const setUserInfo = (user: User) =>
  localStorage.setItem(USER_KEY, JSON.stringify(user));

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/**
 * Функция для входа в систему (Login/Password)
 * Использует 'login' вместо 'username' как того требует бэкенд.
 */
export const loginUser = async (login: string, password: string) => {
  const params = new URLSearchParams();
  // Используем 'login' как основной идентификатор
  params.append("login", login.trim());
  params.append("username", login.trim()); // Для совместимости с OAuth2 scopes если нужно
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

  if (data.access_token || data.token) {
    const token = data.access_token || data.token;
    setAuthToken(token);

    // Сохраняем информацию о пользователе из ответа (или декодируем если бэкенд не прислал объект)
    // В старой логике обычно объект user приходил вместе с токеном
    if (data.user) {
      setUserInfo(data.user);
    } else {
      // Заглушка если бэкенд не вернул user, но мы знаем роль по логике (например админ если login 'admin')
      const fallbackUser: User = {
        id: "1",
        login: login,
        full_name: data.full_name || login,
        role: login.toLowerCase().includes("admin")
          ? "admin"
          : ("driver" as any),
      };
      setUserInfo(fallbackUser);
    }
    return data;
  }

  throw new Error("Токен не получен");
};

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export const apiRequest = async (
  endpoint: string,
  options: FetchOptions = {}
) => {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

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
    clearAuth();
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
