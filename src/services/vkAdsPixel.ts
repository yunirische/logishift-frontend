import {
  ANALYTICS_CONSENT_ACCEPTED,
  ANALYTICS_CONSENT_STORAGE_KEY,
  isVkAdsPixelAllowedContext,
  VK_ADS_PIXEL_ID,
} from "../config/analytics";

interface VkPageView {
  id: string;
  type: "pageView";
  start: number;
}

declare global {
  interface Window {
    _tmr?: { push: (event: VkPageView) => unknown };
  }
}

const SCRIPT_ID = "tmr-code";
const SCRIPT_SRC = "https://top-fwz1.mail.ru/js/code.js";
let initialized = false;

export const loadVkAdsPixel = (): void => {
  if (initialized || !isVkAdsPixelAllowedContext(
    window.location.hostname, window.location.pathname, window.location.protocol
  )) return;
  try {
    if (window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY) !== ANALYTICS_CONSENT_ACCEPTED) return;
  } catch {
    return;
  }

  // Official Top.Mail.Ru initialization: only the supplied counter ID/page view.
  const queue = window._tmr || (window._tmr = []);
  queue.push({ id: VK_ADS_PIXEL_ID, type: "pageView", start: Date.now() });
  initialized = true;

  if (document.getElementById(SCRIPT_ID) || Array.from(document.scripts).some(script => script.src === SCRIPT_SRC)) return;
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.async = true;
  script.id = SCRIPT_ID;
  script.src = SCRIPT_SRC;
  const firstScript = document.getElementsByTagName("script")[0];
  if (firstScript?.parentNode) firstScript.parentNode.insertBefore(script, firstScript);
  else document.head.appendChild(script);
};

export const removeVkAdsPixel = (): void => {
  const script = document.getElementById(SCRIPT_ID);
  if (script instanceof HTMLScriptElement && script.src === SCRIPT_SRC) script.remove();
  if (Array.isArray(window._tmr)) window._tmr.length = 0;
  // Removing a tag cannot unload executed vendor code. The existing consent
  // revocation reload terminates that document; never call _tmr.unload(), which sends a hit.
};

export const clearVkAdsPixelCookies = (): void => {
  const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
  const names = document.cookie.split(";").map(cookie => cookie.trim().split("=")[0])
    .filter(name => name.startsWith("tmr_"));
  for (const name of names) {
    document.cookie = `${name}=; expires=${expires}; path=/`;
    document.cookie = `${name}=; expires=${expires}; path=/; domain=${window.location.hostname}`;
  }
};
