import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useDemoSession } from "../context/DemoSessionContext";
import { DemoScenarioShift, DemoWorkflowStatus } from "../lib/demoSession";
import { getDemoRegistrationUrl } from "../lib/demoRegistrationHandoff";

type DemoPersona = "admin" | "driver";

interface DemoScenarioGuideProps {
  demoPersona: DemoPersona;
  activeTab: string;
  setDemoPersona: (persona: DemoPersona) => void;
  setActiveTab: (tab: string) => void;
  showDemoShiftInRegistry?: (shiftId: string) => void;
}

interface GuideState {
  step: 1 | 2 | 3 | 4 | 5;
  title: string;
  text: string;
  detail?: string;
  actionLabel?: string;
  actionTarget?: string;
  actionHref?: string;
  action?: () => void;
  secondaryActionLabel?: string;
  secondaryAction?: () => void;
  shift?: DemoScenarioShift;
  completed?: boolean;
}

const isSyntheticShift = (shift: DemoScenarioShift): boolean =>
  shift.id.startsWith("demo-shift:");

const shiftTimestamp = (shift: DemoScenarioShift): number =>
  Date.parse(shift.finishedAt || shift.startedAt);

export const selectLatestSyntheticFinishedShift = (
  shifts: DemoScenarioShift[]
): DemoScenarioShift | null =>
  shifts
    .filter(
      (shift) =>
        isSyntheticShift(shift) &&
        shift.status === "finished" &&
        Number.isFinite(shiftTimestamp(shift))
    )
    .sort((left, right) => shiftTimestamp(right) - shiftTimestamp(left))[0] ||
  null;

const statusLabel = (status: DemoWorkflowStatus): string => {
  switch (status) {
    case "awaiting_odo_start":
      return "Ожидается фото одометра перед началом";
    case "awaiting_odo_end":
      return "Ожидается фото одометра после работы";
    case "awaiting_invoice":
      return "Ожидается фотография накладной";
    case "finished":
      return "Завершена";
    default:
      return "Активна";
  }
};

const PHOTO_REQUIREMENTS_EXPLANATION =
  "Требования к фото задаются в настройках объекта. Администратор может сделать обязательными, например, фото одометра до и после смены или накладную.";

const DemoScenarioGuide: React.FC<DemoScenarioGuideProps> = ({
  demoPersona,
  activeTab,
  setDemoPersona,
  setActiveTab,
  showDemoShiftInRegistry,
}) => {
  const { activeShift, finishedShifts } = useDemoSession();
  const [collapsed, setCollapsed] = useState(false);
  const [reviewedActiveShiftId, setReviewedActiveShiftId] = useState<
    string | null
  >(null);

  const latestFinishedShift = useMemo(
    () => selectLatestSyntheticFinishedShift(finishedShifts),
    [finishedShifts]
  );

  useEffect(() => {
    if (!activeShift || activeShift.id !== reviewedActiveShiftId) {
      setReviewedActiveShiftId(null);
    }
  }, [activeShift, reviewedActiveShiftId]);

  const guideState = useMemo<GuideState>(() => {
    if (!activeShift && !latestFinishedShift) {
      if (demoPersona === "driver") {
        return {
          step: 2,
          title: "Начните тестовую смену",
          text: "Выберите КамАЗ 65115 и объект «ЖК Северный», затем начните смену.",
          actionLabel: "Перейти к выбору",
          actionTarget: "#demo-driver-selection",
        };
      }

      return {
        step: 1,
        title: "Перейдите к водителю",
        text: "Переключитесь в режим водителя и начните тестовую смену.",
        actionLabel: "Открыть режим водителя",
        action: () => setDemoPersona("driver"),
      };
    }

    if (!activeShift && latestFinishedShift) {
      if (demoPersona === "driver") {
        return {
          step: 5,
          title: "Смена завершена",
          text: "Посмотрите завершённую смену глазами администратора.",
          actionLabel: "Посмотреть результат у администратора",
          action: () => setDemoPersona("admin"),
          shift: latestFinishedShift,
        };
      }

      return {
        step: 5,
        title: "Сценарий завершён",
        text: "Перейдите к работе со своими данными.",
        detail:
          "На бесплатном тарифе доступны 2 машины, 2 объекта и 2 водителя.",
        actionLabel: "Создать свою компанию",
        actionHref: getDemoRegistrationUrl(),
        secondaryActionLabel: "Посмотреть завершённую смену",
        secondaryAction: () => setActiveTab("shifts"),
        shift: latestFinishedShift,
        completed: true,
      };
    }

    if (activeShift && demoPersona === "admin") {
      if (activeTab !== "shifts") {
        return {
          step: 4,
          title: "Проверьте смену у администратора",
          text: "Администратор видит смену в реестре, может открыть её, проверить фотографии и комментарий, изменить данные, завершить или отменить смену.",
          actionLabel: "Показать в реестре",
          action: () => showDemoShiftInRegistry?.(activeShift.id),
          shift: activeShift,
        };
      }

      return {
        step: 4,
        title: "Проверьте смену у администратора",
        text: "Откройте «Подробнее» у демонстрационной смены, затем вернитесь к водителю для завершения.",
        actionLabel: "Вернуться к водителю и завершить",
        action: () => {
          setReviewedActiveShiftId(activeShift.id);
          setDemoPersona("driver");
        },
        shift: activeShift,
      };
    }

    if (
      activeShift &&
      (reviewedActiveShiftId === activeShift.id ||
        activeShift.status === "awaiting_odo_end" ||
        activeShift.status === "awaiting_invoice")
    ) {
      const text =
        activeShift.status === "awaiting_odo_end"
          ? "Добавьте фото одометра после работы."
          : activeShift.status === "awaiting_invoice"
            ? "Добавьте фотографию накладной."
            : "Завершите смену и добавьте обязательные фотографии.";

      return {
        step: 5,
        title: "Завершите смену",
        text,
        detail:
          activeShift.status === "awaiting_odo_end" ||
          activeShift.status === "awaiting_invoice"
            ? PHOTO_REQUIREMENTS_EXPLANATION
            : undefined,
        actionLabel:
          activeShift.status === "active"
            ? "Перейти к завершению"
            : "Перейти к фотографии",
        actionTarget:
          activeShift.status === "active"
            ? "#demo-driver-action"
            : "#demo-driver-workflow",
        shift: activeShift,
      };
    }

    if (activeShift?.status === "awaiting_odo_start") {
      return {
        step: 3,
        title: "Добавьте данные смены",
        text: "Добавьте фото одометра перед началом.",
        detail: PHOTO_REQUIREMENTS_EXPLANATION,
        actionLabel: "Перейти к фотографии",
        actionTarget: "#demo-driver-workflow",
        shift: activeShift,
      };
    }

    if (activeShift?.status === "active" && !activeShift.comment?.trim()) {
      return {
        step: 3,
        title: "Добавьте данные смены",
        text: "Добавьте короткий комментарий к смене.",
        actionLabel: "Перейти к комментарию",
        actionTarget: "#demo-driver-workflow",
        shift: activeShift,
      };
    }

    return {
      step: 3,
      title: "Посмотрите смену у администратора",
      text: "Теперь посмотрите эту смену глазами администратора.",
      actionLabel: "Посмотреть как администратор",
      action: () => setDemoPersona("admin"),
      shift: activeShift || undefined,
    };
  }, [
    activeShift,
    demoPersona,
    latestFinishedShift,
    reviewedActiveShiftId,
    setActiveTab,
    setDemoPersona,
    showDemoShiftInRegistry,
  ]);

  const handleAnchorAction = () => {
    if (demoPersona === "driver" && activeTab !== "my-shifts") {
      setActiveTab("my-shifts");
    }
  };

  return (
    <section
      className="sticky top-[5.25rem] z-20 mb-4 max-h-[calc(100vh-5.75rem)] overflow-y-auto rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 shadow-md sm:mb-5 sm:px-4 sm:py-3"
      data-testid="demo-scenario-guide"
      data-synthetic-shift-id={guideState.shift?.id}
      aria-labelledby="demo-scenario-guide-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            id="demo-scenario-guide-title"
            className="text-sm font-bold text-slate-900"
          >
            {guideState.completed
              ? "Сценарий завершён"
              : "Попробуйте сценарий смены"}
          </h3>
          {!collapsed && !guideState.completed && (
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Водитель начинает смену, администратор сразу видит её в системе.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 text-xs font-semibold text-blue-800 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          aria-expanded={!collapsed}
          aria-controls="demo-scenario-guide-content"
        >
          {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          {collapsed ? "Развернуть" : "Свернуть"}
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span
          className="inline-flex rounded-full bg-blue-700 px-2.5 py-1 text-xs font-bold text-white"
          data-testid="demo-guide-progress"
        >
          Шаг {guideState.step} из 5
        </span>
        {guideState.completed && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <Check size={14} aria-hidden="true" />
            Готово
          </span>
        )}
      </div>

      {collapsed && guideState.completed && guideState.actionHref && (
        <a
          href={guideState.actionHref}
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 sm:w-auto"
          data-testid="demo-guide-collapsed-registration-action"
        >
          {guideState.actionLabel}
        </a>
      )}

      {!collapsed && (
        <div id="demo-scenario-guide-content" className="mt-3">
          <div
            className="text-sm"
            aria-live="polite"
            aria-atomic="true"
            data-testid="demo-guide-current-step"
          >
            <p className="font-semibold text-slate-900">{guideState.title}</p>
            <p className="mt-1 leading-5 text-slate-700">{guideState.text}</p>
            {guideState.detail && (
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {guideState.detail}
              </p>
            )}
          </div>

          {guideState.step === 4 && guideState.shift && (
            <dl
              className="mt-3 grid gap-2 rounded-lg border border-blue-100 bg-white p-3 text-xs sm:grid-cols-2"
              data-testid="demo-guide-shift-summary"
            >
              <div>
                <dt className="text-slate-500">Водитель</dt>
                <dd className="font-semibold text-slate-900">
                  {guideState.shift.driverName}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Машина</dt>
                <dd className="font-semibold text-slate-900">
                  {guideState.shift.truckName}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Объект</dt>
                <dd className="font-semibold text-slate-900">
                  {guideState.shift.siteName}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Статус</dt>
                <dd className="font-semibold text-slate-900">
                  {statusLabel(guideState.shift.status)}
                </dd>
              </div>
            </dl>
          )}

          {guideState.actionLabel &&
            (guideState.actionHref ? (
              <a
                href={guideState.actionHref}
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 sm:w-auto"
                data-testid="demo-guide-primary-action"
              >
                {guideState.actionLabel}
              </a>
            ) : guideState.actionTarget ? (
              <a
                href={guideState.actionTarget}
                onClick={handleAnchorAction}
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 sm:w-auto"
                data-testid="demo-guide-primary-action"
              >
                {guideState.actionLabel}
              </a>
            ) : (
              <button
                type="button"
                onClick={guideState.action}
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 sm:w-auto"
                data-testid="demo-guide-primary-action"
              >
                {guideState.actionLabel}
              </button>
            ))}
          {guideState.secondaryActionLabel && guideState.secondaryAction && (
            <button
              type="button"
              onClick={guideState.secondaryAction}
              className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-blue-300 bg-white px-4 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 sm:ml-2 sm:mt-3 sm:w-auto"
              data-testid="demo-guide-secondary-action"
            >
              {guideState.secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default DemoScenarioGuide;
