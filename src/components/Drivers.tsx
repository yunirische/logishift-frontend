import React, { useEffect, useState } from "react";
import { API_ENDPOINTS } from "../../constants";
import { Driver } from "../types";

const Drivers: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.DRIVERS);
        if (!response.ok) throw new Error("Ошибка базы данных");
        const data = await response.json();
        setDrivers(Array.isArray(data) ? data : []);
      } catch (err) {
        setError("Ошибка связи с сервером");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDrivers();
  }, []);

  if (loading)
    return (
      <div className="p-20 text-center animate-pulse text-indigo-600 font-black uppercase tracking-widest text-xs">
        Загрузка штата...
      </div>
    );

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
          {error}
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
              className="bg-white p-6 rounded-[24px] border border-slate-50 shadow-sm hover:shadow-lg transition-all group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                    driver.is_active
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {driver.full_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-[#1B254B] truncate">
                    {driver.full_name}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {driver.phone_number}
                  </p>
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${
                    driver.is_active ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                ></div>
              </div>
              <div className="pt-4 border-t border-slate-50 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Транспорт:</span>
                  <span className="font-bold text-[#1B254B] text-xs uppercase">
                    {driver.vehicle_info || "—"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Drivers;
