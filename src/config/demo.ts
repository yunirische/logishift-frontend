export const DEMO_TENANT_ID = 999;
export const MARKETING_HOSTNAME = "kontrolsmen.ru";
export const WWW_MARKETING_HOSTNAME = "www.kontrolsmen.ru";
export const DEMO_HOSTNAME = "demo.kontrolsmen.ru";
export const APP_HOSTNAME = "app.kontrolsmen.ru";
export const EXPLICIT_DEMO_LOGOUT_KEY = "explicit_demo_logout";
export const APP_DEMO_PERSONA_KEY = "demoPersona";
export const DEMO_ACTIVE_SHIFT_STORAGE_KEY_PREFIX = "logishift_active_shift_demo";

export const isDemoTenantId = (tenantId: unknown): boolean =>
  tenantId === DEMO_TENANT_ID || String(tenantId) === String(DEMO_TENANT_ID);

export const isDemoHostname = (hostname: string): boolean =>
  hostname === DEMO_HOSTNAME;

export const isProductionAppHostname = (hostname: string): boolean =>
  hostname === APP_HOSTNAME;

export const isMarketingHostname = (hostname: string): boolean =>
  hostname === MARKETING_HOSTNAME || hostname === WWW_MARKETING_HOSTNAME;

export const getDemoAppUrl = (): string => `https://${DEMO_HOSTNAME}`;
export const getProductionAppUrl = (pathname: string = "/"): string =>
  `https://${APP_HOSTNAME}${pathname}`;
export const redirectToLogin = (): void => {
  if (typeof window !== "undefined") {
    window.location.replace("/login");
  }
};

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
    ? DEMO_ACTIVE_SHIFT_STORAGE_KEY_PREFIX
    : `${DEMO_ACTIVE_SHIFT_STORAGE_KEY_PREFIX}_${personaId}`;

export const isDemoActiveShiftStorageKey = (key: string | null): boolean =>
  Boolean(
    key &&
      (key === DEMO_ACTIVE_SHIFT_STORAGE_KEY_PREFIX ||
        key.startsWith(`${DEMO_ACTIVE_SHIFT_STORAGE_KEY_PREFIX}_`))
  );

export const clearDemoLocalState = (storage: Storage): void => {
  storage.removeItem(APP_DEMO_PERSONA_KEY);
  storage.removeItem(DEMO_PERSONA_KEY);

  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (isDemoActiveShiftStorageKey(key)) {
      storage.removeItem(key as string);
    }
  }
};

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
