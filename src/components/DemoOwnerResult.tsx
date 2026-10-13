import React, { useEffect, useRef } from "react";
import { DemoScenarioShift } from "../lib/demoSession";
import { DemoOwnerShiftSummary } from "./DemoScenarioGuide";
import { getDemoRegistrationUrl } from "../lib/demoRegistrationHandoff";
import { recordDemoRegistrationCtaClick } from "../lib/demoFunnelEvents";

interface Props {
  shift: DemoScenarioShift;
  onExploreCabinet: () => void;
  onContinue: () => void;
}

const DemoOwnerResult: React.FC<Props> = ({ shift, onExploreCabinet, onContinue }) => {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo?.(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, [shift.id]);

  return (
    <section data-testid="demo-owner-result" data-synthetic-shift-id={shift.id} aria-labelledby="demo-owner-result-title">
      <h1 ref={heading} tabIndex={-1} id="demo-owner-result-title" className="text-xl font-bold outline-none sm:text-2xl">
        Смена глазами руководителя
      </h1>
      <p className="mt-2 text-sm leading-5 text-slate-600">
        Водитель начал смену → руководитель сразу видит её в системе.
      </p>
      <DemoOwnerShiftSummary shift={shift} compact />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <a href={getDemoRegistrationUrl()} onClick={recordDemoRegistrationCtaClick}
          className="flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-700"
        >Создать свою компанию</a>
        <button type="button" onClick={onExploreCabinet}
          className="min-h-11 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-700"
        >Посмотреть кабинет подробнее</button>
      </div>
      <button type="button" onClick={onContinue} className="mt-2 min-h-10 text-left text-sm text-blue-700 underline underline-offset-4">
        Продолжить сценарий водителя
      </button>
    </section>
  );
};

export default DemoOwnerResult;
