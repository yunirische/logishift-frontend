import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  LogOut,
  MapPin,
  History,
  Play,
  Square,
  Truck,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card } from "../components/ui";
import {
  DEMO_FALLBACK_PERSONA,
  DemoDriverPersona,
  demoActiveShiftKey,
  isDemoTenantId,
  pickDemoDriverPersona,
} from "../config/demo";
import { API_ENDPOINTS } from "../constants";
import { useAuth } from "../context/AuthContext";
import api, { getCurrentShift } from "../services/api";
import { DriverState } from "../types";
import { validatePhotoFile } from "../utils/photoFile";

interface DriverViewProps {
  focusHistory?: boolean;
}

export const DriverView: React.FC<DriverViewProps> = ({
  focusHistory = false,
}) => {
  const { user, logout, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [shiftHistory, setShiftHistory] = useState<any[]>([]);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type?: "success" | "error";
  }>({ show: false, message: "", type: "success" });
  const [actionMessage, setActionMessage] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ show: false, message: "", type: "info" });
  const [selectedTruck, setSelectedTruck] = useState("");
  const [selectedSite, setSelectedSite] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDemoMode = isDemoTenantId(user?.tenant_id);
  // Demo-driver mode: substitute persona at the view layer only.
  // AuthContext.user is never mutated.
  const [demoPersona, setDemoPersona] = useState<DemoDriverPersona | null>(null);
  const isDemoDriverMode = isDemoMode && user?.role === "admin";
  const effectiveDriverId: number | null = isDemoDriverMode
    ? demoPersona?.id ?? null
    : user?.id ?? null;
  const effectiveDriverName: string = isDemoDriverMode
    ? demoPersona?.full_name || DEMO_FALLBACK_PERSONA.full_name
    : user?.full_name || "";
  const hasActiveShift = Boolean(activeShift);
  const workflowState = String(activeShift?.status || "").toLowerCase();
  const startDisabledReason =
    !selectedTruck && !selectedSite
      ? "Выберите машину и объект, чтобы начать смену."
      : !selectedTruck
      ? "Выберите машину."
      : !selectedSite
      ? "Выберите объект."
      : "";
  const currentShiftBannerMessage = hasActiveShift
    ? workflowState === "active"
      ? "Смена активна."
      : workflowState === "finished"
      ? "Смена завершена."
      : "Текущая смена загружена."
    : startDisabledReason || "Готово к началу смены.";

  // Demo-driver mode: fetch tenant users once and pick a driver persona.
  // Falls back to a synthetic persona if /users fails or has no drivers.
  useEffect(() => {
    if (!isDemoDriverMode) {
      if (demoPersona !== null) setDemoPersona(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const users = await api.get("/users");
        if (cancelled) return;
        const picked = pickDemoDriverPersona(users) || DEMO_FALLBACK_PERSONA;
        setDemoPersona(picked);
      } catch {
        if (!cancelled) setDemoPersona(DEMO_FALLBACK_PERSONA);
      }
    })();
    return () => {
      cancelled = true;
    };
    // demoPersona intentionally excluded — we only want to fetch once per mode entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoDriverMode]);

  const formatShiftDate = useCallback((dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "long",
    });
  }, []);

  const renderHistoryList = (limit?: number) => {
    const historyItems =
      typeof limit === "number" ? shiftHistory.slice(0, limit) : shiftHistory;

    if (historyItems.length === 0) {
      return (
        <Card className="border border-dashed border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <History size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Пока нет смен</h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              Здесь появятся завершенные смены водителя.
            </p>
          </div>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {historyItems.map((shift) => (
          <Card
            key={shift.id}
            className="border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-slate-900">
                  <Truck size={16} className="shrink-0 text-slate-400" />
                  <span className="truncate text-sm font-bold">
                    {shift.truck?.name || shift.truck_name || "—"}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <MapPin size={14} className="shrink-0" />
                  <span className="truncate">
                    {shift.site?.name || shift.site_name || "—"}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Дата
                </div>
                <div className="mt-1 text-sm font-medium text-slate-700">
                  {formatShiftDate(shift.end_time || shift.created_at)}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                Завершена
              </span>
              <span className="font-medium">
                {shift.hours_worked ? `${shift.hours_worked} ч` : "Без часов"}
              </span>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const loadSelectionData = useCallback(async () => {
    // History query targets the effective driver:
    //  - production: the authenticated user
    //  - demo-driver: the substituted demo persona (real seeded driver id)
    // If demo persona has no real id (id=0), skip the history call and show
    // an empty (synthetic) history rather than firing a query that would
    // either fail validation or return unrelated data.
    const historyDriverId = effectiveDriverId && effectiveDriverId > 0 ? effectiveDriverId : null;

    const [trucksRes, sitesRes, historyRes] = await Promise.all([
      api.get("/trucks"),
      api.get("/sites"),
      historyDriverId != null
        ? api
            .get(`/shifts?driver_id=${historyDriverId}&status=finished&limit=20`)
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    setTrucks(Array.isArray(trucksRes) ? trucksRes : []);
    setSites(Array.isArray(sitesRes) ? sitesRes : []);
    // /shifts returns { data, total, page, lastPage } for paginated; some
    // callers return a bare array. Accept both shapes.
    const historyArr = Array.isArray(historyRes)
      ? historyRes
      : Array.isArray((historyRes as any)?.data)
      ? (historyRes as any).data
      : [];
    setShiftHistory(historyArr);
  }, [effectiveDriverId]);

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
        if (isDemoTenantId(user.tenant_id)) {
          // Demo: active shift is stored client-side, keyed per persona so
          // switching demo drivers does not leak state between personas.
          const storageKey = demoActiveShiftKey(effectiveDriverId);
          const storedShift = localStorage.getItem(storageKey);

          if (storedShift) {
            try {
              const parsedShift = JSON.parse(storedShift);
              setActiveShift(parsedShift);
              return parsedShift;
            } catch (error) {
              console.error("Failed to parse stored shift:", error);
              localStorage.removeItem(storageKey);
            }
          } else {
            // No active mock shift for this persona — ensure UI shows picker.
            setActiveShift(null);
          }

          await loadSelectionData();

          // Demo: do NOT call refreshUser() — it would re-fetch /users/me for
          // the admin auth user and clobber any local UI state. Identity in
          // demo-driver mode comes from `demoPersona`, not from AuthContext.

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
    [effectiveDriverId, loadSelectionData, refreshUser, user]
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
    setActionMessage({ show: false, message: "", type: "info" });
    try {
      if (isDemoTenantId(user?.tenant_id)) {
        const selectedSiteData = sites.find(
          (site) => String(site.id) === selectedSite
        );
        const selectedTruckData = trucks.find(
          (truck) => String(truck.id) === selectedTruck
        );

        const mockShift = {
          id: 999,
          status: selectedSiteData?.odometer_required
            ? "awaiting_odo_start"
            : "active",
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
        localStorage.setItem(
          demoActiveShiftKey(effectiveDriverId),
          JSON.stringify(mockShift)
        );
        // Demo: do not mutate cached user / AuthContext. UI gating is driven
        // by `activeShift.status`, not by `user.current_state`.

        setToast({
          show: true,
          message: "Смена открыта",
          type: "success",
        });
        setActionMessage({
          show: true,
          message: "Смена открыта.",
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
      setActionMessage({
        show: true,
        message: "Смена начата.",
        type: "success",
      });
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error || error.message || "Ошибка старта";
      setToast({ show: true, message: errorMsg, type: "error" });
      setActionMessage({
        show: true,
        message: errorMsg,
        type: "error",
      });
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
    setActionMessage({ show: false, message: "", type: "info" });
    try {
      if (isDemoTenantId(user?.tenant_id)) {
        setActiveShift(null);
        localStorage.removeItem(demoActiveShiftKey(effectiveDriverId));
        // Demo: do not mutate cached user / AuthContext.
        // Refresh selection data + history so the picker re-appears with
        // up-to-date "last shifts" list for the persona.
        await loadSelectionData();

        setToast({
          show: true,
          message: "Смена завершена",
          type: "success",
        });
        setActionMessage({
          show: true,
          message: "Смена завершена.",
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
      setActionMessage({
        show: true,
        message: "Смена завершена.",
        type: "success",
      });
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error || error.message || "Ошибка завершения";
      setToast({ show: true, message: errorMsg, type: "error" });
      setActionMessage({
        show: true,
        message: errorMsg,
        type: "error",
      });
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

    const validation = validatePhotoFile(file);
    if ("error" in validation) {
      setToast({ show: true, message: validation.error, type: "error" });
      setActionMessage({
        show: true,
        message: validation.error,
        type: "error",
      });
      setTimeout(
        () => setToast({ show: false, message: "", type: "success" }),
        3000
      );
      return;
    }

    if (validation.warning) {
      setActionMessage({
        show: true,
        message: validation.warning,
        type: "info",
      });
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

      if (isDemoTenantId(user?.tenant_id)) {
        // Demo: advance the mock shift status locally based on its current
        // status, mirroring the backend state machine (driven by activeShift,
        // not by AuthContext.user).
        const currentStatus = String(activeShift?.status || "").toLowerCase();
        let nextStatus: string;
        switch (currentStatus) {
          case "awaiting_odo_start":
            nextStatus = "active";
            break;
          case "awaiting_odo_end":
            nextStatus = "awaiting_invoice";
            break;
          case "awaiting_invoice":
            nextStatus = "finished";
            break;
          default:
            nextStatus = "active";
        }

        const storageKey = demoActiveShiftKey(effectiveDriverId);
        if (nextStatus === "finished") {
          setActiveShift(null);
          localStorage.removeItem(storageKey);
        } else if (activeShift) {
          const advanced = { ...activeShift, status: nextStatus };
          setActiveShift(advanced);
          localStorage.setItem(storageKey, JSON.stringify(advanced));
        }
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

  if (focusHistory) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 pb-28">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Мои смены
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              История завершенных смен водителя без общего реестра и лишних
              действий.
            </p>
          </div>
          {hasActiveShift && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-right">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                Активная смена
              </div>
              <div className="mt-1 text-sm font-bold text-emerald-900">
                {activeShift.truck?.name || "Смена в работе"}
              </div>
            </div>
          )}
        </div>

        {renderHistoryList()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-48">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFileUpload}
      />

      <div className="mb-8 flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Привет, {effectiveDriverName}
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
                const truckLabel = `${truck.name || "Машина"} ${
                  truck.plate || truck.plate_number
                    ? `— ${truck.plate || truck.plate_number}`
                    : ""
                }`.trim();

                return (
                  <button
                    key={truck.id}
                    type="button"
                    onClick={() => setSelectedTruck(truckId)}
                    aria-pressed={isSelected}
                    aria-label={truckLabel}
                    data-testid={`driver-truck-card-${truck.id}`}
                    data-selected={isSelected ? "true" : "false"}
                    className={`flex min-h-[88px] cursor-pointer flex-col justify-center rounded-xl border-2 p-4 text-left transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a192f] ${
                      isSelected
                        ? "border-[#0a192f] bg-[#0a192f]/5 shadow-md shadow-[#0a192f]/10"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <Truck
                        size={20}
                        className={`shrink-0 ${
                          isSelected ? "text-[#0a192f]" : "text-slate-400"
                        }`}
                      />
                      {isSelected && (
                        <span
                          className="rounded-full bg-[#0a192f] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
                          data-testid={`driver-truck-selected-${truck.id}`}
                        >
                          Выбрано
                        </span>
                      )}
                    </div>
                    <div className="text-base font-bold text-slate-800">
                      {truck.name}
                    </div>
                    <div className="text-xs font-medium text-slate-500">
                      {truck.plate || truck.plate_number || "Без номера"}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <MapPin size={16} />
              Выберите объект / площадку
            </h3>
            <div className="space-y-3">
              {sites.map((site) => {
                const siteId = String(site.id);
                const isSelected = selectedSite === siteId;
                const siteLabel = `${site.name || "Объект"}`;

                return (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => setSelectedSite(siteId)}
                    aria-pressed={isSelected}
                    aria-label={siteLabel}
                    data-testid={`driver-site-card-${site.id}`}
                    data-selected={isSelected ? "true" : "false"}
                    className={`flex min-h-[60px] cursor-pointer items-center gap-3 rounded-xl border p-4 text-left transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a192f] ${
                      isSelected
                        ? "border-[#0a192f] bg-[#0a192f]/5 shadow-md shadow-[#0a192f]/10"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <MapPin
                      size={20}
                      className={isSelected ? "text-[#0a192f]" : "text-slate-400"}
                    />
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className="truncate text-base font-bold text-slate-800">
                        {site.name}
                      </span>
                      {isSelected && (
                        <span
                          className="rounded-full bg-[#0a192f] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
                          data-testid={`driver-site-selected-${site.id}`}
                        >
                          Выбрано
                        </span>
                      )}
                    </div>
                  </button>
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

        </div>
      ) : (
        <div className="space-y-5">
          <div data-testid="current-shift-status">
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
          </div>

          {workflowState === "active" ? (
            <div className="space-y-4">
              <div
                className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800"
                data-testid="active-shift-status"
              >
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
          <div className="space-y-2">
            <Button
              onClick={handleStart}
              disabled={!selectedTruck || !selectedSite}
              data-testid="start-shift-button"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0a192f] py-3 text-base font-bold text-white shadow-lg shadow-[#0a192f]/20 transition-all hover:bg-[#152238] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              isLoading={loading}
            >
              <Play size={18} fill="currentColor" />
              Начать смену
            </Button>
            <div
              className="min-h-5 text-center text-xs font-medium text-slate-500"
              data-testid="start-shift-disabled-reason"
              role="status"
              aria-live="polite"
            >
              {startDisabledReason || "Смена может быть начата."}
            </div>
          </div>
        ) : workflowState === "active" ? (
          <Button
            onClick={handleEnd}
            data-testid="end-shift-button"
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
              localStorage.removeItem(demoActiveShiftKey(effectiveDriverId));
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0a192f] py-3 text-base font-bold text-white shadow-lg shadow-[#0a192f]/20 transition-all hover:bg-[#152238] active:scale-[0.98]"
          >
            <Play size={18} fill="currentColor" />
            Открыть новую смену
          </Button>
        )}
        <div
          className={`mt-3 rounded-lg border px-4 py-3 text-sm shadow-sm ${
            actionMessage.show
              ? actionMessage.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : actionMessage.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-700"
              : "border-slate-200 bg-white text-slate-500"
          }`}
          data-testid="driver-shift-message"
          role={actionMessage.show && actionMessage.type === "error" ? "alert" : "status"}
          aria-live={actionMessage.show && actionMessage.type === "error" ? "assertive" : "polite"}
        >
          {actionMessage.show ? actionMessage.message : currentShiftBannerMessage}
        </div>
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
    </div>
  );
};
