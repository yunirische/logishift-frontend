import { recordDemoFunnelEvent, recordPublicFunnelEvent, TOKEN_KEY } from "../api";

describe("attribution transport privacy and auth isolation", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    localStorage.clear(); localStorage.setItem(TOKEN_KEY, "fixture-auth-value");
    fetchMock.mockReset().mockResolvedValue({ ok: true, headers: new Headers(), text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sends only measurement fields without an auth header, cookies or referrer for pre-auth events", async () => {
    await recordPublicFunnelEvent("landing_viewed", "a".repeat(43), {
      utm_source: "vk", utm_campaign: "any-campaign", utm_content: "creative_02", yclid: "fixture-click",
    }, true);
    const options = fetchMock.mock.calls[0][1];
    expect(Object.keys(JSON.parse(options.body)).sort()).toEqual(["attribution", "demoSessionKey", "eventType", "isInternal"]);
    expect(new Headers(options.headers).has("Authorization")).toBe(false);
    expect(options).toEqual(expect.objectContaining({ credentials: "omit", referrerPolicy: "no-referrer", keepalive: true }));
    expect(options.body).not.toMatch(/email|userId|user_agent|ip_address|fixture-auth-value/);
  });

  it("keeps authenticated demo observation on its existing endpoint and carries only analytics internal metadata", async () => {
    await recordDemoFunnelEvent("demo_shift_started", "a".repeat(43), {}, { isInternal: true });
    expect(fetchMock.mock.calls[0][0]).toContain("/attribution/demo-funnel");
    expect(new Headers(fetchMock.mock.calls[0][1].headers).has("Authorization")).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).isInternal).toBe(true);
  });

  it("cannot clear or replace authentication when public measurement fails", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(recordPublicFunnelEvent("registration_viewed", "a".repeat(43), {})).rejects.toThrow("Attribution unavailable");
    expect(localStorage.getItem(TOKEN_KEY)).toBe("fixture-auth-value");
  });
});
