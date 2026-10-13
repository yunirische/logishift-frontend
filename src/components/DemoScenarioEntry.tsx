import React from "react";
import { useDemoSession } from "../context/DemoSessionContext";
import { DriverView } from "../views/DriverView";
import DemoScenarioGuide from "./DemoScenarioGuide";

interface DemoScenarioEntryProps {
  onExploreCabinet: () => void;
  setDemoPersona: (persona: "admin" | "driver") => void;
  setActiveTab: (tab: string) => void;
  showDemoShiftInRegistry: (shiftId: string) => void;
}

// Presentation only: shift state and actions remain in the existing demo store/DriverView.
const DemoScenarioEntry: React.FC<DemoScenarioEntryProps> = ({ onExploreCabinet, ...guideActions }) => {
  const { activeShift, finishedShifts } = useDemoSession();
  const hasFinishedScenario = finishedShifts.some(shift => shift.id.startsWith("demo-shift:"));
  const hasScenario = Boolean(activeShift || hasFinishedScenario);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" data-testid="demo-scenario-entry">
      <header className="mx-auto max-w-4xl px-4 py-3 text-xs font-semibold text-slate-500 sm:px-6">
        Демо LogiShift · Тестовые данные
      </header>
      <main className="mx-auto max-w-4xl px-4 pb-8 sm:px-6">
        {!hasScenario && (
          <div className="mb-4">
            <h1 className="text-xl font-bold sm:text-2xl">Попробуйте смену</h1>
            <p className="mt-2 text-sm leading-5 text-slate-600">
              Начните тестовую смену — затем увидите её глазами руководителя.
            </p>
          </div>
        )}
        {hasScenario && (
          <DemoScenarioGuide demoPersona="driver" activeTab="my-shifts" {...guideActions} />
        )}
        <DriverView demoScenarioFirst focusHistory={!activeShift && hasFinishedScenario} />
        <button
          type="button"
          onClick={onExploreCabinet}
          className="mt-5 min-h-10 text-left text-sm font-semibold text-blue-700 underline underline-offset-4 hover:text-blue-900"
        >
          Посмотреть кабинет подробнее
        </button>
        <p className="mt-2 text-xs leading-5 text-slate-500">Действия в демо не создают реальные смены.</p>
      </main>
    </div>
  );
};

export default DemoScenarioEntry;
