import { API_ENDPOINTS, API_BASE_URL, STATIC_BASE_URL } from "../constants";
import {
  User,
  AnalyticsUsage,
  AnalyticsTrend,
  AnalyticsDriver,
  AnalyticsInsights,
  SubscriptionInfo,
  TenantBillingSummary,
  BillingPaymentSummary,
  BillingCheckoutResponse,
  OwnerSummary,
  OwnerTenantRow,
} from "../types";

export const TOKEN_KEY = "logishift_auth_token";
export const USER_KEY = "logishift_user_info";
export const AUTH_SESSION_UPDATED_EVENT = "logishift:auth-session-updated";

// Error types for better error handling
export enum ApiErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  AUTHENTICATION = 'AUTHENTICATION',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

// Backend error codes (from response.error.code)
export enum BackendErrorCode {
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  MISSING_TOKEN = 'MISSING_TOKEN',
  AUTH_ERROR = 'AUTH_ERROR',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
}

// Backend error response structure
export interface BackendErrorResponse {
  error?: string;
  code?: BackendErrorCode;
  detail?: string;
  message?: string;
}

export interface ApiError extends Error {
  type: ApiErrorType;
  status?: number;
  backendCode?: BackendErrorCode; // Backend error code if available
}

const createApiError = (message: string, type: ApiErrorType, status?: number, backendCode?: BackendErrorCode): ApiError => {
  const error = new Error(message) as ApiError;
  error.type = type;
  error.status = status;
  error.backendCode = backendCode;
  return error;
};

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

const dispatchAuthSessionUpdated = (token: string, user: User | null) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_SESSION_UPDATED_EVENT, {
      detail: { token, user },
    })
  );
};

export const applyReplacementAuthSession = (token: string, user?: User | null) => {
  if (!token) {
    return;
  }

  setAuthToken(token);
  const resolvedUser = user ?? getUserInfo();
  if (resolvedUser) {
    setUserInfo(resolvedUser);
  }
  dispatchAuthSessionUpdated(token, resolvedUser);
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const normalizeLoginEmail = (login: string) => login.trim().toLowerCase();

export const loginUser = async (login: string, password: string) => {
  const normalizedLogin = normalizeLoginEmail(login);

  try {
    const response = await fetch(API_ENDPOINTS.AUTH_LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: normalizedLogin, password }),
    });

    if (!response.ok) {
      // Try to get error message from response body
      let errorMessage = "Ошибка авторизации";
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      // В твоем бэкенде данные юзера лежат в data.user
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data;
    }
  } catch (err: any) {
    // Re-throw Error objects as-is
    if (err instanceof Error) {
      throw err;
    }
    // Wrap unknown errors
    throw new Error("Ошибка сети. Проверьте подключение к интернету");
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

    // Handle authentication errors (401)
    // Backend now returns 401 with error codes: TOKEN_EXPIRED, INVALID_TOKEN, MISSING_TOKEN
    if (response.status === 401) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        // Response is not JSON
      }

      const errorCode = errorData.code as BackendErrorCode;
      // Only clear auth for token-related errors, not for other 401s
      if (errorCode === BackendErrorCode.TOKEN_EXPIRED ||
          errorCode === BackendErrorCode.INVALID_TOKEN ||
          errorCode === BackendErrorCode.MISSING_TOKEN) {
        clearAuth();
        window.location.reload();
        return;
      }

      // For other 401 errors, throw with details
      const errorMessage = errorData.error || errorData.detail || errorData.message || 'Ошибка авторизации';
      throw createApiError(errorMessage, ApiErrorType.AUTHENTICATION, 401, errorCode);
    }

    // Handle subscription expired (403) - do NOT clear auth, analytics should be read-only
    // Backend returns 403 with error code: SUBSCRIPTION_EXPIRED
    if (response.status === 403) {
      let errorMessage = 'Подписка истекла';
      let backendCode: BackendErrorCode | undefined;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
        backendCode = errorData.code as BackendErrorCode;
      } catch {
        // If response is not JSON, use default message
      }
      throw createApiError(errorMessage, ApiErrorType.SUBSCRIPTION_EXPIRED, 403, backendCode);
    }

    // Handle other HTTP errors
    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}`;

      try {
        const errorData = await response.json();
        // Try multiple possible error field names (detail, message, error)
        errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }

      throw createApiError(errorMessage, ApiErrorType.SERVER, response.status);
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
        throw createApiError('Превышено время ожидания запроса', ApiErrorType.TIMEOUT);
      }
      if (error.message.includes('Failed to fetch')) {
        throw createApiError('Ошибка сети. Проверьте подключение к интернету', ApiErrorType.NETWORK);
      }
      // Re-throw ApiError as-is
      if ('type' in error) {
        throw error;
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

// ============================================================================
// ANALYTICS DATA TRANSFORMERS
// Backend returns camelCase, frontend expects snake_case
// ============================================================================

/**
 * Transform backend usage response to frontend format
 * Backend: { utilizationPercentage } → Frontend: { utilization_percent }
 */
const transformAnalyticsUsage = (data: any): AnalyticsUsage => {
  if (!data || typeof data !== 'object') {
    return {
      trucks: { current: 0, limit: -1, utilization_percent: null },
      drivers: { current: 0, limit: -1, utilization_percent: null },
      sites: { current: 0, limit: -1, utilization_percent: null },
    };
  }

  const transformResource = (resource: any) => ({
    current: typeof resource?.current === 'number' ? resource.current : 0,
    limit: typeof resource?.limit === 'number' ? resource.limit : -1,
    utilization_percent: typeof resource?.utilizationPercentage === 'number'
      ? resource.utilizationPercentage
      : (typeof resource?.utilization_percent === 'number' ? resource.utilization_percent : null),
  });

  return {
    trucks: transformResource(data.trucks),
    drivers: transformResource(data.drivers),
    sites: transformResource(data.sites),
  };
};

/**
 * Transform backend trends response to frontend format
 * Backend: { shiftsCount, totalHours, totalSalary } → Frontend: { shifts_count, hours_worked, salary_paid }
 */
const transformAnalyticsTrends = (data: any[]): AnalyticsTrend[] => {
  if (!Array.isArray(data)) return [];

  return data.map((item: any) => ({
    date: item.date || null,
    shifts_count: typeof item.shiftsCount === 'number' ? item.shiftsCount :
                 (typeof item.shifts_count === 'number' ? item.shifts_count : 0),
    hours_worked: typeof item.totalHours === 'number' ? item.totalHours :
                  (typeof item.hours_worked === 'number' ? item.hours_worked : 0),
    salary_paid: typeof item.totalSalary === 'number' ? item.totalSalary :
                 (typeof item.salary_paid === 'number' ? item.salary_paid : 0),
  }));
};

/**
 * Transform backend drivers response to frontend format
 * Backend: { driverId, driverName, totalHours, totalSalary, shiftsCount }
 * → Frontend: { driver_id, driver_name, hours_worked, salary_paid, shifts_count }
 */
const transformAnalyticsDrivers = (data: any[]): AnalyticsDriver[] => {
  if (!Array.isArray(data)) return [];

  return data.map((item: any) => ({
    driver_id: typeof item.driverId === 'number' ? item.driverId :
                (typeof item.driver_id === 'number' ? item.driver_id : 0),
    driver_name: item.driverName || item.driver_name || 'Неизвестно',
    hours_worked: typeof item.totalHours === 'number' ? item.totalHours :
                  (typeof item.hours_worked === 'number' ? item.hours_worked : 0),
    salary_paid: typeof item.totalSalary === 'number' ? item.totalSalary :
                 (typeof item.salary_paid === 'number' ? item.salary_paid : 0),
    shifts_count: typeof item.shiftsCount === 'number' ? item.shiftsCount :
                  (typeof item.shifts_count === 'number' ? item.shifts_count : 0),
  }));
};

/**
 * Transform backend insights response to frontend format
 * Backend structure: { period, utilization, activityMetrics, insights }
 * Frontend structure: { underutilizedResources, nearLimitResources, costPerShift, recommendedActions, activityMetrics }
 */
const transformAnalyticsInsights = (data: any): AnalyticsInsights | null => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  // Handle both old and new response formats
  const insights = data.insights || data;
  const activityMetrics = data.activityMetrics;

  return {
    underutilizedResources: {
      trucks: insights.underutilizedResources?.trucks || insights.underutilizedResources || [],
      sites: insights.underutilizedResources?.sites || [],
    },
    nearLimitResources: {
      trucks: insights.nearLimitResources?.trucks || null,
      drivers: insights.nearLimitResources?.drivers || null,
      sites: insights.nearLimitResources?.sites || null,
    },
    costPerShift: typeof insights.costPerShift === 'number' ? insights.costPerShift :
                  (typeof insights.cost_per_shift === 'number' ? insights.cost_per_shift : 0),
    recommendedActions: insights.recommendedActions || [],
    // v1.1.1: Include activityMetrics if available (for costPerShift display logic)
    ...(activityMetrics && {
      activityMetrics: {
        avgDailyActiveShifts: activityMetrics.avgDailyActiveShifts || 0,
        peakSimultaneousUsage: activityMetrics.peakSimultaneousUsage || 0,
        finishedShifts: activityMetrics.finishedShifts || 0,
      }
    })
  };
};

// ============================================================================
// ANALYTICS API FUNCTIONS (with transformers)
// ============================================================================

export const getAnalyticsUsage = async (): Promise<AnalyticsUsage> => {
  const data = await get(API_ENDPOINTS.ANALYTICS_USAGE);
  return transformAnalyticsUsage(data);
};

export const getAnalyticsTrends = async (days: number = 30): Promise<AnalyticsTrend[]> => {
  const data = await get(`${API_ENDPOINTS.ANALYTICS_TRENDS}?days=${days}`);
  return transformAnalyticsTrends(data);
};

export const getAnalyticsDrivers = async (days: number = 30, limit: number = 10): Promise<AnalyticsDriver[]> => {
  const data = await get(`${API_ENDPOINTS.ANALYTICS_DRIVERS}?days=${days}&limit=${limit}`);
  return transformAnalyticsDrivers(data);
};

export const getAnalyticsInsights = async (days: number = 30): Promise<AnalyticsInsights | null> => {
  const data = await get(`${API_ENDPOINTS.ANALYTICS_INSIGHTS}?days=${days}`);
  return transformAnalyticsInsights(data);
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

// ============================================================================
// AUTH & SECURITY API
// ============================================================================

export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<{ message?: string; token?: string; user?: User }> => {
  const response = await post(API_ENDPOINTS.AUTH_PASSWORD, {
    currentPassword,
    newPassword,
  });

  if (response?.token) {
    applyReplacementAuthSession(response.token, response.user ?? null);
  }

  return response;
};

export const requestPasswordReset = async (email: string): Promise<{ message: string }> => {
  const response = await fetch(API_ENDPOINTS.AUTH_RESET_PASSWORD_REQUEST, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: normalizeLoginEmail(email) }),
  });

  if (!response.ok) {
    let errorMessage = "Не удалось отправить запрос на восстановление";
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

export const confirmPasswordReset = async (
  token: string,
  newPassword: string
): Promise<{ message: string }> => {
  const response = await fetch(API_ENDPOINTS.AUTH_RESET_PASSWORD_CONFIRM, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });

  if (!response.ok) {
    let errorMessage = "Не удалось обновить пароль";
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

export const getSubscription = async (): Promise<SubscriptionInfo> => {
  const data = await get(API_ENDPOINTS.TENANT_SUBSCRIPTION);

  // Transform backend response if needed
  return {
    status: data.status || 'active',
    expires_at: data.expires_at || data.expiryDate || null,
    plan_name: data.plan_name || data.planName || undefined,
  };
};

export const getTenantBilling = async (): Promise<TenantBillingSummary> => {
  const data = await get(API_ENDPOINTS.TENANT_BILLING);
  const currentPlan = data.current_plan || data.currentPlan || null;
  const lastPayment = data.last_payment || data.lastPayment || null;

  return {
    current_plan: currentPlan
      ? {
          code: currentPlan.code,
          name: currentPlan.name,
          price_monthly: Number(currentPlan.price_monthly ?? currentPlan.priceMonthly ?? 0),
          limit_machines: Number(currentPlan.limit_machines ?? currentPlan.limitMachines ?? 0),
          limit_drivers: Number(currentPlan.limit_drivers ?? currentPlan.limitDrivers ?? 0),
          limit_sites: Number(currentPlan.limit_sites ?? currentPlan.limitSites ?? 0),
        }
      : null,
    subscription_expires_at:
      data.subscription_expires_at || data.subscriptionExpiresAt || null,
    last_payment: lastPayment
      ? {
          id: Number(lastPayment.id),
          plan_code: lastPayment.plan_code || lastPayment.planCode || undefined,
          plan_name: lastPayment.plan_name || lastPayment.planName || undefined,
          status: String(lastPayment.status || "unknown"),
          amount: Number(lastPayment.amount ?? 0),
          currency: String(lastPayment.currency || "RUB"),
          period_months:
            lastPayment.period_months !== undefined ||
            lastPayment.periodMonths !== undefined
              ? Number(lastPayment.period_months ?? lastPayment.periodMonths)
              : undefined,
          paid_at: lastPayment.paid_at || lastPayment.paidAt || null,
          created_at: lastPayment.created_at || lastPayment.createdAt || null,
        }
      : null,
  };
};

export const getBillingPayments = async (): Promise<BillingPaymentSummary[]> => {
  const data = await get(API_ENDPOINTS.BILLING_PAYMENTS);
  if (!Array.isArray(data)) return [];

  return data.map((payment: any) => ({
    id: Number(payment.id),
    plan_code: payment.plan_code || payment.planCode || undefined,
    plan_name: payment.plan_name || payment.planName || undefined,
    status: String(payment.status || "unknown"),
    amount: Number(payment.amount ?? 0),
    currency: String(payment.currency || "RUB"),
    period_months:
      payment.period_months !== undefined || payment.periodMonths !== undefined
        ? Number(payment.period_months ?? payment.periodMonths)
        : undefined,
    paid_at: payment.paid_at || payment.paidAt || null,
    created_at: payment.created_at || payment.createdAt || null,
  }));
};

export const createBillingCheckout = async (
  planCode: string
): Promise<BillingCheckoutResponse> => {
  const data = await post(API_ENDPOINTS.BILLING_CHECKOUT, { planCode });

  return {
    payment_id: Number(data.payment_id ?? data.paymentId ?? 0),
    status: String(data.status || "pending"),
    confirmation_url: data.confirmation_url || data.confirmationUrl || null,
  };
};

export const getOwnerSummary = async (): Promise<OwnerSummary> => {
  return await get(API_ENDPOINTS.OWNER_SUMMARY);
};

export const getOwnerTenants = async (): Promise<OwnerTenantRow[]> => {
  const data = await get(API_ENDPOINTS.OWNER_TENANTS);
  return Array.isArray(data) ? data : [];
};

/**
 * Get current shift for the logged-in user.
 * Returns null if no active shift exists (400/404), instead of throwing.
 * This prevents console errors for the expected "no shift" state.
 */
export const getCurrentShift = async (): Promise<any | null> => {
  try {
    return await get(API_ENDPOINTS.CURRENT_SHIFT);
  } catch (err) {
    // Silently return null for 400/404 (no active shift)
    // These are expected states, not errors
    const error = err as ApiError;
    if (error.status === 400 || error.status === 404) {
      return null;
    }
    // Re-throw other errors (network, auth, etc)
    throw err;
  }
};

/**
 * Accept an invite code to register as a driver.
 * POST /invites/accept
 */
export const acceptInvite = async (data: {
  code: string;
  full_name: string;
  email: string;
  password: string;
  consents: {
    accepted: true;
    versions: {
      offer: string;
      privacy_policy: string;
      personal_data: string;
    };
  };
}): Promise<void> => {
  await post(`${API_BASE_URL}/invites/accept`, data);
};

/**
 * Get Telegram link code for connecting the bot.
 * GET /auth/link-token
 */
export const getTelegramLinkCode = async (): Promise<{ code: string }> => {
  return await get(API_ENDPOINTS.TELEGRAM_LINK_CODE);
};

/**
 * Unlink Telegram account.
 * DELETE /users/telegram-link
 */
export const unlinkTelegram = async (): Promise<void> => {
  await del(API_ENDPOINTS.TELEGRAM_UNLINK);
};

/**
 * Refresh current user profile from API.
 * GET /users/me
 * Updates localStorage and returns the updated User object.
 * Falls back to cached user data if endpoint returns 404.
 */
export const refreshUser = async (): Promise<User> => {
  try {
    const data = await get(API_ENDPOINTS.USERS_ME);
    // Update localStorage with fresh user data
    setUserInfo(data);
    return data;
  } catch (err) {
    const error = err as ApiError;
    // If endpoint doesn't exist (404), return cached user data
    if (error.status === 404) {
      const cachedUser = getUserInfo();
      if (cachedUser) {
        return cachedUser;
      }
    }
    // Re-throw other errors
    throw err;
  }
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
  changePassword,
  requestPasswordReset,
  confirmPasswordReset,
  getSubscription,
  getTenantBilling,
  getBillingPayments,
  createBillingCheckout,
  getOwnerSummary,
  getOwnerTenants,
  getCurrentShift,
  acceptInvite,
  getTelegramLinkCode,
  unlinkTelegram,
  refreshUser,
  TOKEN_KEY,
  USER_KEY,
  // Export enums for convenience
  ApiErrorType,
  BackendErrorCode,
};

export default api;
