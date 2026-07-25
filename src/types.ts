export enum ShiftStatus {
  ACTIVE = "active",
  PENDING_INVOICE = "pending_invoice",
  FINISHED = "finished",
  CANCELLED = "cancelled",
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
  is_excluded?: boolean;
  exclusion_reason?: string | null;
  excluded_at?: string | null;
  excluded_by_user_id?: number | null;
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

export interface EffectiveBillingPlanInfo {
  id?: number;
  code: string;
  name: string;
  limit_machines: number;
  limit_drivers: number;
  limit_sites: number;
}

export type BillingEntitlementSource =
  | "free"
  | "paid"
  | "pilot"
  | "individual"
  | "internal_demo";

export interface BillingEntitlementSummary {
  source: BillingEntitlementSource;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
}

export interface BillingUsageMetric {
  current: number;
  limit: number;
  over_limit: boolean;
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
  stored_plan?: EffectiveBillingPlanInfo | null;
  effective_plan?: EffectiveBillingPlanInfo | null;
  entitlement?: BillingEntitlementSummary | null;
  usage?: {
    drivers: BillingUsageMetric;
    trucks: BillingUsageMetric;
    sites: BillingUsageMetric;
  } | null;
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
  health: OwnerTenantHealth;
}

export type OwnerTenantHealthStage =
  | "not_configured"
  | "configuring"
  | "ready_for_first_shift"
  | "first_shift_started"
  | "working"
  | "inactive";

export interface OwnerTenantHealth {
  stage: OwnerTenantHealthStage;
  label: string;
  lastActivityAt: string | null;
  attentionCount: number;
}

export interface OwnerTenantAttention {
  code: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
}

export interface OwnerTenantPlan {
  id: number;
  code: string;
  name: string;
  limitMachines: number;
  limitDrivers: number;
  limitSites: number;
}

export type OwnerEntitlementSource =
  | "free"
  | "paid"
  | "pilot"
  | "individual"
  | "internal_demo";

export interface OwnerEffectiveEntitlement {
  source: OwnerEntitlementSource;
  status: "active";
  startsAt: string | null;
  expiresAt: string | null;
  plan: OwnerTenantPlan;
}

export interface OwnerUsageMetric {
  current: number;
  limit: number;
  overLimit: boolean;
}

export interface OwnerPilotSummary {
  status: "active" | "expired" | "revoked" | "superseded_by_paid";
  plan: Pick<OwnerTenantPlan, "code" | "name">;
  startsAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  sourceChannel: "direct" | "community" | "product_radar" | "referral" | "other";
  version: number;
}

export interface OwnerTenantDetail {
  tenant: {
    id: number;
    name: string;
    timezone: string | null;
  };
  health: OwnerTenantHealth;
  attention: OwnerTenantAttention[];
  storedPlan: OwnerTenantPlan;
  effectiveEntitlement: OwnerEffectiveEntitlement;
  usage: {
    drivers: OwnerUsageMetric;
    trucks: OwnerUsageMetric;
    sites: OwnerUsageMetric;
  };
  shifts: {
    active: number;
    finished: number;
    stuck: number;
  };
  usersSummary: {
    total: number;
    admins: number;
    foremen: number;
    drivers: number;
    other: number;
  };
  users: Array<{
    id: number;
    name: string;
    role: string;
    roleLabel: string;
    hasEmail: boolean;
    hasTelegram: boolean;
    activityAt: string | null;
  }>;
  resources: {
    trucks: { total: number; active: number; busy: number };
    sites: { total: number; active: number };
  };
  recentTrucks: Array<{
    id: number;
    name: string;
    plate: string | null;
    active: boolean;
    busy: boolean;
  }>;
  recentSites: Array<{
    id: number;
    name: string;
    active: boolean;
  }>;
  recentShifts: Array<{
    id: number;
    status: string;
    statusLabel: string;
    driverName: string;
    truckName: string | null;
    siteName: string | null;
    startedAt: string | null;
    endedAt: string | null;
    updatedAt: string | null;
    hasStartPhoto: boolean;
    hasEndPhoto: boolean;
    hasInvoicePhoto: boolean;
    hasComment: boolean;
    durationWarning: boolean;
  }>;
  invitesSummary: {
    pending: number;
    accepted: number;
    revoked: number;
    expired: number;
    expiringSoon: number;
  };
  pilot: OwnerPilotSummary | null;
  billing: {
    activePaidSubscription: {
      plan: Pick<OwnerTenantPlan, "code" | "name">;
      expiresAt: string | null;
    } | null;
    recentPayments: Array<{
      id: number;
      status: string;
      plan: Pick<OwnerTenantPlan, "code" | "name"> | null;
      amount: number;
      currency: string;
      periodMonths: number | null;
      paidAt: string | null;
      canceledAt: string | null;
      createdAt: string | null;
    }>;
  };
  attribution: {
    utmSource: string | null;
    utmCampaign: string | null;
    utmTerm: string | null;
  };
  timeline: Array<{
    id: string;
    type: string;
    title: string;
    description: string | null;
    occurredAt: string | null;
  }>;
}

export type OwnerInternalOverviewWindow = "1h" | "24h" | "7d";

export interface OwnerInternalOverview {
  generatedAt: string;
  window: OwnerInternalOverviewWindow;
  baseline: {
    backend: string;
    frontend: string;
  };
  health: {
    api: "ok" | "warning" | "error" | "unknown";
    db: "ok" | "warning" | "error" | "unknown";
    systemSnapshot: OwnerSystemStatus;
  };
  totals: {
    tenants: number;
    users: number;
    activeShifts: number;
    stuckShifts: number;
  };
  activity: {
    invitesCreated: number | null;
    invitesAccepted: number | null;
    shiftsCreated: number | null;
    shiftsStarted: number | null;
    shiftsFinished: number | null;
    shiftsCancelled: number | null;
    billingCheckouts: number | null;
    paymentsSucceeded: number | null;
    paymentsCanceled: number | null;
    auditEvents: number | null;
  };
  funnel: {
    tenantsTotal: number;
    tenantsWithUsers: number;
    tenantsWithInvites: number;
    tenantsWithShifts: number;
    tenantsWithFinishedShift: number;
    tenantsWithBillingPayment: number;
  };
  audit: {
    count: number;
    byAction: Record<string, number>;
    recent: Array<{
      time: string | null;
      action: string;
      tenantId: number | null;
      entity: string | null;
      entityId: number | null;
      summary: string;
    }>;
  };
  billing: {
    paymentsByStatus: Record<string, number>;
    providerEventsByStatus: Record<string, number>;
    providerEventsWithError: number;
  };
  attribution: {
    demoSuccesses: number;
    registrations: number;
    lastDemoAt: string | null;
    lastRegistrationAt: string | null;
    rows: Array<{
      eventType: "demo_entry_success" | "tenant_registered";
      utmSource: string | null;
      utmCampaign: string | null;
      utmTerm: string | null;
      count: number;
    }>;
    recentAttributionEvents: Array<{
      eventType: "demo_entry_success" | "tenant_registered";
      occurredAt: string | null;
      utmSource: string | null;
      utmCampaign: string | null;
      utmTerm: string | null;
    }>;
  };
  risks: string[];
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
