import React, { useCallback, useEffect, useState, Suspense } from "react";
import { API_ENDPOINTS } from "../constants";
import api, { getCurrentShift, getAnalyticsUsage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { DriverState, UserRole, AnalyticsUsage } from "../types";
import {
  Clock,
  Truck,
  Hand,
  Plus,
  User,
  Building2,
  RefreshCw,
} from "lucide-react";
import { DriverView } from "../views/DriverView";

// Dynamic import for manual shift modal
const ManualShiftModal = React.lazy(() => import("./ManualShiftModal"));

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
  const currentUser = user;
  const [loading, setLoading] = useState(true);
  const [shiftCheckComplete, setShiftCheckComplete] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<{
    activeShifts: number;
    activeDrivers: number;
    trucksInWork?: number;
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
    currentPlan: { name: '', billingUrl: '' },
    activeShiftsDetails: [],
  });

  // Usage limits from Analytics API (/api/v1/analytics/usage) - single source of truth
  const [usage, setUsage] = useState<AnalyticsUsage | null>(null);

  const isAdminView =
    currentUser?.role === UserRole.ADMIN ||
    currentUser?.role === UserRole.FOREMAN;

  const isLoading = loading || !shiftCheckComplete;
  const onboardingSteps = [
    {
      label: "Добавьте объект работы",
      done: Boolean(usage?.sites.current),
    },
    {
      label: "Добавьте машину или технику",
      done: Boolean(usage?.trucks.current),
    },
    {
      label: "Пригласите водителя",
      done: Boolean(usage?.drivers.current),
    },
    {
      label: "Проверьте первую смену в реестре",
      done: stats.activeShifts > 0,
    },
  ];
  const shouldHighlightOnboarding =
    isAdminView && usage !== null && onboardingSteps.some((step) => !step.done);

  const refreshStatus = useCallback(async () => {
    try {
      // Check shift status for state synchronization
      const shiftRes = await getCurrentShift();
      setShiftCheckComplete(true);

      // Sync user state if different from DB
      if (currentUser) {
        let realStateInDb = currentUser.current_state;

        if (shiftRes) {
          realStateInDb = shiftRes.status as DriverState;
        } else {
          realStateInDb = DriverState.IDLE;
        }

        if (currentUser.current_state !== realStateInDb) {
          const updatedUser = { ...currentUser, current_state: realStateInDb };
          api.setUserInfo(updatedUser);
        }
      }
    } catch (e: any) {
      console.error("Ошибка синхронизации стейта:", e);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  const fetchDashboardStats = useCallback(async () => {
    if (!isAdminView) return;
    try {
      // Fetch dashboard stats and analytics usage in parallel
      // Usage data from Analytics API (/api/v1/analytics/usage) - single source of truth
      const [statsRes, usageRes] = await Promise.all([
        api.get(API_ENDPOINTS.DASHBOARD_STATS),
        getAnalyticsUsage().catch(() => null), // Gracefully handle analytics errors
      ]);

      // Handle both camelCase (frontend) and snake_case (backend) field names
      const activeShifts = statsRes.activeShifts ?? statsRes.active_shifts ?? 0;
      const activeDrivers = statsRes.activeDrivers ?? statsRes.active_drivers ?? 0;
      const trucksInWork = statsRes.trucksInWork ?? statsRes.trucks_in_work;
      const currentPlan = statsRes.currentPlan ?? statsRes.current_plan ?? { name: '', billingUrl: '' };
      const activeShiftsDetails = statsRes.activeShiftsDetails ?? statsRes.active_shifts_details ?? [];

      setStats({
        activeShifts,
        activeDrivers,
        trucksInWork,
        currentPlan,
        activeShiftsDetails,
      });

      // Set usage from Analytics API (single source of truth across all views)
      if (usageRes) {
        setUsage(usageRes);
      }
    } catch (e) {
      console.error("Failed to fetch dashboard stats:", e);
    }
  }, [isAdminView]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchDashboardStats();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchDashboardStats();

    // Polling every 60 seconds for dashboard stats
    const interval = setInterval(fetchDashboardStats, 60000);

    // Window focus refresh
    const handleFocus = () => fetchDashboardStats();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchDashboardStats]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-[#0a192f] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Загрузка текущих смен...
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
              Водителей на смене
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

        {shouldHighlightOnboarding && (
          <div className="bg-white p-8 rounded-lg border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold text-[#1B254B] mb-2">
              Начните работу за 4 шага
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              После этого водитель сможет открыть смену с телефона, а диспетчер увидит ее в реестре.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {onboardingSteps.map((step, index) => (
                <div
                  key={step.label}
                  className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                    step.done
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      step.done
                        ? "bg-emerald-500 text-white"
                        : "bg-[#0a192f] text-white"
                    }`}
                  >
                    {step.done ? "✓" : index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1B254B]">{step.label}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {step.done ? "Шаг уже выполнен." : "Следующий шаг настройки кабинета."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* НОВЫЙ РАЗДЕЛ: Usage Limits (Лимиты тарифа) */}
        <div className="bg-white p-8 rounded-lg border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-[#1B254B]">Лимиты тарифа</h3>
            <div className="flex items-center gap-3">
              {stats.currentPlan && stats.currentPlan.name && (
                <span className="px-3 py-1 bg-indigo-100 text-[#0a192f] text-xs font-bold rounded-full">
                  {stats.currentPlan.name}
                </span>
              )}
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                title="Обновить статистику"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {usage && (
              <>
                <UsageCard
                  label="Машины"
                  icon={<Truck size={24} className="text-[#0a192f]" />}
                  current={usage.trucks.current}
                  limit={usage.trucks.limit}
                />
                <UsageCard
                  label="Водители"
                  icon={<User size={24} className="text-[#0a192f]" />}
                  current={usage.drivers.current}
                  limit={usage.drivers.limit}
                />
                <UsageCard
                  label="Объекты"
                  icon={<Building2 size={24} className="text-[#0a192f]" />}
                  current={usage.sites.current}
                  limit={usage.sites.limit}
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
                // Refresh stats and usage
                const [statsRes, usageRes] = await Promise.all([
                  api.get(API_ENDPOINTS.DASHBOARD_STATS),
                  getAnalyticsUsage().catch(() => null),
                ]);

                // Handle both camelCase (frontend) and snake_case (backend) field names
                const activeShifts = statsRes.activeShifts ?? statsRes.active_shifts ?? 0;
                const activeDrivers = statsRes.activeDrivers ?? statsRes.active_drivers ?? 0;
                const trucksInWork = statsRes.trucksInWork ?? statsRes.trucks_in_work;
                const currentPlan = statsRes.currentPlan ?? statsRes.current_plan ?? { name: '', billingUrl: '' };
                const activeShiftsDetails = statsRes.activeShiftsDetails ?? statsRes.active_shifts_details ?? [];

                setStats({
                  activeShifts,
                  activeDrivers,
                  trucksInWork,
                  currentPlan,
                  activeShiftsDetails,
                });

                if (usageRes) {
                  setUsage(usageRes);
                }
              }}
              timezone={"Europe/Moscow"}
            />
          </Suspense>
        )}

        <div className="bg-white p-8 rounded-lg border border-slate-100">
          <h3 className="text-lg font-semibold text-[#1B254B] mb-6">Что видно диспетчеру</h3>
          <p className="text-slate-400 text-sm">
            Здесь собраны активные смены, лимиты тарифа и текущая ситуация по работе техники и водителей.
          </p>
        </div>
      </div>
    );
  }

  // === DRIVER VIEW ===
  // For drivers, use standard DriverView component (single source of truth)
  if (!isAdminView) {
    return <DriverView />;
  }

  // Fallback - should never reach here due to early returns above
  return null;
};

export default Dashboard;
