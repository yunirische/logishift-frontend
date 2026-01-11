import React, { useEffect, useState } from "react";
import { API_ENDPOINTS } from "../constants";
import { apiRequest } from "../services/api";
import { AuditLog } from "../types";

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // Fixed: Используем apiRequest вместо fetch для автоматической подстановки токена авторизации
        const data = await apiRequest(API_ENDPOINTS.AUDIT);
        setLogs(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching logs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center p-10 text-slate-400 animate-pulse">
        Загрузка журнала аудита...
      </div>
    );

  return (
    <div className="bg-white rounded-[30px] border border-slate-50 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex justify-between items-center">
        <h3 className="text-xl font-bold text-[#1B254B]">Системный журнал</h3>
        <button className="text-indigo-600 text-sm font-bold hover:underline">
          Экспорт CSV
        </button>
      </div>
      <div className="divide-y divide-slate-50">
        {logs.length > 0 ? (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-6 hover:bg-slate-50/50 transition-colors flex gap-6"
            >
              <div className="text-slate-300 font-mono text-xs pt-1 w-32 shrink-0">
                {new Date(log.timestamp).toLocaleString([], {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-[#1B254B] text-sm">
                    {log.performed_by}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                      log.action.includes("SHIFT")
                        ? "bg-blue-100 text-blue-600"
                        : log.action.includes("DELETE")
                        ? "bg-red-100 text-red-600"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {log.action}
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {log.details}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-20 text-center text-slate-400">
            История действий пуста
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
