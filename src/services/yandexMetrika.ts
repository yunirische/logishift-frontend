import { YANDEX_METRIKA_ID } from "../config/analytics";

declare global {
  interface Window {
    ym?: ((...args: unknown[]) => void) & {
      a?: IArguments[];
      l?: number;
    };
  }
}

const YANDEX_METRIKA_SCRIPT_ID = "logishift-yandex-metrika";
const YANDEX_METRIKA_SCRIPT_SRC = "https://mc.yandex.ru/metrika/tag.js";

let initializedCounterId: number | null = null;

const setupYandexMetrikaStub = () => {
  if (typeof window.ym === "function") return;

  window.ym = function ymStub() {
    window.ym!.a = window.ym!.a || [];
    window.ym!.a.push(arguments);
  };
  window.ym.l = Date.now();
};

export const loadYandexMetrika = () => {
  if (!YANDEX_METRIKA_ID || initializedCounterId === YANDEX_METRIKA_ID) return;

  setupYandexMetrikaStub();

  if (!document.getElementById(YANDEX_METRIKA_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = YANDEX_METRIKA_SCRIPT_ID;
    script.async = true;
    script.src = YANDEX_METRIKA_SCRIPT_SRC;
    document.head.appendChild(script);
  }

  window.ym?.(YANDEX_METRIKA_ID, "init", {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: false,
  });
  initializedCounterId = YANDEX_METRIKA_ID;
};

export const destroyYandexMetrika = () => {
  if (initializedCounterId && typeof window.ym === "function") {
    window.ym(initializedCounterId, "destruct");
  }
  initializedCounterId = null;
};

export const clearYandexMetrikaCookies = () => {
  const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
  const cookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.trim().split("=")[0])
    .filter((name) => name.startsWith("_ym_"));

  cookieNames.forEach((name) => {
    document.cookie = `${name}=; expires=${expires}; path=/`;
    document.cookie = `${name}=; expires=${expires}; path=/; domain=${window.location.hostname}`;
  });
};
