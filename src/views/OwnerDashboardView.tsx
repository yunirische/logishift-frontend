import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Clock,
  CreditCard,
  Database,
  Loader2,
  Server,
  Shield,
  Users,
} from "lucide-react";
import {
  ApiError,
  getOwnerSummary,
  getOwnerTenants,
} from "../services/api";
import { OwnerSummary, OwnerTenantRow } from "../types";

const formatDateTime = (value?: string | null) => {
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

const formatStatus = (status?: string) => {
  switch (status) {
    case "active":
      return "Активна";
    case "expired":
      return "Истекла";
    default:
      return "Неизвестно";
  }
};

const statusClasses = (status?: string) =>
  status === "expired"
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";

const StatCard = ({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ElementType;
}) => (
  <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {label}
        </p>
        <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
      </div>
      <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
        <Icon className="h-5 w-5" />
      </div>
    </div>
    <p className="mt-3 text-sm leading-5 text-slate-600">{detail}</p>
  </div>
);

const OwnerDashboardView: React.FC = () => {
  const [summary, setSummary] = useState<OwnerSummary | null>(null);
  const [tenants, setTenants] = useState<OwnerTenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setErrorStatus(null);
        const [summaryData, tenantData] = await Promise.all([
          getOwnerSummary(),
          getOwnerTenants(),
        ]);

        if (!cancelled) {
          setSummary(summaryData);
          setTenants(tenantData);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorStatus((error as ApiError).status || 500);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const renderAccessState = () => {
    const isDisabled = errorStatus === 404;
    const isForbidden = errorStatus === 403;

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-xl font-semibold text-slate-950">
            {isDisabled
              ? "Панель владельца отключена"
              : isForbidden
                ? "Нет доступа к панели владельца"
                : "Панель владельца недоступна"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Доступ к этому разделу выдается отдельно и не связан с ролью
            администратора внутри тенанта.
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Загрузка панели владельца
        </div>
      </div>
    );
  }

  if (!summary || errorStatus) {
    return renderAccessState();
  }

  const paymentTotal = Object.values(summary.billing.payments_by_status).reduce(
    (sum, value) => sum + value,
    0
  );
  const providerEventTotal = Object.values(
    summary.billing.provider_events_by_status
  ).reduce((sum, value) => sum + value, 0);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              LogiShift internal
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Панель владельца сервиса
            </h1>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            Backend {summary.backend.packageVersion} / {summary.backend.buildId}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <section className="rounded-lg bg-slate-950 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                <Shield className="h-3.5 w-3.5" />
                Owner read-only phase 1
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight">
                Операционный обзор LogiShift
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Санитизированные агрегаты по тенантам, сменам, платежам и
                сервисным событиям. Управляющих действий в этой версии нет.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-sm">
              DB: {summary.database.connected ? "доступна" : "недоступна"}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Тенанты"
            value={summary.counts.tenants}
            detail={`Последний tenant id: ${summary.latest.tenant_id ?? "нет"}`}
            icon={Building2}
          />
          <StatCard
            label="Пользователи"
            value={summary.counts.users}
            detail={`Последний user id: ${summary.latest.user_id ?? "нет"}`}
            icon={Users}
          />
          <StatCard
            label="Активные смены"
            value={summary.counts.active_shifts}
            detail={`Проблемные: ${summary.counts.stuck_shifts}`}
            icon={AlertTriangle}
          />
          <StatCard
            label="Платежи"
            value={paymentTotal}
            detail={`Provider events: ${providerEventTotal}, errors: ${summary.billing.provider_events_with_error}`}
            icon={CreditCard}
          />
          <StatCard
            label="Согласия"
            value={summary.counts.user_consents}
            detail={formatDateTime(summary.latest.consent_accepted_at)}
            icon={Shield}
          />
          <StatCard
            label="Инвайты"
            value={summary.counts.invites}
            detail={formatDateTime(summary.latest.invite_expires_at)}
            icon={Clock}
          />
          <StatCard
            label="Reset-токены"
            value={summary.counts.password_reset_tokens}
            detail={formatDateTime(summary.latest.reset_token_created_at)}
            icon={Database}
          />
          <StatCard
            label="Backend"
            value={summary.database.connected ? "OK" : "FAIL"}
            detail={`Смена обновлена: ${formatDateTime(summary.latest.shift_updated_at)}`}
            icon={Server}
          />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold">Тенанты</h2>
            <p className="mt-1 text-sm text-slate-600">
              Без персональных данных, Telegram ID, токенов, IP и raw audit.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Тенант</th>
                  <th className="px-5 py-3">Тариф</th>
                  <th className="px-5 py-3">Подписка</th>
                  <th className="px-5 py-3">Люди</th>
                  <th className="px-5 py-3">Техника</th>
                  <th className="px-5 py-3">Объекты</th>
                  <th className="px-5 py-3">Смены</th>
                  <th className="px-5 py-3">Проблемные</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-mono text-slate-500">
                      {tenant.id}
                    </td>
                    <td className="px-5 py-4 font-semibold">{tenant.name}</td>
                    <td className="px-5 py-4">
                      {tenant.plan?.name || "Без тарифа"}
                      {tenant.plan?.code && (
                        <span className="ml-2 font-mono text-xs text-slate-500">
                          {tenant.plan.code}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(tenant.subscription_status)}`}
                      >
                        {formatStatus(tenant.subscription_status)}
                      </span>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatDateTime(tenant.subscription_expires_at)}
                      </div>
                    </td>
                    <td className="px-5 py-4">{tenant.counts.users}</td>
                    <td className="px-5 py-4">{tenant.counts.trucks}</td>
                    <td className="px-5 py-4">{tenant.counts.sites}</td>
                    <td className="px-5 py-4">{tenant.counts.active_shifts}</td>
                    <td className="px-5 py-4">{tenant.counts.stuck_shifts}</td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-500" colSpan={9}>
                      Тенанты не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default OwnerDashboardView;
