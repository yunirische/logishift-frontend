import React, { useEffect, useState } from "react";
import { API_ENDPOINTS } from "../constants";
import api from "../services/api";
import { Shift, ShiftStatus, UserRole } from "../types";

const Shifts: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const user = api.getUserInfo();
  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FOREMAN;

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const data = await api.get(API_ENDPOINTS.SHIFTS);
        setShifts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Shifts fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchShifts();
  }, []);

  const displayShifts = isAdmin
    ? shifts
    : shifts.filter((s) => s.driver_name === user?.full_name);

  const getStatusStyle = (status: ShiftStatus) => {
    switch (status) {
      case ShiftStatus.ACTIVE:
        return "bg-indigo-50 text-indigo-600 border-indigo-100";
      case ShiftStatus.PENDING_INVOICE:
        return "bg-amber-50 text-amber-600 border-amber-100";
      case ShiftStatus.FINISHED:
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      default:
        return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  if (loading)
    return (
      <div className="p-20 text-center animate-pulse font-black text-indigo-600 uppercase tracking-widest text-[10px]">
        Загрузка истории...
      </div>
    );

  return (
    <div className="bg-white rounded-[40px] shadow-sm border border-slate-50 overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1B254B]">
            {isAdmin ? "Реестр всех смен" : "Мои записи"}
          </h2>
          <p className="text-slate-400 text-xs font-medium mt-1">
            Отображено: {displayShifts.length}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 hover:scale-105 transition-all">
            + Добавить
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="px-8 py-5">{isAdmin ? "Водитель" : "Машина"}</th>
              <th className="px-8 py-5">Объект</th>
              <th className="px-8 py-5">Время</th>
              <th className="px-8 py-5">Статус</th>
              <th className="px-8 py-5 text-right">Детали</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm">
            {displayShifts.length > 0 ? (
              displayShifts.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-indigo-50/10 transition-colors"
                >
                  <td className="px-8 py-5">
                    <p className="font-bold text-[#1B254B]">
                      {isAdmin ? s.driver_name : s.vehicle_plate}
                    </p>
                    {isAdmin && (
                      <p className="text-[10px] font-bold text-slate-400">
                        {s.vehicle_plate}
                      </p>
                    )}
                  </td>
                  <td className="px-8 py-5 font-medium text-slate-600">
                    {s.work_object}
                  </td>
                  <td className="px-8 py-5 text-[12px] font-mono text-slate-500">
                    {new Date(s.started_at).toLocaleDateString()}{" "}
                    {new Date(s.started_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-8 py-5">
                    <span
                      className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${getStatusStyle(
                        s.status
                      )}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="w-8 h-8 text-slate-300 hover:text-indigo-600">
                      🔍
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="py-20 text-center text-slate-300 italic"
                >
                  Данных нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Shifts;
