export const DEMO_FUNNEL_SESSION_STORAGE_KEY =
  "logishift_demo_funnel_session_v1";
export const DEMO_FUNNEL_SESSION_VERSION = 1;
export const DEMO_FUNNEL_SESSION_TTL_MS = 4 * 60 * 60 * 1000;
export const DEMO_SESSION_FRAGMENT_PARAM = "demo_session";
export const DEMO_SESSION_EXPIRY_PARAM = "demo_session_expires";
export const INTERNAL_ENTRY_PARAM = "measurement_internal";

export interface DemoFunnelSession {
  version: 1;
  expiresAt: number;
  key: string;
  isInternal: boolean;
}

const SESSION_KEY_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
let initializedEntry: { storage: Storage; key: string } | null = null;
const FRAGMENT_FIELDS = [DEMO_SESSION_FRAGMENT_PARAM, DEMO_SESSION_EXPIRY_PARAM, INTERNAL_ENTRY_PARAM];

export const isValidDemoFunnelSessionKey = (
  value: unknown
): value is string =>
  typeof value === "string" && SESSION_KEY_PATTERN.test(value);

const browserStorage = (): Storage | null => {
  try { return typeof window === "undefined" ? null : window.localStorage; }
  catch { return null; }
};

const clearStoredSession = (storage: Storage | null): void => {
  try {
    storage?.removeItem(DEMO_FUNNEL_SESSION_STORAGE_KEY);
  } catch {
    // Analytics state must never block the demo.
  }
};

const generateSessionKey = (): string => {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  const binary = Array.from(bytes, (value) =>
    String.fromCharCode(value)
  ).join("");
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

export const readDemoFunnelSession = (
  storage: Storage | null = browserStorage(),
  now: number = Date.now()
): DemoFunnelSession | null => {
  if (!storage) return null;
  try {
    const raw = storage.getItem(DEMO_FUNNEL_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      clearStoredSession(storage);
      return null;
    }
    const payload = parsed as Record<string, unknown>;
    if (
      Object.keys(payload).some(
        (key) => !["version", "expiresAt", "key", "isInternal"].includes(key)
      ) ||
      payload.version !== DEMO_FUNNEL_SESSION_VERSION ||
      typeof payload.expiresAt !== "number" ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= now ||
      (payload.isInternal !== undefined && typeof payload.isInternal !== "boolean") ||
      !isValidDemoFunnelSessionKey(payload.key)
    ) {
      clearStoredSession(storage);
      return null;
    }
    return {
      version: DEMO_FUNNEL_SESSION_VERSION,
      expiresAt: payload.expiresAt,
      key: payload.key,
      isInternal: payload.isInternal === true,
    };
  } catch {
    clearStoredSession(storage);
    return null;
  }
};

export const getOrCreateDemoFunnelSession = ({
  explicitEntry,
  storage = browserStorage(),
  now = Date.now(),
  isInternal = false,
}: {
  explicitEntry: boolean;
  storage?: Storage | null;
  now?: number;
  isInternal?: boolean;
}): DemoFunnelSession | null => {
  if (!storage) return null;
  if (!explicitEntry) {
    const current = readDemoFunnelSession(storage, now);
    if (current) return current;
  }

  const session: DemoFunnelSession = {
    version: DEMO_FUNNEL_SESSION_VERSION,
    expiresAt: now + DEMO_FUNNEL_SESSION_TTL_MS,
    key: generateSessionKey(),
    isInternal: isInternal === true,
  };
  clearStoredSession(storage);
  try {
    storage.setItem(DEMO_FUNNEL_SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
  } catch {
    return null;
  }
};

export const addDemoSessionFragment = (
  destination: string,
  session: DemoFunnelSession | null | undefined,
  now = Date.now()
): string => {
  const url = new URL(destination);
  if (session && isValidDemoFunnelSessionKey(session.key) &&
      Number.isSafeInteger(session.expiresAt) && session.expiresAt > now &&
      session.expiresAt <= now + DEMO_FUNNEL_SESSION_TTL_MS) {
    const ordinary = fragmentParts(url).ordinary;
    const fields = new URLSearchParams({
      [DEMO_SESSION_FRAGMENT_PARAM]: session.key,
      [DEMO_SESSION_EXPIRY_PARAM]: String(session.expiresAt),
      [INTERNAL_ENTRY_PARAM]: session.isInternal === true ? "1" : "0",
    });
    url.hash = [ordinary, fields.toString()].filter(Boolean).join("&");
  }
  return url.toString();
};

// Preserve ordinary anchors byte-for-byte instead of URLSearchParams turning #pricing into #pricing=.
const fragmentParts = (url: URL) => {
  const parts = url.hash.slice(1).split("&");
  const service = parts.filter(part => FRAGMENT_FIELDS.includes(new URLSearchParams(part).keys().next().value || ""));
  return { fields: new URLSearchParams(service.join("&")),
    ordinary: parts.filter(part => !service.includes(part)).join("&"), hasService: service.length > 0 };
};

export const initializeDemoFunnelSession = ({
  explicitEntry = false, href = window.location.href,
  replace = (url: string) => window.history.replaceState({}, "", url),
  storage = browserStorage(), now = Date.now(),
}: { explicitEntry?: boolean; href?: string; replace?: (url: string) => void;
     storage?: Storage | null; now?: number } = {}): DemoFunnelSession | null => {
  const url = new URL(href);
  const { fields, ordinary, hasService } = fragmentParts(url);
  if (hasService) {
    url.hash = ordinary;
    replace(`${url.pathname}${url.search}${url.hash}`);
  }
  if (!storage) return null;
  const key = fields.get(DEMO_SESSION_FRAGMENT_PARAM);
  const expiry = fields.get(DEMO_SESSION_EXPIRY_PARAM);
  const marker = fields.get(INTERNAL_ENTRY_PARAM);
  const unique = FRAGMENT_FIELDS.every(field => fields.getAll(field).length <= 1);
  if (key !== null || expiry !== null) {
    const expiresAt = expiry !== null && /^\d+$/.test(expiry) ? Number(expiry) : NaN;
    if (unique && isValidDemoFunnelSessionKey(key) && Number.isSafeInteger(expiresAt) &&
        expiresAt > now && expiresAt <= now + DEMO_FUNNEL_SESSION_TTL_MS &&
        (marker === "0" || marker === "1")) {
      const session: DemoFunnelSession = { version: 1, key, expiresAt, isInternal: marker === "1" };
      try { storage.setItem(DEMO_FUNNEL_SESSION_STORAGE_KEY, JSON.stringify(session)); }
      catch { return null; }
      initializedEntry = { storage, key };
      return session;
    }
    // An invalid/expired inbound handoff cannot revive an old internal session.
    explicitEntry = true;
  } else if (unique && (marker === "0" || marker === "1")) {
    const session = getOrCreateDemoFunnelSession({ explicitEntry: true, storage, now, isInternal: marker === "1" });
    if (session) initializedEntry = { storage, key: session.key };
    return session;
  }
  const current = readDemoFunnelSession(storage, now);
  // StrictMode may initialize the demo provider twice after the fragment was stripped.
  if (!hasService && current && initializedEntry?.storage === storage && initializedEntry.key === current.key) return current;
  const session = getOrCreateDemoFunnelSession({ explicitEntry, storage, now });
  if (session && explicitEntry) initializedEntry = { storage, key: session.key };
  return session;
};
