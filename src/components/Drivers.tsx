import React, { useEffect, useState } from "react";
import { API_ENDPOINTS } from "../constants";
import { apiRequest } from "../services/api";
import { Driver } from "../types";

const Drivers: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const data = await apiRequest(API_ENDPOINTS.DRIVERS);
        setDrivers(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || "Ошибка связи с сервером");
      } finally {
        setLoading(false);
      }
    };
    fetchDrivers();
  }, []);

  if (loading)
    return (
      <div className="p-20 text-center animate-pulse text-indigo-600 font-black uppercase tracking-widest text-xs">
        Загрузка штата KONTROLSMEN...
      </div>
    );

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100 flex items-center gap-2">
          <span>🚨</span> {error}
        </div>
      )}

      {drivers.length === 0 && !error ? (
        <div className="p-20 text-center bg-white rounded-[32px] text-slate-300 italic">
          Список водителей пуст
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          {drivers.map((driver) => (
            <div
              key={driver.id}
              className="bg-white p-6 rounded-[24px] border border-slate-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="text-4xl">🚚</span>
              </div>
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner ${
                    driver.is_active
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {driver.full_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-[#1B254B] truncate text-base">
                    {driver.full_name}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">
                    {driver.phone_number}
                  </p>
                </div>
                <div
                  className={`w-3 h-3 rounded-full shadow-sm ${
                    driver.is_active
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-slate-300"
                  }`}
                ></div>
              </div>
              <div className="pt-4 border-t border-slate-50 text-sm space-y-2 relative z-10">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium text-xs">
                    Транспорт:
                  </span>
                  <span className="font-bold text-[#1B254B] text-[10px] px-2 py-1 bg-slate-50 rounded-lg uppercase tracking-tight">
                    {driver.vehicle_info || "Не назначен"}
                  </span>
                </div>
                {driver.last_activity && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium text-xs">
                      Активность:
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(driver.last_activity).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Drivers;
