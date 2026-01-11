import React, { useEffect, useState } from "react";
import { API_ENDPOINTS } from "../constants";
import { apiRequest, getUserInfo } from "../services/api";
import { Shift, ShiftStatus, UserRole } from "../types";

const Shifts: React.FC = () => {
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

        if (user && user.role === UserRole.DRIVER) {
          allShifts = allShifts.filter((s) => s.driver_name === user.full_name);
        }

        setShifts(allShifts);
      } catch (err: any) {
        setError(err.message || "Ошибка загрузки смен");
      } finally {
        setLoading(false);
      }
    };
    fetchShifts();
  }, [user]);

  const getStatusBadge = (status: ShiftStatus) => {
    const colors = {
      [ShiftStatus.ACTIVE]: "bg-blue-100 text-blue-600",
      [ShiftStatus.PENDING_INVOICE]: "bg-amber-100 text-amber-600",
      [ShiftStatus.FINISHED]: "bg-emerald-100 text-emerald-600",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
          colors[status] || "bg-slate-100 text-slate-500"
        }`}
      >
        {status}
      </span>
    );
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center p-20 text-indigo-600">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold tracking-widest text-xs uppercase opacity-70">
          Загрузка архива...
        </p>
      </div>
    );

  return (
    <div className="bg-white rounded-[32px] border border-slate-50 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-[#1B254B]">
            {isAdmin ? "Реестр всех смен" : "История моих работ"}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Отображение последних записей из системы
          </p>
        </div>
        {!isAdmin && (
          <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-100 hover:-translate-y-0.5 transition-all">
            + Новая запись
          </button>
        )}
      </div>

      {error ? (
        <div className="p-20 text-center">
          <p className="text-red-500 font-bold">Ошибка данных</p>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      ) : shifts.length === 0 ? (
        <div className="p-20 text-center">
          <div className="text-4xl mb-4 opacity-20">📭</div>
          <p className="text-slate-300 italic font-medium">
            Записей не найдено
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/30">
              <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                <th className="px-8 py-5">
                  {isAdmin ? "Водитель" : "Транспорт"}
                </th>
                <th className="px-8 py-5">Объект / Локация</th>
                <th className="px-8 py-5">Начало</th>
                <th className="px-8 py-5">Статус</th>
                <th className="px-8 py-5 text-right">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {shifts.map((shift) => (
                <tr
                  key={shift.id}
                  className="hover:bg-indigo-50/10 transition-colors group"
                >
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-[#1B254B]">
                      {isAdmin ? shift.driver_name : shift.vehicle_plate}
                    </p>
                    {isAdmin && (
                      <p className="text-[11px] text-slate-400 font-bold uppercase">
                        {shift.vehicle_plate}
                      </p>
                    )}
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-slate-600">
                    {shift.work_object}
                  </td>
                  <td className="px-8 py-5 text-[12px] text-slate-500 font-mono">
                    {new Date(shift.started_at).toLocaleDateString("ru-RU")}{" "}
                    {new Date(shift.started_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-8 py-5">{getStatusBadge(shift.status)}</td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                      🔍
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Shifts;
