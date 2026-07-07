import React, { useEffect, useState, useMemo } from "react";
import { API_ENDPOINTS } from "../constants";
import { apiRequest } from "../services/api";
import { AuditLog } from "../types";
import {
  FileText,
  ArrowRightLeft,
  Bell,
  CircleSlash,
  Clock3,
  MessageSquare,
  Pencil,
  Truck,
  User,
} from "lucide-react";

type AuditDetails = Record<string, unknown>;

const STATUS_LABELS: Record<string, string> = {
  active: "Активна",
  finished: "Завершена",
  cancelled: "Отменена",
  awaiting_odo_start: "Ожидает старт",
  awaiting_odo_end: "Ожидает финиш",
  awaiting_invoice: "Ожидает накладную",
  pending_site: "Ожидает объект",
  pending_truck: "Ожидает машину",
};

const AUDIT_PRESENTATIONS = [
  { match: ["смена отменена"], label: "Смена отменена", Icon: CircleSlash },
  { match: ["смена исключена из учета", "смена исключена из учёта"], label: "Смена исключена из учета", Icon: CircleSlash },
  { match: ["смена возвращена в учет", "смена возвращена в учёт"], label: "Смена возвращена в учет", Icon: ArrowRightLeft },
  { match: ["смена завершена", "завершение смены"], label: "Смена завершена", Icon: Clock3 },
  { match: ["смена начата", "начало смены", "смена создана"], label: "Смена начата", Icon: Clock3 },
  { match: ["время смены изменено"], label: "Время смены изменено", Icon: Pencil },
  { match: ["комментарий добавлен"], label: "Комментарий добавлен", Icon: MessageSquare },
  { match: ["уведомление водителю"], label: "Уведомление водителю", Icon: Bell },
  { match: ["пользователь"], label: "Изменение пользователя", Icon: User },
  { match: ["машина"], label: "Изменение машины", Icon: Truck },
] as const;

const normalizeAuditDisplay = (value: string): string =>
  value
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim()
    .toLowerCase();

const getAuditPresentation = (actionDisplay?: string) => {
  const fallbackLabel = actionDisplay?.trim() || "Неизвестное действие";
  const normalized = normalizeAuditDisplay(fallbackLabel);
  const known = AUDIT_PRESENTATIONS.find(({ match }) =>
    match.some((variant) => normalized.includes(variant))
  );

  return {
    Icon: known?.Icon || FileText,
    label: known?.label || fallbackLabel,
  };
};

const parseDetails = (details?: string): AuditDetails | null => {
  if (!details) return null;

  try {
    const obj = JSON.parse(details);
    return obj && typeof obj === "object" ? (obj as AuditDetails) : null;
  } catch {
    return null;
  }
};

const formatAuditStatus = (status: unknown): string | null => {
  if (typeof status !== "string" || !status.trim()) {
    return null;
  }

  return STATUS_LABELS[status] || status;
};

const formatAuditDetails = (details?: string): string[] => {
  const parsed = parseDetails(details);
  if (!parsed) return [];

  const lines: string[] = [];
  const reason =
    typeof parsed.reason === "string"
      ? parsed.reason
      : typeof parsed.exclusion_reason === "string"
        ? parsed.exclusion_reason
        : null;

  if (reason) {
    lines.push(`Причина: ${reason}`);
  }

  const before =
    parsed.before && typeof parsed.before === "object"
      ? (parsed.before as AuditDetails)
      : null;
  const after =
    parsed.after && typeof parsed.after === "object"
      ? (parsed.after as AuditDetails)
      : null;

  const beforeStatus = formatAuditStatus(before?.status);
  const afterStatus = formatAuditStatus(after?.status);
  if (beforeStatus || afterStatus) {
    if (beforeStatus && afterStatus) {
      lines.push(`Статус: ${beforeStatus} -> ${afterStatus}`);
    } else {
      lines.push(`Статус: ${beforeStatus || afterStatus}`);
    }
  }

  const summary: string[] = [];
  const shiftId = parsed.shift_id;
  if (typeof shiftId === "number") summary.push(`Смена #${shiftId}`);
  if (typeof parsed.driver_id === "number") summary.push(`Водитель #${parsed.driver_id}`);
  if (typeof parsed.truck_id === "number") summary.push(`Машина #${parsed.truck_id}`);
  if (typeof parsed.site_id === "number") summary.push(`Объект #${parsed.site_id}`);
  if (parsed.hours !== undefined) summary.push(`${parsed.hours} ч`);
  if (parsed.age_minutes !== undefined) summary.push(`${parsed.age_minutes} мин`);

  if (summary.length > 0) {
    lines.push(summary.join(" • "));
  }

  return lines;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const groupLogsByDate = (logs: AuditLog[]): Record<string, AuditLog[]> => {
  const grouped: Record<string, AuditLog[]> = {};

  logs.forEach((log) => {
    const dateKey = formatDate(log.timestamp);
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(log);
  });

  return grouped;
};

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await apiRequest(API_ENDPOINTS.AUDIT);
        const logsArray = Array.isArray(data) ? data : data?.data || [];
        setLogs(logsArray);
      } catch (error) {
        console.error("Error fetching logs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const groupedLogs = useMemo(() => groupLogsByDate(logs), [logs]);

  if (loading)
    return (
      <div className="flex justify-center p-10 text-slate-400 animate-pulse">
        Загрузка журнала аудита...
      </div>
    );

  return (
    <div className="bg-white rounded-lg border border-slate-50 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-50">
        <h3 className="text-lg font-semibold text-[#1B254B]">Системный журнал</h3>
      </div>

      <div className="divide-y divide-slate-100">
        {!logs || logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            История действий пуста
          </div>
        ) : (
          Object.entries(groupedLogs).map(([date, dateLogs]) => (
            <div key={date} className="border-b border-slate-100 last:border-b-0">
              <div className="px-6 py-2 bg-slate-50 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {date}
                </span>
              </div>

              <div className="divide-y divide-slate-50">
                {dateLogs.map((log) => {
                  const { Icon, label } = getAuditPresentation(log.action_display);
                  const detailLines = formatAuditDetails(log.details);
                  return (
                    <div
                      key={log.id}
                      className="p-4 hover:bg-slate-50/50 transition-colors flex gap-4"
                    >
                      <div className="text-slate-400 font-mono text-xs pt-0.5 w-16 shrink-0">
                        {formatTime(log.timestamp)}
                      </div>

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <Icon size={16} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-semibold text-[#1B254B] text-sm">
                            {log.performed_by}
                          </span>
                          <span className="text-sm text-slate-600">
                            {label}
                          </span>
                        </div>
                        {detailLines.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {detailLines.map((line) => (
                              <p key={line} className="text-xs text-slate-500 leading-relaxed">
                                {line}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
