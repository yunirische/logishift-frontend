import React, { useEffect, useState } from "react";
import { getOwnerTraffic } from "../services/api";
import { OwnerTrafficReport, TrafficWindow } from "../types";

const percent = (n: number | null) => n === null ? "—" : `${n.toLocaleString("ru-RU")}%`;
const date = (value: string) => new Date(value).toLocaleString("ru-RU");

export default function OwnerTraffic() {
  const [period, setPeriod] = useState<TrafficWindow>("24h");
  const [report, setReport] = useState<OwnerTrafficReport | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setReport(null);
    setError(false);
    getOwnerTraffic(period).then(data => {
      if (!cancelled) setReport(data);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [period, reload]);
  const m = report?.external;
  return <section aria-label="Привлечение и регистрации" className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Привлечение и регистрации</h2>
      <div className="flex flex-wrap gap-1" aria-label="Период статистики">
        {(["24h", "7d", "30d"] as const).map((value, i) =>
          <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}
            className={`min-h-11 rounded-md px-3 text-sm ${period === value ? "bg-slate-950 text-white" : "bg-slate-100"}`}>
            {["24 часа", "7 дней", "30 дней"][i]}
          </button>)}
        <button type="button" className="min-h-11 px-3 text-sm underline" onClick={() => setReload(n => n + 1)}>Обновить статистику</button>
      </div>
    </div>
    <p className="mt-2 text-sm text-slate-600">Внешние сессии без явной внутренней метки. Сессия длится до 4 часов; это не число людей.</p>
    {error ? <p role="alert" className="mt-4 text-amber-800">Статистика временно недоступна. Попробуйте обновить.</p>
      : !report || !m ? <p role="status" className="mt-4">Загрузка статистики…</p> : <>
      <p className="mt-2 text-xs text-slate-500">
        Начало сессии: {date(report.effectiveStart)} — {date(report.generatedAt)} (местное время).
        {report.effectiveStart === report.cohortStart && " Период ограничен запуском измерения 19 октября 2026; более ранние данные не смешиваются."}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
        {[
          ["Внешние сессии", m.sessions], ["Сессии демо", m.demo],
          ["Сессии регистрации", m.registration], ["Созданные компании", m.tenants],
          ["Лендинг → компания", percent(m.landingToTenant)],
        ].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3">
          <dt className="text-xs text-slate-600">{label}</dt><dd className="mt-1 text-2xl font-semibold">{value}</dd>
        </div>)}
      </dl>
      {m.sessions === 0 && <p className="mt-3 text-sm">За этот период внешние сессии не зафиксированы. Это не доказывает отсутствие посещений.</p>}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Охват этапов</h3>
          <dl className="mt-2 space-y-2 text-sm">
            {[
              ["Открыли лендинг", m.landing],
              ["Открыли демо", m.demo],
              ["Начали смену в демо", m.engagedDemo],
              ["Открыли регистрацию", m.registration],
              ["Сессии с созданием компании", m.convertedSessions],
            ].map(([label, value]) => <div key={label} className="flex justify-between gap-3 border-b border-slate-100 pb-1">
              <dt>{label}</dt><dd className="font-semibold">{value}</dd></div>)}
          </dl>
          <p className="mt-2 text-xs text-slate-500">Демо — необязательная ветка. Здесь охват в одной сессии, а не доказанный порядок действий.</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Переходы и конверсия</h3>
          <dl className="mt-2 space-y-2 text-sm">
            {[
              ["Лендинг → демо", percent(m.landingToDemo)],
              ["Лендинг → регистрация", percent(m.landingToRegistration)],
              ["Регистрация → компания", percent(m.registrationToTenant)],
              ["Нажали «Демо» на лендинге", m.demoClicks],
              ["Нажали регистрацию на лендинге", m.registrationClicks],
            ].map(([label, value]) => <div key={label} className="flex justify-between gap-3 border-b border-slate-100 pb-1">
              <dt>{label}</dt><dd className="font-semibold">{value}</dd></div>)}
          </dl>
          <p className="mt-2 text-xs text-slate-500">CR — доля сессий первого этапа, где также зафиксирован второй. Клики — число сессий; «—» означает отсутствие знаменателя.</p>
        </div>
      </div>
      <h3 className="mt-5 text-sm font-semibold">Источники, кампании и креативы</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-slate-50"><tr>{["Источник / канал", "Кампания", "Креатив", "Сессии", "Демо", "Регистрация", "Компании", "CR"].map(label =>
            <th key={label} className="p-2 font-semibold">{label}</th>)}</tr></thead>
          <tbody>{report.segments.map((s, index) => <tr key={index} className="border-b border-slate-100">
            <td className="max-w-48 break-words p-2">{s.source || "Без атрибуции / direct"} / {s.medium || "—"}</td>
            <td className="max-w-48 break-words p-2">{s.campaign || "—"}</td>
            <td className="max-w-40 break-words p-2">{s.content || "—"}</td>
            {[s.sessions, s.demo, s.registration, s.tenants, percent(s.sessionToTenant)].map((value, i) => <td key={i} className="p-2 tabular-nums">{value}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">Первая записанная UTM-разметка сессии. CR — сессии с созданием компании / все сессии строки. Без UTM нельзя отличить прямой заход от неразмеченного источника.</p>
      <details className="mt-4 rounded-lg border border-slate-200 p-3 text-sm">
        <summary className="cursor-pointer font-semibold">Внутренний трафик и полнота данных</summary>
        <p className="mt-2">Исключены внутренние сессии: {report.internal.sessions}; демо: {report.internal.demo}; регистрация: {report.internal.registration}.</p>
        <p className="mt-2">Регистрации компаний без связи с сессией: {report.unlinkedRegistrations}. В KPI и CR выше не включены.</p>
        <p className="mt-2 text-xs text-slate-600">Внутренние: явная метка, источник internal или регистрация защищённой компании.
          Старые клиенты, блокировка хранилища/сети и непомеченные проверки могут снижать полноту.
          История ограничена сроком хранения событий; поздние действия меняют текущую когорту. Боты отдельно не определяются.</p>
      </details>
    </>}
  </section>;
}
