import React, { useEffect, useState } from "react";
import {
  Activity,
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
  getOwnerInternalOverview,
  getOwnerSummary,
  getOwnerSystem,
  getOwnerTenants,
} from "../services/api";
import {
  OwnerBackupSnapshot,
  OwnerContainerSnapshot,
  OwnerInternalOverview,
  OwnerInternalOverviewWindow,
  OwnerSummary,
  OwnerSystemSnapshot,
  OwnerSystemStatus,
  OwnerTenantRow,
} from "../types";

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

const healthClasses = (stage: OwnerTenantRow["health"]["stage"]) => {
  switch (stage) {
    case "working":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "inactive":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "first_shift_started":
      return "border-sky-200 bg-sky-50 text-sky-800";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
};

const formatBytes = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "No data";
  if (value < 1024) return `${value} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let size = value / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
};

const formatAge = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "No data";
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const normalizeStatusColor = (status: string): OwnerSystemStatus => {
  if (status === "ok" || status === "warning" || status === "error" || status === "stale") {
    return status;
  }
  return "unknown";
};

const systemStatusClasses = (status: string) => {
  switch (normalizeStatusColor(status)) {
    case "ok":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "error":
      return "border-red-200 bg-red-50 text-red-700";
    case "stale":
    case "unknown":
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};

const StatusPill = ({ status }: { status: string }) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${systemStatusClasses(status)}`}>
    {status}
  </span>
);

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

const OWNER_ACTIVITY_WINDOWS: Array<{ value: OwnerInternalOverviewWindow; label: string }> = [
  { value: "1h", label: "1ч" },
  { value: "24h", label: "24ч" },
  { value: "7d", label: "7д" },
];

const formatNullableCount = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? String(value) : "не отслеживается";

const sumNullableCounts = (values: Array<number | null | undefined>) => {
  if (values.some((value) => value === null || value === undefined)) {
    return null;
  }

  return values.reduce((sum, value) => sum + (value || 0), 0);
};

const OwnerActivitySection = ({
  overview,
  selectedWindow,
  loading,
  error,
  onWindowChange,
}: {
  overview: OwnerInternalOverview | null;
  selectedWindow: OwnerInternalOverviewWindow;
  loading: boolean;
  error: boolean;
  onWindowChange: (window: OwnerInternalOverviewWindow) => void;
}) => {
  const periodShiftTotal = overview
    ? sumNullableCounts([
        overview.activity.shiftsCreated,
        overview.activity.shiftsStarted,
        overview.activity.shiftsFinished,
        overview.activity.shiftsCancelled,
      ])
    : null;
  const periodWarningTotal = overview
    ? (overview.risks.length || 0) + (overview.billing.providerEventsWithError || 0)
    : null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Статус и активность</h2>
          <p className="mt-1 text-sm text-slate-600">
            Внутренние факты LogiShift: здоровье API/DB, продуктовые действия,
            воронка и безопасные события аудита. Компании и пользователи
            показаны как всего; период применяется к timestamped-активности.
          </p>
        </div>
        <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1">
          {OWNER_ACTIVITY_WINDOWS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onWindowChange(item.value)}
              className={`min-w-12 rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                selectedWindow === item.value
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка статуса и активности
        </div>
      )}

      {!loading && error && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Статус и активность временно недоступны.
        </div>
      )}

      {!loading && !error && overview && (
        <div className="mt-4 space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <StatCard
              label="API / DB"
              value={overview.health.api === "ok" && overview.health.db === "ok" ? "OK" : "Проверь"}
              detail={`API: ${overview.health.api}, DB: ${overview.health.db}`}
              icon={Server}
            />
            <StatCard
              label="Компании всего"
              value={overview.totals.tenants}
              detail="Не за период: у tenants нет created_at"
              icon={Building2}
            />
            <StatCard
              label="Пользователи всего"
              value={overview.totals.users}
              detail="Не за период: у users нет created_at"
              icon={Users}
            />
            <StatCard
              label="Инвайты за период"
              value={formatNullableCount(overview.activity.invitesAccepted)}
              detail={`Созданы: ${formatNullableCount(overview.activity.invitesCreated)}, приняты: ${formatNullableCount(overview.activity.invitesAccepted)}`}
              icon={Clock}
            />
            <StatCard
              label="Смены за период"
              value={formatNullableCount(periodShiftTotal)}
              detail={`Созданы: ${formatNullableCount(overview.activity.shiftsCreated)}, завершены: ${formatNullableCount(overview.activity.shiftsFinished)}`}
              icon={Activity}
            />
            <StatCard
              label="Ошибки / предупреждения"
              value={formatNullableCount(periodWarningTotal)}
              detail={overview.risks.length ? overview.risks[0] : "Нет явных рисков"}
              icon={AlertTriangle}
            />
            <StatCard
              label="Demo за период"
              value={overview.attribution.demoSuccesses}
              detail="Успешные demo-входы first-party"
              icon={Activity}
            />
            <StatCard
              label="Регистрации за период"
              value={overview.attribution.registrations}
              detail="Успешно созданные tenants"
              icon={Building2}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.2fr]">
            <div className="rounded-lg border border-slate-200">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-semibold">Внутренняя воронка</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Только backend/product факты, без внешней аналитики.
                </p>
              </div>
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-slate-100">
                  {[
                    ["Компании всего", overview.funnel.tenantsTotal],
                    ["С пользователями", overview.funnel.tenantsWithUsers],
                    ["С инвайтами", overview.funnel.tenantsWithInvites],
                    ["Со сменами", overview.funnel.tenantsWithShifts],
                    ["С завершенной сменой", overview.funnel.tenantsWithFinishedShift],
                    ["С оплатой / платежом", overview.funnel.tenantsWithBillingPayment],
                  ].map(([label, value]) => (
                    <tr key={String(label)}>
                      <td className="px-4 py-3 text-slate-600">{label}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-950">
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border border-slate-200">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-semibold">Последние события</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Без raw details, email, токенов и кодов инвайтов.
                </p>
              </div>
              {overview.audit.recent.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  За выбранный период событий нет.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Время</th>
                        <th className="px-4 py-3">Действие</th>
                        <th className="px-4 py-3">Tenant</th>
                        <th className="px-4 py-3">Сводка</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {overview.audit.recent.map((event) => (
                        <tr key={`${event.time}-${event.action}-${event.entityId ?? "none"}`}>
                          <td className="px-4 py-3 text-slate-600">
                            {formatDateTime(event.time)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-700">
                            {event.action}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {event.tenantId ?? "нет данных"}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {event.summary}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold">Рекламная атрибуция</h3>
              <p className="mt-1 text-xs text-slate-500">
                First-party события за выбранный период; yclid и персональные данные не отображаются.
              </p>
            </div>
            {overview.attribution.rows.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                За выбранный период attribution-событий нет.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Событие</th>
                      <th className="px-4 py-3">UTM source</th>
                      <th className="px-4 py-3">UTM campaign</th>
                      <th className="px-4 py-3">UTM term</th>
                      <th className="px-4 py-3 text-right">Количество</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {overview.attribution.rows.map((row) => (
                      <tr key={`${row.eventType}-${row.utmSource}-${row.utmCampaign}-${row.utmTerm}`}>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {row.eventType === "demo_entry_success" ? "Demo success" : "Регистрация tenant"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{row.utmSource || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{row.utmCampaign || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{row.utmTerm || "-"}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-950">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

const BackupLine = ({
  label,
  backup,
}: {
  label: string;
  backup: OwnerBackupSnapshot;
}) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <StatusPill status={backup.status} />
    </div>
    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600 sm:grid-cols-5">
      <div>
        <p className="font-bold uppercase tracking-widest text-slate-400">Time</p>
        <p className="mt-1">{formatDateTime(backup.latestAt)}</p>
      </div>
      <div>
        <p className="font-bold uppercase tracking-widest text-slate-400">Age</p>
        <p className="mt-1">{formatAge(backup.ageSeconds)}</p>
      </div>
      <div>
        <p className="font-bold uppercase tracking-widest text-slate-400">Size</p>
        <p className="mt-1">{formatBytes(backup.sizeBytes)}</p>
      </div>
      <div>
        <p className="font-bold uppercase tracking-widest text-slate-400">Retained</p>
        <p className="mt-1">{backup.retainedCount ?? "No data"}</p>
      </div>
      <div>
        <p className="font-bold uppercase tracking-widest text-slate-400">Integrity</p>
        <p className="mt-1">{backup.integrity}</p>
      </div>
    </div>
  </div>
);

const ContainerLine = ({
  label,
  container,
}: {
  label: string;
  container: OwnerContainerSnapshot;
}) => (
  <div className="rounded-lg border border-slate-200 bg-white p-3">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <StatusPill status={container.status} />
    </div>
    <p className="mt-2 text-xs text-slate-500">
      {container.state} / health {container.health} / restart {container.restartPolicy}
    </p>
  </div>
);

const OwnerSystemSection = ({ snapshot }: { snapshot: OwnerSystemSnapshot }) => (
  <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-lg font-semibold">Host snapshot</h2>
        <p className="mt-1 text-sm text-slate-600">
          Read-only backup, disk, and container status. Generated: {formatDateTime(snapshot.generatedAt)}
          {snapshot.reason ? ` (${snapshot.reason})` : ""}
        </p>
      </div>
      <StatusPill status={snapshot.overallStatus} />
    </div>

    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
      <div className="space-y-3">
        <BackupLine label="PostgreSQL backup" backup={snapshot.backups.postgres} />
        <BackupLine label="Uploads backup" backup={snapshot.backups.uploads} />
      </div>
      <div className="space-y-3">
        <div className="rounded-lg border border-slate-200 bg-slate-950 p-4 text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Root disk
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {snapshot.disk.root.usedPercent ?? "No data"}% used
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Free: {formatBytes(snapshot.disk.root.freeBytes)}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <ContainerLine label="backend" container={snapshot.containers.logishift_backend} />
          <ContainerLine label="frontend" container={snapshot.containers.logishift_frontend} />
          <ContainerLine label="postgres" container={snapshot.containers.logishift_postgres} />
          <ContainerLine label="caddy" container={snapshot.containers.logishift_caddy} />
        </div>
      </div>
    </div>
  </section>
);

const OwnerDashboardView: React.FC = () => {
  const [summary, setSummary] = useState<OwnerSummary | null>(null);
  const [tenants, setTenants] = useState<OwnerTenantRow[]>([]);
  const [systemSnapshot, setSystemSnapshot] = useState<OwnerSystemSnapshot | null>(null);
  const [internalOverview, setInternalOverview] = useState<OwnerInternalOverview | null>(null);
  const [activityWindow, setActivityWindow] = useState<OwnerInternalOverviewWindow>("24h");
  const [internalOverviewLoading, setInternalOverviewLoading] = useState(true);
  const [internalOverviewError, setInternalOverviewError] = useState(false);
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

  useEffect(() => {
    let cancelled = false;

    const loadInternalOverview = async () => {
      try {
        setInternalOverviewLoading(true);
        setInternalOverviewError(false);
        const overview = await getOwnerInternalOverview(activityWindow);
        if (!cancelled) {
          setInternalOverview(overview);
        }
      } catch {
        if (!cancelled) {
          setInternalOverview(null);
          setInternalOverviewError(true);
        }
      } finally {
        if (!cancelled) {
          setInternalOverviewLoading(false);
        }
      }
    };

    void loadInternalOverview();

    return () => {
      cancelled = true;
    };
  }, [activityWindow]);

  useEffect(() => {
    let cancelled = false;

    const loadSystemSnapshot = async () => {
      try {
        const snapshot = await getOwnerSystem();
        if (!cancelled) {
          setSystemSnapshot(snapshot);
        }
      } catch {
        if (!cancelled) {
          setSystemSnapshot(null);
        }
      }
    };

    void loadSystemSnapshot();

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

        <OwnerActivitySection
          overview={internalOverview}
          selectedWindow={activityWindow}
          loading={internalOverviewLoading}
          error={internalOverviewError}
          onWindowChange={setActivityWindow}
        />

        {systemSnapshot ? <OwnerSystemSection snapshot={systemSnapshot} /> : null}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold">Тенанты</h2>
            <p className="mt-1 text-sm text-slate-600">
              Без персональных данных, Telegram ID, токенов, IP и raw audit.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Тенант</th>
                  <th className="px-5 py-3">Запуск</th>
                  <th className="px-5 py-3">Активность</th>
                  <th className="px-5 py-3">Внимание</th>
                  <th className="px-5 py-3">Тариф</th>
                  <th className="px-5 py-3">Подписка</th>
                  <th className="px-5 py-3">Люди</th>
                  <th className="px-5 py-3">Техника</th>
                  <th className="px-5 py-3">Объекты</th>
                  <th className="px-5 py-3">Смены</th>
                  <th className="px-5 py-3">Проблемные</th>
                  <th className="px-5 py-3"><span className="sr-only">Открыть тенант</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => { window.location.href = `/owner/tenants/${tenant.id}`; }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        window.location.href = `/owner/tenants/${tenant.id}`;
                      }
                    }}
                    role="link"
                    tabIndex={0}
                    aria-label={`Открыть тенант ${tenant.name}`}
                  >
                    <td className="px-5 py-4 font-mono text-slate-500">
                      {tenant.id}
                    </td>
                    <td className="px-5 py-4 font-semibold">{tenant.name}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${healthClasses(tenant.health.stage)}`}>
                        {tenant.health.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">{formatDateTime(tenant.health.lastActivityAt)}</td>
                    <td className="px-5 py-4">
                      {tenant.health.attentionCount > 0 ? (
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          {tenant.health.attentionCount}
                        </span>
                      ) : <span className="text-xs text-slate-500">Нет</span>}
                    </td>
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
                    <td className="px-5 py-4 text-right">
                      <a
                        className="font-semibold text-[#006497] hover:text-[#004f79]"
                        href={`/owner/tenants/${tenant.id}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        Открыть
                      </a>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-500" colSpan={13}>
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
