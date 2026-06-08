export const DEMO_TENANT_ID = 999;
export const DEMO_HOSTNAME = "demo.kontrolsmen.ru";

export const isDemoTenantId = (tenantId: unknown): boolean =>
  tenantId === DEMO_TENANT_ID || String(tenantId) === String(DEMO_TENANT_ID);

export const isDemoHostname = (hostname: string): boolean =>
  hostname === DEMO_HOSTNAME;
