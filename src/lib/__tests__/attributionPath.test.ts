import { getAttributionSessionNavigationUrl, getDemoRegistrationUrl, prepareAttributionSession,
  readDemoRegistrationHandoff } from "../demoRegistrationHandoff";
import { DEMO_FUNNEL_SESSION_TTL_MS, getOrCreateDemoFunnelSession,
  initializeDemoFunnelSession, readDemoFunnelSession } from "../demoFunnelSession";

const storageForOrigin = (): Storage => {
  const values = new Map<string, string>();
  return { get length() { return values.size; }, clear: () => values.clear(),
    getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); },
    removeItem: key => { values.delete(key); }, key: index => [...values.keys()][index] ?? null };
};
const now = Date.parse("2026-10-19T10:00:00Z");
const utm = "yclid=test-click&utm_source=vk&utm_medium=cpc&utm_campaign=core_active_30d&utm_content=creative_02&utm_term=shift";
const metadata = { yclid: "test-click", utm_source: "vk", utm_medium: "cpc",
  utm_campaign: "core_active_30d", utm_content: "creative_02", utm_term: "shift" };

describe("cross-host attribution acceptance", () => {
  it.each([false, true])("preserves apex -> demo -> register session, expiry, UTM and internal=%s", internal => {
    const apex = storageForOrigin(), demo = storageForOrigin(), app = storageForOrigin();
    let landingHref = `https://kontrolsmen.ru/?${utm}&email=discarded#pricing${internal ? "&measurement_internal=1" : ""}`;
    const source = prepareAttributionSession({ storage: apex, href: landingHref, now,
      replace: next => { landingHref = new URL(next, landingHref).href; } });
    expect(source?.isInternal).toBe(internal);
    const destination = getAttributionSessionNavigationUrl("https://demo.kontrolsmen.ru/?enterDemo=1", {
      storage: apex, href: landingHref, now: now + 1000, replace: vi.fn(),
    });
    expect(new URL(destination).searchParams.get("enterDemo")).toBe("1");
    expect(new URL(destination).searchParams.has("email")).toBe(false);
    expect(new URL(destination).searchParams.has("demo_session")).toBe(false);
    let demoHref = destination;
    const received = prepareAttributionSession({ storage: demo, href: demoHref, explicitEntry: true,
      now: now + 2000, replace: next => { demoHref = new URL(next, demoHref).href; } });
    expect(received).toEqual(source);
    expect(new URL(demoHref).hash).toBe("");
    expect(readDemoRegistrationHandoff(demo, now + 2000)?.attribution).toEqual(metadata);
    expect(prepareAttributionSession({ storage: demo, href: demoHref, explicitEntry: true,
      now: now + 3000 })).toEqual(source); // StrictMode/provider replay cannot rotate an adopted key.
    const registration = getDemoRegistrationUrl(demo, now + 4000);
    expect(new URL(registration).searchParams.get("registration_source")).toBe("demo");
    const registeredView = prepareAttributionSession({ storage: app, href: registration, now: now + 5000,
      replace: vi.fn() });
    expect(registeredView).toEqual(source);
    expect(readDemoRegistrationHandoff(app, now + 5000)?.attribution).toEqual(metadata);
    expect(readDemoRegistrationHandoff(app, now + 5000)?.expiresAt).toBe(source?.expiresAt);
  });

  it("preserves apex -> register continuity and ordinary anchors on reception and refresh", () => {
    const apex = storageForOrigin(), app = storageForOrigin();
    const sourceHref = `https://kontrolsmen.ru/?${utm}`;
    const source = prepareAttributionSession({ storage: apex, href: sourceHref, now });
    let destination = getAttributionSessionNavigationUrl("https://app.kontrolsmen.ru/register#offer", {
      storage: apex, href: sourceHref, now: now + 1000,
    });
    const received = prepareAttributionSession({ storage: app, href: destination, now: now + 2000,
      replace: next => { destination = new URL(next, destination).href; } });
    expect(received).toEqual(source);
    expect(new URL(destination).hash).toBe("#offer");
    expect(new URL(destination).pathname).toBe("/register");
    expect(prepareAttributionSession({ storage: app, href: destination, now: now + 3000 })).toEqual(source);
    expect(received?.isInternal).toBe(false);
  });

  it("only an explicit marker starts internal measurement and explicit 0 starts a fresh unmarked session", () => {
    const storage = storageForOrigin();
    const ordinary = prepareAttributionSession({ storage, href: "https://kontrolsmen.ru/", now });
    const marked = prepareAttributionSession({ storage, href: "https://kontrolsmen.ru/#measurement_internal=1",
      now: now + 1, replace: vi.fn() });
    expect(marked?.key).not.toBe(ordinary?.key);
    expect(marked?.isInternal).toBe(true);
    expect(prepareAttributionSession({ storage, href: "https://kontrolsmen.ru/", now: now + 2 })).toEqual(marked);
    const unmarked = prepareAttributionSession({ storage, href: "https://kontrolsmen.ru/#measurement_internal=0",
      now: now + 3, replace: vi.fn() });
    expect(unmarked?.key).not.toBe(marked?.key);
    expect(unmarked?.isInternal).toBe(false);
    expect(readDemoFunnelSession(storage, now + 3)?.isInternal).toBe(false);
  });

  it.each([
    `demo_session=short&demo_session_expires=${now + 1000}&measurement_internal=1`,
    `demo_session=${"a".repeat(43)}&demo_session_expires=${now - 1}&measurement_internal=1`,
    `demo_session=${"a".repeat(43)}&demo_session_expires=${now + DEMO_FUNNEL_SESSION_TTL_MS + 1}&measurement_internal=1`,
    `demo_session=${"a".repeat(43)}&demo_session_expires=NaN&measurement_internal=1`,
    `demo_session=${"a".repeat(43)}`,
    `demo_session=${"a".repeat(43)}&demo_session_expires=${now + 1000}&measurement_internal=true`,
    `demo_session=${"a".repeat(43)}&demo_session=${"b".repeat(43)}&demo_session_expires=${now + 1000}&measurement_internal=1`,
  ])("strips but rejects unsafe/expired handoff %s without restoring internal metadata", fragment => {
    const storage = storageForOrigin();
    const old = getOrCreateDemoFunnelSession({ storage, explicitEntry: true, now, isInternal: true });
    const replace = vi.fn();
    const result = initializeDemoFunnelSession({ storage, href: `https://app.kontrolsmen.ru/register?code=ABC#offer&${fragment}`,
      now, replace });
    expect(replace).toHaveBeenCalledExactlyOnceWith("/register?code=ABC#offer");
    expect(result?.key).not.toBe(old?.key);
    expect(result?.key).not.toBe("a".repeat(43));
    expect(result?.isInternal).toBe(false);
  });

  it("does not rewrite ordinary routes/anchors and safely skips tracking when storage is unavailable", () => {
    const replace = vi.fn();
    const href = `https://kontrolsmen.ru/?${utm}#pricing%2Ffree`;
    expect(prepareAttributionSession({ storage: null, href, now, replace })).toBeNull();
    const destination = new URL(getAttributionSessionNavigationUrl("https://app.kontrolsmen.ru/register", {
      storage: null, href, now, replace,
    }));
    expect(destination.hash).toBe("");
    expect(destination.searchParams.get("yclid")).toBe("test-click");
    expect(replace).not.toHaveBeenCalled();
  });
});
