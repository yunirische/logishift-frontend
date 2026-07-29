import {
  DEMO_REGISTRATION_HANDOFF_STORAGE_KEY,
  DEMO_REGISTRATION_HANDOFF_TTL_MS,
  captureDemoRegistrationHandoff,
  getDemoRegistrationUrl,
  readDemoRegistrationHandoff,
} from "../demoRegistrationHandoff";

describe("demo registration attribution handoff", () => {
  const now = Date.parse("2026-07-27T12:00:00.000Z");

  beforeEach(() => {
    localStorage.clear();
  });

  it("captures all six normalized allowlisted fields for an explicit entry", () => {
    const handoff = captureDemoRegistrationHandoff({
      explicitEntry: true,
      search:
        "?enterDemo=1&yclid=click&utm_source=yandex&utm_medium=cpc&utm_campaign=demo&utm_content=guide&utm_term=shift",
      now,
    });

    expect(handoff).toEqual({
      version: 1,
      expiresAt: now + DEMO_REGISTRATION_HANDOFF_TTL_MS,
      attribution: {
        yclid: "click",
        utm_source: "yandex",
        utm_medium: "cpc",
        utm_campaign: "demo",
        utm_content: "guide",
        utm_term: "shift",
      },
    });
  });

  it("retains valid partial attribution and ignores invalid or unsupported values", () => {
    const handoff = captureDemoRegistrationHandoff({
      explicitEntry: true,
      search: `?utm_source=yandex&utm_medium=bad%0Avalue&utm_campaign=${"x".repeat(
        257
      )}&email=private@example.test&registration_source=other`,
      now,
    });

    expect(handoff?.attribution).toEqual({ utm_source: "yandex" });
  });

  it("replaces a previous explicit handoff and clears it on an unattributed explicit entry", () => {
    captureDemoRegistrationHandoff({
      explicitEntry: true,
      search: "?utm_source=old",
      now,
    });
    captureDemoRegistrationHandoff({
      explicitEntry: true,
      search: "?utm_source=new",
      now: now + 1,
    });

    expect(readDemoRegistrationHandoff(localStorage, now + 1)?.attribution).toEqual(
      { utm_source: "new" }
    );

    expect(
      captureDemoRegistrationHandoff({
        explicitEntry: true,
        search: "?enterDemo=1",
        now: now + 2,
      })
    ).toBeNull();
    expect(localStorage.getItem(DEMO_REGISTRATION_HANDOFF_STORAGE_KEY)).toBeNull();
  });

  it("preserves an unexpired handoff on non-explicit navigation", () => {
    const captured = captureDemoRegistrationHandoff({
      explicitEntry: true,
      search: "?utm_source=yandex",
      now,
    });

    expect(
      captureDemoRegistrationHandoff({
        explicitEntry: false,
        search: "",
        now: now + 60_000,
      })
    ).toEqual(captured);
  });

  it("clears expired, corrupt, wrong-version, and structurally unsafe payloads", () => {
    const invalidPayloads = [
      "{",
      JSON.stringify({ version: 2, expiresAt: now + 10, attribution: { utm_source: "x" } }),
      JSON.stringify({
        version: 1,
        expiresAt: now - 1,
        attribution: { utm_source: "x" },
      }),
      JSON.stringify({
        version: 1,
        expiresAt: now + 10,
        attribution: { utm_source: "x", token: "forbidden" },
      }),
      JSON.stringify({
        version: 1,
        expiresAt: now + 10,
        attribution: { utm_source: "x" },
        user: {},
      }),
    ];

    invalidPayloads.forEach((payload) => {
      localStorage.setItem(DEMO_REGISTRATION_HANDOFF_STORAGE_KEY, payload);
      expect(readDemoRegistrationHandoff(localStorage, now)).toBeNull();
      expect(
        localStorage.getItem(DEMO_REGISTRATION_HANDOFF_STORAGE_KEY)
      ).toBeNull();
    });
  });

  it("persists only version, expiry, and normalized attribution", () => {
    captureDemoRegistrationHandoff({
      explicitEntry: true,
      search:
        "?utm_source=yandex&token=secret&shift=demo-shift%3A1&driver=Alex&photo=data",
      now,
    });

    const raw = localStorage.getItem(DEMO_REGISTRATION_HANDOFF_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const payload = JSON.parse(raw as string);

    expect(Object.keys(payload).sort()).toEqual([
      "attribution",
      "expiresAt",
      "version",
    ]);
    expect(payload.attribution).toEqual({ utm_source: "yandex" });
    expect(raw).not.toMatch(/token|demo-shift|driver|photo|comment|email/i);
  });

  it("builds the absolute app registration URL with marker and valid attribution", () => {
    captureDemoRegistrationHandoff({
      explicitEntry: true,
      search:
        "?yclid=click&utm_source=yandex&utm_medium=cpc&utm_campaign=demo&utm_content=guide&utm_term=shift",
      now,
    });

    const url = new URL(getDemoRegistrationUrl(localStorage, now + 1));

    expect(`${url.origin}${url.pathname}`).toBe(
      "https://app.kontrolsmen.ru/register"
    );
    expect(url.searchParams.get("registration_source")).toBe("demo");
    expect(url.searchParams.get("yclid")).toBe("click");
    expect(url.searchParams.get("utm_source")).toBe("yandex");
    expect(url.searchParams.get("utm_medium")).toBe("cpc");
    expect(url.searchParams.get("utm_campaign")).toBe("demo");
    expect(url.searchParams.get("utm_content")).toBe("guide");
    expect(url.searchParams.get("utm_term")).toBe("shift");
    expect(url.searchParams.get("enterDemo")).toBeNull();
    expect(url.searchParams.get("token")).toBeNull();
    expect([...url.searchParams.keys()].filter((key) => key === "utm_source")).toHaveLength(1);
  });

  it("omits expired attribution but retains the demo registration marker", () => {
    captureDemoRegistrationHandoff({
      explicitEntry: true,
      search: "?utm_source=yandex",
      now,
    });

    const url = new URL(
      getDemoRegistrationUrl(localStorage, now + DEMO_REGISTRATION_HANDOFF_TTL_MS)
    );

    expect(`${url.origin}${url.pathname}${url.search}`).toBe(
      "https://app.kontrolsmen.ru/register?registration_source=demo"
    );
    expect(url.hash).toMatch(/^#demo_session=[A-Za-z0-9_-]{43}$/);
  });
});
