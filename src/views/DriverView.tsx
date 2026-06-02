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
import ShiftHistoryModal from "../components/ShiftHistoryModal";

export const DriverView = () => {
  const { user, logout, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [shiftHistory, setShiftHistory] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [toast, setToast] = useState<{show: boolean; message: string; type?: 'success' | 'error'}>({show: false, message: '', type: 'success'});

  const [selectedTruck, setSelectedTruck] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const workflowState = activeShift?.status || user?.current_state || "";

  const initData = async () => {
    setLoading(true);
    try {
      // Demo mode: restore active shift from localStorage
      if (user?.tenant_id === 999) {
        const storedShift = localStorage.getItem('logishift_active_shift');
        if (storedShift) {
          try {
            setActiveShift(JSON.parse(storedShift));
          } catch (e) {
            console.error("Failed to parse stored shift:", e);
            localStorage.removeItem('logishift_active_shift');
          }
        }
      }

      // 1. Запрашиваем текущую смену (getCurrentShift handles 400/404 gracefully)
      const currentShift = await getCurrentShift();

      if (currentShift) {
        // Если смена есть в базе — сохраняем её
        setActiveShift(currentShift);
      } else {
        // Если смены нет — обнуляем стейт и грузим списки выбора
        if (!user || user.tenant_id !== 999) {
          setActiveShift(null);
        } else if (user.current_state === DriverState.IDLE) {
          // Demo mode, idle state: clear any stale mock shift so the
          // start-shift screen shows instead of the fallback completion screen.
          setActiveShift(null);
          localStorage.removeItem('logishift_active_shift');
        }
        const [trucksRes, sitesRes, historyRes] = await Promise.all([
          api.get("/trucks"),
          api.get("/sites"),
          // Fetch shift history: completed shifts for current user, limit 10
          api.get("/shifts?driver_id=" + user?.id + "&status=completed&limit=10").catch(() => []),
        ]);
        setTrucks(Array.isArray(trucksRes) ? trucksRes : []);
        setSites(Array.isArray(sitesRes) ? sitesRes : []);
        setShiftHistory(Array.isArray(historyRes) ? historyRes : []);
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
      // Demo mode: force state update with mock shift object
      if (user?.tenant_id === 999) {
        const selectedSiteData = sites.find(s => String(s.id) === selectedSite);
        const selectedTruckData = trucks.find(t => String(t.id) === selectedTruck);

        // Create mock shift object
        const mockShift = {
          id: 999,
          status: 'active',
          start_time: new Date().toISOString(),
          truck: selectedTruckData || { id: 1, name: 'MAN TGX', plate_number: 'А123БВ' },
          site: selectedSiteData || { id: 1, name: 'ЖК Северный', address: 'ул. Примерная, 1' }
        };

        // Force immediate state update for demo mode
        setActiveShift(mockShift);
        localStorage.setItem('logishift_active_shift', JSON.stringify(mockShift));

        // Determine next state based on site requirements (use string literal for consistency)
        const nextState = selectedSiteData?.odometer_required ? 'awaiting_odo_start' : 'active';

        // Update user state to active (string literal for consistency with condition check)
        const updatedUser = { ...user, current_state: nextState };
        localStorage.setItem('logishift_user_info', JSON.stringify(updatedUser));
        await refreshUser(); // This triggers AuthContext update

        setToast({ show: true, message: "✅ Смена открыта", type: 'success' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2000);
        setLoading(false);
        return;
      }

      // Production mode: normal API call
      await api.post("/shifts/start", {
        truck_id: selectedTruck,
        site_id: selectedSite,
      });

      // Re-fetch data and refresh user state
      await initData();
      await refreshUser();
    } catch (e: any) {
      const errorMsg = e.response?.data?.error || e.message || "Ошибка старта";
      setToast({ show: true, message: `❌ ${errorMsg}`, type: 'error' });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!confirm("Завершить смену?")) return;
    setLoading(true);
    try {
      // Demo mode: force state update
      if (user?.tenant_id === 999) {
        setActiveShift(null);
        localStorage.removeItem('logishift_active_shift');

        // Update user state back to idle via refreshUser
        const updatedUser = { ...user, current_state: DriverState.IDLE };
        localStorage.setItem('logishift_user_info', JSON.stringify(updatedUser));
        await refreshUser();

        setToast({ show: true, message: "✅ Смена завершена", type: 'success' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2000);
        setLoading(false);
        return;
      }

      // Production mode: normal API call
      await api.post("/shifts/end", {});

      // Re-fetch data and refresh user state
      await initData();
      await refreshUser();
    } catch (e: any) {
      const errorMsg = e.response?.data?.error || e.message || "Ошибка завершения";
      setToast({ show: true, message: `❌ ${errorMsg}`, type: 'error' });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    const formData = new FormData();
    formData.append("photo", file);
    setLoading(true);
    try {
      // Use direct fetch instead of api.post() to avoid JSON.stringify on FormData
      const uploadRes = await fetch(API_ENDPOINTS.UPLOAD_PHOTO, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${api.getAuthToken()}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        const errorMsg = (errData as any).error || `Ошибка загрузки фото (${uploadRes.status})`;
        setToast({ show: true, message: `❌ ${errorMsg}`, type: 'error' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
        return;
      }

      // Demo mode: advance state machine
      if (user?.tenant_id === 999) {
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

        // Clear active shift before initData runs so it does not restore from localStorage
        if (nextState === DriverState.IDLE) {
          setActiveShift(null);
          localStorage.removeItem('logishift_active_shift');
        }

        // Update user state via refreshUser to sync with AuthContext
        const updatedUser = { ...user, current_state: nextState };
        localStorage.setItem('logishift_user_info', JSON.stringify(updatedUser));
        await refreshUser();

        setToast({ show: true, message: "✅ Фото загружено", type: 'success' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2000);
      } else {
        // Production mode
        setToast({ show: true, message: "✅ Фото загружено", type: 'success' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2000);
      }

      // Re-fetch data instead of full page reload
      await initData();
      if (!user?.tenant_id || user.tenant_id !== 999) {
        await refreshUser();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || "Ошибка загрузки фото";
      setToast({ show: true, message: `❌ ${errorMsg}`, type: 'error' });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    } finally {
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
      <div className="flex justify-between items-center mb-8">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Привет, {user?.full_name}
          </h1>
          <div className="mt-2">
            <span
              className={`inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full ${
                !activeShift || user?.current_state === "idle"
                  ? "bg-slate-100 text-slate-500"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                !activeShift || user?.current_state === "idle"
                  ? "bg-slate-400"
                  : "bg-emerald-500 animate-pulse"
              }`}></span>
              {!activeShift || user?.current_state === "idle"
                ? "Вне смены"
                : "В процессе"}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          aria-label="Выйти"
        >
          <LogOut size={22} />
        </button>
      </div>

      {/* ГЛАВНАЯ ЛОГИКА ЭКРАНОВ */}
      {!activeShift ? (
        // --- ЭКРАН 1: ВЫБОР (Если смены нет в БД или статус idle) ---
        <div className="space-y-5">
          <Card className="p-5 border border-slate-200 shadow-sm bg-white">
            <h3 className="text-xs font-semibold text-slate-500 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Truck size={16} />
              Выберите транспорт
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {trucks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTruck(t.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all active:scale-95 min-h-[88px] flex flex-col justify-center ${
                    selectedTruck === t.id
                      ? "border-[#0a192f] bg-[#0a192f]/5 shadow-md shadow-[#0a192f]/10"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Truck
                    size={20}
                    className={`mb-2 ${
                      selectedTruck === t.id
                        ? "text-[#0a192f]"
                        : "text-slate-400"
                    }`}
                  />
                  <div className="font-bold text-base text-slate-800">
                    {t.name}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {t.plate || t.plate_number || "Без номера"}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 border border-slate-200 shadow-sm bg-white">
            <h3 className="text-xs font-semibold text-slate-500 mb-4 uppercase tracking-wider flex items-center gap-2">
              <MapPin size={16} />
              Выберите объект
            </h3>
            <div className="space-y-3">
              {sites.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSite(String(s.id))}
                  className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all active:scale-[0.98] min-h-[60px] ${
                    selectedSite === String(s.id)
                      ? "border-[#0a192f] bg-[#0a192f]/5 shadow-md shadow-[#0a192f]/10"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <MapPin
                    size={20}
                    className={
                      selectedSite === String(s.id) ? "text-[#0a192f]" : "text-slate-400"
                    }
                  />
                  <span className="text-base font-bold text-slate-800">
                    {s.name}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Requirements Info Block */}
          {selectedSite && (() => {
            const selectedSiteData = sites.find(s => String(s.id) === selectedSite);
            const requiresOdometer = selectedSiteData?.odometer_required;
            const requiresInvoice = selectedSiteData?.invoice_required;

            if (!requiresOdometer && !requiresInvoice) return null;

            return (
              <Card className="p-4 border border-amber-200 shadow-sm bg-amber-50">
                <h3 className="text-xs font-semibold text-amber-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle size={14} />
                  Требования для смены
                </h3>
                <div className="space-y-2">
                  {requiresOdometer && (
                    <div className="flex items-center gap-2 text-sm text-amber-800">
                      <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center text-xs">🏁</div>
                      <span className="font-medium">Требуется фото одометра</span>
                    </div>
                  )}
                  {requiresInvoice && (
                    <div className="flex items-center gap-2 text-sm text-amber-800">
                      <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center text-xs">📄</div>
                      <span className="font-medium">Требуется накладная</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })()}

          {/* Shift History */}
          {shiftHistory.length > 0 && (
            <Card className="p-5 border border-slate-200 shadow-sm bg-white">
              <h3 className="text-xs font-semibold text-slate-500 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Clock size={16} />
                Мои последние смены
              </h3>
              <div className="space-y-3">
                {shiftHistory.slice(0, 5).map((shift) => (
                  <div key={shift.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-700">
                          {shift.truck?.name || shift.truck_name || '—'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {shift.created_at ? new Date(shift.created_at).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit'
                        }) : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <MapPin size={12} />
                      <span>{shift.site?.name || shift.site_name || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => setShowHistoryModal(true)}
                className="w-full mt-3 py-3 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all active:scale-[0.98]"
              >
                Показать все смены
              </Button>
            </Card>
          )}

          <Button
            onClick={handleStart}
            disabled={!selectedTruck || !selectedSite}
            className="w-full py-3 rounded-lg bg-[#0a192f] hover:bg-[#152238] text-white font-bold text-lg shadow-lg shadow-[#0a192f]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            isLoading={loading}
          >
            <Play size={20} fill="currentColor" />
            ОТКРЫТЬ СМЕНУ
          </Button>
        </div>
      ) : (
        // --- ЭКРАН 2: СМЕНА ОТКРЫТА (Работа или Фото) ---
        <div className="space-y-5">
          <Card className="p-6 border border-slate-200 shadow-md bg-white">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 text-[#0a192f]">
                <Clock size={20} />
                <span className="font-bold text-base uppercase tracking-tight">
                  Смена #{activeShift.id}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                {activeShift.start_time
                  ? new Date(activeShift.start_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "ОФОРМЛЕНИЕ"}
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-5">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                  <Truck size={22} />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider mb-0.5">
                    Машина
                  </div>
                  <div className="text-base font-bold text-slate-800">
                    {activeShift.truck?.name || "---"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                  <MapPin size={22} />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider mb-0.5">
                    Объект
                  </div>
                  <div className="text-base font-bold text-slate-800">
                    {activeShift.site?.name || "---"}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {workflowState === "active" ? (
            // ПОД-ЭКРАН: ПРОСТО РАБОТА
            <div className="space-y-4">
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-4 text-emerald-800">
                <CheckCircle2 size={28} className="shrink-0" />
                <div className="flex-1">
                  <div className="font-bold text-base">Смена активна</div>
                  <div className="text-sm opacity-80 mt-0.5">
                    Вы можете завершить её в любой момент
                  </div>
                </div>
              </div>
              <Button
                onClick={handleEnd}
                className="w-full py-6 bg-red-500 hover:bg-red-600 text-white font-bold text-lg shadow-xl shadow-red-100 transition-all active:scale-[0.98]"
                isLoading={loading}
              >
                <Square size={20} fill="currentColor" className="mr-3" />
                ЗАВЕРШИТЬ РАБОТУ
              </Button>
            </div>
          ) : ['awaiting_odo_start', 'awaiting_odo_end', 'awaiting_invoice'].includes(workflowState) ? (
            // ПОД-ЭКРАН: ТРЕБУЕТСЯ ФОТО
            <div className="space-y-4">
              <div className="p-6 bg-orange-50 border border-orange-200 rounded-xl text-center">
                <Camera size={48} className="mx-auto mb-4 text-orange-500" />
                <h3 className="font-bold text-lg text-orange-900 uppercase tracking-tight mb-2">
                  Нужна фотография
                </h3>
                <p className="text-sm text-orange-700 font-medium leading-relaxed">
                  {workflowState === "awaiting_odo_start" &&
                    "Сфотографируйте одометр ПЕРЕД началом"}
                  {workflowState === "awaiting_odo_end" &&
                    "Сфотографируйте одометр ПОСЛЕ работы"}
                  {workflowState === "awaiting_invoice" &&
                    "Сфотографируйте накладную (ТТН)"}
                </p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-10 bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold shadow-2xl shadow-orange-200 flex flex-col items-center gap-2 transition-all active:scale-[0.98]"
                isLoading={loading}
              >
                <Camera size={36} />
                ОТКРЫТЬ КАМЕРУ
              </Button>
              <div className="flex items-start gap-3 p-4 text-slate-500 text-xs bg-white rounded-lg border border-slate-200 shadow-sm">
                <AlertCircle size={16} className="shrink-0 text-orange-500 mt-0.5" />
                <span className="leading-relaxed">
                  Убедитесь, что все данные на фото видны четко. Плохое качество
                  фото может стать причиной отклонения смены.
                </span>
              </div>
            </div>
          ) : (
            // ПОД-ЭКРАН: СМЕНА ЗАВЕРШЕНА (состояние не ожидает фото)
            <div className="space-y-4">
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-500" />
                <h3 className="font-bold text-lg text-emerald-900 uppercase tracking-tight mb-2">
                  Смена завершена
                </h3>
                <p className="text-sm text-emerald-700 font-medium">
                  Все документы приняты. Хорошей работы!
                </p>
              </div>
              <Button
                onClick={() => {
                  setActiveShift(null);
                  localStorage.removeItem('logishift_active_shift');
                }}
                className="w-full py-3 bg-[#0a192f] hover:bg-[#152238] text-white font-bold text-lg shadow-lg shadow-[#0a192f]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Play size={20} fill="currentColor" />
                Открыть новую смену
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className={`px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-[#0a192f] text-white'
          }`}>
            {toast.type === 'error' ? (
              <AlertCircle size={18} className="text-white" />
            ) : (
              <CheckCircle2 size={18} className="text-green-400" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Shift History Modal */}
      {showHistoryModal && (
        <ShiftHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          shifts={shiftHistory}
        />
      )}
    </div>
  );
};
