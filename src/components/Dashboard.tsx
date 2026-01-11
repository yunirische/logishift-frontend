import React, { useEffect, useState } from "react";
import { API_ENDPOINTS } from "../constants";
import { apiRequest, getUserInfo } from "../services/api";
import { Shift, ShiftStatus, UserRole } from "../types";

const Dashboard: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = getUserInfo();
  const isAdmin = user?.role === UserRole.ADMIN;

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const data = await apiRequest(API_ENDPOINTS.SHIFTS);
        let allShifts = Array.isArray(data) ? data : [];

        // Фильтруем если пользователь - водитель
        if (user && user.role === UserRole.DRIVER) {
          allShifts = allShifts.filter((s) => s.driver_name === user.full_name);
        }

        setShifts(allShifts);
        setError(null);
      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        setError(err.message || "Ошибка загрузки данных");
      } finally {
        setLoading(false);
      }
    };
    fetchShifts();
  }, [user]);

  const activeShift = shifts.find((s) => s.status === ShiftStatus.ACTIVE);
  const activeCount = shifts.filter(
    (s) => s.status === ShiftStatus.ACTIVE
  ).length;
  const finishedCount = shifts.filter(
    (s) => s.status === ShiftStatus.FINISHED
  ).length;

  const kpis = isAdmin
    ? [
        {
          label: "Всего активных",
          value: activeCount,
          icon: "⏱️",
          color: "indigo",
        },
        {
          label: "Смен сегодня",
          value: shifts.length,
          icon: "📊",
          color: "blue",
        },
        {
          label: "Ожидают накладные",
          value: shifts.filter((s) => s.status === ShiftStatus.PENDING_INVOICE)
            .length,
          icon: "📄",
          color: "amber",
        },
        {
          label: "Статус сервера",
          value: "Online",
          icon: "🌐",
          color: "emerald",
        },
      ]
    : [
        {
          label: "Моя смена",
          value: activeShift ? "Активна" : "Нет",
          icon: "⚡",
          color: activeShift ? "emerald" : "slate",
        },
        { label: "Всего часов", value: "124.5", icon: "⏰", color: "indigo" },
        { label: "Завершено", value: finishedCount, icon: "✅", color: "blue" },
        { label: "Рейтинг", value: "4.9", icon: "⭐", color: "amber" },
      ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {!isAdmin && (
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 rounded-[32px] text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-2xl font-black mb-2">
              Добро пожаловать, {user?.full_name}!
            </h2>
            <p className="text-indigo-100 font-medium">
              Готовы начать новую смену?
            </p>
          </div>
          <button className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:scale-105 transition-transform">
            {activeShift ? "Завершить смену" : "Начать смену"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-[24px] border border-slate-50 shadow-sm transition-all hover:shadow-md"
          >
            <div
              className={`w-12 h-12 rounded-2xl bg-${kpi.color}-50 flex items-center justify-center text-xl mb-4`}
            >
              {kpi.icon}
            </div>
            <h4 className="text-2xl font-bold text-[#1B254B]">{kpi.value}</h4>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[30px] border border-slate-50 shadow-sm overflow-hidden relative">
          <h3 className="text-lg font-bold text-[#1B254B] mb-6">
            {isAdmin ? "Динамика работ" : "Моя активность"}
          </h3>
          <div className="h-64 flex flex-col items-center justify-center text-slate-300">
            <div className="text-4xl mb-4 opacity-20">📊</div>
            <p className="text-sm font-medium italic">
              График статистики формируется...
            </p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[30px] border border-slate-50 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-[#1B254B]">
              {isAdmin ? "Последние смены" : "Мои последние записи"}
            </h3>
          </div>
          <div className="space-y-6">
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-12 bg-slate-50 rounded-xl"></div>
                <div className="h-12 bg-slate-50 rounded-xl"></div>
              </div>
            ) : shifts.length === 0 ? (
              <div className="text-center py-10 text-slate-300 text-sm italic">
                Записей пока нет
              </div>
            ) : (
              shifts.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center gap-3 group">
                  <div
                    className={`w-2 h-10 rounded-full ${
                      s.status === ShiftStatus.ACTIVE
                        ? "bg-indigo-500"
                        : "bg-emerald-500"
                    }`}
                  ></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#1B254B] truncate">
                      {isAdmin ? s.driver_name : s.work_object}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase truncate">
                      {isAdmin ? s.work_object : "Завершена"}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-300 font-bold whitespace-nowrap">
                    {new Date(s.started_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
