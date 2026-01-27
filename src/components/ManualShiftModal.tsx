import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import api from "../services/api";
import { API_ENDPOINTS } from "../constants";
import { ManualShiftRequest } from "../types";

interface ManualShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  timezone: string;
}

const ManualShiftModal: React.FC<ManualShiftModalProps> = ({
  isOpen,
  onClose,
  onSave,
  timezone,
}) => {
  const [driversList, setDriversList] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [manualDriverId, setManualDriverId] = useState<number | null>(null);
  const [manualTruckId, setManualTruckId] = useState<number | null>(null);
  const [manualSiteId, setManualSiteId] = useState<number | null>(null);
  const [manualLoading, setManualLoading] = useState(false);

  // Загрузка данных для модалки
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        setIsLoadingData(true);
        setLoadError(null);

        try {
          const [driversRes, trucksRes, sitesRes] = await Promise.all([
            api.get(API_ENDPOINTS.DRIVERS),
            api.get(API_ENDPOINTS.TRUCKS),
            api.get(API_ENDPOINTS.SITES),
          ]);

          // Водители только с ролью driver и idle (НИЖНИЙ РЕГИСТР)
          const idleDrivers = Array.isArray(driversRes)
            ? driversRes.filter((d: any) =>
                d.role === "driver" && d.current_state === "idle"  // ✅ ИСПРАВЛЕНО
              )
            : [];

          setDriversList(idleDrivers);

          // Машины только не занятые
          const freeTrucks = Array.isArray(trucksRes)
            ? trucksRes.filter((t: any) => !t.is_busy && t.is_active)
            : [];

          setTrucks(freeTrucks);

          // Объекты активные
          const activeSites = Array.isArray(sitesRes)
            ? sitesRes.filter((s: any) => s.is_active)
            : [];

          setSites(activeSites);
        } catch (error: any) {
          console.error("Ошибка загрузки данных для ручной смены:", error);
          setLoadError(error.message || "Не удалось загрузить данные");
        } finally {
          setIsLoadingData(false);
        }
      };
      loadData();
    }
  }, [isOpen]);

  const handleClose = () => {
    setManualDriverId(null);
    setManualTruckId(null);
    setManualSiteId(null);
    onClose();
  };

  const handleCreateShift = async () => {
    if (!manualDriverId || !manualTruckId || !manualSiteId) {
      alert("Заполните все поля");
      return;
    }

    setManualLoading(true);
    try {
      const payload: ManualShiftRequest = {
        driver_id: manualDriverId,
        truck_id: manualTruckId,
        site_id: manualSiteId,
      };

      await api.post(API_ENDPOINTS.MANUAL_SHIFT, payload);
      alert("Смена успешно создана!");

      handleClose();
      onSave();
    } catch (err: any) {
      alert(err.message || "Ошибка создания смены");
    } finally {
      setManualLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-8 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-[#1B254B]">
            ✋ Создать смену вручную
          </h3>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-6">
          Выберите водителя, машину и объект
        </p>

        {/* Form */}
        <div className="space-y-4">
          {/* Driver Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Водитель (idle)
            </label>

            {isLoadingData ? (
              <div className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-400 text-sm">
                Загрузка водителей...
              </div>
            ) : loadError ? (
              <div className="w-full px-3 py-2.5 border border-red-200 rounded-lg bg-red-50 text-red-600 text-sm">
                {loadError}
              </div>
            ) : (
              <select
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                value={manualDriverId || ""}
                onChange={(e) => setManualDriverId(Number(e.target.value) || null)}
                disabled={manualLoading}
              >
                <option value="">
                  {driversList.length === 0 ? "Все водители заняты" : "Выберите водителя"}
                </option>
                {driversList.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.full_name} (ID: {driver.id})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Truck Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Машина (не занята)
            </label>
            <select
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
              value={manualTruckId || ""}
              onChange={(e) => setManualTruckId(Number(e.target.value) || null)}
              disabled={manualLoading}
            >
              <option value="">Выберите машину</option>
              {trucks
                .filter((t) => !t.is_busy && t.is_active)
                .map((truck) => (
                  <option key={truck.id} value={truck.id}>
                    {truck.name} ({truck.plate})
                  </option>
                ))}
            </select>
          </div>

          {/* Site Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Объект
            </label>
            <select
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
              value={manualSiteId || ""}
              onChange={(e) => setManualSiteId(Number(e.target.value) || null)}
              disabled={manualLoading}
            >
              <option value="">Выберите объект</option>
              {sites
                .filter((s) => s.is_active)
                .map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} (одометр: {site.odometer_required ? "да" : "нет"})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-500 font-semibold text-sm rounded-lg hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={manualLoading}
          >
            Отмена
          </button>
          <button
            onClick={handleCreateShift}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={manualLoading || isLoadingData || !manualDriverId || !manualTruckId || !manualSiteId}
          >
            {manualLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin"></div>
                Создание...
              </>
            ) : (
              <>✨ Создать смену</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualShiftModal;
