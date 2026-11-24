const KEY = "logishift_first_truck_draft";

export const FIRST_TRUCK_ENTRY = "/register?try=fleet";

export interface FirstTruckDraft {
  name: string;
  registrationOpen?: boolean;
  tenantId?: number;
}

export function readFirstTruckDraft(): FirstTruckDraft | null {
  try {
    const draft = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    return typeof draft?.name === "string" ? draft : null;
  } catch {
    return null;
  }
}

export function writeFirstTruckDraft(draft: FirstTruckDraft | null): void {
  try {
    if (draft) sessionStorage.setItem(KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(KEY);
  } catch {
    // The current form remains usable when browser storage is unavailable.
  }
}
