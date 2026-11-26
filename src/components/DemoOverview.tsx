import DemoSamplePhoto from "./DemoSamplePhoto";
import { useEffect, useState } from "react";
import { Camera, Check, ClipboardList, Clock3, Play, RotateCcw, Smartphone } from "lucide-react";
import BrandLogo from "./BrandLogo";
import { useDemoSession } from "../context/DemoSessionContext";
import { DemoExampleId, demoExamples, exampleFinish, exampleStart } from "../lib/demoExamples";
import { DemoFunnelEventType, recordCurrentDemoFunnelEvent } from "../lib/demoFunnelEvents";

interface Props {
  onExploreCabinet: () => void;
  registrationHref: string;
  onRegistrationClick: () => void;
}

const choices = Object.entries(demoExamples) as [DemoExampleId, typeof demoExamples[DemoExampleId]][];
const observe = (event: DemoFunnelEventType) => { void recordCurrentDemoFunnelEvent(event).catch(() => undefined); };
const time = (value: string) => new Date(value).toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" });

export default function DemoOverview({ onExploreCabinet, registrationHref, onRegistrationClick }: Props) {
  const { activeShift, finishedShifts, startDemoShift, attachWorkSample, requestDemoShiftFinish } = useDemoSession();
  const [selected, setSelected] = useState<DemoExampleId>("snow");
  const [dismissed, setDismissed] = useState<string>();
  const latest = activeShift || finishedShifts[0];
  const shift = latest?.exampleId && latest.id !== dismissed ? latest : null;
  const key = shift?.exampleId || selected;
  const example = demoExamples[key];
  const done = shift?.status === "finished";
  const hasPhoto = !shift || shift.workSampleAdded;
  const start = shift?.startedAt || exampleStart().toISOString();
  const end = shift ? shift.finishedAt : exampleFinish(start).toISOString();
  const minutes = end ? Math.round((Date.parse(end) - Date.parse(start)) / 60000) : 0;
  const phase = !shift ? 0 : done ? 3 : hasPhoto ? 2 : 1;
  const ActionIcon = [Play, Camera, Check, RotateCcw][phase];
  const action = ["Начать смену", "Добавить образец фото", "Завершить смену", "Повторить демонстрацию"][phase];
  useEffect(() => {
    observe("demo_overview_shown");
    observe("demo_driver_view_shown");
  }, []);
  useEffect(() => {
    if (!shift) {
      observe("demo_shift_selection_shown");
      observe("demo_shift_start_ready");
    }
  }, [shift?.id]);
  useEffect(() => {
    if (shift) observe("demo_owner_result_shown");
  }, [shift?.id]);

  function choose(id: DemoExampleId) {
    setSelected(id);
    setDismissed(latest?.id);
  }

  function act() {
    if (!shift) {
      observe("demo_driver_scenario_requested");
      startDemoShift({ exampleId: key, driverId: null, driverName: "Алексей Смирнов",
        truckId: key, truckName: example.truck, siteId: key, siteName: example.site,
        odometerRequired: false, invoiceRequired: false });
    } else if (done) choose(key);
    else if (!hasPhoto) attachWorkSample(shift.id);
    else requestDemoShiftFinish();
  }

  return <main className="min-h-screen bg-slate-50 text-slate-900" data-testid="demo-overview">
    <header className="border-b bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-8">
        <BrandLogo className="w-16 shrink-0 sm:w-32" imageClassName="block h-auto w-full" />
        <div className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold sm:text-sm">
          <button onClick={onExploreCabinet}>Изучить кабинет</button>
          <a href={registrationHref} onClick={onRegistrationClick} className="rounded-lg bg-slate-900 px-2.5 py-2 text-white sm:px-4">Начать бесплатно</a>
        </div>
      </nav>
    </header>
    <div className="mx-auto max-w-6xl px-3 py-3 sm:px-8 sm:py-10">
      <h1 className="text-xl font-bold tracking-tight sm:text-4xl">Одна смена — две стороны</h1>
      <p className="mt-1 text-xs text-slate-600 sm:mt-3 sm:text-base">Водитель отмечает работу. Руководитель видит часы и фото.</p>
      <div className="my-3 sm:my-6">
        <select aria-label="Пример работы" value={key} disabled={!!activeShift} onChange={e => choose(e.target.value as DemoExampleId)} className="rounded-lg border bg-white px-3 py-1.5 text-sm sm:hidden">
          {choices.map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
        </select>
        <div className="hidden gap-2 sm:flex">{choices.map(([id, item]) => <button key={id} disabled={!!activeShift} aria-pressed={id === key} onClick={() => choose(id)}
          className={'rounded-full border px-4 py-2 text-sm font-semibold ' + (id === key ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-700")}>{item.label}</button>)}</div>
      </div>
      <div className="grid gap-2 md:grid-cols-[0.85fr_1.15fr] md:gap-5">
        <section className="flex flex-col rounded-2xl bg-slate-900 p-3 text-white sm:p-7">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-blue-200"><Smartphone size={18}/> Водитель</h2>
          <h3 className="mt-2 text-lg font-bold sm:mt-8 sm:text-3xl">{example.job}</h3>
          <p className="text-xs text-slate-300 sm:mt-2 sm:text-base">{example.truck} · {example.site}</p>
          <div className="mt-auto pt-3 sm:pt-8">
            <button className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 font-semibold text-white hover:bg-blue-700 sm:min-h-12" onClick={act}><ActionIcon size={18}/>{action}</button>
          </div>
        </section>
        <section aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-blue-700"><ClipboardList size={18}/>Руководитель</h2>
          <div className="my-2 flex flex-wrap items-center justify-between gap-1 sm:my-4">
            <h3 className="font-bold sm:text-xl">{shift ? "Ваша демосмена" : "Пример готового отчёта"}</h3>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">{!shift || done ? "Завершена" : "На смене"}</span>
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-x-3 text-sm sm:mb-3">
            <Clock3 size={15}/><span>{time(start)} {end && "— " + time(end)}</span>{end && <strong>{Math.floor(minutes / 60)} ч {minutes % 60} мин</strong>}
            <span className="text-xs text-slate-500">Время в примере · МСК</span>
          </div>
          {hasPhoto ? <DemoSamplePhoto exampleId={key}/> : <p className="grid h-24 place-content-center rounded-lg border border-dashed text-sm text-slate-500 sm:h-52">Здесь появится рабочее фото</p>}
          <p className="mt-2 text-xs text-slate-600">{example.truck} · {example.site} · Алексей Смирнов</p>
        </section>
      </div>
    </div>
  </main>;
}
