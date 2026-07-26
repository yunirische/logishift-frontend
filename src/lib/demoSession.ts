import { isDemoActiveShiftStorageKey } from "../config/demo";
import {
  ALLOWED_PHOTO_MIME_TYPES,
  MAX_PHOTO_FILE_BYTES,
} from "../utils/photoFile";

export const DEMO_SESSION_STORAGE_KEY = "logishift_demo_session_v2";
export const LEGACY_DEMO_SESSION_STORAGE_KEY = "logishift_demo_session_v1";
export const DEMO_SESSION_VERSION = 2;
export const DEMO_SESSION_TTL_MS = 4 * 60 * 60 * 1000;
export const DEMO_COMMENT_MAX_LENGTH = 1000;

export type DemoWorkflowStatus =
  | "active"
  | "awaiting_odo_start"
  | "awaiting_odo_end"
  | "awaiting_invoice"
  | "finished";

export type DemoPhotoType = "start" | "end" | "invoice";

export interface DemoPhotoMetadata {
  type: DemoPhotoType;
  fileName: string;
  mimeType: string;
  size: number;
  addedAt: string;
}

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
  status: DemoWorkflowStatus;
  odometerRequired: boolean;
  invoiceRequired: boolean;
  comment?: string | null;
  photos: Partial<Record<DemoPhotoType, DemoPhotoMetadata>>;
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
  "id" | "startedAt" | "finishedAt" | "status" | "comment" | "photos"
>;

export const EMPTY_DEMO_SESSION: DemoSessionState = {
  activeShift: null,
  finishedShifts: [],
};

const DEMO_PHOTO_TYPES: DemoPhotoType[] = ["start", "end", "invoice"];
const DEMO_WORKFLOW_STATUSES: DemoWorkflowStatus[] = [
  "active",
  "awaiting_odo_start",
  "awaiting_odo_end",
  "awaiting_invoice",
  "finished",
];

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isIdentifier = (value: unknown): value is number | string =>
  (typeof value === "number" && Number.isFinite(value)) ||
  isNonEmptyString(value);

const isNullableString = (value: unknown): value is string | null | undefined =>
  value == null || typeof value === "string";

const isIsoDate = (value: unknown): value is string =>
  isNonEmptyString(value) && !Number.isNaN(Date.parse(value));

const parsePhotoMetadata = (
  value: unknown,
  expectedType: DemoPhotoType
): DemoPhotoMetadata | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const photo = value as Record<string, unknown>;
  const allowedKeys = ["type", "fileName", "mimeType", "size", "addedAt"];
  const mimeType =
    typeof photo.mimeType === "string" ? photo.mimeType.toLowerCase() : "";
  if (
    Object.keys(photo).some((key) => !allowedKeys.includes(key)) ||
    photo.type !== expectedType ||
    !isNonEmptyString(photo.fileName) ||
    photo.fileName.length > 255 ||
    !ALLOWED_PHOTO_MIME_TYPES.includes(
      mimeType as (typeof ALLOWED_PHOTO_MIME_TYPES)[number]
    ) ||
    typeof photo.size !== "number" ||
    !Number.isFinite(photo.size) ||
    photo.size <= 0 ||
    photo.size > MAX_PHOTO_FILE_BYTES ||
    !isIsoDate(photo.addedAt)
  ) {
    return null;
  }

  return {
    type: expectedType,
    fileName: photo.fileName,
    mimeType,
    size: photo.size,
    addedAt: photo.addedAt,
  };
};

const parsePhotos = (
  value: unknown
): Partial<Record<DemoPhotoType, DemoPhotoMetadata>> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const source = value as Record<string, unknown>;
  if (Object.keys(source).some((key) => !DEMO_PHOTO_TYPES.includes(key as DemoPhotoType))) {
    return null;
  }

  const photos: Partial<Record<DemoPhotoType, DemoPhotoMetadata>> = {};
  for (const type of DEMO_PHOTO_TYPES) {
    if (source[type] === undefined) continue;
    const parsed = parsePhotoMetadata(source[type], type);
    if (!parsed) return null;
    photos[type] = parsed;
  }
  return photos;
};

const parseDemoScenarioShift = (value: unknown): DemoScenarioShift | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const shift = value as Record<string, unknown>;
  const validDriverId =
    shift.driverId === null ||
    (typeof shift.driverId === "number" && Number.isFinite(shift.driverId));
  const photos = parsePhotos(shift.photos);
  const status = String(shift.status) as DemoWorkflowStatus;
  const comment =
    shift.comment === undefined || shift.comment === null
      ? null
      : typeof shift.comment === "string"
      ? shift.comment
      : undefined;

  if (
    !isNonEmptyString(shift.id) ||
    !shift.id.startsWith("demo-shift:") ||
    !validDriverId ||
    !isNonEmptyString(shift.driverName) ||
    !isIdentifier(shift.truckId) ||
    !isNonEmptyString(shift.truckName) ||
    !isNullableString(shift.truckPlate) ||
    !isIdentifier(shift.siteId) ||
    !isNonEmptyString(shift.siteName) ||
    !isNullableString(shift.siteAddress) ||
    !isIsoDate(shift.startedAt) ||
    !isNullableString(shift.finishedAt) ||
    (shift.finishedAt != null && !isIsoDate(shift.finishedAt)) ||
    !DEMO_WORKFLOW_STATUSES.includes(status) ||
    typeof shift.odometerRequired !== "boolean" ||
    typeof shift.invoiceRequired !== "boolean" ||
    comment === undefined ||
    (comment !== null && comment.length > DEMO_COMMENT_MAX_LENGTH) ||
    photos === null ||
    (status === "finished" && !isIsoDate(shift.finishedAt)) ||
    (status !== "finished" && shift.finishedAt != null)
  ) {
    return null;
  }

  return {
    id: shift.id,
    driverId: shift.driverId as number | null,
    driverName: shift.driverName,
    truckId: shift.truckId as number | string,
    truckName: shift.truckName,
    truckPlate: shift.truckPlate as string | null | undefined,
    siteId: shift.siteId as number | string,
    siteName: shift.siteName,
    siteAddress: shift.siteAddress as string | null | undefined,
    startedAt: shift.startedAt,
    finishedAt: (shift.finishedAt as string | null | undefined) ?? null,
    status,
    odometerRequired: shift.odometerRequired,
    invoiceRequired: shift.invoiceRequired,
    comment,
    photos,
  };
};

const parsePersistedDemoSession = (
  value: unknown,
  now: number
): DemoSessionState | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const payload = value as Record<string, unknown>;
  if (
    payload.version !== DEMO_SESSION_VERSION ||
    typeof payload.expiresAt !== "number" ||
    !Number.isFinite(payload.expiresAt) ||
    payload.expiresAt <= now ||
    !Array.isArray(payload.finishedShifts)
  ) {
    return null;
  }

  const activeShift =
    payload.activeShift === null
      ? null
      : parseDemoScenarioShift(payload.activeShift);
  if (
    payload.activeShift !== null &&
    (!activeShift || activeShift.status === "finished")
  ) {
    return null;
  }

  const finishedShifts = payload.finishedShifts.map(parseDemoScenarioShift);
  if (
    finishedShifts.some(
      (shift) => !shift || shift.status !== "finished"
    )
  ) {
    return null;
  }

  return {
    activeShift,
    finishedShifts: finishedShifts as DemoScenarioShift[],
  };
};

export const clearObsoleteDemoActiveShiftKeys = (storage: Storage): void => {
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (
      isDemoActiveShiftStorageKey(key) ||
      key === LEGACY_DEMO_SESSION_STORAGE_KEY
    ) {
      storage.removeItem(key as string);
    }
  }
};

export const clearDemoSessionStorage = (storage: Storage): void => {
  storage.removeItem(DEMO_SESSION_STORAGE_KEY);
  storage.removeItem(LEGACY_DEMO_SESSION_STORAGE_KEY);
};

export const readDemoSession = (
  storage: Storage,
  now: number = Date.now()
): DemoSessionState => {
  const raw = storage.getItem(DEMO_SESSION_STORAGE_KEY);
  if (!raw) return EMPTY_DEMO_SESSION;

  try {
    const parsed = parsePersistedDemoSession(JSON.parse(raw), now);
    if (!parsed) {
      clearDemoSessionStorage(storage);
      return EMPTY_DEMO_SESSION;
    }
    return parsed;
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
    status: input.odometerRequired ? "awaiting_odo_start" : "active",
    comment: null,
    photos: {},
  };
};

const finishShift = (
  shift: DemoScenarioShift,
  now: Date
): DemoScenarioShift => ({
  ...shift,
  status: "finished",
  finishedAt: now.toISOString(),
});

export const requestDemoShiftFinish = (
  shift: DemoScenarioShift,
  now: Date = new Date()
): DemoScenarioShift | null => {
  if (shift.status !== "active") return null;
  if (shift.odometerRequired) {
    return { ...shift, status: "awaiting_odo_end" };
  }
  if (shift.invoiceRequired) {
    return { ...shift, status: "awaiting_invoice" };
  }
  return finishShift(shift, now);
};

export const addDemoPhotoMetadata = (
  shift: DemoScenarioShift,
  photo: DemoPhotoMetadata,
  now: Date = new Date()
): DemoScenarioShift | null => {
  if (shift.status === "finished") {
    const isRequired =
      (photo.type === "start" && shift.odometerRequired) ||
      (photo.type === "end" && shift.odometerRequired) ||
      (photo.type === "invoice" && shift.invoiceRequired);
    return isRequired
      ? { ...shift, photos: { ...shift.photos, [photo.type]: photo } }
      : null;
  }

  const expectedType: DemoPhotoType | null =
    shift.status === "awaiting_odo_start"
      ? "start"
      : shift.status === "awaiting_odo_end"
      ? "end"
      : shift.status === "awaiting_invoice"
      ? "invoice"
      : null;
  if (photo.type !== expectedType) return null;

  const withPhoto = {
    ...shift,
    photos: { ...shift.photos, [photo.type]: photo },
  };
  if (shift.status === "awaiting_odo_start") {
    return { ...withPhoto, status: "active" };
  }
  if (shift.status === "awaiting_odo_end") {
    return shift.invoiceRequired
      ? { ...withPhoto, status: "awaiting_invoice" }
      : finishShift(withPhoto, now);
  }
  return finishShift(withPhoto, now);
};

export const addDemoShiftComment = (
  shift: DemoScenarioShift,
  text: string
): DemoScenarioShift | null => {
  const normalized = text.trim();
  if (!normalized || normalized.length > DEMO_COMMENT_MAX_LENGTH) return null;
  return {
    ...shift,
    comment: shift.comment ? `${shift.comment}\n${normalized}` : normalized,
  };
};

export const replaceDemoShift = (
  state: DemoSessionState,
  shiftId: string,
  update: (shift: DemoScenarioShift) => DemoScenarioShift | null
): { state: DemoSessionState; shift: DemoScenarioShift } | null => {
  if (state.activeShift?.id === shiftId) {
    const shift = update(state.activeShift);
    if (!shift) return null;
    if (shift.status === "finished") {
      return {
        shift,
        state: {
          activeShift: null,
          finishedShifts: [shift, ...state.finishedShifts],
        },
      };
    }
    return { shift, state: { ...state, activeShift: shift } };
  }

  const index = state.finishedShifts.findIndex((shift) => shift.id === shiftId);
  if (index < 0) return null;
  const shift = update(state.finishedShifts[index]);
  if (!shift || shift.status !== "finished") return null;
  const finishedShifts = [...state.finishedShifts];
  finishedShifts[index] = shift;
  return { shift, state: { ...state, finishedShifts } };
};
