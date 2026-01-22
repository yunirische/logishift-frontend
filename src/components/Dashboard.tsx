import React, { useCallback, useEffect, useState } from "react";
import { API_ENDPOINTS } from "../constants";
import api, { getPhotoUrl } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { DriverState, Shift, User, UserRole, ManualShiftRequest } from "../types";

// Лог версии для проверки очистки кэша
console.log("Dashboard Version 2.0 Loaded");

// Вспомогательная функция проверки URL фото
const isValidPhotoUrl = (url: any): boolean => {
  return url && typeof url === 'string' && url.startsWith('/');
};

// Вспомогательный компонент для карточки лимитов
const UsageCard: React.FC<{
  label: string;
  icon: string;
  current: number;
  limit: number;
}> = ({ label, icon, current, limit }) => {
  let percentage = 0;
  let isNearLimit = false;
  let isUnlimited = false;
  if (limit === -1) {
    // безлимитный тариф
    percentage = 100; // показываем полную полоску серым
    isNearLimit = false;
    isUnlimited = true;
  } else if (limit > 0) {
    percentage = Math.round((current / limit) * 100);
    isNearLimit = percentage >= 80;
  } else {
    // limit === 0 или отрицательный (не -1)
    percentage = 0;
    isNearLimit = false;
  }
  const displayLimit = limit === -1 ? "∞" : limit;
  
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
        </div>
        <span className={`text-sm font-black ${isNearLimit ? 'text-orange-500' : isUnlimited ? 'text-slate-600' : 'text-slate-800'}`}>
          {current} / {displayLimit}
        </span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isUnlimited ? 'bg-slate-300' : 
            isNearLimit ? 'bg-orange-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(user);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [selectedTruck, setSelectedTruck] = useState<number | null>(null);
  const [selectedSite, setSelectedSite] = useState<number | null>(null);
  const [step, setStep] = useState<
    "idle" | "selecting_truck" | "selecting_site"
  >("idle");

  // Для ручной смены (admin)
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualDriverId, setManualDriverId] = useState<number | null>(null);
  const [manualTruckId, setManualTruckId] = useState<number | null>(null);
  const [manualSiteId, setManualSiteId] = useState<number | null>(null);
  const [driversList, setDriversList] = useState<any[]>([]);
  const [manualLoading, setManualLoading] = useState(false);

  // Структура stats соответствует новой спецификации API
  const [stats, setStats] = useState<{
    activeShifts: number;
    activeDrivers: number;
    usage: {
      trucks: { current: number; limit: number };
      drivers: { current: number; limit: number };
      sites: { current: number; limit: number };
    };
    currentPlan: string | { name: string };
    activeShiftsDetails: any[];
  }>({
    activeShifts: 0,
    activeDrivers: 0,
    usage: {
      trucks: { current: 0, limit: 0 },
      drivers: { current: 0, limit: 0 },
      sites: { current: 0, limit: 0 },
    },
    currentPlan: '',
    activeShiftsDetails: [],
  });

  const isAdminView =
    currentUser?.role === UserRole.ADMIN ||
    currentUser?.role === UserRole.FOREMAN;

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    }
  }, [user]);

  const refreshStatus = useCallback(async () => {
    try {
      // 1. Запрашиваем текущую смену
      const shiftRes = await api.get(API_ENDPOINTS.CURRENT_SHIFT);
      setActiveShift(shiftRes);

      // 2. СИНХРОНИЗАЦИЯ СОСТОЯНИЯ
      if (currentUser) {
        let realStateInDb = currentUser.current_state;

        if (shiftRes) {
          realStateInDb = shiftRes.status as DriverState;
        } else {
          if (step === "idle") {
            realStateInDb = DriverState.IDLE;
          }
        }

        if (currentUser.current_state !== realStateInDb) {
          const updatedUser = { ...currentUser, current_state: realStateInDb };
          setCurrentUser(updatedUser);
          api.setUserInfo(updatedUser);
        }
      }

      // 3. ЗАГРУЗКА СПИСКОВ (если нужно)
      if (!shiftRes && trucks.length === 0) {
        const [trucksData, sitesData] = await Promise.all([
          api.get(API_ENDPOINTS.TRUCKS),
          api.get(API_ENDPOINTS.SITES),
        ]);

        setTrucks(Array.isArray(trucksData) ? trucksData : []);
        setSites(Array.isArray(sitesData) ? sitesData : []);
      }
    } catch (e: any) {
      console.error("Ошибка синхронизации стейта:", e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, trucks.length, step]);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 15000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  useEffect(() => {
    // Таймер
    if (
      currentUser?.current_state === DriverState.ACTIVE &&
      activeShift?.started_at
    ) {
      const timer = setInterval(() => {
        const start = new Date(
          activeShift.start_time || activeShift.started_at || Date.now()
        ).getTime();
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

  // Загрузка данных для ручной смены (водители, машины, объекты)
  useEffect(() => {
    if (isAdminView && showManualModal) {
      const loadManualData = async () => {
        try {
          const [driversRes, trucksRes, sitesRes] = await Promise.all([
            api.get(API_ENDPOINTS.DRIVERS),
            api.get(API_ENDPOINTS.TRUCKS),
            api.get(API_ENDPOINTS.SITES),
          ]);
          // Водители только с ролью driver и idle
          const idleDrivers = Array.isArray(driversRes) 
            ? driversRes.filter((d: any) => 
                d.role === UserRole.DRIVER && d.current_state === DriverState.IDLE
              )
            : [];
          setDriversList(idleDrivers);
          // Машины только не занятые
          const freeTrucks = Array.isArray(trucksRes)
            ? trucksRes.filter((t: any) => !t.is_busy && t.is_active)
            : [];
          setTrucks(freeTrucks);
          // Объекты активные
          const activeSites = Array.isArray(sitesRes)
            ? sitesRes.filter((s: any) => s.is_active)
            : [];
          setSites(activeSites);
        } catch (error) {
          console.error("Ошибка загрузки данных для ручной смены:", error);
        }
      };
      loadManualData();
    }
  }, [isAdminView, showManualModal]);

  useEffect(() => {
    // Загрузка статистики для админа
    if (isAdminView) {
      api
        .get(API_ENDPOINTS.DASHBOARD_STATS)
        .then((res) => {
          // Явно обновляем стейт, убедившись, что структура соответствует API
          setStats({
            activeShifts: res.activeShifts || 0,
            activeDrivers: res.activeDrivers || 0,
            usage: res.usage || {
              trucks: { current: 0, limit: 0 },
              drivers: { current: 0, limit: 0 },
              sites: { current: 0, limit: 0 },
            },
            currentPlan: res.currentPlan || '',
            activeShiftsDetails: res.activeShiftsDetails || [],
          });
        })
        .catch(console.error);
    }
  }, [isAdminView]);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Синхронизация стейт-машины...
        </p>
      </div>
    );
  }

  // === ADMIN VIEW ===
  if (isAdminView) {
    return (
      <div className="space-y-8 animate-in fade-in">
        {/* Основная статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl mb-4">
              ⏱️
            </div>
            <p className="text-3xl font-black text-[#1B254B]">
              {stats.activeShifts}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Активные смены
            </p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-4">
              🚛
            </div>
            <p className="text-3xl font-black text-[#1B254B]">
              {stats.activeDrivers}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Водителей в рейсе
            </p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl mb-4">
              ✋
            </div>
            <p className="text-3xl font-black text-[#1B254B]">
              +
            </p>
            <button
              onClick={() => setShowManualModal(true)}
              className="mt-2 w-full py-2 bg-amber-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-amber-600 transition-all"
            >
              ➕ Создать смену вручную
            </button>
          </div>
        </div>

        {/* НОВЫЙ РАЗДЕЛ: Usage Limits (Лимиты тарифа) */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-[#1B254B]">Лимиты тарифа</h3>
            {stats.currentPlan && (
              <span className="px-3 py-1 bg-indigo-100 text-indigo-600 text-xs font-bold rounded-full">
                Текущий тариф: {typeof stats.currentPlan === 'string' ? stats.currentPlan : stats.currentPlan?.name || "Загрузка..."}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.usage && (
              <>
                <UsageCard
                  label="Машины"
                  icon="🚚"
                  current={stats.usage.trucks?.current || 0}
                  limit={stats.usage.trucks?.limit || 0}
                />
                <UsageCard
                  label="Водители"
                  icon="👷"
                  current={stats.usage.drivers?.current || 0}
                  limit={stats.usage.drivers?.limit || 0}
                />
                <UsageCard
                  label="Объекты"
                  icon="🏗️"
                  current={stats.usage.sites?.current || 0}
                  limit={stats.usage.sites?.limit || 0}
                />
              </>
            )}
          </div>
        </div>

        {/* Активные смены */}
        {stats.activeShiftsDetails && stats.activeShiftsDetails.length > 0 && (
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-[#1B254B] mb-6">Активные смены</h3>
            <div className="space-y-4">
              {stats.activeShiftsDetails.map((shift: any) => (
                <div key={shift.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50">
                  <div>
                    <div className="font-bold text-[#1B254B]">
                      {shift.driver_name} — {shift.truck_name} — {shift.site_name}
                    </div>
                    <div className="text-xs text-slate-400">
                      Старт: {shift.start_time ? new Date(shift.start_time).toLocaleString() : 'Оформление...'}
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full">
                    {shift.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Модальное окно для ручной смены */}
        {showManualModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-8 animate-in zoom-in-95">
              <h3 className="text-xl font-black text-[#1B254B] mb-2">
                ✋ Создать смену вручную
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                Выберите водителя, машину и объект
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    Водитель (idle)
                  </label>
                  <select
                    className="w-full p-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={manualDriverId || ""}
                    onChange={(e) => setManualDriverId(Number(e.target.value) || null)}
                    disabled={manualLoading}
                  >
                    <option value="">Выберите водителя</option>
                    {driversList.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.full_name} (ID: {driver.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    Машина (не занята)
                  </label>
                  <select
                    className="w-full p-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={manualTruckId || ""}
                    onChange={(e) => setManualTruckId(Number(e.target.value) || null)}
                    disabled={manualLoading}
                  >
                    <option value="">Выберите машину</option>
                    {trucks
                      .filter((t) => !t.is_busy && t.is_active)
                      .map((truck) => (
                        <option key={truck.id} value={truck.id}>
                          {truck.name} ({truck.plate})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    Объект
                  </label>
                  <select
                    className="w-full p-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={manualSiteId || ""}
                    onChange={(e) => setManualSiteId(Number(e.target.value) || null)}
                    disabled={manualLoading}
                  >
                    <option value="">Выберите объект</option>
                    {sites
                      .filter((s) => s.is_active)
                      .map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name} (одометр: {site.odometer_required ? "да" : "нет"})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => {
                    setManualDriverId(null);
                    setManualTruckId(null);
                    setManualSiteId(null);
                    setShowManualModal(false);
                  }}
                  className="flex-1 py-3 border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-all"
                  disabled={manualLoading}
                >
                  Отмена
                </button>
                <button
                  onClick={async () => {
                    if (!manualDriverId || !manualTruckId || !manualSiteId) {
                      alert("Заполните все поля");
                      return;
                    }
                    setManualLoading(true);
                    try {
                      const payload: ManualShiftRequest = {
                        driver_id: manualDriverId,
                        truck_id: manualTruckId,
                        site_id: manualSiteId,
                      };
                      await api.post(API_ENDPOINTS.MANUAL_SHIFT, payload);
                      alert("Смена успешно создана!");
                      setManualDriverId(null);
                      setManualTruckId(null);
                      setManualSiteId(null);
                      setShowManualModal(false);
                      // Обновить статистику
                      const res = await api.get(API_ENDPOINTS.DASHBOARD_STATS);
                      setStats({
                        activeShifts: res.activeShifts || 0,
                        activeDrivers: res.activeDrivers || 0,
                        usage: res.usage || {
                          trucks: { current: 0, limit: 0 },
                          drivers: { current: 0, limit: 0 },
                          sites: { current: 0, limit: 0 },
                        },
                        currentPlan: res.currentPlan || '',
                        activeShiftsDetails: res.activeShiftsDetails || [],
                      });
                    } catch (err: any) {
                      alert(err.message || "Ошибка создания смены");
                    } finally {
                      setManualLoading(false);
                    }
                  }}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                  disabled={manualLoading}
                >
                  {manualLoading ? "Создание..." : "Создать смену"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-8 rounded-[40px] border border-slate-100">
          <h3 className="text-lg font-black text-[#1B254B] mb-6">Мониторинг</h3>
          <p className="text-slate-400 text-sm">
            Панель администратора в режиме просмотра данных.
          </p>
        </div>
      </div>
    );
  }

  // === DRIVER VIEW ===
  const renderDriverUI = () => {
    const state = currentUser?.current_state || DriverState.IDLE;

    if (state === DriverState.IDLE) {
      if (step === "idle") {
        return (
          <div className="text-center py-10 animate-in zoom-in-95">
            <div className="w-32 h-32 bg-slate-100 rounded-[40px] flex items-center justify-center text-5xl mx-auto mb-8 shadow-inner text-slate-300">
              💤
            </div>
            <h2 className="text-4xl font-black text-[#1B254B] mb-4">
              Вы отдыхаете
            </h2>
            <p className="text-slate-400 mb-10 max-w-xs mx-auto font-medium">
              Готовы начать новый рабочий день? Выберите машину и объект.
            </p>
            <button
              onClick={() => setStep("selecting_truck")}
              className="w-full max-w-sm py-8 bg-indigo-600 text-white rounded-[32px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all"
            >
              🚀 Начать смену
            </button>
          </div>
        );
      }

      if (step === "selecting_truck") {
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-2xl font-black text-[#1B254B]">
                🚜 Выберите машину
              </h2>
              <button
                onClick={() => setStep("idle")}
                className="text-slate-400 text-sm font-bold"
              >
                Отмена
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {trucks.length > 0 ? (
                trucks.map((truck) => (
                  <button
                    key={truck.id}
                    onClick={() => {
                      setSelectedTruck(truck.id);
                      setStep("selecting_site");
                    }}
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
                ))
              ) : (
                <div className="p-10 text-center text-slate-400 italic">
                  Нет свободных машин
                </div>
              )}
            </div>
          </div>
        );
      }

      if (step === "selecting_site") {
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-2xl font-black text-[#1B254B]">
                🏗️ Выберите объект
              </h2>
              <button
                onClick={() => setStep("selecting_truck")}
                className="text-slate-400 text-sm font-bold"
              >
                Назад
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {sites.map((site) => (
                <button
                  key={site.id}
                  disabled={isActionLoading}
                  onClick={() =>
                    performAction(async () => {
                      await api.post(API_ENDPOINTS.START_SHIFT, {
                        truck_id: selectedTruck,
                        site_id: site.id,
                      });
                      setStep("idle");
                    })
                  }
                  className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:border-indigo-600 text-left flex items-center justify-between group transition-all"
                >
                  <div>
                    <p className="text-lg font-black text-[#1B254B]">
                      {site.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Активный объект
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
      }
    }

    // Состояния ожидания фото
    if (
      [
        DriverState.AWAITING_ODO_START,
        DriverState.AWAITING_ODO_END,
        DriverState.AWAITING_INVOICE,
      ].includes(state)
    ) {
      const isStart = state === DriverState.AWAITING_ODO_START;
      const isEnd = state === DriverState.AWAITING_ODO_END;
      const title = isStart
        ? "📸 Фото одометра (СТАРТ)"
        : isEnd
        ? "📸 Фото одометра (ФИНИШ)"
        : "📸 Фото накладной";

      return (
        <div className="text-center py-8 animate-in zoom-in-95">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6">
              📷
            </div>
            <h3 className="text-xl font-black text-[#1B254B] mb-2">{title}</h3>
            <p className="text-slate-400 text-sm mb-8">
              Сфотографируйте документ или панель приборов для продолжения.
            </p>

            <label className="block">
              <div className="w-full py-6 bg-indigo-600 text-white rounded-[24px] font-black uppercase tracking-widest cursor-pointer hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
                {isActionLoading ? "Загрузка..." : "Открыть камеру"}
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={isActionLoading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const fd = new FormData();
                    fd.append("photo", file);
                    performAction(async () => {
                      await fetch(API_ENDPOINTS.UPLOAD_PHOTO, {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${api.getAuthToken()}`,
                        },
                        body: fd,
                      });
                    });
                  }
                }}
              />
            </label>
          </div>
          {isStart && (
            <button
              onClick={() =>
                performAction(() =>
                  api.post(`${API_ENDPOINTS.SHIFTS}/cancel`, {})
                )
              }
              className="mt-6 text-slate-300 font-bold text-[10px] uppercase tracking-widest"
            >
              Отменить смену
            </button>
          )}
        </div>
      );
    }

    // Активная смена
    if (state === DriverState.ACTIVE) {
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
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase">
                🚛 Машина
              </span>
              <span className="text-sm font-black text-[#1B254B]">
                {activeShift?.truck?.name || activeShift?.vehicle_plate || "—"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase">
                🏗️ Объект
              </span>
              <span className="text-sm font-black text-[#1B254B]">
                {activeShift?.site?.name || activeShift?.work_object || "—"}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (confirm("Завершить смену?"))
                performAction(() => api.post(API_ENDPOINTS.END_SHIFT, {}));
            }}
            disabled={isActionLoading}
            className="w-full py-8 bg-red-500 text-white rounded-[32px] font-black uppercase tracking-widest shadow-xl shadow-red-100 active:scale-95 transition-all"
          >
            🏁 Завершить смену
          </button>
        </div>
      );
    }

    return (
      <div className="p-20 text-center text-slate-300">
        <p>Неизвестное состояние системы</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-indigo-600 font-bold"
        >
          Обновить
        </button>
      </div>
    );
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
