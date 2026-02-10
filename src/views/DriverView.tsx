import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  LogOut,
  MapPin,
  Play,
  Square,
  Truck,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Button, Card } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import api, { getCurrentShift } from "../services/api";
import { API_ENDPOINTS } from "../constants";
import { DriverState } from "../types";

export const DriverView = () => {
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [toast, setToast] = useState<{show: boolean; message: string}>({show: false, message: ''});

  const [selectedTruck, setSelectedTruck] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const initData = async () => {
    setLoading(true);
    try {
      // 1. Запрашиваем текущую смену (getCurrentShift handles 400/404 gracefully)
      const currentShift = await getCurrentShift();

      if (currentShift) {
        // Если смена есть в базе — сохраняем её
        setActiveShift(currentShift);
      } else {
        // Если смены нет — обнуляем стейт и грузим списки выборасч
        setActiveShift(null);
        const [trucksRes, sitesRes] = await Promise.all([
          api.get("/trucks"),
          api.get("/sites"),
        ]);
        setTrucks(Array.isArray(trucksRes) ? trucksRes : []);
        setSites(Array.isArray(sitesRes) ? sitesRes : []);
      }
    } catch (e) {
      console.error("Ошибка загрузки данных:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      initData();
    }
  }, [user]);

  const handleStart = async () => {
    if (!selectedTruck || !selectedSite) return;
    setLoading(true);
    try {
      const response = await api.post("/shifts/start", {
        truck_id: selectedTruck,
        site_id: selectedSite,
      });

      // Demo mode: show success toast and update state
      if (user?.tenant_id === 999) {
        setToast({ show: true, message: "✅ Смена открыта" });
        setTimeout(() => setToast({ show: false, message: '' }), 2000);

        // Determine next state based on site requirements
        const selectedSiteData = sites.find(s => s.id === selectedSite);
        const nextState = selectedSiteData?.odometer_required
          ? DriverState.AWAITING_ODO_START
          : DriverState.ACTIVE;

        // Update local user state
        const updatedUser = { ...user, current_state: nextState };
        localStorage.setItem('logishift_user_info', JSON.stringify(updatedUser));

        // Update context by re-fetching user data
        await initData();
      } else {
        // Production mode: re-fetch data
        await initData();
      }
    } catch (e: any) {
      alert(e.response?.data?.error || "Ошибка старта");
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!confirm("Завершить смену?")) return;
    setLoading(true);
    try {
      await api.post("/shifts/end", {});

      // Demo mode: show success toast
      if (user?.tenant_id === 999) {
        setToast({ show: true, message: "✅ Смена завершена" });
        setTimeout(() => setToast({ show: false, message: '' }), 2000);
      }

      // Re-fetch data instead of full page reload
      await initData();
    } catch (e: any) {
      alert(e.response?.data?.error || "Ошибка завершения");
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("photo", file);
    setLoading(true);
    try {
      // Use direct fetch instead of api.post() to avoid JSON.stringify on FormData
      await fetch(API_ENDPOINTS.UPLOAD_PHOTO, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${api.getAuthToken()}`,
        },
        body: formData,
      });

      // Demo mode: show success toast and advance state
      if (user?.tenant_id === 999) {
        setToast({ show: true, message: "✅ Действие выполнено" });
        setTimeout(() => setToast({ show: false, message: '' }), 2000);

        // Advance state machine
        const currentState = user?.current_state;
        let nextState: DriverState;

        switch (currentState) {
          case DriverState.AWAITING_ODO_START:
            nextState = DriverState.ACTIVE;
            break;
          case DriverState.AWAITING_ODO_END:
            nextState = DriverState.AWAITING_INVOICE;
            break;
          case DriverState.AWAITING_INVOICE:
            nextState = DriverState.IDLE;
            break;
          default:
            nextState = DriverState.ACTIVE;
        }

        // Update local user state
        const updatedUser = { ...user, current_state: nextState };
        localStorage.setItem('logishift_user_info', JSON.stringify(updatedUser));
      }

      // Re-fetch data instead of full page reload
      await initData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Ошибка загрузки фото");
      setLoading(false);
    }
  };

  if (loading && !activeShift && !trucks.length) {
    return (
      <div className="p-10 text-center animate-pulse text-slate-400">
        Синхронизация...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-10">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
      />

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Привет, {user?.full_name}
          </h1>
          <span
            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
              !activeShift || user?.current_state === "idle"
                ? "bg-slate-200 text-slate-500"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {!activeShift || user?.current_state === "idle"
              ? "Вне смены"
              : "В процессе"}
          </span>
        </div>
        <button
          onClick={logout}
          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* ГЛАВНАЯ ЛОГИКА ЭКРАНОВ */}
      {!activeShift || user?.current_state === "idle" ? (
        // --- ЭКРАН 1: ВЫБОР (Если смены нет в БД или статус idle) ---
        <div className="space-y-4">
          <Card className="p-4 border-none shadow-sm">
            <h3 className="text-[10px] font-semibold text-slate-400 mb-3 uppercase tracking-widest">
              Выберите транспорт
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {trucks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTruck(t.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedTruck === t.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-100"
                  }`}
                >
                  <Truck
                    size={18}
                    className={`mb-1 ${
                      selectedTruck === t.id
                        ? "text-blue-600"
                        : "text-slate-400"
                    }`}
                  />
                  <div className="font-bold text-sm text-slate-700">
                    {t.name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {t.plate || "Без номера"}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 border-none shadow-sm">
            <h3 className="text-[10px] font-semibold text-slate-400 mb-3 uppercase tracking-widest">
              Выберите объект
            </h3>
            <div className="space-y-2">
              {sites.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSite(s.id)}
                  className={`p-4 rounded-lg border flex items-center gap-3 transition-all ${
                    selectedSite === s.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-100"
                  }`}
                >
                  <MapPin
                    size={18}
                    className={
                      selectedSite === s.id ? "text-blue-600" : "text-slate-400"
                    }
                  />
                  <span className="text-sm font-bold text-slate-700">
                    {s.name}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Button
            onClick={handleStart}
            disabled={!selectedTruck || !selectedSite}
            className="w-full py-4 bg-blue-600 text-white font-semibold text-lg shadow-xl shadow-blue-100 disabled:opacity-30"
            isLoading={loading}
          >
            <Play size={20} fill="currentColor" className="mr-2" />
            ОТКРЫТЬ СМЕНУ
          </Button>
        </div>
      ) : (
        // --- ЭКРАН 2: СМЕНА ОТКРЫТА (Работа или Фото) ---
        <div className="space-y-4">
          <Card className="p-5 border-none shadow-sm bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Clock size={18} />
                <span className="font-semibold text-sm uppercase">
                  Смена #{activeShift.id}
                </span>
              </div>
              <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                {activeShift.start_time
                  ? new Date(activeShift.start_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "ОФОРМЛЕНИЕ"}
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-50 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                  <Truck size={20} />
                </div>
                <div>
                  <div className="text-[9px] uppercase text-slate-400 font-semibold tracking-tighter">
                    Машина
                  </div>
                  <div className="text-sm font-bold text-slate-700">
                    {activeShift.truck?.name || "---"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                  <MapPin size={20} />
                </div>
                <div>
                  <div className="text-[9px] uppercase text-slate-400 font-semibold tracking-tighter">
                    Объект
                  </div>
                  <div className="text-sm font-bold text-slate-700">
                    {activeShift.site?.name || "---"}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {user?.current_state === "active" ? (
            // ПОД-ЭКРАН: ПРОСТО РАБОТА
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-100 rounded-lg flex items-center gap-3 text-green-700">
                <CheckCircle2 size={24} />
                <div>
                  <div className="font-bold text-sm">Смена активна</div>
                  <div className="text-[11px] opacity-80">
                    Вы можете завершить её в любой момент
                  </div>
                </div>
              </div>
              <Button
                onClick={handleEnd}
                className="w-full py-5 bg-red-500 text-white font-semibold text-lg shadow-xl shadow-red-100"
                isLoading={loading}
              >
                <Square size={18} fill="currentColor" className="mr-2" />
                ЗАВЕРШИТЬ РАБОТУ
              </Button>
            </div>
          ) : (
            // ПОД-ЭКРАН: ТРЕБУЕТСЯ ФОТО
            <div className="space-y-4">
              <div className="p-6 bg-orange-50 border border-orange-100 rounded-lg text-center">
                <Camera size={40} className="mx-auto mb-3 text-orange-500" />
                <h3 className="font-semibold text-orange-800 uppercase tracking-tight">
                  Нужна фотография
                </h3>
                <p className="text-xs text-orange-600 mt-1 font-bold">
                  {user?.current_state === "awaiting_odo_start" &&
                    "Сфотографируйте одометр ПЕРЕД началом"}
                  {user?.current_state === "awaiting_odo_end" &&
                    "Сфотографируйте одометр ПОСЛЕ работы"}
                  {user?.current_state === "awaiting_invoice" &&
                    "Сфотографируйте накладную (ТТН)"}
                </p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 bg-orange-500 text-white text-2xl font-semibold animate-pulse shadow-2xl shadow-orange-200 flex flex-col items-center gap-1"
                isLoading={loading}
              >
                <Camera size={32} />
                ОТКРЫТЬ КАМЕРУ
              </Button>
              <div className="flex items-start gap-2 p-4 text-slate-400 text-[10px] bg-white rounded-lg shadow-sm italic">
                <AlertCircle size={14} className="shrink-0 text-orange-400" />
                Убедитесь, что все данные на фото видны четко. Плохое качество
                фото может стать причиной отклонения смены.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-[#0a192f] text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-400" />
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};
