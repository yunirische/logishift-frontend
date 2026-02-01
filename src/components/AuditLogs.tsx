import React, { useEffect, useState, useMemo } from "react";
import { API_ENDPOINTS } from "../constants";
import { apiRequest } from "../services/api";
import { AuditLog } from "../types";
import {
  FileText,
} from "lucide-react";

// Helper function to format details into human-readable text
const formatDetails = (details?: string): string => {
  if (!details) return '';
  
  try {
    const obj = JSON.parse(details);
    const parts: string[] = [];
    
    if (obj.hours !== undefined) parts.push(`${obj.hours} ч`);
    if (obj.shift_id) parts.push(`смена #${obj.shift_id}`);
    if (obj.truck_name) parts.push(obj.truck_name);
    if (obj.site_name) parts.push(obj.site_name);
    if (obj.status) parts.push(`статус: ${obj.status}`);
    if (obj.age_minutes) parts.push(`${obj.age_minutes} мин`);
    
    return parts.length > 0 ? parts.join(', ') : '';
  } catch {
    return '';
  }
};

// Format date to "27 января 2026"
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

// Format time to "13:22"
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Group logs by date
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
        console.log("Audit data:", data);
        const logsArray = Array.isArray(data) ? data : (data?.data || []);
        setLogs(logsArray);
      } catch (error) {
        console.error("Error fetching logs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  // Group logs by date
  const groupedLogs = useMemo(() => groupLogsByDate(logs), [logs]);

  if (loading)
    return (
      <div className="flex justify-center p-10 text-slate-400 animate-pulse">
        Загрузка журнала аудита...
      </div>
    );

  return (
    <div className="bg-white rounded-lg border border-slate-50 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-[#1B254B]">Системный журнал</h3>
        <button className="text-[#0a192f] text-xs font-semibold hover:underline">
          Экспорт CSV
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {!logs || logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            История действий пуста
          </div>
        ) : (
          Object.entries(groupedLogs).map(([date, dateLogs]) => (
            <div key={date} className="border-b border-slate-100 last:border-b-0">
              {/* Date header */}
              <div className="px-6 py-2 bg-slate-50 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {date}
                </span>
              </div>

              {/* Logs for this date */}
              <div className="divide-y divide-slate-50">
                {dateLogs.map((log) => {
                  return (
                    <div
                      key={log.id}
                      className="p-4 hover:bg-slate-50/50 transition-colors flex gap-4"
                    >
                      {/* Time */}
                      <div className="text-slate-400 font-mono text-xs pt-0.5 w-16 shrink-0">
                        {formatTime(log.timestamp)}
                      </div>

                      {/* Icon - использует эмодзи из action_display */}
                      <div className="text-2xl shrink-0 leading-none">
                        {log.action_display?.[0] || '📄'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-semibold text-[#1B254B] text-sm">
                            {log.performed_by}
                          </span>
                          <span className="text-sm text-slate-600">
                            {log.action_display?.substring(2) || log.action_display || 'Неизвестное действие'}
                          </span>
                        </div>
                        {(() => {
                          const details = formatDetails(log.details);
                          return details && (
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {details}
                            </p>
                          );
                        })()}
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
