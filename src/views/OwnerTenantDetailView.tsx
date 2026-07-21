import React, { useEffect, useState } from "react";
import { ArrowLeft, Building2, Loader2, Shield } from "lucide-react";
import { ApiError, getOwnerTenantDetail } from "../services/api";
import {
  OwnerEntitlementSource,
  OwnerTenantDetail,
  OwnerTenantPlan,
  OwnerUsageMetric,
} from "../types";

type OwnerTenantDetailViewProps = {
  tenantId: number;
};

const formatDateTime = (value: string | null) => {
  if (!value) return "Нет данных";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Нет данных";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency || "RUB",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);

const formatLimit = (limit: number) => (limit === -1 ? "Без ограничений" : String(limit));

const sourceLabel = (source: OwnerEntitlementSource) => {
  switch (source) {
    case "paid":
      return "Оплаченный";
    case "pilot":
      return "Пилотный";
    case "individual":
      return "Индивидуальный";
    case "internal_demo":
      return "Внутренний";
    case "free":
    default:
      return "Бесплатный";
  }
};

const pilotStatusLabel = (status: string) => {
  switch (status) {
    case "active":
      return "Активен";
    case "expired":
      return "Истёк";
    case "revoked":
      return "Завершён";
    case "superseded_by_paid":
      return "Заменён оплатой";
    default:
      return "Неизвестно";
  }
};

const paymentStatusLabel = (status: string) => {
  switch (status) {
    case "succeeded":
    case "paid":
      return "Оплачен";
    case "pending":
      return "Ожидает оплаты";
    case "canceled":
    case "cancelled":
      return "Отменён";
    default:
      return status || "Статус уточняется";
  }
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
    <h2 className="border-b border-slate-200 px-5 py-4 text-lg font-semibold">{title}</h2>
    <div className="p-5">{children}</div>
  </section>
);

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-5 border-b border-slate-100 py-3 last:border-0">
    <dt className="text-sm text-slate-500">{label}</dt>
    <dd className="text-right text-sm font-medium text-slate-900">{value}</dd>
  </div>
);

const PlanSummary = ({ plan }: { plan: OwnerTenantPlan }) => (
  <dl>
    <DetailRow label="Тариф" value={`${plan.name} (${plan.code})`} />
    <DetailRow label="Водители" value={formatLimit(plan.limitDrivers)} />
    <DetailRow label="Техника" value={formatLimit(plan.limitMachines)} />
    <DetailRow label="Объекты" value={formatLimit(plan.limitSites)} />
  </dl>
);

const UsageRow = ({ label, usage }: { label: string; usage: OwnerUsageMetric }) => (
  <div className="rounded-lg border border-slate-200 p-4">
    <p className="text-sm font-semibold text-slate-900">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-slate-950">
      {usage.current} <span className="text-base font-medium text-slate-500">/ {formatLimit(usage.limit)}</span>
    </p>
    {usage.overLimit ? (
      <p className="mt-2 text-xs font-semibold text-red-700">Превышен лимит</p>
    ) : (
      <p className="mt-2 text-xs text-slate-500">В пределах лимита</p>
    )}
  </div>
);

const ErrorState = ({ status }: { status: number | null }) => {
  const title = status === 404
    ? "Тенант не найден"
    : status === 401 || status === 403
      ? "Нет доступа к данным тенанта"
      : "Данные тенанта временно недоступны";
  const description = status === 404
    ? "Проверьте адрес или вернитесь к списку тенантов."
    : status === 401 || status === 403
      ? "Доступ к этому разделу выдается отдельно."
      : "Попробуйте открыть страницу позже.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Shield className="mx-auto h-10 w-10 text-slate-700" />
        <h1 className="mt-5 text-xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        <a className="mt-6 inline-flex items-center gap-2 font-semibold text-[#006497] hover:text-[#004f79]" href="/owner">
          <ArrowLeft className="h-4 w-4" />
          К списку тенантов
        </a>
      </div>
    </div>
  );
};

const OwnerTenantDetailView: React.FC<OwnerTenantDetailViewProps> = ({ tenantId }) => {
  const [detail, setDetail] = useState<OwnerTenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setErrorStatus(null);
        const result = await getOwnerTenantDetail(tenantId);
        if (!cancelled) setDetail(result);
      } catch (error) {
        if (!cancelled) setErrorStatus((error as ApiError).status || 500);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Загрузка тенанта
        </div>
      </div>
    );
  }

  if (!detail || errorStatus) return <ErrorState status={errorStatus} />;

  const { tenant, storedPlan, effectiveEntitlement, usage, shifts, pilot, billing, attribution, recentAudit } = detail;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-slate-700" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Тенант</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{tenant.name}</h1>
            </div>
          </div>
          <a className="inline-flex items-center gap-2 text-sm font-semibold text-[#006497] hover:text-[#004f79]" href="/owner">
            <ArrowLeft className="h-4 w-4" />
            К списку тенантов
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <section className="rounded-lg bg-slate-950 p-6 text-white shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Read-only</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div><p className="text-sm text-slate-300">ID</p><p className="mt-1 font-mono text-xl font-semibold">{tenant.id}</p></div>
            <div><p className="text-sm text-slate-300">Название</p><p className="mt-1 text-xl font-semibold">{tenant.name}</p></div>
            <div><p className="text-sm text-slate-300">Часовой пояс</p><p className="mt-1 text-xl font-semibold">{tenant.timezone || "Нет данных"}</p></div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Сохранённый тариф"><PlanSummary plan={storedPlan} /></Section>
          <Section title="Действующее право">
            <dl>
              <DetailRow label="Источник" value={sourceLabel(effectiveEntitlement.source)} />
              <DetailRow label="Тариф" value={`${effectiveEntitlement.plan.name} (${effectiveEntitlement.plan.code})`} />
              <DetailRow label="Начало" value={formatDateTime(effectiveEntitlement.startsAt)} />
              <DetailRow label="Окончание" value={formatDateTime(effectiveEntitlement.expiresAt)} />
            </dl>
          </Section>
        </div>

        <Section title="Использование">
          <div className="grid gap-4 md:grid-cols-3">
            <UsageRow label="Водители" usage={usage.drivers} />
            <UsageRow label="Техника" usage={usage.trucks} />
            <UsageRow label="Объекты" usage={usage.sites} />
          </div>
        </Section>

        <Section title="Смены">
          <div className="grid gap-4 md:grid-cols-3">
            <UsageRow label="Активные" usage={{ current: shifts.active, limit: -1, overLimit: false }} />
            <UsageRow label="Завершённые" usage={{ current: shifts.finished, limit: -1, overLimit: false }} />
            <UsageRow label="Проблемные" usage={{ current: shifts.stuck, limit: -1, overLimit: false }} />
          </div>
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Пилот">
            {pilot ? (
              <dl>
                <DetailRow label="Статус" value={pilotStatusLabel(pilot.status)} />
                <DetailRow label="Тариф" value={`${pilot.plan.name} (${pilot.plan.code})`} />
                <DetailRow label="Начало" value={formatDateTime(pilot.startsAt)} />
                <DetailRow label="Окончание" value={formatDateTime(pilot.expiresAt)} />
                <DetailRow label="Источник" value={pilot.sourceChannel} />
              </dl>
            ) : <p className="text-sm text-slate-600">Пилот не выдан.</p>}
          </Section>
          <Section title="Оплата">
            {billing.activePaidSubscription ? (
              <dl>
                <DetailRow label="Активная подписка" value={`${billing.activePaidSubscription.plan.name} (${billing.activePaidSubscription.plan.code})`} />
                <DetailRow label="Окончание" value={formatDateTime(billing.activePaidSubscription.expiresAt)} />
              </dl>
            ) : <p className="text-sm text-slate-600">Нет активной оплаченной подписки.</p>}
            <h3 className="mt-5 text-sm font-semibold">Последние платежи</h3>
            {billing.recentPayments.length ? (
              <ul className="mt-3 divide-y divide-slate-100">
                {billing.recentPayments.map((payment) => (
                  <li key={payment.id} className="py-3 text-sm">
                    <div className="flex justify-between gap-4"><span className="font-medium">{payment.plan?.name || "Тариф не указан"}</span><span>{formatMoney(payment.amount, payment.currency)}</span></div>
                    <p className="mt-1 text-xs text-slate-500">{paymentStatusLabel(payment.status)} · {formatDateTime(payment.paidAt || payment.createdAt)}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-slate-600">Платежей нет.</p>}
          </Section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="UTM-атрибуция">
            <dl>
              <DetailRow label="Источник" value={attribution.utmSource || "Нет данных"} />
              <DetailRow label="Кампания" value={attribution.utmCampaign || "Нет данных"} />
              <DetailRow label="Термин" value={attribution.utmTerm || "Нет данных"} />
            </dl>
          </Section>
          <Section title="Последние безопасные события">
            {recentAudit.length ? (
              <ul className="divide-y divide-slate-100">
                {recentAudit.map((event) => (
                  <li key={event.id} className="py-3 text-sm">
                    <p className="font-medium">{event.action}</p>
                    <p className="mt-1 text-xs text-slate-500">{event.entity}{event.entityId === null ? "" : ` #${event.entityId}`} · {formatDateTime(event.createdAt)}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-600">Безопасных событий нет.</p>}
          </Section>
        </div>
      </main>
    </div>
  );
};

export default OwnerTenantDetailView;
