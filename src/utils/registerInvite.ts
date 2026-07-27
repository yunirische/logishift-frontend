import {
  DEMO_REGISTRATION_SOURCE_PARAM,
  DEMO_REGISTRATION_SOURCE_VALUE,
} from "../lib/demoRegistrationHandoff";

export type RegisterMode = "driver" | "admin";

export const normalizeInviteCode = (value?: string | null): string =>
  (value || "")
    .trim()
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toUpperCase();

export const getRegisterContextFromSearch = (
  search: string
): {
  initialMode: RegisterMode;
  inviteCode: string;
  isDemoSource: boolean;
} => {
  const params = new URLSearchParams(search);
  const inviteCode = normalizeInviteCode(params.get("code"));

  return {
    initialMode: inviteCode ? "driver" : "admin",
    inviteCode,
    isDemoSource:
      !inviteCode &&
      params.get(DEMO_REGISTRATION_SOURCE_PARAM) ===
        DEMO_REGISTRATION_SOURCE_VALUE,
  };
};
