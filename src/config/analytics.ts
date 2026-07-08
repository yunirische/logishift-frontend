import { isMarketingHostname } from "./demo";

export const ANALYTICS_CONSENT_STORAGE_KEY = "logishift.analytics-consent.v1";
export const ANALYTICS_CONSENT_ACCEPTED = "accepted";
export const ANALYTICS_CONSENT_REJECTED = "rejected";
export const ANALYTICS_CONSENT_OPEN_EVENT = "logishift:analytics-consent-open";
export const YANDEX_METRIKA_ID = 110142109;

export type AnalyticsConsentChoice =
  | typeof ANALYTICS_CONSENT_ACCEPTED
  | typeof ANALYTICS_CONSENT_REJECTED;

export const PUBLIC_MARKETING_ANALYTICS_PATHS = new Set(["/"]);

export const isPublicMarketingAnalyticsPath = (pathname: string): boolean =>
  PUBLIC_MARKETING_ANALYTICS_PATHS.has(pathname);

export const isYandexMetrikaAllowedContext = (
  hostname: string,
  pathname: string
): boolean =>
  isMarketingHostname(hostname) && isPublicMarketingAnalyticsPath(pathname);
