import React, { useEffect, useState } from "react";
import {
  ANALYTICS_CONSENT_ACCEPTED,
  ANALYTICS_CONSENT_REJECTED,
  ANALYTICS_CONSENT_OPEN_EVENT,
  ANALYTICS_CONSENT_STORAGE_KEY,
  AnalyticsConsentChoice,
  isYandexMetrikaAllowedContext,
} from "../config/analytics";
import {
  clearYandexMetrikaCookies,
  destroyYandexMetrika,
  loadYandexMetrika,
} from "../services/yandexMetrika";
import { clearVkAdsPixelCookies, loadVkAdsPixel, removeVkAdsPixel } from "../services/vkAdsPixel";
import { reloadLocation } from "../services/navigation";

const readStoredChoice = (): AnalyticsConsentChoice | null => {
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    return value === ANALYTICS_CONSENT_ACCEPTED ||
      value === ANALYTICS_CONSENT_REJECTED
      ? value
      : null;
  } catch {
    return null;
  }
};

const writeStoredChoice = (choice: AnalyticsConsentChoice) => {
  window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, choice);
};

const AnalyticsConsent: React.FC = () => {
  const [choice, setChoice] = useState<AnalyticsConsentChoice | null>(() =>
    readStoredChoice()
  );
  const [isOpen, setIsOpen] = useState(false);
  const isAllowedContext = isYandexMetrikaAllowedContext(
    window.location.hostname,
    window.location.pathname
  );

  useEffect(() => {
    if (!isAllowedContext) return;

    if (choice === ANALYTICS_CONSENT_ACCEPTED) {
      loadYandexMetrika();
      loadVkAdsPixel();
      setIsOpen(false);
      return;
    }

    if (choice === ANALYTICS_CONSENT_REJECTED) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
  }, [choice, isAllowedContext]);

  useEffect(() => {
    const openConsent = () => {
      if (isAllowedContext) setIsOpen(true);
    };

    window.addEventListener(ANALYTICS_CONSENT_OPEN_EVENT, openConsent);
    return () =>
      window.removeEventListener(ANALYTICS_CONSENT_OPEN_EVENT, openConsent);
  }, [isAllowedContext]);

  if (!isAllowedContext || !isOpen) return null;

  const accept = () => {
    writeStoredChoice(ANALYTICS_CONSENT_ACCEPTED);
    setChoice(ANALYTICS_CONSENT_ACCEPTED);
  };

  const reject = () => {
    writeStoredChoice(ANALYTICS_CONSENT_REJECTED);
    destroyYandexMetrika();
    clearYandexMetrikaCookies();
    removeVkAdsPixel();
    clearVkAdsPixelCookies();
    setChoice(ANALYTICS_CONSENT_REJECTED);
    if (choice === ANALYTICS_CONSENT_ACCEPTED) {
      reloadLocation();
    }
  };

  return (
    <section
      aria-label="Настройки аналитических cookies"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-900/10 md:inset-x-4 md:bottom-6 md:flex md:items-center md:gap-5 md:rounded-3xl md:p-5"
    >
      <p className="text-[13px] leading-5 text-slate-700 md:text-sm md:leading-6">
        Яндекс Метрика и пиксель VK Рекламы для анализа посещений — только с вашего согласия.{" "}
        <a className="font-semibold text-[#0a192f] underline" href="/privacy">
          Подробнее
        </a>
        .
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 md:mt-0 md:w-64 md:flex-none">
        <button
          type="button"
          onClick={accept}
          className="min-h-11 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#0a192f] transition-colors hover:border-[#0a192f]"
        >
          Принять
        </button>
        <button
          type="button"
          onClick={reject}
          className="min-h-11 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#0a192f] transition-colors hover:border-[#0a192f]"
        >
          Отклонить
        </button>
      </div>
    </section>
  );
};

export default AnalyticsConsent;
