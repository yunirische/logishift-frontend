import { isDemoActiveShiftStorageKey } from "../config/demo";

export const DEMO_SESSION_STORAGE_KEY = "logishift_demo_session_v1";
export const DEMO_SESSION_VERSION = 1;
export const DEMO_SESSION_TTL_MS = 4 * 60 * 60 * 1000;

export type DemoScenarioStatus = "idle" | "active" | "finished";

export interface DemoScenarioShift {
  id: string;
  driverId: number | null;
  driverName: string;
  truckId: number | string;
  truckName: string;
  truckPlate?: string | null;
  siteId: number | string;
  siteName: string;
  siteAddress?: string | null;
  startedAt: string;
  finishedAt?: string | null;
  status: DemoScenarioStatus;
}

export interface DemoSessionState {
  activeShift: DemoScenarioShift | null;
  finishedShifts: DemoScenarioShift[];
}

interface PersistedDemoSession extends DemoSessionState {
  version: typeof DEMO_SESSION_VERSION;
  expiresAt: number;
}

export type StartDemoShiftInput = Omit<
  DemoScenarioShift,
  "id" | "startedAt" | "finishedAt" | "status"
>;

export const EMPTY_DEMO_SESSION: DemoSessionState = {
  activeShift: null,
  finishedShifts: [],
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isIdentifier = (value: unknown): value is number | string =>
  (typeof value === "number" && Number.isFinite(value)) || isNonEmptyString(value);

const isNullableString = (value: unknown): value is string | null | undefined =>
  value == null || typeof value === "string";

const isIsoDate = (value: unknown): value is string =>
  isNonEmptyString(value) && !Number.isNaN(Date.parse(value));

const isDemoScenarioShift = (value: unknown): value is DemoScenarioShift => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const shift = value as Record<string, unknown>;
  const validDriverId =
    shift.driverId === null ||
    (typeof shift.driverId === "number" && Number.isFinite(shift.driverId));

  return (
    isNonEmptyString(shift.id) &&
    shift.id.startsWith("demo-shift:") &&
    validDriverId &&
    isNonEmptyString(shift.driverName) &&
    isIdentifier(shift.truckId) &&
    isNonEmptyString(shift.truckName) &&
    isNullableString(shift.truckPlate) &&
    isIdentifier(shift.siteId) &&
    isNonEmptyString(shift.siteName) &&
    isNullableString(shift.siteAddress) &&
    isIsoDate(shift.startedAt) &&
    isNullableString(shift.finishedAt) &&
    (shift.finishedAt == null || isIsoDate(shift.finishedAt)) &&
    ["idle", "active", "finished"].includes(String(shift.status))
  );
};

const isPersistedDemoSession = (
  value: unknown,
  now: number
): value is PersistedDemoSession => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const payload = value as Record<string, unknown>;
  if (
    payload.version !== DEMO_SESSION_VERSION ||
    typeof payload.expiresAt !== "number" ||
    !Number.isFinite(payload.expiresAt) ||
    payload.expiresAt <= now ||
    !Array.isArray(payload.finishedShifts)
  ) {
    return false;
  }

  if (
    payload.activeShift !== null &&
    (!isDemoScenarioShift(payload.activeShift) ||
      payload.activeShift.status !== "active")
  ) {
    return false;
  }

  return payload.finishedShifts.every(
    (shift) => isDemoScenarioShift(shift) && shift.status === "finished"
  );
};

export const clearObsoleteDemoActiveShiftKeys = (storage: Storage): void => {
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (isDemoActiveShiftStorageKey(key)) {
      storage.removeItem(key as string);
    }
  }
};

export const clearDemoSessionStorage = (storage: Storage): void => {
  storage.removeItem(DEMO_SESSION_STORAGE_KEY);
};

export const readDemoSession = (
  storage: Storage,
  now: number = Date.now()
): DemoSessionState => {
  const raw = storage.getItem(DEMO_SESSION_STORAGE_KEY);
  if (!raw) return EMPTY_DEMO_SESSION;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedDemoSession(parsed, now)) {
      clearDemoSessionStorage(storage);
      return EMPTY_DEMO_SESSION;
    }

    return {
      activeShift: parsed.activeShift,
      finishedShifts: parsed.finishedShifts,
    };
  } catch {
    clearDemoSessionStorage(storage);
    return EMPTY_DEMO_SESSION;
  }
};

export const writeDemoSession = (
  storage: Storage,
  state: DemoSessionState,
  now: number = Date.now()
): void => {
  if (!state.activeShift && state.finishedShifts.length === 0) {
    clearDemoSessionStorage(storage);
    return;
  }

  const payload: PersistedDemoSession = {
    version: DEMO_SESSION_VERSION,
    expiresAt: now + DEMO_SESSION_TTL_MS,
    activeShift: state.activeShift,
    finishedShifts: state.finishedShifts,
  };
  storage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(payload));
};

export const createDemoScenarioShift = (
  input: StartDemoShiftInput,
  now: Date = new Date()
): DemoScenarioShift => {
  const randomPart =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${now.getTime()}-${Math.random().toString(36).slice(2)}`;

  return {
    ...input,
    id: `demo-shift:${randomPart}`,
    startedAt: now.toISOString(),
    finishedAt: null,
    status: "active",
  };
};

export const finishDemoScenarioShift = (
  shift: DemoScenarioShift,
  now: Date = new Date()
): DemoScenarioShift => ({
  ...shift,
  status: "finished",
  finishedAt: now.toISOString(),
});
