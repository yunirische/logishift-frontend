import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Building2, Check, Copy, Loader2, Shield } from "lucide-react";
import {
  ApiError,
  endOwnerPilot,
  extendOwnerPilot,
  getOwnerTenantDetail,
  grantOwnerPilot,
  OwnerPilotDurationDays,
  OwnerPilotPlanCode,
  OwnerPilotSourceChannel,
} from "../services/api";
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

const attentionClasses = (severity: "info" | "warning" | "critical") => {
  switch (severity) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-900";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    default:
      return "border-sky-200 bg-sky-50 text-sky-900";
  }
};

const BooleanLabel = ({ value, yes, no = "Нет" }: { value: boolean; yes: string; no?: string }) => (
  <span className={value ? "text-emerald-700" : "text-slate-500"}>{value ? yes : no}</span>
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

type PilotAction = "grant" | "extend" | "end";

type GrantPayload = {
  planCode: OwnerPilotPlanCode;
  durationDays: OwnerPilotDurationDays;
  sourceChannel: OwnerPilotSourceChannel;
  reason: string;
};

type ExtendPayload = {
  durationDays: OwnerPilotDurationDays;
  reason: string;
};

type EndPayload = { reason: string };
type PilotPayload = GrantPayload | ExtendPayload | EndPayload;
type PendingPilotAttempt = { action: PilotAction; operationId: string; payload: PilotPayload };

const PILOT_DURATIONS: OwnerPilotDurationDays[] = [14, 30, 60, 90];
const PILOT_PLANS: Array<{ value: OwnerPilotPlanCode; label: string }> = [
  { value: "start", label: "Старт" },
  { value: "business", label: "Бизнес" },
  { value: "company", label: "Компания" },
];
const PILOT_SOURCES: Array<{ value: OwnerPilotSourceChannel; label: string }> = [
  { value: "direct", label: "direct" },
  { value: "community", label: "community" },
  { value: "product_radar", label: "product_radar" },
  { value: "referral", label: "referral" },
  { value: "other", label: "other" },
];

const createOperationId = () => crypto.randomUUID();

const pilotActionError = (error: unknown) => {
  const status = (error as ApiError).status;
  if (status === 400) return "Проверьте данные пилота и попробуйте снова.";
  if (status === 401 || status === 403) return "Нет доступа к управлению пилотом.";
  if (status === 404) return "Тенант или тариф не найден.";
  if (status === 409) return "Действие невозможно: данные пилота уже изменились или конфликтуют с текущим тарифом.";
  return "Не удалось отправить запрос. Повторите попытку.";
};

const isNetworkError = (error: unknown) => !(error as ApiError).status;
const samePilotPayload = (left: PilotPayload, right: PilotPayload) =>
  JSON.stringify(left) === JSON.stringify(right);

const PilotModal = ({
  action,
  submitting,
  error,
  retryAvailable,
  onClose,
  onSubmit,
  onRetry,
  onInputChange,
}: {
  action: PilotAction;
  submitting: boolean;
  error: string | null;
  retryAvailable: boolean;
  onClose: () => void;
  onSubmit: (payload: PilotPayload) => void;
  onRetry: () => void;
  onInputChange: () => void;
}) => {
  const [planCode, setPlanCode] = useState<OwnerPilotPlanCode>("start");
  const [durationDays, setDurationDays] = useState<OwnerPilotDurationDays>(30);
  const [sourceChannel, setSourceChannel] = useState<OwnerPilotSourceChannel>("direct");
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const isGrant = action === "grant";
  const isEnd = action === "end";
  const title = isGrant ? "Выдать пилот" : isEnd ? "Завершить пилот" : "Продлить пилот";

  const changeReason = (value: string) => {
    setReason(value);
    setValidationError(null);
    onInputChange();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3 || normalizedReason.length > 500) {
      setValidationError("Причина должна содержать от 3 до 500 символов.");
      return;
    }

    if (isGrant) {
      onSubmit({ planCode, durationDays, sourceChannel, reason: normalizedReason });
    } else if (isEnd) {
      onSubmit({ reason: normalizedReason });
    } else {
      onSubmit({ durationDays, reason: normalizedReason });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="pilot-modal-title">
      <form className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl" onSubmit={handleSubmit}>
        <h2 id="pilot-modal-title" className="text-xl font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {isEnd ? "Подтвердите завершение текущего пилота." : "Изменение будет применено только после подтверждения."}
        </p>

        <div className="mt-5 space-y-4">
          {isGrant ? (
            <>
              <label className="block text-sm font-medium text-slate-700" htmlFor="pilot-plan">
                Тариф
                <select id="pilot-plan" className="mt-1 block w-full rounded border border-slate-300 px-3 py-2" value={planCode} onChange={(event) => { setPlanCode(event.target.value as OwnerPilotPlanCode); onInputChange(); }} disabled={submitting}>
                  {PILOT_PLANS.map((plan) => <option key={plan.value} value={plan.value}>{plan.label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700" htmlFor="pilot-source">
                Источник
                <select id="pilot-source" className="mt-1 block w-full rounded border border-slate-300 px-3 py-2" value={sourceChannel} onChange={(event) => { setSourceChannel(event.target.value as OwnerPilotSourceChannel); onInputChange(); }} disabled={submitting}>
                  {PILOT_SOURCES.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
                </select>
              </label>
            </>
          ) : null}
          {!isEnd ? (
            <label className="block text-sm font-medium text-slate-700" htmlFor="pilot-duration">
              Срок
              <select id="pilot-duration" className="mt-1 block w-full rounded border border-slate-300 px-3 py-2" value={durationDays} onChange={(event) => { setDurationDays(Number(event.target.value) as OwnerPilotDurationDays); onInputChange(); }} disabled={submitting}>
                {PILOT_DURATIONS.map((duration) => <option key={duration} value={duration}>{duration} дней</option>)}
              </select>
            </label>
          ) : null}
          <label className="block text-sm font-medium text-slate-700" htmlFor="pilot-reason">
            Причина
            <textarea id="pilot-reason" className="mt-1 block min-h-24 w-full rounded border border-slate-300 px-3 py-2" value={reason} onChange={(event) => changeReason(event.target.value)} disabled={submitting} maxLength={500} />
          </label>
          {validationError ? <p className="text-sm text-red-700" role="alert">{validationError}</p> : null}
          {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" onClick={onClose} disabled={submitting}>Отмена</button>
          {retryAvailable ? <button type="button" className="rounded bg-[#006497] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={onRetry} disabled={submitting}>Повторить запрос</button> : null}
          <button type="submit" className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={submitting}>{isEnd ? "Подтвердить завершение" : "Подтвердить"}</button>
        </div>
      </form>
    </div>
  );
};

const OwnerTenantDetailView: React.FC<OwnerTenantDetailViewProps> = ({ tenantId }) => {
  const [detail, setDetail] = useState<OwnerTenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [modalAction, setModalAction] = useState<PilotAction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAttempt, setPendingAttempt] = useState<PendingPilotAttempt | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState(false);
  const submissionInFlight = useRef(false);

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

  const {
    tenant,
    health,
    attention,
    storedPlan,
    effectiveEntitlement,
    usage,
    shifts,
    usersSummary,
    users,
    resources,
    recentTrucks,
    recentSites,
    recentShifts,
    invitesSummary,
    pilot,
    billing,
    attribution,
    timeline,
  } = detail;
  const isProtectedTenant = tenant.id === 1 || tenant.id === 999;
  const hasActivePilot = pilot?.status === "active";

  const copySummary = async () => {
    const summary = [
      `Компания: ${tenant.name}`,
      `ID: ${tenant.id}`,
      `Состояние: ${health.label}`,
      `Тариф: ${effectiveEntitlement.plan.name}`,
      `Пользователи: ${usersSummary.admins} администратор, ${usersSummary.foremen} диспетчер, ${usersSummary.drivers} водитель`,
      `Техника: ${usage.trucks.current}/${formatLimit(usage.trucks.limit)}`,
      `Объекты: ${usage.sites.current}/${formatLimit(usage.sites.limit)}`,
      `Смены: ${shifts.active} активных, ${shifts.finished} завершённых, ${shifts.stuck} проблемных`,
      `Последняя активность: ${formatDateTime(health.lastActivityAt)}`,
      `Требует внимания: ${attention.length ? attention.map((item) => item.title).join("; ") : "Нет"}`,
    ].join("\n");

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary);
      } else {
        const element = document.createElement("textarea");
        element.value = summary;
        element.setAttribute("readonly", "");
        element.style.position = "fixed";
        element.style.opacity = "0";
        document.body.appendChild(element);
        element.select();
        document.execCommand("copy");
        element.remove();
      }
      setCopyNotice(true);
      window.setTimeout(() => setCopyNotice(false), 2500);
    } catch {
      setCopyNotice(false);
    }
  };

  const openPilotModal = (action: PilotAction) => {
    setModalAction(action);
    setActionError(null);
    setActionNotice(null);
    setPendingAttempt(null);
  };

  const closePilotModal = () => {
    if (submitting) return;
    setModalAction(null);
    setActionError(null);
    setPendingAttempt(null);
  };

  const invalidateRetry = () => {
    if (pendingAttempt) setPendingAttempt(null);
    if (actionError) setActionError(null);
  };

  const submitPilotAction = async (payload: PilotPayload, retry?: PendingPilotAttempt) => {
    if (!modalAction || submitting || submissionInFlight.current) return;
    const retainedAttempt = pendingAttempt && pendingAttempt.action === modalAction && samePilotPayload(pendingAttempt.payload, payload)
      ? pendingAttempt
      : null;
    const attempt = retry || retainedAttempt || { action: modalAction, operationId: createOperationId(), payload };
    setPendingAttempt(attempt);
    submissionInFlight.current = true;
    setSubmitting(true);
    setActionError(null);

    try {
      if (attempt.action === "grant") {
        await grantOwnerPilot(tenant.id, attempt.payload as GrantPayload, attempt.operationId);
      } else if (attempt.action === "extend") {
        await extendOwnerPilot(tenant.id, attempt.payload as ExtendPayload, attempt.operationId);
      } else {
        await endOwnerPilot(tenant.id, attempt.payload as EndPayload, attempt.operationId);
      }
      const refreshed = await getOwnerTenantDetail(tenant.id);
      setDetail(refreshed);
      setModalAction(null);
      setPendingAttempt(null);
      setActionNotice("Данные пилота обновлены.");
    } catch (error) {
      if (!isNetworkError(error)) setPendingAttempt(null);
      setActionError(pilotActionError(error));
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-slate-700" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{isProtectedTenant ? "Защищённый тенант" : "Обзор тенанта"}</p>
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Состояние запуска</p>
              <p className="mt-2 text-2xl font-semibold">{health.label}</p>
              <p className="mt-1 text-sm text-slate-300">Последняя активность: {formatDateTime(health.lastActivityAt)}</p>
            </div>
            <button type="button" onClick={() => { void copySummary(); }} className="inline-flex items-center justify-center gap-2 rounded border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
              {copyNotice ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copyNotice ? "Сводка скопирована" : "Скопировать сводку"}
            </button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div><p className="text-sm text-slate-300">ID</p><p className="mt-1 font-mono text-xl font-semibold">{tenant.id}</p></div>
            <div><p className="text-sm text-slate-300">Название</p><p className="mt-1 text-xl font-semibold">{tenant.name}</p></div>
            <div><p className="text-sm text-slate-300">Внимание</p><p className="mt-1 text-xl font-semibold">{health.attentionCount || "Нет"}</p></div>
          </div>
        </section>

        <Section title="Требует внимания">
          {attention.length ? (
            <div className="space-y-3">
              {attention.map((item) => (
                <div key={item.code} className={`rounded-lg border p-4 ${attentionClasses(item.severity)}`}>
                  <div className="flex gap-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-sm leading-5 opacity-90">{item.description}</p></div></div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-600">Сейчас нет пунктов, требующих внимания.</p>}
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Тариф в настройках"><PlanSummary plan={storedPlan} /></Section>
          <Section title="Фактически действует">
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

        <Section title="Пользователи">
          <p className="text-sm text-slate-600">
            Всего: {usersSummary.total}. Администраторы: {usersSummary.admins}, диспетчеры: {usersSummary.foremen}, водители: {usersSummary.drivers}{usersSummary.other ? `, другие роли: ${usersSummary.other}` : ""}.
          </p>
          {users.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-[10px] font-bold uppercase tracking-widest text-slate-500"><tr><th className="pb-3 pr-4">Пользователь</th><th className="pb-3 pr-4">Роль</th><th className="pb-3 pr-4">Email</th><th className="pb-3 pr-4">Telegram</th><th className="pb-3">Активность</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => <tr key={user.id}><td className="py-3 pr-4 font-medium">{user.name}</td><td className="py-3 pr-4">{user.roleLabel}</td><td className="py-3 pr-4"><BooleanLabel value={user.hasEmail} yes="Есть" /></td><td className="py-3 pr-4"><BooleanLabel value={user.hasTelegram} yes="Подключён" /></td><td className="py-3 text-slate-600">{formatDateTime(user.activityAt)}</td></tr>)}
                </tbody>
              </table>
            </div>
          ) : <p className="mt-3 text-sm text-slate-600">Пользователей пока нет.</p>}
        </Section>

        <Section title="Последние смены">
          {recentShifts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-[10px] font-bold uppercase tracking-widest text-slate-500"><tr><th className="pb-3 pr-4">Статус</th><th className="pb-3 pr-4">Водитель</th><th className="pb-3 pr-4">Техника</th><th className="pb-3 pr-4">Объект</th><th className="pb-3 pr-4">Время</th><th className="pb-3 pr-4">Фото</th><th className="pb-3 pr-4">Комментарий</th><th className="pb-3">Предупреждение</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {recentShifts.map((shift) => <tr key={shift.id}><td className="py-3 pr-4 font-medium">{shift.statusLabel}</td><td className="py-3 pr-4">{shift.driverName}</td><td className="py-3 pr-4">{shift.truckName || "—"}</td><td className="py-3 pr-4">{shift.siteName || "—"}</td><td className="py-3 pr-4 text-xs text-slate-600">{formatDateTime(shift.startedAt || shift.updatedAt)}</td><td className="py-3 pr-4">{[shift.hasStartPhoto, shift.hasEndPhoto, shift.hasInvoicePhoto].filter(Boolean).length || "Нет"}</td><td className="py-3 pr-4"><BooleanLabel value={shift.hasComment} yes="Есть" /></td><td className="py-3">{shift.durationWarning ? <span className="font-semibold text-red-700">Проверить</span> : "—"}</td></tr>)}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-slate-600">Смен пока нет.</p>}
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Техника и объекты">
            <dl><DetailRow label="Техника" value={`${resources.trucks.active} активна из ${resources.trucks.total}; занята: ${resources.trucks.busy}`} /><DetailRow label="Объекты" value={`${resources.sites.active} активны из ${resources.sites.total}`} /></dl>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><h3 className="text-sm font-semibold">Последняя техника</h3>{recentTrucks.length ? <ul className="mt-2 space-y-2 text-sm text-slate-600">{recentTrucks.map((truck) => <li key={truck.id}>{truck.name}{truck.plate ? ` · ${truck.plate}` : ""}{!truck.active ? " · неактивна" : ""}{truck.busy ? " · занята" : ""}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Нет данных</p>}</div>
              <div><h3 className="text-sm font-semibold">Последние объекты</h3>{recentSites.length ? <ul className="mt-2 space-y-2 text-sm text-slate-600">{recentSites.map((site) => <li key={site.id}>{site.name}{!site.active ? " · неактивен" : ""}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Нет данных</p>}</div>
            </div>
          </Section>
          <Section title="Приглашения">
            <dl><DetailRow label="Ожидают" value={invitesSummary.pending} /><DetailRow label="Принято" value={invitesSummary.accepted} /><DetailRow label="Отозвано" value={invitesSummary.revoked} /><DetailRow label="Истекло" value={invitesSummary.expired} /><DetailRow label="Истекает скоро" value={invitesSummary.expiringSoon} /></dl>
          </Section>
        </div>

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
            {!isProtectedTenant ? (
              <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                {hasActivePilot ? (
                  <>
                    <button type="button" className="rounded bg-[#006497] px-4 py-2 text-sm font-semibold text-white" onClick={() => openPilotModal("extend")}>Продлить</button>
                    <button type="button" className="rounded border border-red-300 px-4 py-2 text-sm font-semibold text-red-700" onClick={() => openPilotModal("end")}>Завершить</button>
                  </>
                ) : <button type="button" className="rounded bg-[#006497] px-4 py-2 text-sm font-semibold text-white" onClick={() => openPilotModal("grant")}>Выдать пилот</button>}
              </div>
            ) : null}
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
          <Section title="Последние события">
            {timeline.length ? (
              <ul className="divide-y divide-slate-100">
                {timeline.map((event) => (
                  <li key={event.id} className="py-3 text-sm">
                    <p className="font-medium">{event.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{event.description ? `${event.description} · ` : ""}{formatDateTime(event.occurredAt)}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-600">Событий нет.</p>}
          </Section>
        </div>
      </main>
      {actionNotice ? <div className="fixed bottom-5 right-5 rounded bg-emerald-700 px-4 py-3 text-sm font-semibold text-white" role="status">{actionNotice}</div> : null}
      {modalAction ? (
        <PilotModal
          key={modalAction}
          action={modalAction}
          submitting={submitting}
          error={actionError}
          retryAvailable={Boolean(pendingAttempt && actionError)}
          onClose={closePilotModal}
          onSubmit={(payload) => { void submitPilotAction(payload); }}
          onRetry={() => { if (pendingAttempt) void submitPilotAction(pendingAttempt.payload, pendingAttempt); }}
          onInputChange={invalidateRetry}
        />
      ) : null}
    </div>
  );
};

export default OwnerTenantDetailView;
