export const DEMO_TENANT_ID = 999;
export const DEMO_HOSTNAME = "demo.kontrolsmen.ru";
export const APP_HOSTNAME = "app.kontrolsmen.ru";

export const isDemoTenantId = (tenantId: unknown): boolean =>
  tenantId === DEMO_TENANT_ID || String(tenantId) === String(DEMO_TENANT_ID);

export const isDemoHostname = (hostname: string): boolean =>
  hostname === DEMO_HOSTNAME;

export const isProductionAppHostname = (hostname: string): boolean =>
  hostname === APP_HOSTNAME;

export const getDemoAppUrl = (): string => `https://${DEMO_HOSTNAME}`;
