import { normalizeInviteCode } from "./registerInvite";

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

export const extractInviteCode = (value?: string | null): string => {
  if (!value) {
    return "";
  }

  const raw = value.trim();
  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(raw, "https://placeholder.local");
    const queryCode = normalizeInviteCode(parsed.searchParams.get("code"));
    if (queryCode) {
      return queryCode;
    }

    const inviteMatch = parsed.pathname.match(/\/invite\/([^/?#]+)/i);
    if (inviteMatch) {
      return normalizeInviteCode(inviteMatch[1]);
    }
  } catch {
    // ignore and continue with plain-string parsing
  }

  const inviteMatch = raw.match(/\/invite\/([^/?#]+)/i);
  if (inviteMatch) {
    return normalizeInviteCode(inviteMatch[1]);
  }

  return normalizeInviteCode(raw);
};

export const buildRegistrationLink = ({
  origin,
  registrationLink,
  inviteCode,
}: {
  origin: string;
  registrationLink?: string | null;
  inviteCode?: string | null;
}): string => {
  const originBase = trimTrailingSlash(origin);
  const normalizedCode = extractInviteCode(registrationLink || inviteCode);

  if (!normalizedCode) {
    return "";
  }

  if (registrationLink) {
    try {
      const parsed = new URL(registrationLink, originBase);
      parsed.pathname = "/register";
      parsed.search = `?code=${encodeURIComponent(normalizedCode)}`;
      parsed.hash = "";
      return parsed.toString();
    } catch {
      // fall through to origin-based construction
    }
  }

  return `${originBase}/register?code=${encodeURIComponent(normalizedCode)}`;
};
