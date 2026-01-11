export const API_BASE_URL = "https://pwa.kontrolsmen.ru/api/v1";

export const API_ENDPOINTS = {
  AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
  SHIFTS: `${API_BASE_URL}/shifts`,
  DRIVERS: `${API_BASE_URL}/drivers`,
  FLEET: `${API_BASE_URL}/fleet`,
  OBJECTS: `${API_BASE_URL}/objects`,
  AUDIT: `${API_BASE_URL}/audit`,
};

export const isProduction = () => {
  try {
    // Безопасная проверка окружения. С глобальной декларацией в types.ts ошибок tsc не будет.
    return (
      typeof process !== "undefined" &&
      process.env &&
      process.env.NODE_ENV === "production"
    );
  } catch {
    return false;
  }
};
