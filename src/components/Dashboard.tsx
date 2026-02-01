import React, { useCallback, useEffect, useState, useRef, Suspense } from "react";
import { API_ENDPOINTS } from "../constants";
import api, { getPhotoUrl, getCurrentShift } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { DriverState, Shift, UserRole, ManualShiftRequest } from "../types";
import {
  Clock,
  Truck,
  Hand,
  Plus,
  User,
  Building2,
  Moon,
  Rocket,
  ArrowRight,
  Camera,
  Flag,
} from "lucide-react";

// Dynamic import for manual shift modal
const ManualShiftModal = React.lazy(() => import("./ManualShiftModal"));

// Лог версии для проверки очистки кэша
console.log("Dashboard Version 2.0 Loaded");

// Вспомогательная функция проверки URL фото
const isValidPhotoUrl = (url: any): boolean => {
  return url && typeof url === 'string' && url.startsWith('/');
};

// Вспомогательный компонент для карточки лимитов
// Bundle optimization: memo to prevent unnecessary re-renders (rerender-memo)
const UsageCard: React.FC<{
  label: string;
  icon: React.ReactNode;
  current: number;
  limit: number;
}> = React.memo(({ label, icon, current, limit }) => {
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
    <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
        </div>
        <span className={`text-sm font-semibold ${isNearLimit ? 'text-orange-500' : isUnlimited ? 'text-slate-600' : 'text-slate-800'}`}>
          {current} / {displayLimit}
        </span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isUnlimited ? 'bg-slate-300' :
            isNearLimit ? 'bg-orange-500' : 'bg-[#0a192f]'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
});

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  // Remove derived state - use user directly from context
  const currentUser = user;
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  // Track if getCurrentShift has completed (for sync state detection)
  // Start as false so loading state shows first, then recovery if needed
  const [shiftCheckComplete, setShiftCheckComplete] = useState(false);
  const [needsRecovery, setNeedsRecovery] = useState(false);

  // Loading state: show spinner until shift check is complete
  // Then show recovery state if needed, or normal UI
  const isLoading = loading || !shiftCheckComplete;

  // Use ref to store start time and prevent timer re-creation
  const startTimeRef = useRef<number>();

  const [selectedTruck, setSelectedTruck] = useState<number | null>(null);
  const [selectedSite, setSelectedSite] = useState<number | null>(null);
  const [step, setStep] = useState<
    "idle" | "selecting_truck" | "selecting_site"
  >("idle");

  // Для ручной смены (admin)
  const [showManualModal, setShowManualModal] = useState(false);

  const [stats, setStats] = useState<{
    activeShifts: number;
    activeDrivers: number;
    trucksInWork?: number;
    usage: {
      trucks: { current: number; limit: number };
      drivers: { current: number; limit: number };
      sites: { current: number; limit: number };
    };
    currentPlan: { name: string; billingUrl: string };
    activeShiftsDetails: Array<{
      driver_name: string;
      truck_name: string;
      site_name: string;
      start_time: string;
    }>;
  }>({
    activeShifts: 0,
    activeDrivers: 0,
    usage: {
      trucks: { current: 0, limit: 0 },
      drivers: { current: 0, limit: 0 },
      sites: { current: 0, limit: 0 },
    },
    currentPlan: { name: '', billingUrl: '' },
    activeShiftsDetails: [],
  });

  const isAdminView =
    currentUser?.role === UserRole.ADMIN ||
    currentUser?.role === UserRole.FOREMAN;

  const refreshStatus = useCallback(async () => {
    try {
      // 1. Параллельная загрузка всех данных с better-all паттерном
      const [shiftRes, trucksData, sitesData] = await Promise.all([
        getCurrentShift(),
        trucks.length === 0 ? api.get(API_ENDPOINTS.TRUCKS).catch(() => []) : Promise.resolve(trucks),
        sites.length === 0 ? api.get(API_ENDPOINTS.SITES).catch(() => []) : Promise.resolve(sites),
      ]);

      // Mark shift check as complete
      setShiftCheckComplete(true);

      // 2. Устанавливаем данные смены
      setActiveShift(shiftRes);

      // 3. СИНХРОНИЗАЦИЯ СОСТОЯНИЯ
      if (currentUser) {
        let realStateInDb = currentUser.current_state;

        if (shiftRes) {
          // If we have a shift, use its status
          realStateInDb = shiftRes.status as DriverState;
          setNeedsRecovery(false);
        } else {
          // No shift found
          // If user thinks they're active but DB has no shift, we need recovery
          if (currentUser.current_state !== DriverState.IDLE) {
            setNeedsRecovery(true);
          }
          // Reset to idle
          realStateInDb = DriverState.IDLE;
        }

        // Sync state to localStorage if different
        if (currentUser.current_state !== realStateInDb) {
          const updatedUser = { ...currentUser, current_state: realStateInDb };
          api.setUserInfo(updatedUser);
          // AuthContext обновится автоматически при следующем рендере из localStorage
        }
      }

      // 4. ЗАГРУЗКА СПИСКОВ (если нужно)
      if (trucks.length === 0 && Array.isArray(trucksData)) {
        setTrucks(trucksData);
      }
      if (sites.length === 0 && Array.isArray(sitesData)) {
        setSites(sitesData);
      }
    } catch (e: any) {
      console.error("Ошибка синхронизации стейта:", e);
    } finally {
      setLoading(false);
    }
  }, [currentUser]); // Only depend on currentUser, not step or trucks.length

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  useEffect(() => {
    // Update ref when activeShift changes
    if (activeShift?.start_time) {
      startTimeRef.current = new Date(activeShift.start_time).getTime();
    }
  }, [activeShift?.start_time]);

  useEffect(() => {
    // Timer - only depends on user state, uses ref for start time
    if (currentUser?.current_state === DriverState.ACTIVE && startTimeRef.current) {
      const timer = setInterval(() => {
        const start = startTimeRef.current || Date.now();
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
  }, [currentUser?.current_state]); // Only depend on user state, not activeShift

  useEffect(() => {
    // Загрузка статистики для админа
    if (isAdminView) {
      api
        .get(API_ENDPOINTS.DASHBOARD_STATS)
        .then((res) => {
          setStats({
            activeShifts: res.activeShifts || 0,
            activeDrivers: res.activeDrivers || 0,
            trucksInWork: res.trucksInWork,
            usage: res.usage || {
              trucks: { current: 0, limit: 0 },
              drivers: { current: 0, limit: 0 },
              sites: { current: 0, limit: 0 },
            },
            currentPlan: res.currentPlan || { name: '', billingUrl: '' },
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
      refreshStatus().catch(console.error); // Don't await - non-blocking
    } catch (err: any) {
      alert(err.message || "Ошибка действия");
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-[#0a192f] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
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
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-indigo-50 text-[#0a192f] flex items-center justify-center mb-4">
              <Clock size={24} />
            </div>
            <p className="text-3xl font-semibold text-[#1B254B]">
              {stats.activeShifts}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Активные смены
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Truck size={24} />
            </div>
            <p className="text-3xl font-semibold text-[#1B254B]">
              {stats.activeDrivers}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Водителей в рейсе
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Hand size={24} />
            </div>
            <p className="text-3xl font-semibold text-[#1B254B]">
              +
            </p>
            <button
              onClick={() => setShowManualModal(true)}
              className="mt-2 w-full py-2 bg-amber-500 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Создать смену вручную
            </button>
          </div>
        </div>

        {/* НОВЫЙ РАЗДЕЛ: Usage Limits (Лимиты тарифа) */}
        <div className="bg-white p-8 rounded-lg border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-[#1B254B]">Лимиты тарифа</h3>
            {stats.currentPlan && stats.currentPlan.name && (
              <span className="px-3 py-1 bg-indigo-100 text-[#0a192f] text-xs font-bold rounded-full">
                {stats.currentPlan.name}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.usage && (
              <>
                <UsageCard
                  label="Машины"
                  icon={<Truck size={24} className="text-[#0a192f]" />}
                  current={stats.usage.trucks?.current || 0}
                  limit={stats.usage.trucks?.limit || 0}
                />
                <UsageCard
                  label="Водители"
                  icon={<User size={24} className="text-[#0a192f]" />}
                  current={stats.usage.drivers?.current || 0}
                  limit={stats.usage.drivers?.limit || 0}
                />
                <UsageCard
                  label="Объекты"
                  icon={<Building2 size={24} className="text-[#0a192f]" />}
                  current={stats.usage.sites?.current || 0}
                  limit={stats.usage.sites?.limit || 0}
                />
              </>
            )}
          </div>
        </div>

        {/* Активные смены */}
        {stats.activeShiftsDetails && stats.activeShiftsDetails.length > 0 && (
          <div className="bg-white p-8 rounded-lg border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold text-[#1B254B] mb-6">Активные смены</h3>
            <div className="space-y-4">
              {stats.activeShiftsDetails.map((shift, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50">
                  <div>
                    <div className="font-bold text-[#1B254B]">
                      {shift.driver_name} — {shift.truck_name} — {shift.site_name}
                    </div>
                    <div className="text-xs text-slate-400">
                      Старт: {shift.start_time ? new Date(shift.start_time).toLocaleString() : 'В процессе оформления'}
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full">
                    В работе
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Модальное окно для ручной смены */}
        {showManualModal && (
          <Suspense fallback={<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-8 text-center">Загрузка...</div>
          </div>}>
            <ManualShiftModal
              isOpen={showManualModal}
              onClose={() => setShowManualModal(false)}
              onSave={async () => {
                setShowManualModal(false);
                // Refresh stats
                const res = await api.get(API_ENDPOINTS.DASHBOARD_STATS);
                setStats({
                  activeShifts: res.activeShifts || 0,
                  activeDrivers: res.activeDrivers || 0,
                  trucksInWork: res.trucksInWork,
                  usage: res.usage || {
                    trucks: { current: 0, limit: 0 },
                    drivers: { current: 0, limit: 0 },
                    sites: { current: 0, limit: 0 },
                  },
                  currentPlan: res.currentPlan || { name: '', billingUrl: '' },
                  activeShiftsDetails: res.activeShiftsDetails || [],
                });
              }}
              timezone={"Europe/Moscow"}
            />
          </Suspense>
        )}

        <div className="bg-white p-8 rounded-lg border border-slate-100">
          <h3 className="text-lg font-semibold text-[#1B254B] mb-6">Мониторинг</h3>
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

    // Show recovery state if:
    // - Shift check is complete
    // - We detected a state mismatch (needsRecovery=true)
    // - No active shift exists
    if (shiftCheckComplete && needsRecovery && !activeShift) {
      return (
        <div className="text-center py-10 animate-in zoom-in-95">
          <div className="w-32 h-32 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Clock size={64} className="text-amber-500 animate-spin-slow" />
          </div>
          <h2 className="text-2xl font-semibold text-[#1B254B] mb-4">
            Синхронизация...
          </h2>
          <p className="text-slate-400 mb-10 max-w-xs mx-auto font-medium">
            Обнаружено рассинхрон. Состояние сбрасывается в режим отдыха.
          </p>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      );
    }

    if (state === DriverState.IDLE) {
      if (step === "idle") {
        return (
          <div className="text-center py-10 animate-in zoom-in-95">
            <div className="w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Moon size={64} className="text-slate-300" />
            </div>
            <h2 className="text-4xl font-semibold text-[#1B254B] mb-4">
              Вы отдыхаете
            </h2>
            <p className="text-slate-400 mb-10 max-w-xs mx-auto font-medium">
              Готовы начать новый рабочий день? Выберите машину и объект.
            </p>
            <button
              onClick={() => setStep("selecting_truck")}
              className="w-full max-w-sm py-8 bg-[#0a192f] text-white rounded-lg font-semibold uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Rocket size={24} />
              Начать смену
            </button>
          </div>
        );
      }

      if (step === "selecting_truck") {
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-2xl font-semibold text-[#1B254B] flex items-center gap-2">
                <Truck size={20} className="text-[#0a192f]" />
                Выберите машину
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
                    className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm hover:border-[#0a192f] text-left flex items-center justify-between group transition-all"
                  >
                    <div>
                      <p className="text-lg font-semibold text-[#1B254B]">
                        {truck.plate || truck.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Доступна для работы
                      </p>
                    </div>
                    <span className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <ArrowRight size={16} />
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
              <h2 className="text-2xl font-semibold text-[#1B254B] flex items-center gap-2">
                <Building2 size={20} className="text-[#0a192f]" />
                Выберите объект
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
                  onClick={async () =>
                    performAction(async () => {
                      // Call start shift API
                      await api.post(API_ENDPOINTS.START_SHIFT, {
                        truck_id: selectedTruck,
                        site_id: site.id,
                      });
                      // Wait for refreshStatus to confirm the shift before resetting step
                      await refreshStatus();
                      setStep("idle");
                      setNeedsRecovery(false);
                    })
                  }
                  className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm hover:border-[#0a192f] text-left flex items-center justify-between group transition-all"
                >
                  <div>
                    <p className="text-lg font-semibold text-[#1B254B]">
                      {site.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Активный объект
                    </p>
                  </div>
                  <span className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <ArrowRight size={16} />
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
        ? "Фото одометра (СТАРТ)"
        : isEnd
        ? "Фото одометра (ФИНИШ)"
        : "Фото накладной";

      return (
        <div className="text-center py-8 animate-in zoom-in-95">
          <div className="bg-white p-10 rounded-lg shadow-2xl border border-slate-100">
            <div className="w-20 h-20 bg-indigo-50 text-[#0a192f] rounded-lg flex items-center justify-center mx-auto mb-6">
              <Camera size={32} />
            </div>
            <h3 className="text-xl font-semibold text-[#1B254B] mb-2 flex items-center justify-center gap-2">
              <Camera size={20} className="text-[#0a192f]" />
              {title}
            </h3>
            <p className="text-slate-400 text-sm mb-8">
              Сфотографируйте документ или панель приборов для продолжения.
            </p>

            <label htmlFor="photo-upload" className="block">
              <div className="w-full py-6 bg-indigo-600 text-white rounded-lg font-semibold uppercase tracking-widest cursor-pointer hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
                {isActionLoading ? "Загрузка..." : "Открыть камеру"}
              </div>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                disabled={isActionLoading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const fd = new FormData();
                    fd.append("photo", file);
                    await performAction(async () => {
                      await fetch(API_ENDPOINTS.UPLOAD_PHOTO, {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${api.getAuthToken()}`,
                        },
                        body: fd,
                      });
                      // Wait for confirmation after photo upload
                      await refreshStatus();
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
          <div className="bg-[#1B254B] p-10 rounded-lg text-center text-white shadow-2xl shadow-indigo-200">
            <p className="text-[10px] font-semibold text-indigo-300 uppercase tracking-[0.3em] mb-4">
              Время в работе
            </p>
            <h2 className="text-6xl font-semibold tracking-tighter mb-8 font-jetbrains">
              {elapsedTime}
            </h2>
            <div className="flex justify-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[10px] font-bold uppercase text-emerald-400">
                Смена активна
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                <Truck size={16} className="text-slate-500" />
                Машина
              </span>
              <span className="text-sm font-semibold text-[#1B254B]">
                {activeShift?.truck?.name || "—"}
              </span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                <Building2 size={16} className="text-slate-500" />
                Объект
              </span>
              <span className="text-sm font-semibold text-[#1B254B]">
                {activeShift?.site?.name || "—"}
              </span>
            </div>
            {/* Photo requirements indicator */}
            {activeShift?.site && (activeShift.site.odometer_required || activeShift.site.invoice_required) && (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">
                  Требуется фото:
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeShift.site.odometer_required && (
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded border border-amber-200">
                      🏁 Одометр
                    </span>
                  )}
                  {activeShift.site.invoice_required && (
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded border border-amber-200">
                      📄 Накладная
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (confirm("Завершить смену?"))
                performAction(() => api.post(API_ENDPOINTS.END_SHIFT, {}));
            }}
            disabled={isActionLoading}
            className="w-full py-8 bg-[#0a192f] text-white rounded-lg font-semibold uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Flag size={24} />
            Завершить смену
          </button>
        </div>
      );
    }

    return (
      <div className="p-20 text-center text-slate-300">
        <p>Неизвестное состояние системы</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-[#0a192f] font-bold"
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
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
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
            <p className="text-sm font-semibold text-[#1B254B] uppercase tracking-tighter">
              {currentUser?.current_state === DriverState.IDLE
                ? "Отдых"
                : "В работе"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Время
          </p>
          <p className="text-sm font-semibold text-[#1B254B]">
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
