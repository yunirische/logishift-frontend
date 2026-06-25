import { isMarketingHostname } from "./demo";

export const ANALYTICS_CONSENT_STORAGE_KEY = "logishift.analytics-consent.v1";
export const ANALYTICS_CONSENT_ACCEPTED = "accepted";
export const ANALYTICS_CONSENT_REJECTED = "rejected";
export const ANALYTICS_CONSENT_OPEN_EVENT = "logishift:analytics-consent-open";

export type AnalyticsConsentChoice =
  | typeof ANALYTICS_CONSENT_ACCEPTED
  | typeof ANALYTICS_CONSENT_REJECTED;

export const PUBLIC_MARKETING_ANALYTICS_PATHS = new Set([
  "/",
  "/offer",
  "/privacy",
  "/personal-data-consent",
  "/payment-and-refund",
  "/contacts",
]);

const rawYandexMetrikaId = import.meta.env.VITE_YANDEX_METRIKA_ID || "";
const parsedYandexMetrikaId = Number(rawYandexMetrikaId);

export const YANDEX_METRIKA_ID =
  Number.isInteger(parsedYandexMetrikaId) && parsedYandexMetrikaId > 0
    ? parsedYandexMetrikaId
    : null;

export const isPublicMarketingAnalyticsPath = (pathname: string): boolean =>
  PUBLIC_MARKETING_ANALYTICS_PATHS.has(pathname);

export const isYandexMetrikaAllowedContext = (
  hostname: string,
  pathname: string
): boolean =>
  YANDEX_METRIKA_ID !== null &&
  isMarketingHostname(hostname) &&
  isPublicMarketingAnalyticsPath(pathname);
