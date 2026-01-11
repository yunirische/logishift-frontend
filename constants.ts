export const API_BASE_URL = "https://pwa.kontrolsmen.ru/api/v1";

export const API_ENDPOINTS = {
  SHIFTS: `${API_BASE_URL}/shifts`,
  DRIVERS: `${API_BASE_URL}/drivers`,
  FLEET: `${API_BASE_URL}/fleet`,
  OBJECTS: `${API_BASE_URL}/objects`,
  AUDIT: `${API_BASE_URL}/audit`,
};

declare const process: {
  env: {
    NODE_ENV?: string;
  };
};

export const isProduction = () => {
  try {
    return process.env.NODE_ENV === "production";
  } catch {
    return false;
  }
};
