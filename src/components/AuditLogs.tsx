import React, { useEffect, useState, useMemo } from "react";
import { API_ENDPOINTS } from "../constants";
import { apiRequest } from "../services/api";
import { AuditLog } from "../types";
import {
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  Clock,
  User,
  Truck,
  Building,
  Settings,
  FileText,
  LogOut,
  LogIn,
  Camera,
  XCircle,
} from "lucide-react";

// Helper function to format action type from backend action code
const formatActionType = (log: AuditLog): string => {
  const { action, entity_type } = log;
  const actionUpper = action?.toUpperCase();
  const entityType = entity_type?.toLowerCase();

  // If we have both action and entity_type, combine them
  if (entityType && actionUpper) {
    const entityMap: Record<string, string> = {
      shift: 'смена',
      user: 'пользователь',
      truck: 'машина',
      site: 'объект',
      photo: 'фото',
      settings: 'настройки',
    };

    const actionMap: Record<string, string> = {
      CREATE: 'Создана',
      UPDATE: 'Обновлена',
      DELETE: 'Удалена',
      LOGIN: 'Вход в систему',
      LOGOUT: 'Выход из системы',
    };

    const entityName = entityMap[entityType];
    const actionName = actionMap[actionUpper];

    if (entityName && actionName) {
      // Adjust gender for some entities
      if (entityType === 'user') {
        if (actionUpper === 'CREATE') return 'Создан пользователь';
        if (actionUpper === 'UPDATE') return 'Обновлен пользователь';
        if (actionUpper === 'DELETE') return 'Удален пользователь';
      }
      if (entityType === 'truck') {
        if (actionUpper === 'CREATE') return 'Добавлена машина';
        if (actionUpper === 'UPDATE') return 'Обновлена машина';
        if (actionUpper === 'DELETE') return 'Удалена машина';
      }
      if (entityType === 'site') {
        if (actionUpper === 'CREATE') return 'Добавлен объект';
        if (actionUpper === 'UPDATE') return 'Обновлен объект';
        if (actionUpper === 'DELETE') return 'Удален объект';
      }

      return `${actionName} ${entityName}`;
    }
  }

  // Fallback to old format for backward compatibility
  const oldActionMap: Record<string, string> = {
    // Shift actions
    SHIFT_CREATED: "Создана смена",
    SHIFT_STARTED: "Начата смена",
    SHIFT_FINISHED: "Завершена смена",
    SHIFT_CANCELLED: "Отменена смена",
    SHIFT_UPDATED: "Обновлена смена",
    PHOTO_UPLOADED: "Загружено фото",

    // User actions
    USER_CREATED: "Создан пользователь",
    USER_UPDATED: "Обновлен пользователь",
    USER_DELETED: "Удален пользователь",
    USER_ACTIVATED: "Активирован пользователь",
    USER_DEACTIVATED: "Деактивирован пользователь",
    USER_LOGIN: "Вход в систему",
    USER_LOGOUT: "Выход из системы",

    // Truck actions
    TRUCK_CREATED: "Добавлена машина",
    TRUCK_UPDATED: "Обновлена машина",
    TRUCK_DELETED: "Удалена машина",

    // Site actions
    SITE_CREATED: "Добавлен объект",
    SITE_UPDATED: "Обновлен объект",
    SITE_DELETED: "Удален объект",

    // System actions
    SETTINGS_UPDATED: "Обновлены настройки",
    SYSTEM_ERROR: "Системная ошибка",
  };

  return oldActionMap[action] || action || "Неизвестное действие";
};

// Helper function to get icon for action type
const getActionIcon = (action: string, entity_type?: string): React.ComponentType<{ className?: string }> => {
  if (!action && !entity_type) return FileText;

  const actionUpper = action?.toUpperCase();
  const entityType = entity_type?.toLowerCase();

  // New format: use entity_type + action
  if (entityType) {
    // Determine icon based on entity and action combination
    if (entityType === 'shift') {
      if (actionUpper === 'CREATE') return CheckCircle;
      if (actionUpper === 'UPDATE') return Edit3;
      if (actionUpper === 'DELETE') return XCircle;
      return Clock;
    }

    if (entityType === 'user') {
      if (actionUpper === 'CREATE') return Plus;
      if (actionUpper === 'UPDATE') return Edit3;
      if (actionUpper === 'DELETE') return Trash2;
      if (actionUpper === 'LOGIN') return LogIn;
      if (actionUpper === 'LOGOUT') return LogOut;
      return User;
    }

    if (entityType === 'truck') {
      if (actionUpper === 'CREATE') return Plus;
      if (actionUpper === 'UPDATE') return Edit3;
      if (actionUpper === 'DELETE') return Trash2;
      return Truck;
    }

    if (entityType === 'site') {
      if (actionUpper === 'CREATE') return Plus;
      if (actionUpper === 'UPDATE') return Edit3;
      if (actionUpper === 'DELETE') return Trash2;
      return Building;
    }

    if (entityType === 'photo') {
      return Camera;
    }

    if (entityType === 'settings') {
      return Settings;
    }
  }

  // Fallback to old format for backward compatibility
  if (actionUpper) {
    // Shift actions
    if (actionUpper.includes("SHIFT") || actionUpper.includes("СМЕН")) {
      if (actionUpper.includes("CREATED") || actionUpper.includes("СОЗДАН")) return Plus;
      if (actionUpper.includes("STARTED") || actionUpper.includes("НАЧА")) return CheckCircle;
      if (actionUpper.includes("FINISHED") || actionUpper.includes("ЗАВЕРШ")) return CheckCircle;
      if (actionUpper.includes("CANCELLED") || actionUpper.includes("ОТМЕН")) return XCircle;
      if (actionUpper.includes("UPDATED") || actionUpper.includes("ОБНОВЛ")) return Edit3;
      return Clock;
    }

    // User actions
    if (actionUpper.includes("USER") || actionUpper.includes("ПОЛЬЗОВАТЕЛ")) {
      if (actionUpper.includes("CREATED") || actionUpper.includes("СОЗДАН")) return Plus;
      if (actionUpper.includes("UPDATED") || actionUpper.includes("ОБНОВЛ")) return Edit3;
      if (actionUpper.includes("DELETED") || actionUpper.includes("УДАЛ")) return Trash2;
      if (actionUpper.includes("LOGIN") || actionUpper.includes("ВХОД")) return LogIn;
      if (actionUpper.includes("LOGOUT") || actionUpper.includes("ВЫХОД")) return LogOut;
      return User;
    }

    // Truck actions
    if (actionUpper.includes("TRUCK") || actionUpper.includes("МАШИН") || actionUpper.includes("ГРУЗОВИК")) {
      if (actionUpper.includes("CREATED") || actionUpper.includes("ДОБАВЛ")) return Plus;
      if (actionUpper.includes("UPDATED") || actionUpper.includes("ОБНОВЛ")) return Edit3;
      if (actionUpper.includes("DELETED") || actionUpper.includes("УДАЛ")) return Trash2;
      return Truck;
    }

    // Site actions
    if (actionUpper.includes("SITE") || actionUpper.includes("ОБЪЕКТ")) {
      if (actionUpper.includes("CREATED") || actionUpper.includes("ДОБАВЛ")) return Plus;
      if (actionUpper.includes("UPDATED") || actionUpper.includes("ОБНОВЛ")) return Edit3;
      if (actionUpper.includes("DELETED") || actionUpper.includes("УДАЛ")) return Trash2;
      return Building;
    }

    // Photo actions
    if (actionUpper.includes("PHOTO") || actionUpper.includes("ФОТО")) {
      return Camera;
    }

    // Settings
    if (actionUpper.includes("SETTINGS") || actionUpper.includes("НАСТРО")) {
      return Settings;
    }

    // Login
    if (actionUpper.includes("LOGIN") || actionUpper.includes("ВХОД")) {
      return LogIn;
    }

    // Logout
    if (actionUpper.includes("LOGOUT") || actionUpper.includes("ВЫХОД")) {
      return LogOut;
    }

    // Delete/Remove
    if (actionUpper.includes("DELETE") || actionUpper.includes("REMOVE") || actionUpper.includes("УДАЛ")) {
      return Trash2;
    }

    // Edit/Update
    if (actionUpper.includes("UPDATE") || actionUpper.includes("EDIT") || actionUpper.includes("ОБНОВЛ") || actionUpper.includes("РЕДАКТ")) {
      return Edit3;
    }

    // Create/Add
    if (actionUpper.includes("CREATE") || actionUpper.includes("ADD") || actionUpper.includes("СОЗДАН") || actionUpper.includes("ДОБАВЛ")) {
      return Plus;
    }
  }

  // Default
  return FileText;
};

// Helper function to get color style for action type
const getActionStyle = (action: string, entity_type?: string): string => {
  if (!action && !entity_type) {
    return "text-slate-600 bg-slate-50 border-slate-200";
  }

  const actionUpper = action?.toUpperCase();
  const entityType = entity_type?.toLowerCase();

  // New format: use action type for styling
  if (actionUpper) {
    // Create/Add - green
    if (actionUpper === "CREATE") {
      return "text-emerald-600 bg-emerald-50 border-emerald-200";
    }

    // Delete/Cancel - red
    if (actionUpper === "DELETE" || actionUpper === "CANCEL") {
      return "text-red-600 bg-red-50 border-red-200";
    }

    // Update/Edit - blue
    if (actionUpper === "UPDATE" || actionUpper === "EDIT") {
      return "text-blue-600 bg-blue-50 border-blue-200";
    }

    // Login - violet
    if (actionUpper === "LOGIN") {
      return "text-violet-600 bg-violet-50 border-violet-200";
    }

    // Logout - gray
    if (actionUpper === "LOGOUT") {
      return "text-slate-600 bg-slate-50 border-slate-200";
    }

    // Photo - amber
    if (entityType === 'photo') {
      return "text-amber-600 bg-amber-50 border-amber-200";
    }
  }

  // Fallback to old format for backward compatibility
  if (actionUpper) {
    // Create/Add - green
    if (actionUpper.includes("CREATED") || actionUpper.includes("СОЗДАН") ||
        actionUpper.includes("STARTED") || actionUpper.includes("НАЧАЛ") ||
        actionUpper.includes("ADD") || actionUpper.includes("ДОБАВИЛ")) {
      return "text-emerald-600 bg-emerald-50 border-emerald-200";
    }

    // Delete/Cancel - red
    if (actionUpper.includes("DELETED") || actionUpper.includes("УДАЛИЛ") ||
        actionUpper.includes("CANCEL") || actionUpper.includes("ОТМЕН") ||
        actionUpper.includes("REMOVE")) {
      return "text-red-600 bg-red-50 border-red-200";
    }

    // Update/Edit - blue
    if (actionUpper.includes("UPDATED") || actionUpper.includes("ОБНОВИЛ") ||
        actionUpper.includes("EDIT") || actionUpper.includes("РЕДАКТ") ||
        actionUpper.includes("ИЗМЕН")) {
      return "text-blue-600 bg-blue-50 border-blue-200";
    }

    // Finished - teal
    if (actionUpper.includes("FINISHED") || actionUpper.includes("ЗАВЕРШ")) {
      return "text-teal-600 bg-teal-50 border-teal-200";
    }

    // Login - violet
    if (actionUpper.includes("LOGIN") || actionUpper.includes("ВХОД")) {
      return "text-violet-600 bg-violet-50 border-violet-200";
    }

    // Logout - gray
    if (actionUpper.includes("LOGOUT") || actionUpper.includes("ВЫХОД")) {
      return "text-slate-600 bg-slate-50 border-slate-200";
    }

    // Photo - amber
    if (actionUpper.includes("PHOTO") || actionUpper.includes("ФОТО")) {
      return "text-amber-600 bg-amber-50 border-amber-200";
    }
  }

  // Default - indigo
  return "text-indigo-600 bg-indigo-50 border-indigo-200";
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
        <button className="text-indigo-600 text-xs font-semibold hover:underline">
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
                  const actionDisplay = formatActionType(log);
                  const IconComponent = getActionIcon(log.action, log.entity_type);
                  const style = getActionStyle(log.action, log.entity_type);

                  return (
                    <div
                      key={log.id}
                      className="p-4 hover:bg-slate-50/50 transition-colors flex gap-4"
                    >
                      {/* Time */}
                      <div className="text-slate-400 font-mono text-xs pt-0.5 w-16 shrink-0">
                        {formatTime(log.timestamp)}
                      </div>

                      {/* Icon */}
                      <div className={`p-2 rounded-lg border ${style} shrink-0`}>
                        <IconComponent className="w-4 h-4" strokeWidth={2} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-semibold text-[#1B254B] text-sm">
                            {log.performed_by}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style}`}>
                            {actionDisplay}
                          </span>
                        </div>
                        {(() => {
                          const description = formatLogDescription(log);
                          return description && (
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {description}
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
