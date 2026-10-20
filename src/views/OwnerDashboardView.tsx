import React, { useEffect, useState } from "react";
import OwnerTraffic from "../components/OwnerTraffic";
import {
  Loader2,
  Shield,
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

const OWNER_ACTIVITY_WINDOWS: Array<{ value: OwnerInternalOverviewWindow; label: string }> = [
  { value: "1h", label: "1ч" },
  { value: "24h", label: "24ч" },
  { value: "7d", label: "7д" },
];

const formatNullableCount = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? String(value) : "не отслеживается";

const OwnerActivitySection = ({ overview, selectedWindow, loading, error, onWindowChange }: {
  overview: OwnerInternalOverview | null;
  selectedWindow: OwnerInternalOverviewWindow;
  loading: boolean;
  error: boolean;
  onWindowChange: (window: OwnerInternalOverviewWindow) => void;
}) => <section className="rounded-lg border border-slate-200 bg-white p-4">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <h2 className="text-lg font-semibold">Статус и активность</h2>
    <div className="flex gap-1">{OWNER_ACTIVITY_WINDOWS.map(item => <button key={item.value}
      type="button" onClick={() => onWindowChange(item.value)} aria-pressed={selectedWindow === item.value}
      className="min-h-11 rounded bg-slate-100 px-3 text-sm">{item.label}</button>)}</div>
  </div>
  {loading ? <p role="status">Загрузка статуса и активности</p> : error ? <p>Статус и активность временно недоступны.</p> : overview && <>
    <p className="mt-2 text-sm">API / DB: {overview.health.api} / {overview.health.db}. Компании: {overview.totals.tenants}; пользователи: {overview.totals.users} (всего).</p>
    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
      {[
        ["Созданы смены", overview.activity.shiftsCreated], ["Завершены смены", overview.activity.shiftsFinished],
        ["Приняты приглашения", overview.activity.invitesAccepted], ["Ошибки обработки платежей", overview.billing.providerEventsWithError],
      ].map(([label, value]) => <div key={String(label)}><dt className="text-slate-500">{label}</dt><dd>{formatNullableCount(value as number | null)}</dd></div>)}
    </dl>
    <p className="mt-3 text-xs text-slate-500">Активность — за выбранный период. Ошибки платежей — за всё время. Эти данные включают внутреннюю и демо-компании.</p>
    <h3 className="mt-4 text-sm font-semibold">Использование продукта · всего компаний</h3>
    <p className="mt-2 text-sm">Со сменами: {overview.funnel.tenantsWithShifts}; с завершённой сменой: {overview.funnel.tenantsWithFinishedShift}; с записью платежа: {overview.funnel.tenantsWithBillingPayment} (не обязательно успешного).</p>
    <h3 className="mt-4 text-sm font-semibold">Последние события</h3>
    {overview.audit.recent.length ? <ul className="mt-2 space-y-2 text-sm">{overview.audit.recent.map((event, i) =>
      <li key={i}><time className="text-slate-500">{formatDateTime(event.time)}</time> · {event.summary} · компания {event.tenantId ?? "—"}</li>)}</ul>
      : <p className="mt-2 text-sm">За выбранный период событий нет.</p>}
    {overview.risks.length > 0 && <p className="mt-3 text-sm text-amber-800">Диагностические сигналы: {overview.risks.length}. Проверьте смены и обработку платежей.</p>}
  </>}
</section>;

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
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-3 py-5 sm:px-6">
        <OwnerTraffic />
        <details className="rounded-lg border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer font-semibold">Операционный обзор LogiShift</summary>
          <p className="my-3 text-sm text-slate-600">Активные смены: {summary.counts.active_shifts}; требуют внимания: {summary.counts.stuck_shifts}. DB: {summary.database.connected ? "доступна" : "недоступна"}.</p>
        <OwnerActivitySection
          overview={internalOverview}
          selectedWindow={activityWindow}
          loading={internalOverviewLoading}
          error={internalOverviewError}
          onWindowChange={setActivityWindow}
        />

        {systemSnapshot ? <OwnerSystemSection snapshot={systemSnapshot} /> : null}
        </details>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold">Тенанты</h2>
            <p className="mt-1 text-sm text-slate-600">
              Без персональных данных, Telegram ID, токенов, IP и raw audit.
            </p>
          </div>
          <div className="relative overflow-x-auto">
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
