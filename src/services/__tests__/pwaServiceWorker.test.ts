import {
  clearKnownAppCaches,
  reconcilePwaServiceWorker,
  unregisterMarketingServiceWorkers,
} from "../pwaServiceWorker";

vi.mock("../../config/demo", () => ({
  isMarketingHostname: (hostname: string) =>
    hostname === "kontrolsmen.ru" || hostname === "www.kontrolsmen.ru",
}));

describe("pwaServiceWorker", () => {
  const originalServiceWorker = navigator.serviceWorker;
  const originalCaches = window.caches;

  const setServiceWorker = (serviceWorker: Partial<ServiceWorkerContainer>) => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: serviceWorker,
    });
  };

  const setCaches = (cachesMock: Partial<CacheStorage>) => {
    Object.defineProperty(window, "caches", {
      configurable: true,
      value: cachesMock,
    });
  };

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: originalServiceWorker,
    });
    Object.defineProperty(window, "caches", {
      configurable: true,
      value: originalCaches,
    });
  });

  it("registers the app service worker outside marketing hosts", () => {
    const register = vi.fn();
    setServiceWorker({ register } as Partial<ServiceWorkerContainer>);

    reconcilePwaServiceWorker("app.kontrolsmen.ru");
    window.dispatchEvent(new Event("load"));

    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
  });

  it("skips registration on marketing hosts", () => {
    const register = vi.fn();
    const getRegistrations = vi.fn().mockResolvedValue([]);
    setServiceWorker({ getRegistrations, register } as Partial<ServiceWorkerContainer>);

    reconcilePwaServiceWorker("kontrolsmen.ru");

    expect(register).not.toHaveBeenCalled();
  });

  it("unregisters app service workers and clears known app caches on marketing hosts", async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi.fn().mockResolvedValue([
      {
        active: { scriptURL: "https://kontrolsmen.ru/sw.js" },
        unregister,
      },
      {
        active: { scriptURL: "https://kontrolsmen.ru/other-worker.js" },
        unregister: vi.fn(),
      },
    ]);
    const deleteCache = vi.fn().mockResolvedValue(true);
    const register = vi.fn();
    setServiceWorker({ getRegistrations, register } as Partial<ServiceWorkerContainer>);
    setCaches({
      keys: vi.fn().mockResolvedValue(["workbox-precache-v2", "api-cache", "other-cache"]),
      delete: deleteCache,
    } as Partial<CacheStorage>);

    await unregisterMarketingServiceWorkers();

    expect(unregister).toHaveBeenCalledTimes(1);
    expect(deleteCache).toHaveBeenCalledWith("workbox-precache-v2");
    expect(deleteCache).toHaveBeenCalledWith("api-cache");
    expect(deleteCache).not.toHaveBeenCalledWith("other-cache");
  });

  it("clears only known app caches", async () => {
    const deleteCache = vi.fn().mockResolvedValue(true);
    setCaches({
      keys: vi.fn().mockResolvedValue(["api-cache", "workbox-precache-prod", "user-cache"]),
      delete: deleteCache,
    } as Partial<CacheStorage>);

    await clearKnownAppCaches();

    expect(deleteCache).toHaveBeenCalledWith("api-cache");
    expect(deleteCache).toHaveBeenCalledWith("workbox-precache-prod");
    expect(deleteCache).not.toHaveBeenCalledWith("user-cache");
  });
});
