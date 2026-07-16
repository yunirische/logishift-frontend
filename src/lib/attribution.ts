export const ATTRIBUTION_PARAM_NAMES = [
  "yclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type AttributionParamName = (typeof ATTRIBUTION_PARAM_NAMES)[number];
export type Attribution = Partial<Record<AttributionParamName, string>>;

export const ATTRIBUTION_VALUE_MAX_LENGTH = 256;

const hasControlCharacters = (value: string) => /[\x00-\x1f\x7f]/.test(value);

export const normalizeAttributionValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;

  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > ATTRIBUTION_VALUE_MAX_LENGTH ||
    hasControlCharacters(normalized)
  ) {
    return undefined;
  }

  return normalized;
};

export const readAttribution = (search: string): Attribution => {
  const params = new URLSearchParams(search);
  const attribution: Attribution = {};

  for (const name of ATTRIBUTION_PARAM_NAMES) {
    const value = normalizeAttributionValue(params.get(name));
    if (value) attribution[name] = value;
  }

  return attribution;
};

export const addAttributionToUrl = (
  destination: string,
  attribution: Attribution
): string => {
  const url = new URL(destination, window.location.origin);

  for (const name of ATTRIBUTION_PARAM_NAMES) {
    url.searchParams.delete(name);
    const value = normalizeAttributionValue(attribution[name]);
    if (value) url.searchParams.set(name, value);
  }

  return url.toString();
};

export const getAttributionNavigationUrl = (
  destination: string,
  search: string = window.location.search
): string => addAttributionToUrl(destination, readAttribution(search));

export const clearAttributionFromCurrentUrl = (): void => {
  const url = new URL(window.location.href);
  for (const name of ATTRIBUTION_PARAM_NAMES) {
    url.searchParams.delete(name);
  }
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
};
