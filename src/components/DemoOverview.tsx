import React from "react";
import { ArrowDown, ArrowRight, Camera, Check, ClipboardList, Smartphone, Truck, MapPin } from "lucide-react";
import { Card } from "./ui";

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

const DemoOverview: React.FC<DemoOverviewProps> = ({ onTryScenario, onExploreCabinet, registrationHref, onRegistrationClick }) => (
  <div className="min-h-screen bg-slate-50 text-slate-900" data-testid="demo-overview">
    <header className="mx-auto max-w-6xl px-4 pt-4 text-xs font-semibold text-slate-500 sm:px-6">
      Демо LogiShift · Подготовленный пример
    </header>
    <main className="mx-auto max-w-6xl px-4 pb-8 pt-3 sm:px-6 sm:pt-5">
      <h1 className="text-xl font-bold tracking-tight sm:text-3xl">Одна смена — две стороны</h1>
      <p className="mt-2 max-w-2xl text-sm leading-5 text-slate-600 sm:text-base sm:leading-6">
        Водитель отмечает начало с телефона. Руководитель видит эту смену в кабинете.
      </p>

      <ol className="mt-4 grid gap-2 lg:grid-cols-3 lg:gap-6" aria-label="Как действие водителя становится записью смены">
        <li className="relative min-w-0">
          <Card className="h-full p-3 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
              <ClipboardList size={19} aria-hidden="true" /> 1 · Руководитель
            </div>
            <h2 className="mt-2 text-base font-bold sm:text-lg">Видит, кто и где работает</h2>
            <ul className="mt-3 flex flex-wrap gap-1.5 text-sm" aria-label="Данные смены у руководителя">
              {["Водитель", "Техника", "Объект", "Время начала", "Статус"].map(field => (
                <li key={field} className="rounded-lg bg-slate-100 px-2 py-1 font-medium text-slate-700">{field}</li>
              ))}
            </ul>
          </Card>
        </li>
        <li className="relative min-w-0">
          <div className="mb-2 flex justify-center text-blue-500 lg:absolute lg:-left-5 lg:top-1/2 lg:mb-0 lg:-translate-y-1/2" aria-hidden="true">
            <ArrowDown size={20} className="lg:hidden" /><ArrowRight size={20} className="hidden lg:block" />
          </div>
          <Card className="p-3 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
              <Smartphone size={19} aria-hidden="true" /> 2 · Водитель
            </div>
            <h2 className="mt-2 text-base font-bold sm:text-lg">Выбирает и начинает</h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">{example.driver}</p>
            <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold">
              <p className="flex items-center gap-2"><Truck size={17} className="shrink-0 text-slate-500" aria-hidden="true" />{example.truck}</p>
              <p className="flex items-center gap-2"><MapPin size={17} className="shrink-0 text-slate-500" aria-hidden="true" />{example.site}</p>
              <div className="rounded-lg bg-blue-700 px-3 py-2 text-center text-white" data-testid="demo-overview-start-illustration">
                Начать смену
              </div>
            </div>
            <p className="mt-3 text-sm leading-5 text-slate-600">Фото можно сделать обязательным по настройкам объекта.</p>
          </Card>
        </li>
        <li className="relative min-w-0">
          <div className="mb-2 flex justify-center text-blue-500 lg:absolute lg:-left-5 lg:top-1/2 lg:mb-0 lg:-translate-y-1/2" aria-hidden="true">
            <ArrowDown size={20} className="lg:hidden" /><ArrowRight size={20} className="hidden lg:block" />
          </div>
          <Card className="border-blue-200 p-3 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
              <ClipboardList size={19} aria-hidden="true" /> 3 · Результат у руководителя
            </div>
            <h2 className="mt-2 text-base font-bold sm:text-lg">Эта смена уже в кабинете</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm" data-testid="demo-overview-result">
              {[["Водитель", example.driver], ["Техника", example.truck], ["Объект", example.site], ["Время начала", example.start]].map(([label, value]) => (
                <div key={label} className="min-w-0 break-words">
                  <dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 font-semibold">{value}</dd>
                </div>
              ))}
              <div className="col-span-2 flex items-center gap-2">
                <dt className="text-xs text-slate-500">Статус</dt>
                <dd className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700"><Check size={15} aria-hidden="true" />На смене</dd>
              </div>
            </dl>
            <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700"><Camera size={17} className="shrink-0" aria-hidden="true" />Фото начала приложено</p>
          </Card>
        </li>
      </ol>

      <nav className="mt-4 grid gap-2 lg:grid-cols-3" aria-label="Что посмотреть дальше">
        <button type="button" onClick={onTryScenario} className="min-h-11 rounded-lg bg-blue-700 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-700">Попробовать самому</button>
        <button type="button" onClick={onExploreCabinet} className="min-h-11 rounded-lg border border-blue-300 bg-white px-3 py-3 text-sm font-semibold text-blue-800 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-700">Посмотреть настоящий кабинет</button>
        <a href={registrationHref} onClick={onRegistrationClick} className="flex min-h-11 items-center justify-center rounded-lg px-3 py-3 text-center text-sm font-semibold text-blue-700 underline underline-offset-4 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-700">Создать свою компанию</a>
      </nav>
      <p className="mt-3 text-xs leading-5 text-slate-500">Это иллюстрация готовой смены. «Попробовать самому» открывает интерактивное демо.</p>
    </main>
  </div>
);

export default DemoOverview;
