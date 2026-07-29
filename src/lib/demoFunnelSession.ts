export const DEMO_FUNNEL_SESSION_STORAGE_KEY =
  "logishift_demo_funnel_session_v1";
export const DEMO_FUNNEL_SESSION_VERSION = 1;
export const DEMO_FUNNEL_SESSION_TTL_MS = 4 * 60 * 60 * 1000;
export const DEMO_SESSION_FRAGMENT_PARAM = "demo_session";

export interface DemoFunnelSession {
  version: 1;
  expiresAt: number;
  key: string;
}

const SESSION_KEY_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
let recentlyConsumedFragmentKey: string | null = null;

export const isValidDemoFunnelSessionKey = (
  value: unknown
): value is string =>
  typeof value === "string" && SESSION_KEY_PATTERN.test(value);

const browserStorage = (): Storage | null =>
  typeof window === "undefined" ? null : window.localStorage;

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
        (key) => !["version", "expiresAt", "key"].includes(key)
      ) ||
      payload.version !== DEMO_FUNNEL_SESSION_VERSION ||
      typeof payload.expiresAt !== "number" ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= now ||
      !isValidDemoFunnelSessionKey(payload.key)
    ) {
      clearStoredSession(storage);
      return null;
    }
    return {
      version: DEMO_FUNNEL_SESSION_VERSION,
      expiresAt: payload.expiresAt,
      key: payload.key,
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
}: {
  explicitEntry: boolean;
  storage?: Storage | null;
  now?: number;
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
  sessionKey: string | null | undefined
): string => {
  const url = new URL(destination);
  if (isValidDemoFunnelSessionKey(sessionKey)) {
    url.hash = new URLSearchParams({
      [DEMO_SESSION_FRAGMENT_PARAM]: sessionKey,
    }).toString();
  }
  return url.toString();
};

export const consumeDemoSessionKeyFromFragment = (
  href: string = window.location.href,
  replace: (url: string) => void = (url) =>
    window.history.replaceState({}, "", url)
): string | null => {
  const url = new URL(href);
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
  const sessionKey = fragment.get(DEMO_SESSION_FRAGMENT_PARAM);
  fragment.delete(DEMO_SESSION_FRAGMENT_PARAM);
  url.hash = fragment.toString();
  if (sessionKey !== null) {
    replace(`${url.pathname}${url.search}${url.hash}`);
  }
  if (isValidDemoFunnelSessionKey(sessionKey)) {
    recentlyConsumedFragmentKey = sessionKey;
    queueMicrotask(() => {
      if (recentlyConsumedFragmentKey === sessionKey) {
        recentlyConsumedFragmentKey = null;
      }
    });
    return sessionKey;
  }
  return recentlyConsumedFragmentKey;
};
