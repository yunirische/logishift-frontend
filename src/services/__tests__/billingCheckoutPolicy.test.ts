import { createBillingCheckout, getTenantBilling, USER_KEY } from "../api";

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem(USER_KEY, JSON.stringify({ id: 7, tenant_id: 42, role: "admin" }));
});

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

const response = (status: string) => ({ ok: true, status: 200, headers: new Headers({ "Content-Type": "application/json" }),
  json: async () => ({ payment_id: 100, status, confirmation_url: status === "pending" ? "https://example.test/confirm" : null }) });

it("coalesces double click into one HTTP request", async () => {
  let finish!: (value: any) => void;
  const fetch = vi.fn().mockReturnValue(new Promise(resolve => { finish = resolve; }));vi.stubGlobal("fetch", fetch);
  const first = createBillingCheckout("start"), second = createBillingCheckout("start");
  expect(fetch).toHaveBeenCalledTimes(1);finish(response("pending"));
  expect(await first).toEqual(await second);
});

it("network loss and a later attempt retain the same persisted checkout intent", async () => {
  const fetch = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValue(response("pending"));vi.stubGlobal("fetch", fetch);
  await expect(createBillingCheckout("start")).rejects.toThrow();await createBillingCheckout("start");
  const bodies = fetch.mock.calls.map(([, init]) => JSON.parse(init.body));
  expect(bodies[0].checkoutIntentId).toBe(bodies[1].checkoutIntentId);
  expect(bodies[0]).toEqual({ planCode: "start", checkoutIntentId: expect.any(String) });
});

it.each(["succeeded", "canceled", "failed"])("an acknowledged terminal %s permits a new explicit intent", async status => {
  const fetch = vi.fn().mockResolvedValue(response(status));vi.stubGlobal("fetch", fetch);
  await createBillingCheckout("start");await createBillingCheckout("start");
  expect(JSON.parse(fetch.mock.calls[0][1].body).checkoutIntentId).not.toBe(JSON.parse(fetch.mock.calls[1][1].body).checkoutIntentId);
});

it("review/ambiguous errors keep the same intent; storage failure sends no checkout", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok:false,status:409,headers:new Headers({"Content-Type":"application/json"}),json:async()=>({error:"review",code:"CHECKOUT_REVIEW_REQUIRED"}) });
  vi.stubGlobal("fetch",fetch);
  await expect(createBillingCheckout("start")).rejects.toThrow();await expect(createBillingCheckout("start")).rejects.toThrow();
  expect(JSON.parse(fetch.mock.calls[0][1].body).checkoutIntentId).toBe(JSON.parse(fetch.mock.calls[1][1].body).checkoutIntentId);
  vi.stubGlobal("sessionStorage",{getItem(){throw new Error("storage unavailable");}});
  await expect(createBillingCheckout("business")).rejects.toThrow(/хранилища/);expect(fetch).toHaveBeenCalledTimes(2);
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
