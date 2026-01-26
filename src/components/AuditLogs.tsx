import React, { useEffect, useState } from "react";
import { API_ENDPOINTS } from "../constants";
import { apiRequest } from "../services/api";
import { AuditLog } from "../types";

// Helper functions moved outside component to prevent re-creation on every render
const getActionEmoji = (actionDisplay: string): string => {
  const text = actionDisplay.toLowerCase();

  // Смены
  if (text.includes("смен") || text.includes("shift")) {
    if (text.includes("начал") || text.includes("start")) return "🚀";
    if (text.includes("заверш") || text.includes("finish") || text.includes("end")) return "🏁";
    if (text.includes("отмен") || text.includes("cancel")) return "❌";
    if (text.includes("создал") || text.includes("создан")) return "➕";
    return "⏱️";
  }

  // Пользователи
  if (text.includes("пользователь") || text.includes("водитель") || text.includes("user")) {
    if (text.includes("создал") || text.includes("добавил")) return "👤➕";
    if (text.includes("обновил") || text.includes("измен")) return "👤✏️";
    if (text.includes("удалил")) return "👤❌";
    if (text.includes("активировал")) return "✅";
    if (text.includes("деактивировал")) return "🔒";
    return "👤";
  }

  // Техника
  if (text.includes("машин") || text.includes("техник") || text.includes("грузовик") || text.includes("truck")) {
    if (text.includes("создал") || text.includes("добавил")) return "🚛➕";
    if (text.includes("обновил") || text.includes("измен")) return "🚛✏️";
    if (text.includes("удалил")) return "🚛❌";
    return "🚛";
  }

  // Объекты
  if (text.includes("объект") || text.includes("site")) {
    if (text.includes("создал") || text.includes("добавил")) return "🏗️➕";
    if (text.includes("обновил") || text.includes("измен")) return "🏗️✏️";
    if (text.includes("удалил")) return "🏗️❌";
    return "🏗️";
  }

  // Настройки
  if (text.includes("настрой") || text.includes("параметр") || text.includes("setting")) {
    return "⚙️";
  }

  // Удаление
  if (text.includes("удал") || text.includes("delete") || text.includes("remove")) {
    return "🗑️";
  }

  // Редактирование
  if (text.includes("редактир") || text.includes("измен") || text.includes("update") || text.includes("edit")) {
    return "✏️";
  }

  // Создание
  if (text.includes("создал") || text.includes("добавил") || text.includes("create") || text.includes("add")) {
    return "➕";
  }

  // Логин/выход
  if (text.includes("вход") || text.includes("логин") || text.includes("login")) {
    return "🔐";
  }
  if (text.includes("выход") || text.includes("logout")) {
    return "👋";
  }

  // Фотографии
  if (text.includes("фото") || text.includes("изображен") || text.includes("photo")) {
    return "📷";
  }

  // Документы
  if (text.includes("накладн") || text.includes("документ") || text.includes("invoice")) {
    return "📄";
  }

  // Система
  if (text.includes("систем") || text.includes("system")) {
    return "🖥️";
  }

  // Дефолт
  return "📋";
};

const getActionStyle = (actionDisplay: string): string => {
  const text = actionDisplay.toLowerCase();

  // Создание - зеленый
  if (text.includes("создал") || text.includes("добавил") || text.includes("начал")) {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }

  // Удаление/отмена - красный
  if (text.includes("удалил") || text.includes("отмен")) {
    return "bg-red-50 text-red-700 border border-red-200";
  }

  // Редактирование - синий
  if (text.includes("редактир") || text.includes("измен") || text.includes("обнов")) {
    return "bg-blue-50 text-blue-700 border border-blue-200";
  }

  // Завершение - серо-зеленый
  if (text.includes("заверш")) {
    return "bg-teal-50 text-teal-700 border border-teal-200";
  }

  // Логин - фиолетовый
  if (text.includes("вход") || text.includes("логин")) {
    return "bg-violet-50 text-violet-700 border border-violet-200";
  }

  // Выход - серый
  if (text.includes("выход")) {
    return "bg-slate-50 text-slate-600 border border-slate-200";
  }

  // Смена - индиго
  if (text.includes("смен") || text.includes("shift")) {
    return "bg-indigo-50 text-indigo-700 border border-indigo-200";
  }

  // Дефолт - серый
  return "bg-slate-50 text-slate-600 border border-slate-200";
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
        <button className="text-indigo-600 text-xs font-semibold hover:underline">
          Экспорт CSV
        </button>
      </div>
      <div className="divide-y divide-slate-50">
        {!logs || logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            История действий пуста
          </div>
        ) : (
          logs.map((log) => {
            const actionDisplay = log.action_display || log.action;
            const emoji = getActionEmoji(actionDisplay);
            const style = getActionStyle(actionDisplay);

            return (
              <div
                key={log.id}
                className="p-4 hover:bg-slate-50/50 transition-colors flex gap-4"
              >
                <div className="text-slate-400 font-mono text-[10px] pt-0.5 w-28 shrink-0">
                  {new Date(log.timestamp).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm" aria-hidden="true">{emoji}</span>
                    <span className="font-semibold text-[#1B254B] text-xs">
                      {log.performed_by}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${style}`}
                    >
                      {actionDisplay}
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-xs text-slate-500 leading-relaxed ml-5">
                      {log.details}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
