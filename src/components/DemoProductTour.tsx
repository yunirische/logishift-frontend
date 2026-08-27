import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DemoProductTourProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onStartDriverScenario: () => void;
}

type TourMode = "tour" | "choice" | "launcher";

const TOUR_STEPS = [
  {
    tab: "dashboard",
    title: "Главная",
    text: "Здесь руководитель видит, кто сейчас на смене и какая техника в работе.",
  },
  {
    tab: "shifts",
    title: "Реестр смен",
    text: "Здесь собраны статусы, время, фотографии и комментарии по всем сменам.",
  },
  {
    tab: "objects",
    title: "Из чего состоит смена",
    text: "Смена связывает водителя, технику и объект с требованиями к фотографиям.",
  },
  {
    tab: "analytics",
    title: "Аналитика",
    text: "Загрузка и результаты появляются здесь по мере накопления завершённых смен.",
  },
] as const;

const DemoProductTour: React.FC<DemoProductTourProps> = ({
  activeTab,
  setActiveTab,
  onStartDriverScenario,
}) => {
  const initialStepIndex = TOUR_STEPS.findIndex(
    (step) => step.tab === activeTab
  );
  const [mode, setMode] = useState<TourMode>(
    initialStepIndex >= 0 ? "tour" : "launcher"
  );
  const [stepIndex, setStepIndex] = useState(
    initialStepIndex >= 0 ? initialStepIndex : 0
  );

  useEffect(() => {
    if (mode !== "tour") return;

    const matchingStepIndex = TOUR_STEPS.findIndex(
      (step) => step.tab === activeTab
    );
    if (matchingStepIndex >= 0) {
      setStepIndex(matchingStepIndex);
      return;
    }

    // Manual navigation outside the tour ends the guided layer instead of
    // pulling the user back or showing copy for a different screen.
    setMode("launcher");
  }, [activeTab, mode]);

  const openStep = (nextIndex: number) => {
    const nextStep = TOUR_STEPS[nextIndex];
    setStepIndex(nextIndex);
    setActiveTab(nextStep.tab);
  };

  const restartTour = () => {
    setStepIndex(0);
    setMode("tour");
    setActiveTab(TOUR_STEPS[0].tab);
  };

  if (mode === "launcher") {
    return (
      <section
        className="mb-4 flex flex-col gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2.5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4"
        data-testid="demo-product-tour-launcher"
        aria-label="Дополнительные возможности демо"
      >
        <p className="text-sm font-semibold text-slate-700">
          Хотите увидеть мобильный путь водителя?
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onStartDriverScenario}
            className="inline-flex min-h-9 items-center justify-center rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          >
            Посмотреть сценарий водителя
          </button>
          <button
            type="button"
            onClick={restartTour}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            Повторить обзор
          </button>
        </div>
      </section>
    );
  }

  if (mode === "choice") {
    return (
      <section
        className="mb-4 rounded-xl border border-blue-100 bg-white px-3 py-3 shadow-sm sm:px-4"
        data-testid="demo-product-tour-choice"
        aria-labelledby="demo-product-tour-choice-title"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p
              id="demo-product-tour-choice-title"
              className="text-sm font-bold text-slate-900"
            >
              Обзор закончен
            </p>
            <p className="mt-0.5 text-xs leading-5 text-slate-600">
              Теперь можно посмотреть мобильный путь водителя.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onStartDriverScenario}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
            >
              Посмотреть, как водитель отмечает смену
            </button>
            <button
              type="button"
              onClick={() => setMode("launcher")}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              Остаться в кабинете
            </button>
          </div>
        </div>
      </section>
    );
  }

  const step = TOUR_STEPS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === TOUR_STEPS.length - 1;

  return (
    <section
      className="mb-4 rounded-xl border border-blue-100 bg-white px-3 py-3 shadow-sm sm:px-4"
      data-testid="demo-product-tour"
      aria-labelledby="demo-product-tour-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex rounded-full bg-blue-700 px-2.5 py-1 text-xs font-bold text-white"
              data-testid="demo-product-tour-progress"
            >
              Обзор {stepIndex + 1} из {TOUR_STEPS.length}
            </span>
            <h3
              id="demo-product-tour-title"
              className="text-sm font-bold text-slate-900"
            >
              {step.title}
            </h3>
          </div>
          <p className="mt-1 text-sm leading-5 text-slate-700">{step.text}</p>
        </div>
        <button
          type="button"
          onClick={() => setMode("choice")}
          className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-blue-300 bg-blue-50 px-3 text-xs font-bold text-blue-800 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
        >
          Пропустить обзор
        </button>
      </div>

      {isFirstStep && (
        <p
          className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold leading-5 text-emerald-800"
          data-testid="demo-product-tour-owner-preview"
        >
          Пример активной смены: Иван Петров · КамАЗ 65115 · ЖК Северный · Активна
        </p>
      )}

      <div className="mt-2 flex items-center justify-end gap-2">
        {!isFirstStep && (
          <button
            type="button"
            onClick={() => openStep(stepIndex - 1)}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            <ChevronLeft size={14} aria-hidden="true" />
            Назад
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            isLastStep ? setMode("choice") : openStep(stepIndex + 1)
          }
          className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2"
        >
          {isLastStep ? "Закончить обзор" : "Далее"}
          {!isLastStep && <ChevronRight size={14} aria-hidden="true" />}
        </button>
      </div>
    </section>
  );
};

export default DemoProductTour;
