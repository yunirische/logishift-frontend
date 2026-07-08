import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const METRIKA_SCRIPT_SRC =
  "https://mc.yandex.ru/metrika/tag.js?id=110142109";

describe("yandexMetrika service", () => {
  beforeEach(() => {
    vi.resetModules();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    document.cookie
      .split(";")
      .map((cookie) => cookie.trim().split("=")[0])
      .filter(Boolean)
      .forEach((name) => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete window.ym;
  });

  it("injects the configured Metrika script and init options", async () => {
    const { loadYandexMetrika } = await import("../yandexMetrika");

    loadYandexMetrika();

    const script = document.getElementById(
      "logishift-yandex-metrika"
    ) as HTMLScriptElement | null;
    expect(script).not.toBeNull();
    expect(script?.async).toBe(true);
    expect(script?.src).toBe(METRIKA_SCRIPT_SRC);

    expect(window.ym?.a?.length).toBe(1);
    expect(window.ym?.a?.[0][0]).toBe(110142109);
    expect(window.ym?.a?.[0][1]).toBe("init");
    expect(window.ym?.a?.[0][2]).toMatchObject({
      ssr: true,
      webvisor: true,
      clickmap: true,
      referrer: document.referrer,
      url: location.href,
      accurateTrackBounce: true,
      trackLinks: true,
    });
  });

  it("does not inject duplicate scripts or duplicate init calls", async () => {
    const { loadYandexMetrika } = await import("../yandexMetrika");

    loadYandexMetrika();
    loadYandexMetrika();

    expect(
      document.querySelectorAll(
        'script[src="https://mc.yandex.ru/metrika/tag.js?id=110142109"]'
      )
    ).toHaveLength(1);
    expect(window.ym?.a?.length).toBe(1);
  });

  it("reuses an existing matching Metrika script", async () => {
    const existingScript = document.createElement("script");
    existingScript.src = METRIKA_SCRIPT_SRC;
    document.head.appendChild(existingScript);

    const { loadYandexMetrika } = await import("../yandexMetrika");

    loadYandexMetrika();

    expect(
      document.querySelectorAll(
        'script[src="https://mc.yandex.ru/metrika/tag.js?id=110142109"]'
      )
    ).toHaveLength(1);
  });
});
