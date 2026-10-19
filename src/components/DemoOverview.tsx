import React, { useEffect } from "react";
import { ArrowDown, ArrowRight, Camera, Check, ClipboardList, Smartphone, Truck, MapPin } from "lucide-react";
import { Card } from "./ui";
import { recordCurrentDemoFunnelEvent } from "../lib/demoFunnelEvents";

interface DemoOverviewProps {
  onTryScenario: () => void;
  onExploreCabinet: () => void;
  registrationHref: string;
  onRegistrationClick: () => void;
}

// Prepared illustration only: no shift ID, context, requests or workflow actions.
const example = {
  driver: "Алексей Смирнов",
  truck: "КамАЗ 65115",
  site: "ЖК Северный",
  start: "09:00",
};

const DemoOverview: React.FC<DemoOverviewProps> = ({ onTryScenario, onExploreCabinet, registrationHref, onRegistrationClick }) => {
  useEffect(() => {
    void recordCurrentDemoFunnelEvent("demo_overview_shown").catch(() => undefined);
  }, []);
  return (
  <div className="min-h-screen bg-slate-50 text-slate-900" data-testid="demo-overview">
    <header className="mx-auto max-w-6xl px-4 pt-4 text-xs font-semibold text-slate-500 sm:px-6">
      Демо LogiShift · Пример
    </header>
    <main className="mx-auto max-w-6xl px-4 pb-8 pt-3 sm:px-6 sm:pt-5">
      <h1 className="text-xl font-bold tracking-tight sm:text-3xl">Одна смена — две стороны</h1>
      <p className="mt-2 max-w-2xl text-sm leading-5 text-slate-600 sm:text-base sm:leading-6">
        Водитель начинает смену с телефона. Руководитель сразу видит её в кабинете.
      </p>

      <ol className="mt-4 grid items-center gap-3 lg:grid-cols-[300px_180px_minmax(0,1fr)] lg:gap-6" aria-label="Как действие водителя становится записью смены">
        <li className="min-w-0">
          <div className="mx-auto max-w-[300px] rounded-[26px] border-2 border-slate-300 bg-white p-3 shadow-sm sm:p-4">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs font-semibold text-slate-500">
              <span className="text-blue-700">LogiShift</span>
              <span className="flex items-center gap-1"><Smartphone size={14} aria-hidden="true" />Водитель</span>
            </div>
            <p className="mt-2 text-sm font-semibold">{example.driver}</p>
            <div className="mt-2 space-y-2 text-sm">
              <p className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><Truck size={17} className="shrink-0 text-slate-500" aria-hidden="true" />{example.truck}</p>
              <p className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><MapPin size={17} className="shrink-0 text-slate-500" aria-hidden="true" />{example.site}</p>
              <div className="pointer-events-none flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white" data-testid="demo-overview-start-illustration">
                Начать смену <ArrowRight size={16} aria-hidden="true" />
              </div>
            </div>
          </div>
        </li>
        <li className="flex flex-col items-center gap-1 text-blue-700">
          <p className="text-sm font-semibold">Смена началась · {example.start}</p>
          <ArrowDown size={24} className="lg:hidden" aria-hidden="true" />
          <ArrowRight size={32} className="hidden lg:block" aria-hidden="true" />
        </li>
        <li className="min-w-0">
          <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500 sm:px-4">
              <span className="text-blue-700">LogiShift</span><span>Кабинет руководителя</span>
            </div>
            <div className="p-3 sm:p-4">
              <h2 className="flex items-center gap-2 text-base font-bold"><ClipboardList size={18} className="text-blue-700" aria-hidden="true" />Активные смены</h2>
              <Card className="mt-2 border-blue-200 p-3" data-testid="demo-overview-result">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <p className="font-semibold">{example.driver}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700"><Check size={14} aria-hidden="true" />На смене</span>
                </div>
                <div className="mt-2 grid gap-1.5 text-sm">
                  <p className="flex items-center gap-2"><Truck size={16} className="text-slate-500" aria-hidden="true" />{example.truck}</p>
                  <p className="flex items-center gap-2"><MapPin size={16} className="text-slate-500" aria-hidden="true" />{example.site}</p>
                  <p className="text-slate-600">Начало <span className="font-semibold text-slate-900">{example.start}</span></p>
                  <p className="flex items-center gap-2 text-emerald-700"><Camera size={16} className="shrink-0" aria-hidden="true" />Фото начала приложено</p>
                </div>
              </Card>
            </div>
          </div>
        </li>
      </ol>
      <p className="mt-2 text-sm leading-5 text-slate-600">Фото и документы можно запрашивать по настройкам объекта.</p>

      <nav className="mt-4 grid gap-2 rounded-xl border border-slate-200 bg-white p-3 lg:grid-cols-3" aria-label="Что посмотреть дальше">
        <button type="button" onClick={onTryScenario} className="min-h-11 rounded-lg bg-blue-700 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-700">Попробовать самому</button>
        <button type="button" onClick={onExploreCabinet} className="min-h-11 rounded-lg border border-blue-300 bg-white px-3 py-3 text-sm font-semibold text-blue-800 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-700">Посмотреть настоящий кабинет</button>
        <a href={registrationHref} onClick={onRegistrationClick} className="flex min-h-11 items-center justify-center rounded-lg px-3 py-3 text-center text-sm font-semibold text-blue-700 underline underline-offset-4 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-700">Создать свою компанию</a>
      </nav>
      <p className="mt-3 text-xs leading-5 text-slate-500">Это иллюстрация готовой смены. «Попробовать самому» открывает интерактивное демо.</p>
    </main>
  </div>
  );
};

export default DemoOverview;
