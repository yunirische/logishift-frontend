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
    setChoice(ANALYTICS_CONSENT_REJECTED);
    if (choice === ANALYTICS_CONSENT_ACCEPTED) {
      window.location.reload();
    }
  };

  return (
    <section
      aria-label="Настройки аналитических cookies"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-2xl shadow-slate-900/20 backdrop-blur md:bottom-6 md:flex md:items-center md:gap-5 md:p-5"
    >
      <p className="text-sm leading-6 text-slate-700">
        Мы используем Яндекс Метрику для анализа посещаемости сайта и
        эффективности рекламы. Метрика загружается только с вашего согласия.
        Подробнее - в{" "}
        <a className="font-semibold text-[#0a192f] underline" href="/privacy">
          Политике обработки персональных данных
        </a>
        .
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:mt-0 md:w-64 md:flex-none">
        <button
          type="button"
          onClick={accept}
          className="rounded-full border border-[#0a192f] bg-[#0a192f] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#152238]"
        >
          Принять
        </button>
        <button
          type="button"
          onClick={reject}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#0a192f] transition-colors hover:border-[#0a192f]"
        >
          Отклонить
        </button>
      </div>
    </section>
  );
};

export default AnalyticsConsent;
