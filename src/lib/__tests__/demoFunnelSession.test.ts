import {
  DEMO_FUNNEL_SESSION_STORAGE_KEY,
  DEMO_FUNNEL_SESSION_TTL_MS,
  addDemoSessionFragment,
  consumeDemoSessionKeyFromFragment,
  getOrCreateDemoFunnelSession,
  readDemoFunnelSession,
} from "../demoFunnelSession";

describe("demo funnel browser-local session", () => {
  beforeEach(() => localStorage.clear());

  it("rotates on explicit entry and survives reload/navigation within TTL", () => {
    const now = 1_000;
    const first = getOrCreateDemoFunnelSession({
      explicitEntry: true,
      storage: localStorage,
      now,
    });
    const reload = getOrCreateDemoFunnelSession({
      explicitEntry: false,
      storage: localStorage,
      now: now + 10,
    });
    const nextEntry = getOrCreateDemoFunnelSession({
      explicitEntry: true,
      storage: localStorage,
      now: now + 20,
    });

    expect(first?.key).toHaveLength(43);
    expect(reload).toEqual(first);
    expect(nextEntry?.key).not.toBe(first?.key);
    expect(nextEntry?.expiresAt).toBe(now + 20 + DEMO_FUNNEL_SESSION_TTL_MS);
  });

  it("replaces expired, malformed and incompatible state without leaking fields", () => {
    localStorage.setItem(DEMO_FUNNEL_SESSION_STORAGE_KEY, "{broken");
    const malformedReplacement = getOrCreateDemoFunnelSession({
      explicitEntry: false,
      storage: localStorage,
      now: 2_000,
    });
    expect(malformedReplacement?.key).toHaveLength(43);

    localStorage.setItem(
      DEMO_FUNNEL_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        expiresAt: 1_999,
        key: "a".repeat(43),
      })
    );
    const expiredReplacement = getOrCreateDemoFunnelSession({
      explicitEntry: false,
      storage: localStorage,
      now: 2_000,
    });
    expect(expiredReplacement?.key).not.toBe("a".repeat(43));

    localStorage.setItem(
      DEMO_FUNNEL_SESSION_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        expiresAt: 9_999,
        key: "b".repeat(43),
        comment: "forbidden",
      })
    );
    expect(readDemoFunnelSession(localStorage, 2_000)).toBeNull();
  });

  it("passes the opaque key only in a URL fragment and survives one StrictMode replay", async () => {
    const sessionKey = "c".repeat(43);
    const destination = addDemoSessionFragment(
      "https://app.kontrolsmen.ru/register?registration_source=demo&utm_source=yandex",
      sessionKey
    );
    const url = new URL(destination);
    expect(url.searchParams.has("demo_session")).toBe(false);
    expect(url.hash).toBe(`#demo_session=${sessionKey}`);

    const replacements: string[] = [];
    expect(
      consumeDemoSessionKeyFromFragment(destination, (nextUrl) =>
        replacements.push(nextUrl)
      )
    ).toBe(sessionKey);
    expect(replacements).toEqual([
      "/register?registration_source=demo&utm_source=yandex",
    ]);
    expect(
      consumeDemoSessionKeyFromFragment(
        "https://app.kontrolsmen.ru/register?registration_source=demo&utm_source=yandex",
        vi.fn()
      )
    ).toBe(sessionKey);
    await Promise.resolve();
    expect(
      consumeDemoSessionKeyFromFragment(
        "https://app.kontrolsmen.ru/register?registration_source=demo&utm_source=yandex",
        vi.fn()
      )
    ).toBeNull();
  });
});
