import React, { useEffect, useState } from "react";
import { API_ENDPOINTS } from "../constants";
import api from "../services/api";
import { Shift, UserRole } from "../types";

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

  // Изменили тип на any и добавили .toLowerCase() для надежности
  const getStatusStyle = (status: any) => {
    const s = (status || "").toLowerCase();

    switch (s) {
      case "active":
        return "bg-indigo-50 text-indigo-600 border-indigo-100";
      case "pending_invoice":
      case "awaiting_invoice": // Добавили вариант из стейт-машины
        return "bg-amber-50 text-amber-600 border-amber-100";
      case "finished":
      case "completed":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      default:
        return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  // Функция для формирования корректной ссылки
  const getPhotoUrl = (url: string | undefined) => {
    if (!url) return "#";
    const baseUrl = window.location.origin;
    // Заменяем обратные слеши на прямые
    const cleanUrl = url.replace(/\\/g, "/");
    return `${baseUrl}/uploads/${cleanUrl}`;
  };

  // Компонент для отображения иконки-ссылки
  const PhotoLink = ({ url, icon, title }: { url?: string; icon: string; title: string }) => {
    if (!url) return null;
    return (
      <a
        href={getPhotoUrl(url)}
        target="_blank"
        rel="noopener noreferrer"
        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"
        title={title}
      >
        {icon}
      </a>
    );
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="px-8 py-5">{isAdmin ? "Водитель" : "Машина"}</th>
              {/* Скрываем Объект на мобильных */}
              <th className="px-8 py-5 hidden md:table-cell">Объект</th>
              {/* Скрываем Время на мобильных */}
              <th className="px-8 py-5 hidden md:table-cell">Время</th>
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
                  {/* Скрываем Объект на мобильных */}
                  <td className="px-8 py-5 font-medium text-slate-600 hidden md:table-cell">
                    {s.work_object}
                  </td>
                  {/* Скрываем Время на мобильных */}
                  <td className="px-8 py-5 text-[12px] font-mono text-slate-500 hidden md:table-cell">
                    {new Date(
                      s.start_time || s.started_at || Date.now()
                    ).toLocaleDateString()}{" "}
                    {new Date(
                      s.start_time || s.started_at || Date.now()
                    ).toLocaleTimeString([], {
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
                    <div className="flex items-center justify-end gap-1">
                      <PhotoLink url={(s as any).photo_start_url} icon="🏁" title="Одометр (старт)" />
                      <PhotoLink url={(s as any).photo_end_url} icon="🏁" title="Одометр (финиш)" />
                      <PhotoLink url={(s as any).photo_invoice_url} icon="📄" title="Накладная" />
                    </div>
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
