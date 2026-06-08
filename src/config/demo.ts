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

// Demo driver persona ----------------------------------------------------
// Demo-only: when an admin previews the driver UI on demo.kontrolsmen.ru,
// substitute a real seeded demo driver's identity at the view layer only.
// AuthContext is never mutated.

export interface DemoDriverPersona {
  id: number;
  full_name: string;
}

export const DEMO_PERSONA_KEY = "logishift_demo_persona_driver_id";

export const demoActiveShiftKey = (personaId: number | null): string =>
  personaId == null
    ? "logishift_active_shift_demo"
    : `logishift_active_shift_demo_${personaId}`;

// Fallback persona used when /users cannot be fetched or returns no drivers.
// Display-only: id=null means we cannot run driver_id-scoped backend queries
// and the UI must show a synthetic empty-history fallback.
export const DEMO_FALLBACK_PERSONA: DemoDriverPersona = {
  id: 0,
  full_name: "Демо Водитель",
};

export const pickDemoDriverPersona = (
  users: any[] | null | undefined
): DemoDriverPersona | null => {
  if (!Array.isArray(users) || users.length === 0) return null;
  const drivers = users.filter(
    (u) => u && u.role === "driver" && typeof u.id === "number" && u.full_name
  );
  if (drivers.length === 0) return null;

  const storedRaw = (() => {
    try {
      return localStorage.getItem(DEMO_PERSONA_KEY);
    } catch {
      return null;
    }
  })();
  const storedId = storedRaw ? Number(storedRaw) : NaN;
  const stored = Number.isFinite(storedId)
    ? drivers.find((d) => d.id === storedId)
    : undefined;
  const picked = stored || drivers[0];
  return { id: picked.id, full_name: picked.full_name };
};
