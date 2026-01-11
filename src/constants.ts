export const API_BASE_URL = "https://pwa.kontrolsmen.ru/api/v1";

export const API_ENDPOINTS = {
  AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
  SHIFTS: `${API_BASE_URL}/shifts`,
  DRIVERS: `${API_BASE_URL}/drivers`,
  FLEET: `${API_BASE_URL}/fleet`,
  OBJECTS: `${API_BASE_URL}/objects`,
  AUDIT: `${API_BASE_URL}/audit`,
};

/**
 * Объявляем наличие process для типизации TypeScript,
 * чтобы IDE не подсвечивала его как ошибку в браузере.
 */
declare const process: {
  env: {
    NODE_ENV?: string;
    [key: string]: any;
  };
};

export const isProduction = () => {
  try {
    // Безопасная проверка существования process перед обращением к нему
    return (
      typeof process !== "undefined" &&
      process.env &&
      process.env.NODE_ENV === "production"
    );
  } catch {
    return false;
  }
};
