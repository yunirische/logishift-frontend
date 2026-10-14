import { createBillingCheckout, getTenantBilling } from "../api";

afterEach(() => vi.unstubAllGlobals());

it("preserves the server renewal/change policy without deriving it from stored plan", async () => {
  const checkout_plans = {
    start: { allowed: true, action: "renew", denial_code: null, available_after: null },
    business: { allowed: false, action: "blocked", denial_code: "PAID_PLAN_CHANGE_NOT_ALLOWED", available_after: "2026-11-14T00:00:00Z" },
  };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true, status: 200, headers: new Headers({ "Content-Type": "application/json" }),
    json: async () => ({ current_plan: { code: "company" }, checkout_plans }),
  }));
  expect((await getTenantBilling()).checkout_plans).toEqual(checkout_plans);
});

it.each([undefined, null, { start: { allowed: "true", action: "renew" } }])("missing/malformed policy %s never becomes permission", async wire => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true, status: 200, headers: new Headers({ "Content-Type": "application/json" }),
    json: async () => ({ checkout_plans: wire }),
  }));
  expect((await getTenantBilling()).checkout_plans?.start).toBeUndefined();
});

it("keeps machine-readable checkout denial through HTTP error handling", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: false, status: 409, headers: new Headers({ "Content-Type": "application/json" }),
    json: async () => ({ error: "Plan change denied", code: "PAID_PLAN_CHANGE_NOT_ALLOWED" }),
  }));
  await expect(createBillingCheckout("business")).rejects.toMatchObject({ status: 409, backendCode: "PAID_PLAN_CHANGE_NOT_ALLOWED" });
});
