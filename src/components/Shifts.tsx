import React, { useEffect, useState } from "react";
import { API_ENDPOINTS } from "../../constants";
import { Shift, ShiftStatus } from "../types";

const Shifts: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.SHIFTS);
        if (!response.ok) throw new Error("Ошибка загрузки смен");
        const data = await response.json();
        setShifts(Array.isArray(data) ? data : []);
      } catch (err) {
        setError("Не удалось соединиться с сервером KONTROLSMEN");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchShifts();
  }, []);

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
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold tracking-widest text-xs uppercase">
          Подключение к pwa.kontrolsmen.ru...
        </p>
      </div>
    );

  return (
    <div className="bg-white rounded-[32px] border border-slate-50 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
        <div>
          <h3 className="text-xl font-bold text-[#1B254B]">Реестр смен</h3>
          <p className="text-xs text-slate-400 mt-1">
            Данные синхронизированы с ТГ-ботом
          </p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-bold text-slate-400 uppercase">
            Всего: {shifts.length}
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-20 text-center">
          <p className="text-red-500 font-bold mb-2">⚠️ Ошибка соединения</p>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      ) : shifts.length === 0 ? (
        <div className="p-20 text-center text-slate-300 italic">
          Смены в базе отсутствуют
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                <th className="px-8 py-5">Водитель</th>
                <th className="px-8 py-5">Объект работы</th>
                <th className="px-8 py-5">Дата/Время</th>
                <th className="px-8 py-5">Статус</th>
                <th className="px-8 py-5 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {shifts.map((shift) => (
                <tr
                  key={shift.id}
                  className="hover:bg-slate-50/30 transition-colors group"
                >
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-[#1B254B]">
                      {shift.driver_name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-bold uppercase">
                      {shift.vehicle_plate}
                    </p>
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-slate-600">
                    {shift.work_object}
                  </td>
                  <td className="px-8 py-5 text-[12px] text-slate-500 font-mono">
                    {new Date(shift.started_at).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-8 py-5">{getStatusBadge(shift.status)}</td>
                  <td className="px-8 py-5 text-right">
                    <button className="text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Детали
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
