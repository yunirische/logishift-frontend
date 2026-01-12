import React, { useCallback, useEffect, useState } from "react";
import { API_ENDPOINTS } from "../constants";
import api from "../services/api";
import { DriverState, Shift, User, UserRole } from "../types";

const Dashboard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(
    api.getUserInfo()
  );
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");

  const isAdminView =
    currentUser?.role === UserRole.ADMIN ||
    currentUser?.role === UserRole.FOREMAN;

  const refreshStatus = useCallback(async () => {
    try {
      // 1. Получаем актуальный профиль пользователя (со стейтом) из /auth/me
      const userRes = await api.get(API_ENDPOINTS.AUTH_ME);
      setCurrentUser(userRes);
      api.setUserInfo(userRes);

      // 2. Если пользователь не в простое, пытаемся найти активную смену
      if (userRes.current_state !== DriverState.IDLE) {
        try {
          const shiftRes = await api.get(`${API_ENDPOINTS.SHIFTS}/active`);
          setActiveShift(shiftRes);
        } catch (e: any) {
          // Если 404 на /active — значит смены нет, это нормально для некоторых стейтов
          setActiveShift(null);
          if (userRes.current_state === DriverState.ACTIVE) {
            // Если стейт говорит "активен", а смены нет — сбрасываем в idle
            await refreshStatus();
          }
        }
      } else {
        setActiveShift(null);
      }

      // 3. Подгружаем списки для выбора
      if (userRes.current_state === DriverState.PENDING_TRUCK) {
        const fleet = await api.get(API_ENDPOINTS.FLEET);
        setTrucks(Array.isArray(fleet) ? fleet.filter((v) => !v.is_busy) : []);
      }
      if (userRes.current_state === DriverState.PENDING_SITE) {
        const objects = await api.get(API_ENDPOINTS.OBJECTS);
        setSites(
          Array.isArray(objects) ? objects.filter((o) => o.is_active) : []
        );
      }
    } catch (err: any) {
      console.error("Refresh status error:", err);
      // Если 404 на /me или другие критические ошибки сессии
      if (err.message.includes("404") || err.message.includes("401")) {
        // Оставляем как есть или можно разлогинить, если токен протух
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  useEffect(() => {
    if (
      currentUser?.current_state === DriverState.ACTIVE &&
      activeShift?.started_at
    ) {
      const timer = setInterval(() => {
        const start = new Date(activeShift.started_at).getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, now - start);

        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        setElapsedTime(
          `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
            .toString()
            .padStart(2, "0")}`
        );
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentUser?.current_state, activeShift?.started_at]);

  const performAction = async (action: () => Promise<any>) => {
    setIsActionLoading(true);
    try {
      await action();
      await refreshStatus();
    } catch (err: any) {
      alert(err.message || "Ошибка действия");
    } finally {
      setIsActionLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Синхронизация стейт-машины...
        </p>
      </div>
    );

  if (isAdminView) {
    return (
      <div className="space-y-8 animate-in fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl mb-4">
              🚛
            </div>
            <p className="text-3xl font-black text-[#1B254B]">?</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              В рейсе
            </p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-slate-100">
          <h3 className="text-lg font-black text-[#1B254B] mb-6">Мониторинг</h3>
          <p className="text-slate-400 text-sm">
            Панель администратора в режиме просмотра данных.
          </p>
        </div>
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsActionLoading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file); // КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: поле 'photo'

      const response = await fetch(API_ENDPOINTS.UPLOAD_PHOTO, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${api.getAuthToken()}`,
          // Content-Type НЕ ставим, браузер сам поставит boundary
        },
        body: fd,
      });

      if (!response.ok) throw new Error("Ошибка загрузки фото");

      await refreshStatus(); // Обновляем состояние после загрузки
    } catch (err) {
      alert("Сеть нестабильна. Попробуйте еще раз.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const [selectedTruck, setSelectedTruck] = useState<number | null>(null);
  const [selectedSite, setSelectedSite] = useState<number | null>(null);

  // И функцию старта:
  const startShiftFull = async () => {
    if (!selectedTruck || !selectedSite) return;

    await performAction(() =>
      api.post(API_ENDPOINTS.START_SHIFT, {
        truck_id: selectedTruck,
        site_id: selectedSite,
      })
    );
  };

  const renderDriverUI = () => {
    const state = currentUser?.current_state || DriverState.IDLE;

    switch (state) {
      case DriverState.IDLE:
        return (
          <div className="text-center py-10 animate-in zoom-in-95">
            <div className="w-32 h-32 bg-slate-100 rounded-[40px] flex items-center justify-center text-5xl mx-auto mb-8 shadow-inner text-slate-300">
              💤
            </div>
            <h2 className="text-4xl font-black text-[#1B254B] mb-4">
              Вы отдыхаете
            </h2>
            <p className="text-slate-400 mb-10 max-w-xs mx-auto font-medium">
              Готовы начать новый рабочий день? Нажмите кнопку ниже.
            </p>
            <button
              onClick={() =>
                performAction(() => api.post(API_ENDPOINTS.SHIFTS, {}))
              }
              disabled={isActionLoading}
              className="w-full max-w-sm py-8 bg-indigo-600 text-white rounded-[32px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all"
            >
              🚀 Начать смену
            </button>
          </div>
        );

      case DriverState.PENDING_TRUCK:
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-black text-[#1B254B] px-4">
              🚜 Выберите машину
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {trucks.map((truck) => (
                <button
                  key={truck.id}
                  onClick={() =>
                    performAction(() =>
                      api.post(`${API_ENDPOINTS.SHIFTS}/select_truck`, {
                        truck_id: truck.id,
                      })
                    )
                  }
                  disabled={isActionLoading}
                  className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:border-indigo-600 text-left flex items-center justify-between group transition-all"
                >
                  <div>
                    <p className="text-lg font-black text-[#1B254B]">
                      {truck.plate || truck.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Доступна для работы
                    </p>
                  </div>
                  <span className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    ➔
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() =>
                performAction(() =>
                  api.post(`${API_ENDPOINTS.SHIFTS}/cancel`, {})
                )
              }
              className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest"
            >
              Отменить
            </button>
          </div>
        );

      case DriverState.PENDING_SITE:
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-black text-[#1B254B] px-4">
              🏗️ Выберите объект
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {sites.map((site) => (
                <button
                  key={site.id}
                  onClick={() =>
                    performAction(() =>
                      api.post(`${API_ENDPOINTS.SHIFTS}/select_site`, {
                        site_id: site.id,
                      })
                    )
                  }
                  disabled={isActionLoading}
                  className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:border-indigo-600 text-left flex items-center justify-between group transition-all"
                >
                  <div>
                    <p className="text-lg font-black text-[#1B254B]">
                      {site.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {site.location || "Активный объект"}
                    </p>
                  </div>
                  <span className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    ➔
                  </span>
                </button>
              ))}
            </div>
          </div>
        );

      case DriverState.AWAITING_ODO_START:
      case DriverState.AWAITING_ODO_END:
      case DriverState.AWAITING_INVOICE:
        const isStart = state === DriverState.AWAITING_ODO_START;
        const isEnd = state === DriverState.AWAITING_ODO_END;
        const title = isStart
          ? "📸 Фото одометра (СТАРТ)"
          : isEnd
          ? "📸 Фото одометра (ФИНИШ)"
          : "📸 Фото накладной";
        const endpoint = isStart
          ? "photo/start"
          : isEnd
          ? "photo/end"
          : "photo/invoice";

        return (
          <div className="text-center py-8 animate-in zoom-in-95">
            <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6">
                📷
              </div>
              <h3 className="text-xl font-black text-[#1B254B] mb-2">
                {title}
              </h3>
              <p className="text-slate-400 text-sm mb-8">
                Для перехода к следующему шагу необходимо прислать фотографию.
              </p>

              <label className="block">
                <div className="w-full py-6 bg-indigo-600 text-white rounded-[24px] font-black uppercase tracking-widest cursor-pointer hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
                  {isActionLoading ? "Загрузка..." : "Сделать фото / Выбрать"}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const fd = new FormData();
                      fd.append("file", file);
                      performAction(() =>
                        fetch(`${API_ENDPOINTS.SHIFTS}/${endpoint}`, {
                          method: "POST",
                          headers: {
                            Authorization: `Bearer ${api.getAuthToken()}`,
                          },
                          body: fd,
                        })
                      );
                    }
                  }}
                />
              </label>
            </div>
            <div className="mt-8 bg-slate-50 p-4 rounded-2xl text-left border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">
                Контекст
              </p>
              <p className="text-xs font-bold text-[#1B254B]">
                🚛 Машина: {activeShift?.vehicle_plate || "—"}
              </p>
              <p className="text-xs font-bold text-[#1B254B]">
                🏗️ Объект: {activeShift?.work_object || "—"}
              </p>
            </div>
          </div>
        );

      case DriverState.ACTIVE:
        return (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-[#1B254B] p-10 rounded-[40px] text-center text-white shadow-2xl shadow-indigo-200">
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] mb-4">
                Время в работе
              </p>
              <h2 className="text-6xl font-black tracking-tighter mb-8 font-mono">
                {elapsedTime}
              </h2>

              <div className="flex justify-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[10px] font-bold uppercase text-emerald-400">
                  Смена активна
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <h4 className="text-sm font-black text-[#1B254B] mb-6 uppercase tracking-widest">
                Проверка отчета
              </h4>
              <ul className="space-y-4">
                <li className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Одометр (Старт)
                  </span>
                  <span className="text-emerald-500 font-bold">✅</span>
                </li>
                {activeShift?.site?.odometer_required && (
                  <li className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl opacity-50">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      Одометр (Финиш)
                    </span>
                    <span className="text-slate-300 font-bold">❌</span>
                  </li>
                )}
                {(activeShift?.site?.invoice_required ||
                  activeShift?.tenant?.invoice_required) && (
                  <li className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      Накладная
                    </span>
                    <span
                      className={
                        activeShift?.invoice_url
                          ? "text-emerald-500 font-bold"
                          : "text-slate-300 font-bold"
                      }
                    >
                      {activeShift?.invoice_url ? "✅" : "❌"}
                    </span>
                  </li>
                )}
              </ul>
            </div>

            <button
              onClick={() => {
                if (confirm("Завершить текущую смену?")) {
                  performAction(() =>
                    api.post(`${API_ENDPOINTS.SHIFTS}/finish_request`, {})
                  );
                }
              }}
              disabled={isActionLoading}
              className="w-full py-8 bg-red-500 text-white rounded-[32px] font-black uppercase tracking-widest shadow-xl shadow-red-100 active:scale-95 transition-all"
            >
              🏁 Завершить смену
            </button>
          </div>
        );

      default:
        return <div>Неизвестное состояние</div>;
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-10">
      <header className="flex justify-between items-center mb-8 px-4">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Статус
          </p>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                currentUser?.current_state === DriverState.IDLE
                  ? "bg-slate-300"
                  : "bg-emerald-500 animate-pulse"
              }`}
            ></div>
            <p className="text-sm font-black text-[#1B254B] uppercase tracking-tighter">
              {currentUser?.current_state === DriverState.IDLE
                ? "Отдых"
                : "В работе"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Время
          </p>
          <p className="text-sm font-black text-[#1B254B]">
            {new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </header>

      {renderDriverUI()}
    </div>
  );
};

export default Dashboard;
