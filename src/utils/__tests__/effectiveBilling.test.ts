import { TenantBillingSummary } from "../../types";
import { entitlementSourceLabel, resolveEffectiveBillingDisplay } from "../effectiveBilling";

const plan = (code: string, name = code) => ({
  id: 1,
  code,
  name,
  limit_machines: 2,
  limit_drivers: 2,
  limit_sites: 2,
});

const billing = (overrides: Partial<TenantBillingSummary> = {}): TenantBillingSummary => ({
  current_plan: { ...plan("business", "Бизнес"), price_monthly: 1990 },
  subscription_expires_at: "2026-08-20T00:00:00.000Z",
  last_payment: null,
  ...overrides,
});

describe("effective billing display", () => {
  it.each([
    ["free", "Бесплатный"],
    ["paid", "Оплаченный"],
    ["pilot", "Пилотный"],
    ["individual", "Индивидуальный"],
    ["internal_demo", "Внутренний"],
  ] as const)("maps %s source safely", (source, label) => {
    expect(entitlementSourceLabel(source)).toBe(label);
  });

  it("uses Free effective plan and no expiry after paid expiry", () => {
    const result = resolveEffectiveBillingDisplay(billing({
      effective_plan: plan("free", "Бесплатный"),
      entitlement: { source: "free", status: "active", starts_at: null, expires_at: null },
    }));

    expect(result.plan?.code).toBe("free");
    expect(result.source).toBe("free");
    expect(result.expiresAt).toBeNull();
  });

  it("uses active paid expiry supplied by backend", () => {
    const result = resolveEffectiveBillingDisplay(billing({
      effective_plan: plan("business", "Бизнес"),
      entitlement: { source: "paid", status: "active", starts_at: null, expires_at: "2026-08-20T00:00:00.000Z" },
    }));

    expect(result.source).toBe("paid");
    expect(result.expiresAt).toBe("2026-08-20T00:00:00.000Z");
  });

  it("uses active Pilot supplied by backend", () => {
    const result = resolveEffectiveBillingDisplay(billing({
      effective_plan: plan("start", "Старт"),
      entitlement: { source: "pilot", status: "active", starts_at: "2026-07-20T00:00:00.000Z", expires_at: "2026-08-20T00:00:00.000Z" },
    }));

    expect(result.plan?.code).toBe("start");
    expect(result.source).toBe("pilot");
  });

  it("does not override backend paid-over-Pilot decision", () => {
    const result = resolveEffectiveBillingDisplay(billing({
      effective_plan: plan("business", "Бизнес"),
      entitlement: { source: "paid", status: "active", starts_at: null, expires_at: "2026-09-20T00:00:00.000Z" },
    }));

    expect(result.plan?.code).toBe("business");
    expect(result.source).toBe("paid");
  });

  it.each(["individual", "internal_demo"] as const)("does not invent expiry for %s", (source) => {
    const result = resolveEffectiveBillingDisplay(billing({
      effective_plan: plan(source, source),
      entitlement: { source, status: "active", starts_at: null, expires_at: null },
    }));

    expect(result.expiresAt).toBeNull();
  });

  it("keeps usage and over-limit flags from backend", () => {
    const result = resolveEffectiveBillingDisplay(billing({
      usage: {
        drivers: { current: 3, limit: 2, over_limit: true },
        trucks: { current: 1, limit: 2, over_limit: false },
        sites: { current: 2, limit: -1, over_limit: false },
      },
    }));

    expect(result.usage?.drivers).toEqual({ current: 3, limit: 2, over_limit: true });
    expect(result.usage?.sites.limit).toBe(-1);
  });

  it("falls back to legacy current plan without claiming an effective source", () => {
    const result = resolveEffectiveBillingDisplay(billing());

    expect(result.plan?.code).toBe("business");
    expect(result.source).toBeNull();
    expect(result.expiresAt).toBe("2026-08-20T00:00:00.000Z");
    expect(result.isLegacy).toBe(true);
  });
});
