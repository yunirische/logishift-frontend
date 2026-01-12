export const API_BASE_URL = "https://pwa.kontrolsmen.ru/api/v1";

export const API_ENDPOINTS = {
  AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
  AUTH_ME: `${API_BASE_URL}/auth/me`,
  // Групповые эндпоинты для реестров
  SHIFTS: `${API_BASE_URL}/shifts`,
  DRIVERS: `${API_BASE_URL}/drivers`,
  AUDIT: `${API_BASE_URL}/audit`,
  // Эндпоинты действий (PWA)
  CURRENT_SHIFT: `${API_BASE_URL}/shifts/current`,
  START_SHIFT: `${API_BASE_URL}/shifts/start`,
  END_SHIFT: `${API_BASE_URL}/shifts/end`,
  UPLOAD_PHOTO: `${API_BASE_URL}/shifts/photo`,
  FLEET: `${API_BASE_URL}/trucks`, // Для совместимости с Dashboard
  OBJECTS: `${API_BASE_URL}/sites`, // Для совместимости с Dashboard
};
