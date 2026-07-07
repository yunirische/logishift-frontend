import { isMarketingHostname } from "../config/demo";

const SERVICE_WORKER_PATH = "/sw.js";
const APP_CACHE_NAMES = ["api-cache"];
const APP_CACHE_PREFIXES = ["workbox-precache"];

const isKnownAppCache = (cacheName: string): boolean =>
  APP_CACHE_NAMES.includes(cacheName) ||
  APP_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix));

const isAppServiceWorker = (registration: ServiceWorkerRegistration): boolean => {
  const scriptUrls = [
    registration.active?.scriptURL,
    registration.installing?.scriptURL,
    registration.waiting?.scriptURL,
  ].filter(Boolean);

  return scriptUrls.some((scriptUrl) => {
    try {
      return new URL(scriptUrl as string).pathname === SERVICE_WORKER_PATH;
    } catch {
      return false;
    }
  });
};

export const clearKnownAppCaches = async (): Promise<void> => {
  if (!window.caches || typeof window.caches.keys !== "function") return;

  const cacheNames = await window.caches.keys();
  await Promise.all(
    cacheNames
      .filter(isKnownAppCache)
      .map((cacheName) => window.caches.delete(cacheName))
  );
};

export const unregisterMarketingServiceWorkers = async (): Promise<void> => {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter(isAppServiceWorker)
      .map((registration) => registration.unregister())
  );
  await clearKnownAppCaches();
};

export const reconcilePwaServiceWorker = (hostname: string = window.location.hostname): void => {
  if (!("serviceWorker" in navigator)) return;

  if (isMarketingHostname(hostname)) {
    void unregisterMarketingServiceWorkers();
    return;
  }

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(SERVICE_WORKER_PATH, { scope: "/" });
  });
};
