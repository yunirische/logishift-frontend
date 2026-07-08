import { describe, expect, it } from "vitest";
import {
  isPublicMarketingAnalyticsPath,
  isYandexMetrikaAllowedContext,
  YANDEX_METRIKA_ID,
} from "../analytics";

describe("analytics config", () => {
  it("uses the production Yandex Metrika counter id", () => {
    expect(YANDEX_METRIKA_ID).toBe(110142109);
  });

  it("allows Metrika only on the marketing landing route", () => {
    expect(isYandexMetrikaAllowedContext("kontrolsmen.ru", "/")).toBe(true);
    expect(isYandexMetrikaAllowedContext("www.kontrolsmen.ru", "/")).toBe(true);
  });

  it("blocks Metrika on app, demo, and api hosts", () => {
    expect(isYandexMetrikaAllowedContext("app.kontrolsmen.ru", "/")).toBe(false);
    expect(isYandexMetrikaAllowedContext("demo.kontrolsmen.ru", "/")).toBe(false);
    expect(isYandexMetrikaAllowedContext("api.kontrolsmen.ru", "/")).toBe(false);
  });

  it("blocks Metrika on app, auth, owner, payment, and legal routes", () => {
    [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/owner",
      "/dashboard",
      "/billing",
      "/payment/success",
      "/payment/cancel",
      "/privacy",
      "/offer",
      "/contacts",
      "/personal-data-consent",
      "/payment-and-refund",
    ].forEach((pathname) => {
      expect(isPublicMarketingAnalyticsPath(pathname)).toBe(false);
      expect(isYandexMetrikaAllowedContext("kontrolsmen.ru", pathname)).toBe(
        false
      );
    });
  });
});
