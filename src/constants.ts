export const API_BASE_URL = "https://pwa.kontrolsmen.ru/api/v1";
export const STATIC_BASE_URL = "https://pwa.kontrolsmen.ru";

export const API_ENDPOINTS = {
  AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
  // ВАЖНО: только эти названия путей есть в твоем бэкенде
  CURRENT_SHIFT: `${API_BASE_URL}/shifts/current`,
  TRUCKS: `${API_BASE_URL}/trucks`,
  ADD_TRUCK: `${API_BASE_URL}/trucks`,
  UPDATE_TRUCK: (id: number | string) => `${API_BASE_URL}/trucks/${id}`,
  DELETE_TRUCK: (id: number | string) => `${API_BASE_URL}/trucks/${id}`,
  SITES: `${API_BASE_URL}/sites`,
  START_SHIFT: `${API_BASE_URL}/shifts/start`,
  END_SHIFT: `${API_BASE_URL}/shifts/end`,
  UPLOAD_PHOTO: `${API_BASE_URL}/shifts/photo`,
  // Для совместимости с другими компонентами (админка)
  SHIFTS: `${API_BASE_URL}/shifts`,
  DRIVERS: `${API_BASE_URL}/users`, // Изменили с /drivers на /users
  USERS: `${API_BASE_URL}/users`,
  UPDATE_USER: (id: number | string) => `${API_BASE_URL}/users/${id}`,
  INVITES: `${API_BASE_URL}/invites`,
  AUDIT: `${API_BASE_URL}/audit`,
  DASHBOARD_STATS: `${API_BASE_URL}/dashboard/stats`,
  TENANT_SETTINGS: `${API_BASE_URL}/tenant/settings`,
  
  // Управление объектами (Sites)
  ADD_SITE: `${API_BASE_URL}/sites`,
  UPDATE_SITE: (id: number | string) => `${API_BASE_URL}/sites/${id}`,
  DELETE_SITE: (id: number | string) => `${API_BASE_URL}/sites/${id}`,
  // Ручное создание смены (admin)
  MANUAL_SHIFT: `${API_BASE_URL}/shifts/manual`,
  UPDATE_SHIFT: (id: number | string) => `${API_BASE_URL}/shifts/${id}`,

  // Health Check
  HEALTH: `${API_BASE_URL}/health`,

  // Auth
  AUTH_ONBOARD: `${API_BASE_URL}/auth/onboard`,

  // Maintenance & Monitoring
  MAINTENANCE_CLEANUP: `${API_BASE_URL}/maintenance/cleanup`,
  SHIFTS_STUCK: `${API_BASE_URL}/shifts/stuck`,
  SHIFTS_REMINDER: `${API_BASE_URL}/shifts/reminder`,

  // Admin
  ADMIN_STATS: `${API_BASE_URL}/admin/stats`,

  // Users
  USERS_SET_MENU_ID: `${API_BASE_URL}/users/set-menu-id`,

  // Reports
  REPORTS_EXCEL: `${API_BASE_URL}/reports/excel`,
  REPORTS_PHOTOS: `${API_BASE_URL}/reports/photos`,
  REPORTS_EXPORT: `${API_BASE_URL}/reports/export`,

  // Analytics
  ANALYTICS_EXPORT: `${API_BASE_URL}/analytics/export`,
  ANALYTICS_USAGE: `${API_BASE_URL}/analytics/usage`,
  ANALYTICS_TRENDS: `${API_BASE_URL}/analytics/trends`,
  ANALYTICS_DRIVERS: `${API_BASE_URL}/analytics/drivers`,
  ANALYTICS_INSIGHTS: `${API_BASE_URL}/analytics/insights`,
};
