import { useEffect, useRef, useState } from "react";
import {
  ArrowDown, Archive, Camera, CheckCircle2, ClipboardList, Clock3,
  FileSpreadsheet, FileText, Gauge, MapPin, PlayCircle, RotateCcw, SlidersHorizontal,
  Smartphone, Truck, User,
} from "lucide-react";
import BrandLogo from "./BrandLogo";
import { useDemoSession } from "../context/DemoSessionContext";
import { DemoExampleId, demoExamples, exampleFinish, exampleStart } from "../lib/demoExamples";
import { DemoFunnelEventType, recordCurrentDemoFunnelEvent } from "../lib/demoFunnelEvents";
import { createDemoPhotoSample } from "../lib/demoPhotoSample";
import type { DemoPhotoType } from "../lib/demoSession";

interface Props {
  onExploreCabinet: () => void;
  registrationHref: string;
  onRegistrationClick: () => void;
}

const choices = Object.entries(demoExamples) as [DemoExampleId, typeof demoExamples[DemoExampleId]][];
const observe = (event: DemoFunnelEventType) => {
  void recordCurrentDemoFunnelEvent(event).catch(() => undefined);
};
const time = (value: string) => new Date(value).toLocaleTimeString("ru-RU", {
  timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit",
});

function Step({ label, detail, state, Icon }: {
  label: string; detail: string; state: "done" | "current" | "next";
  Icon: typeof Camera;
}) {
  return <li className={"flex min-w-0 flex-col items-center gap-1 rounded-lg border px-1 py-1.5 text-center sm:flex-row sm:gap-2.5 sm:px-2.5 sm:py-2 sm:text-left " +
    (state === "current" ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white")}>
    <div className={"grid h-7 w-7 shrink-0 place-items-center rounded-lg sm:h-8 sm:w-8 " +
      (state === "done" ? "bg-emerald-50 text-emerald-700" : state === "current" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500")}>
      {state === "done" ? <CheckCircle2 size={19} aria-hidden="true"/> : <Icon size={19} aria-hidden="true"/>}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-bold leading-tight sm:text-sm">{label}</p>
      <p className="mt-0.5 hidden text-[11px] leading-tight text-slate-600 sm:block">{detail}</p>
    </div>
    <span className={"shrink-0 text-[10px] font-medium " +
      (state === "done" ? "text-emerald-700" : state === "current" ? "text-blue-700" : "text-slate-500")}>
      {state === "done" ? "Готово" : state === "current" ? "Сейчас" : "Далее"}
    </span>
  </li>;
}

function Proof({ label, received, required, Icon }: {
  label: string; received: boolean; required: boolean; Icon: typeof Camera;
}) {
  return <div className={"flex min-w-0 items-center gap-1.5 rounded-lg border px-2 py-1.5 " +
    (received ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600")}>
    {received ? <CheckCircle2 size={16} className="shrink-0" aria-hidden="true"/> : <Icon size={16} className="shrink-0" aria-hidden="true"/>}
    <div className="min-w-0">
      <p className="text-[11px] font-semibold leading-tight sm:text-xs">{label}</p>
      <p className="text-[10px] leading-tight">{received ? "Получено" : required ? "Ожидается" : "Не требуется"}</p>
    </div>
  </div>;
}

export default function DemoOverview({ onExploreCabinet, registrationHref, onRegistrationClick }: Props) {
  const {
    activeShift, finishedShifts, startDemoShift, attachWorkSample, requestDemoShiftFinish, addDemoShiftPhoto,
  } = useDemoSession();
  const [selected, setSelected] = useState<DemoExampleId>("snow");
  const [dismissed, setDismissed] = useState<string>();
  const [wantOdometer, setWantOdometer] = useState(false);
  const [wantInvoice, setWantInvoice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);
  const mounted = useRef(true);

  const latest = activeShift || finishedShifts[0];
  const shift = latest?.exampleId && latest.id !== dismissed ? latest : null;
  const key = shift?.exampleId || selected;
  const example = demoExamples[key];
  const done = shift?.status === "finished";
  const preview = !shift;
  const hasPhoto = preview || !!shift?.workSampleAdded;
  const odometer = shift?.odometerRequired ?? wantOdometer;
  const invoice = shift?.invoiceRequired ?? wantInvoice;
  const start = shift?.startedAt || exampleStart().toISOString();
  const end = shift ? shift.finishedAt : exampleFinish(start).toISOString();
  const minutes = end ? Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 60000)) : 0;
  const duration = minutes % 60 ? Math.floor(minutes / 60) + " ч " + minutes % 60 + " мин" : Math.floor(minutes / 60) + " ч";
  const awaiting: DemoPhotoType | null = shift?.status === "awaiting_odo_start" ? "start" :
    shift?.status === "awaiting_odo_end" ? "end" : shift?.status === "awaiting_invoice" ? "invoice" : null;
  const startProof = preview ? odometer : !!shift?.photos.start;
  const endProof = preview ? odometer : !!shift?.photos.end;
  const invoiceProof = preview ? invoice : !!shift?.photos.invoice;
  const readyToWork = !!shift && shift.status !== "awaiting_odo_start";
  const closeRequested = !!shift && (done || awaiting === "end" || awaiting === "invoice");
  const activeCount = 1 + (readyToWork && !done ? 1 : 0);
  const ActionIcon = preview ? PlayCircle : done ? RotateCcw : awaiting || !hasPhoto ? Camera : CheckCircle2;
  const action = preview ? "Начать смену" : done ? "Повторить демонстрацию" :
    awaiting === "start" ? "Добавить одометр до" : awaiting === "end" ? "Добавить одометр после" :
    awaiting === "invoice" ? "Добавить накладную" : !hasPhoto ? "Добавить образец фото" : "Завершить смену";
  const locked = !!activeShift || busy;

  useEffect(() => {
    mounted.current = true;
    observe("demo_overview_shown");
    observe("demo_driver_view_shown");
    return () => { mounted.current = false; };
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
    if (locked) return;
    setSelected(id);
    setDismissed(latest?.id);
    setError("");
  }

  function changeRequirement(type: "odometer" | "invoice", checked: boolean) {
    if (locked) return;
    if (shift) {
      setSelected(key);
      setWantOdometer(odometer);
      setWantInvoice(invoice);
      setDismissed(shift.id);
    }
    if (type === "odometer") setWantOdometer(checked);
    else setWantInvoice(checked);
    setError("");
  }

  async function act() {
    if (busyRef.current) return;
    setError("");
    if (!shift) {
      if (activeShift) return;
      observe("demo_driver_scenario_requested");
      startDemoShift({
        exampleId: key, driverId: null, driverName: "Алексей Смирнов",
        truckId: key, truckName: example.truck, siteId: key, siteName: example.site,
        odometerRequired: odometer, invoiceRequired: invoice,
      });
    } else if (done) {
      setWantOdometer(odometer);
      setWantInvoice(invoice);
      choose(key);
    } else if (awaiting) {
      busyRef.current = true;
      setBusy(true);
      try {
        const sample = await createDemoPhotoSample(awaiting, example.site);
        if (!mounted.current) return;
        if (!addDemoShiftPhoto(shift.id, awaiting, sample)) {
          setError("Не удалось добавить образец. Повторите попытку.");
        }
      } catch {
        if (mounted.current) setError("Не удалось подготовить образец. Повторите попытку.");
      } finally {
        busyRef.current = false;
        if (mounted.current) setBusy(false);
      }
    } else if (!hasPhoto) attachWorkSample(shift.id);
    else requestDemoShiftFinish();
  }

  return <main className="min-h-screen bg-[#f3f6fa] text-[#0a192f]" data-testid="demo-overview">
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
        <BrandLogo className="w-20 shrink-0 sm:w-32" imageClassName="block h-auto w-full"/>
        <div className="flex min-w-0 items-center gap-2 whitespace-nowrap text-[11px] font-semibold sm:text-sm">
          <button type="button" onClick={onExploreCabinet} disabled={busy}
            className="rounded-lg px-1 py-2 text-slate-700 hover:text-blue-700 disabled:opacity-50 sm:px-3">Изучить кабинет</button>
          <a href={registrationHref} onClick={onRegistrationClick}
            className="rounded-lg bg-[#00658d] px-2.5 py-2 text-white hover:bg-[#005578] sm:px-4">Начать бесплатно</a>
        </div>
      </nav>
    </header>

    <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-4">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <h1 className="text-xl font-bold leading-tight tracking-tight sm:text-3xl">Одна смена — две стороны</h1>
        <span className="hidden rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline-block">Демо · тестовые данные</span>
      </div>
      <p className="mt-1 text-xs leading-snug text-slate-600 sm:text-sm">Водитель работает с телефона. Вы контролируете время, фото и документы.</p>

      <div className="my-2.5 sm:my-3">
        <select aria-label="Пример работы" value={key} disabled={locked} onChange={e => choose(e.target.value as DemoExampleId)}
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold sm:hidden">
          {choices.map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
        </select>
        <div className="hidden flex-wrap gap-2 sm:flex">
          {choices.map(([id, item]) => <button type="button" key={id} disabled={locked} aria-pressed={id === key} onClick={() => choose(id)}
            className={"rounded-full border px-4 py-1.5 text-sm font-semibold disabled:cursor-not-allowed " +
              (id === key ? "border-[#00658d] bg-[#00658d] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-blue-500")}>{item.label}</button>)}
        </div>
      </div>

      <section className="rounded-xl bg-[#071b2b] px-3 py-2.5 text-white sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3" aria-label="Требования к объекту">
        <div className="flex min-w-0 items-center gap-2">
          <SlidersHorizontal size={20} className="shrink-0 text-[#81c9f5]" aria-hidden="true"/>
          <div>
            <h2 className="text-xs font-bold leading-tight sm:text-sm">Руководитель задаёт требования к объекту</h2>
            <p className="mt-0.5 text-[10px] leading-tight text-[#c3d6e7] sm:text-xs">{activeShift ? "Требования закреплены за сменой" : "Выберите, какие подтверждения нужны"}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:mt-0 sm:gap-x-5 sm:text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#65e3b3]">
            <CheckCircle2 size={16} aria-hidden="true"/>Фотоотчёт
          </span>
          <label className="inline-flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={odometer} disabled={locked} onChange={e => changeRequirement("odometer", e.target.checked)} className="h-4 w-4 accent-emerald-500"/>
            Одометр
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={invoice} disabled={locked} onChange={e => changeRequirement("invoice", e.target.checked)} className="h-4 w-4 accent-emerald-500"/>
            Накладная
          </label>
        </div>
      </section>

      <div className="flex items-center justify-center gap-2 py-1 text-[#00658d]" aria-hidden="true"><ArrowDown size={16}/></div>

      <div className="grid items-start gap-2 md:grid-cols-[0.86fr_1.14fr] md:gap-4">
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#0a192f] text-white"><Smartphone size={19} aria-hidden="true"/></div>
            <div>
              <h2 className="text-sm font-bold sm:text-base">Водитель</h2>
              <p className="text-[10px] leading-tight text-slate-500 sm:text-xs">Мой рабочий день</p>
            </div>
            {shift && <span className="ml-auto rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800">{done ? "Смена завершена" : readyToWork ? "На смене" : "Начало смены"}</span>}
          </div>

          <div className="my-2 rounded-lg bg-slate-50 px-2.5 py-2 sm:my-3">
            <p className="font-bold leading-tight sm:text-base">{example.job}</p>
            <p className="mt-1 flex items-start gap-1.5 text-xs leading-tight text-slate-600"><Truck size={15} className="shrink-0 text-slate-500" aria-hidden="true"/>{example.truck}</p>
            <p className="mt-1 flex items-start gap-1.5 text-xs leading-tight text-slate-600"><MapPin size={15} className="shrink-0 text-slate-500" aria-hidden="true"/>{example.site}</p>
          </div>

          <ol className="grid grid-cols-3 gap-1.5 sm:block sm:space-y-1.5" aria-label="Действия водителя">
            <Step Icon={PlayCircle} label="Начало смены" state={readyToWork ? "done" : "current"}
              detail={readyToWork ? "Время зафиксировано · " + time(start) : awaiting === "start" ? "Нужен снимок одометра" : odometer ? "Отметка времени и одометр" : "Время фиксируется автоматически"}/>
            <Step Icon={Camera} label="Фото работы" state={shift && hasPhoto ? "done" : readyToWork ? "current" : "next"}
              detail={shift && hasPhoto ? example.caption : "Снимок результата с подписью"}/>
            <Step Icon={CheckCircle2} label="Окончание смены" state={done ? "done" : closeRequested || (readyToWork && hasPhoto) ? "current" : "next"}
              detail={done ? "Время и документы зафиксированы" : awaiting === "end" ? "Ожидается одометр после" : awaiting === "invoice" ? "Ожидается накладная" : "Часы и необходимые документы"}/>
          </ol>

          <button type="button" disabled={busy || (!shift && !!activeShift)} onClick={act}
            className="mt-2.5 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0a192f] px-2.5 py-2 text-xs font-bold text-white hover:bg-[#18334e] disabled:opacity-50 sm:mt-3 sm:min-h-11 sm:text-sm">
            <ActionIcon size={18} aria-hidden="true"/>{busy ? "Подготовка образца…" : action}
          </button>
          {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
        </section>

        <section className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-4" aria-label="Руководитель">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e6f3fa] text-[#00658d]"><ClipboardList size={19} aria-hidden="true"/></div>
            <div>
              <h2 className="text-sm font-bold sm:text-base">Руководитель</h2>
              <p className="text-[10px] leading-tight text-slate-500 sm:text-xs">Реестр смен и контроль техники</p>
            </div>
          </div>

          <div className="order-2 mt-2 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 sm:order-none sm:my-3 sm:px-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-500 sm:text-xs">Пример парка · 3 машины</p>
              <p className="text-xs font-semibold text-slate-700">На смене <strong className="text-lg font-bold text-[#00658d]">{activeCount}</strong> из 3</p>
            </div>
            <div className="flex items-center gap-1.5" aria-label={activeCount + " из трёх машин на смене"}>
              {[true, readyToWork && !done, false].map((active, i) => <span key={i}
                className={"grid h-7 w-8 place-items-center rounded-md " + (active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500")}>
                <Truck size={17} aria-hidden="true"/>
              </span>)}
            </div>
          </div>

          <div aria-live="polite" className="mt-2 rounded-lg border border-slate-200 p-2.5 sm:mt-0 sm:p-3">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <h3 className="text-xs font-bold sm:text-sm">{preview ? "Пример готового отчёта" : "Ваша демосмена"}</h3>
              <span className={"rounded-full px-2 py-1 text-[10px] font-semibold " + (preview || done || readyToWork ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800")}>
                {preview || done ? "Завершена" : awaiting === "start" ? "Ожидает одометр" : closeRequested ? "Ожидает документы" : "На смене"}
              </span>
            </div>

            <div className="mt-1.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight sm:text-base">{example.truck}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] leading-tight text-slate-600"><User size={12} className="shrink-0" aria-hidden="true"/>Алексей Смирнов · {example.site}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium tabular-nums"><Clock3 size={13} aria-hidden="true"/>{time(start)}{end ? " – " + time(end) : ""}</p>
                <p className="text-[10px] text-slate-500">Условное время · МСК</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-medium text-slate-500">{end ? "Отработано" : "Учёт времени"}</p>
                {end ? <p className="text-lg font-extrabold leading-none tabular-nums text-emerald-700 sm:text-3xl">{duration}</p> :
                  <p className="text-sm font-bold text-[#00658d]">{awaiting === "start" ? "Ожидание" : closeRequested ? "Завершение" : "Идёт смена"}</p>}
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:mt-3 sm:grid-cols-4" aria-label="Контроль подтверждений">
              <Proof label="Фотоотчёт" received={hasPhoto} required Icon={Camera}/>
              <Proof label="Одометр до" received={startProof} required={odometer} Icon={Gauge}/>
              <Proof label="Одометр после" received={endProof} required={odometer} Icon={Gauge}/>
              <Proof label="Накладная" received={invoiceProof} required={invoice} Icon={FileText}/>
            </div>

            {hasPhoto ? <figure className="mt-2 flex min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:mt-3 sm:gap-3">
              <img src={"/demo-samples/" + key + ".webp"} alt={example.caption} className="h-[74px] w-[40%] shrink-0 object-cover sm:h-[104px] sm:w-[44%]"/>
              <figcaption className="min-w-0 py-1.5 pr-2">
                <p className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 sm:text-xs"><CheckCircle2 size={14} className="shrink-0" aria-hidden="true"/>Фото работы получено</p>
                <p className="mt-1 text-xs font-semibold leading-snug sm:text-sm">{example.caption}</p>
                <p className="mt-1 text-[10px] leading-tight text-slate-500">{end ? "Сохранено в истории смены" : "Привязано к этой смене"}</p>
              </figcaption>
            </figure> : <div className="mt-2 flex min-h-[74px] items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 sm:mt-3 sm:min-h-[104px]">
              <Camera size={24} className="shrink-0 text-[#00658d]" aria-hidden="true"/>
              <div>
                <p className="text-xs font-semibold sm:text-sm">Ожидается фото работы</p>
                <p className="text-[11px] text-slate-600">Снимок и подпись появятся здесь после действия водителя.</p>
              </div>
            </div>}
          </div>

          <div className="order-3 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-semibold text-slate-700 sm:order-none sm:mt-3 sm:text-xs">
            <span className="flex items-center gap-1"><ClipboardList size={15} className="text-[#00658d]" aria-hidden="true"/>История смен</span>
            <span className="flex items-center gap-1"><FileSpreadsheet size={15} className="text-emerald-700" aria-hidden="true"/>Excel</span>
            <span className="flex items-center gap-1"><Archive size={15} className="text-[#00658d]" aria-hidden="true"/>Архив фото</span>
            <span className="text-[10px] font-normal text-slate-500">Экспорт с тарифа «Старт»</span>
          </div>
        </section>
      </div>
      <p className="mt-2 text-center text-[10px] leading-tight text-slate-500 sm:text-xs">В демо используются образцы фото и условное время. Реальные смены не создаются.</p>
    </div>
  </main>;
}
