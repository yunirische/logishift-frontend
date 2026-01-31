import { API_ENDPOINTS, API_BASE_URL, STATIC_BASE_URL } from "../constants";
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
  const response = await fetch(API_ENDPOINTS.AUTH_LOGIN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });

  if (!response.ok) throw new Error("Ошибка авторизации");

  const data = await response.json();
  if (data.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
    // В твоем бэкенде данные юзера лежат в data.user
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data;
  }
};

export const apiRequest = async (endpoint: string, options: any = {}) => {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const fullUrl = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(fullUrl, {
      ...options, 
      headers,
      // Add timeout
      signal: AbortSignal.timeout(30000) // 30 seconds
    });

    // Handle authentication errors
    if (response.status === 401) {
      clearAuth();
      window.location.reload();
      return;
    }

    // Handle other HTTP errors
    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    } else {
      return response.text();
    }

  } catch (error) {
    // Handle network errors
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Превышено время ожидания запроса');
      }
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Ошибка сети. Проверьте подключение к интернету');
      }
    }
    
    throw error;
  }
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

export const patch = (url: string, body: any) => {
  return apiRequest(url, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
};

export const del = (url: string) => {
  return apiRequest(url, {
    method: "DELETE",
  });
};

export const getAnalyticsUsage = async () => {
  return get(API_ENDPOINTS.ANALYTICS_USAGE);
};

export const getAnalyticsTrends = async (days: number = 30) => {
  return get(`${API_ENDPOINTS.ANALYTICS_TRENDS}?days=${days}`);
};

export const getPhotoUrl = (path?: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;

  const cleanPath = path.replace(/\\/g, '/');

  // Если путь уже начинается с /uploads/, просто добавляем домен
  if (cleanPath.startsWith('/uploads/')) {
    return `${STATIC_BASE_URL}${cleanPath}`;
  }

  return `${STATIC_BASE_URL}/uploads/${cleanPath.replace(/^\/+/, '')}`;
};

const api = {
  loginUser,
  apiRequest,
  get,
  post,
  patch,
  del,
  getUserInfo,
  setUserInfo,
  getAuthToken,
  setAuthToken,
  clearAuth,
  getPhotoUrl,
  TOKEN_KEY,
  USER_KEY,
};

export default api;
