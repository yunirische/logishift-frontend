export enum ShiftStatus {
  ACTIVE = "active",
  PENDING_INVOICE = "pending_invoice",
  FINISHED = "finished",
}

export enum UserRole {
  DRIVER = "driver",
  FOREMAN = "foreman",
  ADMIN = "admin",
}

export enum DriverState {
  IDLE = "idle",
  PENDING_TRUCK = "pending_truck",
  PENDING_SITE = "pending_site",
  AWAITING_ODO_START = "awaiting_odo_start",
  ACTIVE = "active",
  AWAITING_ODO_END = "awaiting_odo_end",
  AWAITING_INVOICE = "awaiting_invoice",
}

export interface User {
  id: number;
  full_name: string;
  role: UserRole;
  current_state: DriverState;
  tenant_id: number;
  avatar_url?: string;
  must_change_password?: boolean;
  tg_user_id?: number | null;
}

export interface Shift {
  id: number;
  status: string | ShiftStatus;

  // Поля для списка смен (/shifts)
  driver_name?: string;
  truck_name?: string;
  site_name?: string;
  created_at?: string;

  // Поля для текущей смены (/shifts/current)
  tenant_id?: number;
  user_id?: number;
  truck_id?: number;
  site_id?: number;
  start_time?: string;
  end_time?: string;
  hours_worked?: number;
  salary?: number;
  comment?: string;
  updated_at?: string;

  // Вложенные объекты (из /shifts/current)
  truck?: { name: string };
  site?: {
    id?: number;
    name: string;
    odometer_required: boolean;
    invoice_required: boolean;
  };
  user?: { full_name: string };

  // Данные фото
  photo_start_url?: string;
  photo_end_url?: string;
  photo_invoice_url?: string;

  // Snapshot proof requirements (set at shift creation; null = legacy shift, fall back to site/tenant flags)
  requires_odo_start?: boolean | null;
  requires_odo_end?: boolean | null;
  requires_invoice?: boolean | null;
  proof_requirements?: {
    start?: boolean;
    end?: boolean;
    invoice?: boolean;
  };
  photos?: {
    start?: boolean;
    end?: boolean;
    invoice?: boolean;
  };
}

export interface Driver {
  id: string;
  full_name: string;
  phone_number: string;
  is_active: boolean;
  vehicle_info?: string;
  last_activity?: string;
}

export interface AuditLog {
  id: number;
  action_display: string;  // ← готовый текст с эмодзи
  performed_by: string;
  timestamp: string;
  details?: string;  // JSON строка
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ManualShiftRequest {
  driver_id: number;
  truck_id: number;
  site_id: number;
}

// Analytics types
export interface ResourceUsage {
  current: number;
  limit: number;
  utilization_percent: number | null;
}

export interface AnalyticsUsage {
  trucks: ResourceUsage;
  drivers: ResourceUsage;
  sites: ResourceUsage;
}

// Trends types
export type TrendMetric = "shifts" | "hours" | "salary";

export interface AnalyticsTrend {
  date: string;
  shifts_count: number;
  hours_worked: number;
  salary_paid: number;
}

export interface TrendsData {
  data: AnalyticsTrend[];
  metric: TrendMetric;
}

export interface AnalyticsDriver {
  driver_id: number;
  driver_name: string;
  shifts_count: number;
  hours_worked: number;
  salary_paid: number;
}

export type DriverSortField = 'hours_worked' | 'shifts_count' | 'salary_paid';
export type SortDirection = 'asc' | 'desc';

// Activity metrics from backend analytics
export interface ActivityMetrics {
  avgDailyActiveShifts: number;
  peakSimultaneousUsage: number;
  finishedShifts: number;
}

export interface AnalyticsInsights {
  underutilizedResources: {
    trucks: string[];
    sites: string[];
  };
  nearLimitResources: {
    trucks: NearLimitResource | null;
    drivers: NearLimitResource | null;
    sites: NearLimitResource | null;
  };
  costPerShift: number; // v1.1.1: now returns 0 instead of null
  recommendedActions: string[];
  // Optional: backend may return these in the full response
  activityMetrics?: ActivityMetrics;
}

export interface NearLimitResource {
  current: number;
  limit: number;
  percent: number;
}

// Subscription types
export interface SubscriptionInfo {
  status: 'active' | 'expired' | 'trial';
  expires_at: string | null;
  plan_name?: string;
}

export interface BillingPlanInfo {
  code: string;
  name: string;
  price_monthly: number;
  limit_machines: number;
  limit_drivers: number;
  limit_sites: number;
}

export interface BillingPaymentSummary {
  id: number;
  plan_code?: string;
  plan_name?: string;
  status: string;
  amount: number;
  currency: string;
  period_months?: number;
  paid_at: string | null;
  created_at: string | null;
}

export interface TenantBillingSummary {
  current_plan: BillingPlanInfo | null;
  subscription_expires_at: string | null;
  last_payment: BillingPaymentSummary | null;
}

export interface BillingCheckoutResponse {
  payment_id: number;
  status: string;
  confirmation_url: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface OwnerSummary {
  backend: {
    packageVersion: string;
    buildId: string;
  };
  database: {
    connected: boolean;
  };
  counts: {
    tenants: number;
    users: number;
    active_shifts: number;
    stuck_shifts: number;
    user_consents: number;
    invites: number;
    password_reset_tokens: number;
  };
  billing: {
    payments_by_status: Record<string, number>;
    provider_events_by_status: Record<string, number>;
    provider_events_with_error: number;
  };
  latest: {
    tenant_id: number | null;
    user_id: number | null;
    shift_updated_at: string | null;
    billing_payment_created_at: string | null;
    provider_event_received_at: string | null;
    consent_accepted_at: string | null;
    invite_expires_at: string | null;
    reset_token_created_at: string | null;
  };
}

export interface OwnerTenantRow {
  id: number;
  name: string;
  plan: {
    code: string;
    name: string;
  } | null;
  subscription_expires_at: string | null;
  subscription_status: "active" | "expired";
  counts: {
    users: number;
    trucks: number;
    sites: number;
    active_shifts: number;
    stuck_shifts: number;
  };
}

export type OwnerSystemStatus = "ok" | "warning" | "error" | "stale" | "unknown" | "unavailable";

export interface OwnerBackupSnapshot {
  status: "ok" | "warning" | "error" | "unknown";
  latestAt: string | null;
  ageSeconds: number | null;
  sizeBytes: number | null;
  integrity: "ok" | "failed" | "unknown";
  retainedCount: number | null;
}

export interface OwnerContainerSnapshot {
  status: "ok" | "warning" | "error" | "unknown";
  state: "running" | "restarting" | "exited" | "created" | "paused" | "dead" | "unknown";
  health: "healthy" | "unhealthy" | "starting" | "none" | "unknown";
  restartPolicy: "unless-stopped" | "always" | "on-failure" | "no" | "unknown";
}

export interface OwnerSystemSnapshot {
  schemaVersion: 1;
  generatedAt: string | null;
  overallStatus: OwnerSystemStatus;
  reason?: "snapshot_missing" | "snapshot_unavailable" | "unsupported_schema" | "snapshot_stale";
  disk: {
    root: {
      usedPercent: number | null;
      freeBytes: number | null;
    };
  };
  backups: {
    postgres: OwnerBackupSnapshot;
    uploads: OwnerBackupSnapshot;
  };
  containers: {
    logishift_backend: OwnerContainerSnapshot;
    logishift_frontend: OwnerContainerSnapshot;
    logishift_postgres: OwnerContainerSnapshot;
    logishift_caddy: OwnerContainerSnapshot;
  };
}
