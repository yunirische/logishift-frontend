import { getProductionAppUrl } from "../config/demo";
import {
  ATTRIBUTION_PARAM_NAMES,
  Attribution,
  addAttributionToUrl,
  normalizeAttributionValue,
  readAttribution,
} from "./attribution";
import {
  addDemoSessionFragment,
  getOrCreateDemoFunnelSession,
} from "./demoFunnelSession";

export const DEMO_REGISTRATION_HANDOFF_STORAGE_KEY =
  "logishift_demo_registration_handoff_v1";
export const DEMO_REGISTRATION_HANDOFF_VERSION = 1;
export const DEMO_REGISTRATION_HANDOFF_TTL_MS = 4 * 60 * 60 * 1000;
export const DEMO_REGISTRATION_SOURCE_PARAM = "registration_source";
export const DEMO_REGISTRATION_SOURCE_VALUE = "demo";

export interface DemoRegistrationHandoff {
  version: 1;
  expiresAt: number;
  attribution: Attribution;
}

const PAYLOAD_KEYS = new Set(["version", "expiresAt", "attribution"]);
const ATTRIBUTION_KEYS = new Set<string>(ATTRIBUTION_PARAM_NAMES);

const browserStorage = (): Storage | null =>
  typeof window === "undefined" ? null : window.localStorage;

const clearStoredHandoff = (storage: Storage | null): void => {
  try {
    storage?.removeItem(DEMO_REGISTRATION_HANDOFF_STORAGE_KEY);
  } catch {
    // A blocked browser storage API must not block demo or registration.
  }
};

const parseStoredHandoff = (
  raw: string,
  now: number
): DemoRegistrationHandoff | null => {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const payload = parsed as Record<string, unknown>;
  if (
    Object.keys(payload).some((key) => !PAYLOAD_KEYS.has(key)) ||
    payload.version !== DEMO_REGISTRATION_HANDOFF_VERSION ||
    typeof payload.expiresAt !== "number" ||
    !Number.isFinite(payload.expiresAt) ||
    payload.expiresAt <= now ||
    !payload.attribution ||
    typeof payload.attribution !== "object" ||
    Array.isArray(payload.attribution)
  ) {
    return null;
  }

  const storedAttribution = payload.attribution as Record<string, unknown>;
  if (Object.keys(storedAttribution).some((key) => !ATTRIBUTION_KEYS.has(key))) {
    return null;
  }

  const attribution: Attribution = {};
  for (const name of ATTRIBUTION_PARAM_NAMES) {
    if (!(name in storedAttribution)) continue;
    const normalized = normalizeAttributionValue(storedAttribution[name]);
    if (!normalized || normalized !== storedAttribution[name]) {
      return null;
    }
    attribution[name] = normalized;
  }

  if (Object.keys(attribution).length === 0) {
    return null;
  }

  return {
    version: DEMO_REGISTRATION_HANDOFF_VERSION,
    expiresAt: payload.expiresAt,
    attribution,
  };
};

export const readDemoRegistrationHandoff = (
  storage: Storage | null = browserStorage(),
  now: number = Date.now()
): DemoRegistrationHandoff | null => {
  if (!storage) return null;

  try {
    const raw = storage.getItem(DEMO_REGISTRATION_HANDOFF_STORAGE_KEY);
    if (!raw) return null;
    const handoff = parseStoredHandoff(raw, now);
    if (!handoff) clearStoredHandoff(storage);
    return handoff;
  } catch {
    clearStoredHandoff(storage);
    return null;
  }
};

export const captureDemoRegistrationHandoff = ({
  search,
  explicitEntry,
  storage = browserStorage(),
  now = Date.now(),
}: {
  search: string;
  explicitEntry: boolean;
  storage?: Storage | null;
  now?: number;
}): DemoRegistrationHandoff | null => {
  if (!explicitEntry) {
    return readDemoRegistrationHandoff(storage, now);
  }

  const attribution = readAttribution(search);
  if (!storage || Object.keys(attribution).length === 0) {
    clearStoredHandoff(storage);
    return null;
  }

  const handoff: DemoRegistrationHandoff = {
    version: DEMO_REGISTRATION_HANDOFF_VERSION,
    expiresAt: now + DEMO_REGISTRATION_HANDOFF_TTL_MS,
    attribution,
  };

  clearStoredHandoff(storage);
  try {
    storage.setItem(
      DEMO_REGISTRATION_HANDOFF_STORAGE_KEY,
      JSON.stringify(handoff)
    );
  } catch {
    return null;
  }

  return handoff;
};

export const getDemoRegistrationUrl = (
  storage: Storage | null = browserStorage(),
  now: number = Date.now()
): string => {
  const destination = new URL(getProductionAppUrl("/register"));
  destination.searchParams.set(
    DEMO_REGISTRATION_SOURCE_PARAM,
    DEMO_REGISTRATION_SOURCE_VALUE
  );

  const handoff = readDemoRegistrationHandoff(storage, now);
  const registrationUrl = addAttributionToUrl(
    destination.toString(),
    handoff?.attribution || {}
  );
  const funnelSession = getOrCreateDemoFunnelSession({
    explicitEntry: false,
    storage,
    now,
  });
  return addDemoSessionFragment(registrationUrl, funnelSession?.key);
};
