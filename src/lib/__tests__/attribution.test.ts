import {
  ATTRIBUTION_PARAM_NAMES,
  addAttributionToUrl,
  clearAttributionFromCurrentUrl,
  getAttributionNavigationUrl,
  readAttribution,
} from "../attribution";

describe("first-party attribution URL utility", () => {
  it("reads only the six allowed parameters", () => {
    const search =
      "?yclid=123&utm_source=yandex&utm_medium=cpc&utm_campaign=summer&utm_content=creative&utm_term=shift&email=private@example.test&unknown=value";

    expect(readAttribution(search)).toEqual({
      yclid: "123",
      utm_source: "yandex",
      utm_medium: "cpc",
      utm_campaign: "summer",
      utm_content: "creative",
      utm_term: "shift",
    });
  });

  it("drops empty, control-character, and overlong values", () => {
    const search = `?utm_source=%20%20&utm_medium=ok%0Avalue&utm_campaign=${"x".repeat(257)}`;
    expect(readAttribution(search)).toEqual({});
  });

  it("encodes values and preserves technical destination parameters", () => {
    const url = addAttributionToUrl("https://demo.kontrolsmen.ru/?enterDemo=1", {
      utm_source: "yandex direct",
      utm_term: "truck & shift",
    });
    const parsed = new URL(url);

    expect(parsed.searchParams.get("enterDemo")).toBe("1");
    expect(parsed.searchParams.get("utm_source")).toBe("yandex direct");
    expect(parsed.searchParams.get("utm_term")).toBe("truck & shift");
    expect(url).toContain("utm_source=yandex+direct");
    expect(url).toContain("utm_term=truck+%26+shift");
  });

  it("propagates landing attribution to demo, login, and registration destinations", () => {
    const source = "?yclid=abc&utm_source=yandex&utm_campaign=launch&unknown=discard";
    const destinations = [
      "https://demo.kontrolsmen.ru/?enterDemo=1",
      "https://app.kontrolsmen.ru/login",
      "https://app.kontrolsmen.ru/register",
    ];

    destinations.forEach((destination) => {
      const parsed = new URL(getAttributionNavigationUrl(destination, source));
      expect(parsed.searchParams.get("yclid")).toBe("abc");
      expect(parsed.searchParams.get("utm_source")).toBe("yandex");
      expect(parsed.searchParams.get("utm_campaign")).toBe("launch");
      expect(parsed.searchParams.get("unknown")).toBeNull();
    });
  });

  it("removes attribution from the visible URL without removing technical parameters", () => {
    window.history.replaceState(
      {},
      "",
      "/?enterDemo=1&yclid=abc&utm_source=yandex&utm_term=shift#demo"
    );

    clearAttributionFromCurrentUrl();

    const parsed = new URL(window.location.href);
    expect(parsed.pathname).toBe("/");
    expect(parsed.hash).toBe("#demo");
    expect(parsed.searchParams.get("enterDemo")).toBe("1");
    ATTRIBUTION_PARAM_NAMES.forEach((name) => {
      expect(parsed.searchParams.get(name)).toBeNull();
    });
  });
});
