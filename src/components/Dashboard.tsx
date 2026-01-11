import React, { useEffect, useState } from "react";
import { API_ENDPOINTS } from "../constants";
import api from "../services/api";
import { Shift, ShiftStatus, UserRole } from "../types";

const Dashboard: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const user = api.getUserInfo();

  // Админ и Прораб видят общую аналитику
  const isAdminView =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FOREMAN;

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const data = await api.get(API_ENDPOINTS.SHIFTS);
        setShifts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchShifts();
  }, []);

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-64 text-indigo-500">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold uppercase tracking-widest text-[10px]">
          Загрузка данных...
        </p>
      </div>
    );

  // --- ИНТЕРФЕЙС ВОДИТЕЛЯ ---
  if (!isAdminView) {
    const myShifts = shifts.filter((s) => s.driver_name === user?.full_name);
    const activeShift = myShifts.find((s) => s.status === ShiftStatus.ACTIVE);

    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white p-10 rounded-[40px] shadow-xl border border-slate-50 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-30"></div>

          <div className="relative z-10">
            <div
              className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-3xl mb-6 shadow-inner ${
                activeShift
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-slate-100 text-slate-300"
              }`}
            >
              {activeShift ? "🚚" : "💤"}
            </div>

            <h2 className="text-3xl font-black text-[#1B254B] mb-2">
              {activeShift ? "Вы на смене" : "Вы отдыхаете"}
            </h2>
            <p className="text-slate-400 font-medium mb-10 leading-relaxed px-6">
              {activeShift
                ? `Работа на объекте: ${activeShift.work_object}`
                : "Готовы начать рабочий день? Нажмите кнопку ниже."}
            </p>

            <div className="grid gap-4">
              {activeShift ? (
                <button className="w-full py-5 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-100 hover:bg-red-600 transition-all active:scale-95">
                  Завершить смену
                </button>
              ) : (
                <button className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                  Начать новую смену
                </button>
              )}
              <button className="w-full py-5 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-100 transition-all text-[11px]">
                Загрузить накладную (фото)
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-50 shadow-sm text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">
              Мои смены
            </p>
            <p className="text-2xl font-black text-[#1B254B]">
              {myShifts.length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-50 shadow-sm text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">
              Рейтинг
            </p>
            <p className="text-2xl font-black text-amber-500">5.0 ★</p>
          </div>
        </div>
      </div>
    );
  }

  // --- ИНТЕРФЕЙС АДМИНИСТРАТОРА ---
  const activeCount = shifts.filter(
    (s) => s.status === ShiftStatus.ACTIVE
  ).length;
  const pendingCount = shifts.filter(
    (s) => s.status === ShiftStatus.PENDING_INVOICE
  ).length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "В работе", val: activeCount, color: "indigo", icon: "🚛" },
          {
            label: "Ждут проверки",
            val: pendingCount,
            color: "amber",
            icon: "📸",
          },
          {
            label: "Всего за день",
            val: shifts.length,
            color: "blue",
            icon: "📊",
          },
          {
            label: "Активных объектов",
            val: "12",
            color: "emerald",
            icon: "🏗️",
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-3xl border border-slate-50 shadow-sm group hover:border-indigo-100 transition-all"
          >
            <div
              className={`w-12 h-12 rounded-2xl bg-${kpi.color}-50 text-${kpi.color}-600 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform`}
            >
              {kpi.icon}
            </div>
            <p className="text-3xl font-black text-[#1B254B]">{kpi.val}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-[#1B254B]">
              Активность флота
            </h3>
            <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase">
              Live
            </span>
          </div>

          <div className="space-y-4">
            {shifts.filter((s) => s.status === ShiftStatus.ACTIVE).length >
            0 ? (
              shifts
                .filter((s) => s.status === ShiftStatus.ACTIVE)
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-black text-indigo-600 text-xs shadow-sm">
                      {s.vehicle_plate.slice(-3)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#1B254B]">
                        {s.driver_name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        {s.work_object}
                      </p>
                    </div>
                    <div className="text-right text-xs font-mono text-slate-400">
                      {new Date(s.started_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))
            ) : (
              <div className="py-20 text-center text-slate-300 italic text-sm">
                Нет активных машин в системе
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-2xl mb-6">
            🔔
          </div>
          <h4 className="text-base font-black text-[#1B254B] mb-2">
            Уведомления
          </h4>
          <p className="text-xs text-slate-400 font-medium px-4">
            Здесь будут отображаться важные события системы.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
