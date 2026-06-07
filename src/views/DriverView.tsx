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
import React, { useCallback, useEffect, useRef, useState } from "react";
import ShiftHistoryModal from "../components/ShiftHistoryModal";
import { Button, Card } from "../components/ui";
import { API_ENDPOINTS } from "../constants";
import { useAuth } from "../context/AuthContext";
import api, { getCurrentShift } from "../services/api";
import { DriverState } from "../types";

export const DriverView = () => {
  const { user, logout, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [shiftHistory, setShiftHistory] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type?: "success" | "error";
  }>({ show: false, message: "", type: "success" });
  const [selectedTruck, setSelectedTruck] = useState("");
  const [selectedSite, setSelectedSite] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDemoMode = user?.tenant_id === 999;
  const hasActiveShift = Boolean(activeShift);
  const workflowState = String(activeShift?.status || "").toLowerCase();

  const loadSelectionData = useCallback(async () => {
    const [trucksRes, sitesRes, historyRes] = await Promise.all([
      api.get("/trucks"),
      api.get("/sites"),
      api
        .get(`/shifts?driver_id=${user?.id}&status=completed&limit=10`)
        .catch(() => []),
    ]);

    setTrucks(Array.isArray(trucksRes) ? trucksRes : []);
    setSites(Array.isArray(sitesRes) ? sitesRes : []);
    setShiftHistory(Array.isArray(historyRes) ? historyRes : []);
  }, [user?.id]);

  const refreshCurrentShift = useCallback(
    async ({
      silent = false,
      refreshAuthState = false,
    }: {
      silent?: boolean;
      refreshAuthState?: boolean;
    } = {}) => {
      if (!user) return null;

      if (!silent) {
        setLoading(true);
      }

      try {
        if (user.tenant_id === 999) {
          const storedShift = localStorage.getItem("logishift_active_shift");

          if (storedShift) {
            try {
              const parsedShift = JSON.parse(storedShift);
              setActiveShift(parsedShift);
              return parsedShift;
            } catch (error) {
              console.error("Failed to parse stored shift:", error);
              localStorage.removeItem("logishift_active_shift");
            }
          }

          if (user.current_state === DriverState.IDLE) {
            setActiveShift(null);
            localStorage.removeItem("logishift_active_shift");
          }

          await loadSelectionData();

          if (refreshAuthState) {
            await refreshUser();
          }

          return null;
        }

        const currentShift = await getCurrentShift();

        if (currentShift) {
          setActiveShift(currentShift);
          if (refreshAuthState) {
            await refreshUser();
          }
          return currentShift;
        }

        setActiveShift(null);
        await loadSelectionData();

        if (refreshAuthState) {
          await refreshUser();
        }

        return null;
      } catch (error) {
        if (!silent) {
          console.error("Ошибка загрузки данных:", error);
        }
        return null;
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [loadSelectionData, refreshUser, user]
  );

  useEffect(() => {
    if (user) {
      void refreshCurrentShift();
    }
  }, [refreshCurrentShift, user]);

  useEffect(() => {
    if (!user || isDemoMode) return;

    const runBackgroundRefresh = () => {
      if (document.visibilityState === "visible") {
        void refreshCurrentShift({ silent: true });
      }
    };

    const intervalMs =
      hasActiveShift || user.current_state !== DriverState.IDLE ? 10000 : 15000;
    const intervalId = window.setInterval(runBackgroundRefresh, intervalMs);

    window.addEventListener("focus", runBackgroundRefresh);
    document.addEventListener("visibilitychange", runBackgroundRefresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", runBackgroundRefresh);
      document.removeEventListener("visibilitychange", runBackgroundRefresh);
    };
  }, [
    hasActiveShift,
    isDemoMode,
    refreshCurrentShift,
    user,
    user?.current_state,
  ]);

  const handleStart = async () => {
    if (!selectedTruck || !selectedSite) return;

    setLoading(true);
    try {
      if (user?.tenant_id === 999) {
        const selectedSiteData = sites.find(
          (site) => String(site.id) === selectedSite
        );
        const selectedTruckData = trucks.find(
          (truck) => String(truck.id) === selectedTruck
        );

        const mockShift = {
          id: 999,
          status: "active",
          start_time: new Date().toISOString(),
          truck: selectedTruckData || {
            id: 1,
            name: "MAN TGX",
            plate_number: "А123БВ",
          },
          site: selectedSiteData || {
            id: 1,
            name: "ЖК Северный",
            address: "ул. Примерная, 1",
          },
        };

        setActiveShift(mockShift);
        localStorage.setItem("logishift_active_shift", JSON.stringify(mockShift));

        const nextState = selectedSiteData?.odometer_required
          ? DriverState.AWAITING_ODO_START
          : DriverState.ACTIVE;

        const updatedUser = { ...user, current_state: nextState };
        localStorage.setItem("logishift_user_info", JSON.stringify(updatedUser));
        await refreshUser();

        setToast({
          show: true,
          message: "Смена открыта",
          type: "success",
        });
        setTimeout(
          () => setToast({ show: false, message: "", type: "success" }),
          2000
        );
        return;
      }

      await api.post("/shifts/start", {
        truck_id: selectedTruck,
        site_id: selectedSite,
      });

      await refreshCurrentShift({ silent: true, refreshAuthState: true });
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error || error.message || "Ошибка старта";
      setToast({ show: true, message: errorMsg, type: "error" });
      setTimeout(
        () => setToast({ show: false, message: "", type: "success" }),
        3000
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!confirm("Завершить смену?")) return;

    setLoading(true);
    try {
      if (user?.tenant_id === 999) {
        setActiveShift(null);
        localStorage.removeItem("logishift_active_shift");

        const updatedUser = { ...user, current_state: DriverState.IDLE };
        localStorage.setItem("logishift_user_info", JSON.stringify(updatedUser));
        await refreshUser();

        setToast({
          show: true,
          message: "Смена завершена",
          type: "success",
        });
        setTimeout(
          () => setToast({ show: false, message: "", type: "success" }),
          2000
        );
        return;
      }

      await api.post("/shifts/end", {});
      await refreshCurrentShift({ silent: true, refreshAuthState: true });
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error || error.message || "Ошибка завершения";
      setToast({ show: true, message: errorMsg, type: "error" });
      setTimeout(
        () => setToast({ show: false, message: "", type: "success" }),
        3000
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    const formData = new FormData();
    formData.append("photo", file);
    setLoading(true);

    try {
      const uploadRes = await fetch(API_ENDPOINTS.UPLOAD_PHOTO, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${api.getAuthToken()}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        const errorMsg =
          (errData as any).error ||
          `Ошибка загрузки фото (${uploadRes.status})`;
        setToast({ show: true, message: errorMsg, type: "error" });
        setTimeout(
          () => setToast({ show: false, message: "", type: "success" }),
          3000
        );
        return;
      }

      if (user?.tenant_id === 999) {
        const currentState = user.current_state;
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

        if (nextState === DriverState.IDLE) {
          setActiveShift(null);
          localStorage.removeItem("logishift_active_shift");
        }

        const updatedUser = { ...user, current_state: nextState };
        localStorage.setItem("logishift_user_info", JSON.stringify(updatedUser));
        await refreshUser();
      }

      setToast({
        show: true,
        message: "Фото загружено",
        type: "success",
      });
      setTimeout(
        () => setToast({ show: false, message: "", type: "success" }),
        2000
      );

      await refreshCurrentShift({
        silent: true,
        refreshAuthState: !isDemoMode,
      });
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error || error.message || "Ошибка загрузки фото";
      setToast({ show: true, message: errorMsg, type: "error" });
      setTimeout(
        () => setToast({ show: false, message: "", type: "success" }),
        3000
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading && !activeShift && !trucks.length) {
    return (
      <div className="p-10 text-center text-slate-400 animate-pulse">
        Синхронизация...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-28">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
      />

      <div className="mb-8 flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Привет, {user?.full_name}
          </h1>
          <div className="mt-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                !hasActiveShift
                  ? "bg-slate-100 text-slate-500"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <span
                className={`mr-2 h-1.5 w-1.5 rounded-full ${
                  !hasActiveShift
                    ? "bg-slate-400"
                    : "bg-emerald-500 animate-pulse"
                }`}
              />
              {!hasActiveShift ? "Не на смене" : "На смене"}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="rounded-lg p-3 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500"
          aria-label="Выйти"
        >
          <LogOut size={22} />
        </button>
      </div>

      {!activeShift ? (
        <div className="space-y-5">
          <Card className="border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Truck size={16} />
              Выберите транспорт
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {trucks.map((truck) => {
                const truckId = String(truck.id);
                const isSelected = selectedTruck === truckId;

                return (
                  <div
                    key={truck.id}
                    onClick={() => setSelectedTruck(truckId)}
                    className={`flex min-h-[88px] cursor-pointer flex-col justify-center rounded-xl border-2 p-4 transition-all active:scale-95 ${
                      isSelected
                        ? "border-[#0a192f] bg-[#0a192f]/5 shadow-md shadow-[#0a192f]/10"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <Truck
                      size={20}
                      className={`mb-2 ${
                        isSelected ? "text-[#0a192f]" : "text-slate-400"
                      }`}
                    />
                    <div className="text-base font-bold text-slate-800">
                      {truck.name}
                    </div>
                    <div className="text-xs font-medium text-slate-500">
                      {truck.plate || truck.plate_number || "Без номера"}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <MapPin size={16} />
              Выберите объект
            </h3>
            <div className="space-y-3">
              {sites.map((site) => {
                const siteId = String(site.id);
                const isSelected = selectedSite === siteId;

                return (
                  <div
                    key={site.id}
                    onClick={() => setSelectedSite(siteId)}
                    className={`flex min-h-[60px] cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all active:scale-[0.98] ${
                      isSelected
                        ? "border-[#0a192f] bg-[#0a192f]/5 shadow-md shadow-[#0a192f]/10"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <MapPin
                      size={20}
                      className={isSelected ? "text-[#0a192f]" : "text-slate-400"}
                    />
                    <span className="text-base font-bold text-slate-800">
                      {site.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {selectedSite &&
            (() => {
              const selectedSiteData = sites.find(
                (site) => String(site.id) === selectedSite
              );
              const requiresOdometer = selectedSiteData?.odometer_required;
              const requiresInvoice = selectedSiteData?.invoice_required;

              if (!requiresOdometer && !requiresInvoice) return null;

              return (
                <Card className="border border-amber-200 bg-amber-50 p-4 shadow-sm">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                    <AlertCircle size={14} />
                    Требования для смены
                  </h3>
                  <div className="space-y-2">
                    {requiresOdometer && (
                      <div className="flex items-center gap-2 text-sm text-amber-800">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-[9px] font-bold">
                          ODO
                        </div>
                        <span className="font-medium">
                          Требуется фото одометра
                        </span>
                      </div>
                    )}
                    {requiresInvoice && (
                      <div className="flex items-center gap-2 text-sm text-amber-800">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-[9px] font-bold">
                          ТТН
                        </div>
                        <span className="font-medium">
                          Требуется накладная
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })()}

          {shiftHistory.length > 0 && (
            <Card className="border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Clock size={16} />
                Мои последние смены
              </h3>
              <div className="space-y-3">
                {shiftHistory.slice(0, 5).map((shift) => (
                  <div
                    key={shift.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-700">
                          {shift.truck?.name || shift.truck_name || "-"}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-slate-400">
                        {shift.created_at
                          ? new Date(shift.created_at).toLocaleDateString(
                              "ru-RU",
                              {
                                day: "2-digit",
                                month: "2-digit",
                              }
                            )
                          : "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <MapPin size={12} />
                      <span>{shift.site?.name || shift.site_name || "-"}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => setShowHistoryModal(true)}
                className="mt-3 w-full border-2 border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
              >
                Показать все смены
              </Button>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <Card className="border border-slate-200 bg-white p-6 shadow-md">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#0a192f]">
                <Clock size={20} />
                <span className="text-base font-bold uppercase tracking-tight">
                  Смена #{activeShift.id}
                </span>
              </div>
              <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
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
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                  <Truck size={22} />
                </div>
                <div className="flex-1">
                  <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Машина
                  </div>
                  <div className="text-base font-bold text-slate-800">
                    {activeShift.truck?.name || "---"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                  <MapPin size={22} />
                </div>
                <div className="flex-1">
                  <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
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
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
                <CheckCircle2 size={28} className="shrink-0" />
                <div className="flex-1">
                  <div className="text-base font-bold">Смена активна</div>
                  <div className="mt-0.5 text-sm opacity-80">
                    Вы можете завершить ее в любой момент
                  </div>
                </div>
              </div>
            </div>
          ) : [
              "awaiting_odo_start",
              "awaiting_odo_end",
              "awaiting_invoice",
            ].includes(workflowState) ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-6 text-center">
                <Camera size={48} className="mx-auto mb-4 text-orange-500" />
                <h3 className="mb-2 text-lg font-bold uppercase tracking-tight text-orange-900">
                  Нужна фотография
                </h3>
                <p className="text-sm font-medium leading-relaxed text-orange-700">
                  {workflowState === "awaiting_odo_start" &&
                    "Сфотографируйте одометр ПЕРЕД началом"}
                  {workflowState === "awaiting_odo_end" &&
                    "Сфотографируйте одометр ПОСЛЕ работы"}
                  {workflowState === "awaiting_invoice" &&
                    "Сфотографируйте накладную (ТТН)"}
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-sm">
                <AlertCircle
                  size={16}
                  className="mt-0.5 shrink-0 text-orange-500"
                />
                <span className="leading-relaxed">
                  Убедитесь, что все данные на фото видны четко. Плохое качество
                  фото может стать причиной отклонения смены.
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <CheckCircle2
                  size={48}
                  className="mx-auto mb-4 text-emerald-500"
                />
                <h3 className="mb-2 text-lg font-bold uppercase tracking-tight text-emerald-900">
                  Смена завершена
                </h3>
                <p className="text-sm font-medium text-emerald-700">
                  Все документы приняты. Хорошей работы!
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sticky primary action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
        {!activeShift ? (
          <Button
            onClick={handleStart}
            disabled={!selectedTruck || !selectedSite}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0a192f] py-3 text-base font-bold text-white shadow-lg shadow-[#0a192f]/20 transition-all hover:bg-[#152238] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            isLoading={loading}
          >
            <Play size={18} fill="currentColor" />
            Начать смену
          </Button>
        ) : workflowState === "active" ? (
          <Button
            onClick={handleEnd}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0a192f] py-3 text-base font-bold text-white shadow-lg shadow-[#0a192f]/20 transition-all hover:bg-[#152238] active:scale-[0.98]"
            isLoading={loading}
          >
            <Square size={18} fill="currentColor" />
            Завершить смену
          </Button>
        ) : ["awaiting_odo_start", "awaiting_odo_end", "awaiting_invoice"].includes(workflowState) ? (
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-3 text-base font-bold text-white shadow-lg shadow-orange-200 transition-all hover:bg-orange-600 active:scale-[0.98]"
            isLoading={loading}
          >
            <Camera size={18} />
            Открыть камеру
          </Button>
        ) : (
          <Button
            onClick={() => {
              setActiveShift(null);
              localStorage.removeItem("logishift_active_shift");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0a192f] py-3 text-base font-bold text-white shadow-lg shadow-[#0a192f]/20 transition-all hover:bg-[#152238] active:scale-[0.98]"
          >
            <Play size={18} fill="currentColor" />
            Открыть новую смену
          </Button>
        )}
      </div>

      {toast.show && (
        <div className="animate-in fade-in slide-in-from-top-2 fixed left-1/2 top-4 z-50 -translate-x-1/2 transform">
          <div
            className={`flex items-center gap-2 rounded-lg px-6 py-3 shadow-lg ${
              toast.type === "error"
                ? "bg-red-600 text-white"
                : "bg-[#0a192f] text-white"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle size={18} className="text-white" />
            ) : (
              <CheckCircle2 size={18} className="text-green-400" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

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
