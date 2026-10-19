// @vitest-environment-options {"url":"https://kontrolsmen.ru/"}
import { ANALYTICS_CONSENT_STORAGE_KEY } from "../../config/analytics";

const src = "https://top-fwz1.mail.ru/js/code.js";

describe("consented VK Ads pixel loader", () => {
  beforeEach(() => {
    vi.resetModules();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    localStorage.clear();
    delete window._tmr;
    window.history.replaceState({}, "", "/");
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete window._tmr;
    document.cookie = "tmr_lvid=; max-age=0; path=/";
    document.cookie = "unrelated=; max-age=0; path=/";
  });

  it.each([null, "rejected", "invalid"])("does not load or queue anything for consent %s", async choice => {
    if (choice) localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, choice);
    const { loadVkAdsPixel } = await import("../vkAdsPixel");
    loadVkAdsPixel();
    expect(document.querySelector(`script[src="${src}"]`)).toBeNull();
    expect(window._tmr).toBeUndefined();
  });

  it("uses the official loader and queues exactly one minimal pageView per document", async () => {
    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "accepted");
    const existing = document.createElement("script");
    existing.src = "/assets/app.js";
    document.head.appendChild(existing);
    const { loadVkAdsPixel } = await import("../vkAdsPixel");
    loadVkAdsPixel(); loadVkAdsPixel(); loadVkAdsPixel();
    const script = document.getElementById("tmr-code") as HTMLScriptElement;
    expect(script.src).toBe(src);
    expect(script.async).toBe(true);
    expect(script.type).toBe("text/javascript");
    expect(script.nextElementSibling).toBe(existing);
    expect(document.querySelectorAll(`script[src="${src}"]`)).toHaveLength(1);
    expect(window._tmr).toEqual([{ id: "3805967", type: "pageView", start: expect.any(Number) }]);
    expect(Object.keys((window._tmr as unknown as object[])[0]).sort()).toEqual(["id", "start", "type"]);
    expect(document.querySelector("noscript, img, iframe")).toBeNull();
  });

  it("reuses a matching vendor script instead of inserting a second one", async () => {
    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "accepted");
    const existing = document.createElement("script"); existing.src = src;
    document.head.appendChild(existing);
    const { loadVkAdsPixel } = await import("../vkAdsPixel");
    loadVkAdsPixel(); loadVkAdsPixel();
    expect(document.querySelectorAll(`script[src="${src}"]`)).toHaveLength(1);
    expect(window._tmr).toHaveLength(1);
  });

  it("fails closed when consent storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    const { loadVkAdsPixel } = await import("../vkAdsPixel");
    expect(loadVkAdsPixel).not.toThrow();
    expect(window._tmr).toBeUndefined();
    expect(document.getElementById("tmr-code")).toBeNull();
  });

  it("does not initialize on a legal or registration route even with accepted consent", async () => {
    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "accepted");
    const { loadVkAdsPixel } = await import("../vkAdsPixel");
    for (const pathname of ["/privacy", "/register", "/login", "/owner"]) {
      window.history.replaceState({}, "", pathname); loadVkAdsPixel();
    }
    expect(window._tmr).toBeUndefined();
    expect(document.getElementById("tmr-code")).toBeNull();
  });

  it("removes the loader and pending queue on revocation; a later call cannot reload with rejected consent", async () => {
    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "accepted");
    const { loadVkAdsPixel, removeVkAdsPixel } = await import("../vkAdsPixel");
    loadVkAdsPixel();
    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "rejected");
    removeVkAdsPixel(); loadVkAdsPixel();
    expect(document.getElementById("tmr-code")).toBeNull();
    expect(window._tmr).toEqual([]);
  });

  it("never invokes the vendor unload method, which would send another hit", async () => {
    const unload = vi.fn();
    window._tmr = { push: vi.fn(), unload } as { push: () => void };
    const { removeVkAdsPixel } = await import("../vkAdsPixel");
    removeVkAdsPixel();
    expect(unload).not.toHaveBeenCalled();
  });

  it("clears only accessible VK first-party analytics cookies", async () => {
    document.cookie = "tmr_lvid=fixture; path=/";
    document.cookie = "unrelated=fixture; path=/";
    const { clearVkAdsPixelCookies } = await import("../vkAdsPixel");
    clearVkAdsPixelCookies();
    expect(document.cookie).not.toContain("tmr_lvid=");
    expect(document.cookie).toContain("unrelated=");
  });
});
