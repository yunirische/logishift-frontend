import React, { Suspense, useCallback, useEffect, useState } from "react";
import { Filter, X, ChevronDown, Download } from "lucide-react";
import { DemoPhotoPreviewDialog } from "./DemoPhotoPreviewDialog";
import { isDemoTenantId } from "../config/demo";
import { API_ENDPOINTS } from "../constants";
import { useDemoSession } from "../context/DemoSessionContext";
import {
  DemoPhotoMetadata,
  DemoPhotoType,
  DemoScenarioShift,
} from "../lib/demoSession";
import api, { openShiftFilePreview, ShiftFileType } from "../services/api";
import { Shift, UserRole } from "../types";
import { formatForDisplay } from "../utils/dateUtils";
import { buildShiftQueryString } from "../utils/shiftFilters";

const PAGE_SIZE = 20;

const getDemoPhotoLabel = (type: DemoPhotoType): string => {
  switch (type) {
    case "start":
      return "Одометр до смены";
    case "end":
      return "Одометр после смены";
    case "invoice":
      return "Накладная";
  }
};

const EditShiftModal = React.lazy(() => import("./EditShiftModal"));

type DisplayShift = Omit<Shift, "id"> & {
  id: number | string;
  driver_id?: number | null;
  is_demo_synthetic?: boolean;
  demo_photo_metadata?: Partial<Record<DemoPhotoType, DemoPhotoMetadata>>;
};

const projectDemoShiftForRegistry = (
  shift: DemoScenarioShift
): DisplayShift => ({
  id: shift.id,
  driver_id: shift.driverId,
  driver_name: shift.driverName,
  truck_id:
    typeof shift.truckId === "number" ? shift.truckId : undefined,
  truck_name: shift.truckName,
  site_id: typeof shift.siteId === "number" ? shift.siteId : undefined,
  site_name: shift.siteName,
  start_time: shift.startedAt,
  end_time: shift.finishedAt || undefined,
  created_at: shift.startedAt,
  status: shift.status,
  comment: shift.comment || undefined,
  photos: {
    start: Boolean(shift.photos.start),
    end: Boolean(shift.photos.end),
    invoice: Boolean(shift.photos.invoice),
  },
  requires_odo_start: shift.odometerRequired,
  requires_odo_end: shift.odometerRequired,
  requires_invoice: shift.invoiceRequired,
  demo_photo_metadata: shift.photos,
  is_demo_synthetic: true,
});

const PhotoLink = React.memo(
  ({
    shiftId,
    type,
    hasPhoto,
    icon,
    title,
    isDemoMode = false,
    onError,
  }: {
    shiftId: number | string;
    type: ShiftFileType;
    hasPhoto: boolean;
    icon: string;
    title: string;
    isDemoMode?: boolean;
    onError: (message: string) => void;
  }) => {
    const [isOpening, setIsOpening] = useState(false);
    const isMountedRef = React.useRef(true);

    useEffect(() => {
      return () => {
        isMountedRef.current = false;
      };
    }, []);

    if (!hasPhoto) return null;

    if (isDemoMode) {
      return (
        <span
          className="inline-flex h-8 items-center rounded-full bg-amber-50 px-2 text-[10px] font-semibold text-amber-700"
          title={`${title}: фото недоступно в демо`}
        >
          Демо
        </span>
      );
    }

    const handlePreview = async () => {
      if (isOpening) return;
      setIsOpening(true);

      try {
        await openShiftFilePreview(shiftId, type);
      } catch (error) {
        if (isMountedRef.current) {
          onError(
            error instanceof Error ? error.message : "Не удалось открыть файл"
          );
        }
      } finally {
        if (isMountedRef.current) {
          setIsOpening(false);
        }
      }
    };

    return (
      <button
        type="button"
        onClick={() => {
          void handlePreview();
        }}
        disabled={isOpening}
        aria-label={title}
        aria-busy={isOpening}
        className="flex h-8 w-8 items-center justify-center text-slate-400 transition-colors hover:text-[#0a192f]"
        title={title}
      >
        {icon}
      </button>
    );
  }
);

PhotoLink.displayName = "PhotoLink";

type ShiftListResponse = {
  items: Shift[];
  total: number;
};

const normalizeShiftResponse = (response: any): ShiftListResponse => {
  if (response && typeof response === "object") {
    if (Array.isArray(response.data)) {
      return {
        items: response.data,
        total: response.total || response.count || response.data.length,
      };
    }

    if (Array.isArray(response)) {
      return {
        items: response,
        total: response.length,
      };
    }
  }

  if (Array.isArray(response)) {
    return {
      items: response,
      total: response.length,
    };
  }

  return { items: [], total: 0 };
};

const filenameFromDisposition = (
  contentDisposition: string | null,
  fallback: string
) => {
  const utfMatch = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }
  const match = contentDisposition?.match(
    /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
  );
  return match?.[1]?.replace(/['"]/g, "") || fallback;
};

const Shifts: React.FC = () => {
  const {
    activeShift: demoActiveShift,
    finishedShifts: demoFinishedShifts,
    getDemoPhotoPreview,
  } = useDemoSession();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [timezone, setTimezone] = useState("Europe/Moscow");
  const [timezoneLoaded, setTimezoneLoaded] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    driver_id: "",
    truck_id: "",
    site_id: "",
    date_from: "",
    date_to: "",
    status: "",
    accounting: "included" as "included" | "excluded" | "all",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [demoPreview, setDemoPreview] = useState<{
    url: string;
    fileName: string;
  } | null>(null);

  const user = api.getUserInfo();
  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FOREMAN;
  const isDemoMode = isDemoTenantId(user?.tenant_id);

  const downloadReport = async (
    endpoint: string,
    fallbackFilename: string
  ) => {
    try {
      const token = api.getAuthToken();
      const queryString = buildShiftQueryString({
        page: 1,
        limit: PAGE_SIZE,
        filters,
        tenantTimezone: timezone,
      });
      const response = await fetch(`${endpoint}?${queryString}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const contentType = response.headers.get("Content-Type") || "";
        const err = contentType.includes("application/json")
          ? await response.json().catch(() => ({}))
          : {};
        alert((err as any).error || `Ошибка экспорта (${response.status})`);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const contentDisposition = response.headers.get("Content-Disposition");
      link.download = filenameFromDisposition(contentDisposition, fallbackFilename);

      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error: any) {
      alert(error.message || "Не удалось скачать файл");
    }
  };

  const handleExcelExport = async () => {
    setExporting(true);
    try {
      await downloadReport(API_ENDPOINTS.REPORTS_EXCEL, "logishift-shifts-report.xlsx");
    } finally {
      setExporting(false);
    }
  };

  const handleZipExport = async () => {
    setExportingZip(true);
    try {
      await downloadReport(API_ENDPOINTS.REPORTS_PHOTOS_ZIP, "logishift-shift-photos.zip");
    } finally {
      setExportingZip(false);
    }
  };

  useEffect(() => {
    const fetchFilterData = async () => {
      if (!isAdmin) return;

      try {
        const [driversRes, trucksRes, sitesRes] = await Promise.all([
          api.get(API_ENDPOINTS.DRIVERS),
          api.get(API_ENDPOINTS.TRUCKS),
          api.get(API_ENDPOINTS.SITES),
        ]);

        setDrivers(Array.isArray(driversRes) ? driversRes : []);
        setTrucks(Array.isArray(trucksRes) ? trucksRes : []);
        setSites(Array.isArray(sitesRes) ? sitesRes : []);
      } catch (error) {
        console.error("Failed to load filter data:", error);
      }
    };

    void fetchFilterData();
  }, [isAdmin]);

  const buildQueryString = useCallback(
    (pageNumber: number) => {
      return buildShiftQueryString({
        page: pageNumber,
        limit: PAGE_SIZE,
        filters,
        tenantTimezone: timezone,
      });
    },
    [filters, timezone]
  );

  const updateShiftSnapshot = useCallback((items: Shift[], total: number) => {
    setShifts(items);
    setHasMore(items.length < total);
    setTotalCount(total);
    setEditingShift((current) => {
      if (!current) return current;
      return items.find((item) => item.id === current.id) || current;
    });
  }, []);

  const requestShiftPage = useCallback(
    async (pageNumber: number) => {
      const queryString = buildQueryString(pageNumber);
      const response = await api.get(`${API_ENDPOINTS.SHIFTS}?${queryString}`);
      return normalizeShiftResponse(response);
    },
    [buildQueryString]
  );

  const fetchShifts = useCallback(
    async ({
      pageNumber = page,
      append = false,
      showLoader = true,
      preserveVisiblePages = false,
    }: {
      pageNumber?: number;
      append?: boolean;
      showLoader?: boolean;
      preserveVisiblePages?: boolean;
    } = {}) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else if (showLoader) {
          setLoading(true);
        }

        if (preserveVisiblePages && pageNumber > 1) {
          const pageRequests = Array.from(
            { length: pageNumber },
            (_, index) => requestShiftPage(index + 1)
          );
          const pages = await Promise.all(pageRequests);
          const mergedItems = pages.flatMap((pageData) => pageData.items);
          const total = pages[pages.length - 1]?.total || mergedItems.length;
          updateShiftSnapshot(mergedItems, total);
          return;
        }

        const { items, total } = await requestShiftPage(pageNumber);

        if (append) {
          setShifts((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const appendedItems = items.filter(
              (item) => !existingIds.has(item.id)
            );
            const updated = [...prev, ...appendedItems];
            setHasMore(updated.length < total);
            return updated;
          });
          setTotalCount(total);
        } else {
          updateShiftSnapshot(items, total);
        }
      } catch (error) {
        console.error("Shifts fetch error:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [page, requestShiftPage, updateShiftSnapshot]
  );

  useEffect(() => {
    void fetchShifts({
      pageNumber: page,
      append: page > 1,
      showLoader: page === 1,
    });
  }, [fetchShifts, page]);

  const refreshVisibleShifts = useCallback(() => {
    if (!isAdmin || document.visibilityState !== "visible" || loadingMore) {
      return;
    }

    void fetchShifts({
      pageNumber: page,
      showLoader: false,
      preserveVisiblePages: true,
    });
  }, [fetchShifts, isAdmin, loadingMore, page]);

  useEffect(() => {
    if (!isAdmin) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        refreshVisibleShifts();
      }
    };

    const intervalId = window.setInterval(refreshVisibleShifts, 15000);

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [isAdmin, refreshVisibleShifts]);

  useEffect(() => {
    const fetchTimezone = async () => {
      try {
        const data = await api.get(API_ENDPOINTS.TENANT_SETTINGS);
        setTimezone(data.timezone || "Europe/Moscow");
      } catch (error) {
        console.error("Failed to fetch timezone:", error);
        setTimezone("Europe/Moscow");
      } finally {
        setTimezoneLoaded(true);
      }
    };

    void fetchTimezone();
  }, []);

  const serverDisplayShifts = isAdmin
    ? shifts
    : shifts.filter((shift) => shift.driver_name === user?.full_name);
  const syntheticShifts = isDemoMode
    ? [demoActiveShift, ...demoFinishedShifts]
        .filter((shift): shift is DemoScenarioShift => Boolean(shift))
        .filter((shift) => isAdmin || shift.driverId === user?.id)
        .filter((shift) => {
          if (filters.driver_id && String(shift.driverId) !== filters.driver_id) {
            return false;
          }
          if (filters.truck_id && String(shift.truckId) !== filters.truck_id) {
            return false;
          }
          if (filters.site_id && String(shift.siteId) !== filters.site_id) {
            return false;
          }
          if (filters.status && shift.status !== filters.status) return false;
          if (filters.accounting === "excluded") return false;

          const startedAt = Date.parse(shift.startedAt);
          if (
            filters.date_from &&
            startedAt < new Date(`${filters.date_from}T00:00:00`).getTime()
          ) {
            return false;
          }
          if (
            filters.date_to &&
            startedAt > new Date(`${filters.date_to}T23:59:59.999`).getTime()
          ) {
            return false;
          }
          return true;
        })
        .map(projectDemoShiftForRegistry)
    : [];
  const displayShifts: DisplayShift[] = [
    ...syntheticShifts,
    ...serverDisplayShifts,
  ];
  const displayTotalCount = totalCount + syntheticShifts.length;

  const resetFilters = () => {
    setFilters({
      driver_id: "",
      truck_id: "",
      site_id: "",
      date_from: "",
      date_to: "",
      status: "",
      accounting: "included",
    });
    setPage(1);
    setShifts([]);
  };

  const showCancelled = filters.accounting === "all";

  const getStatusStyle = (status: any) => {
    const normalizedStatus = (status || "").toLowerCase();

    switch (normalizedStatus) {
      case "active":
        return "bg-indigo-50 text-[#0a192f] border-indigo-100";
      case "pending_invoice":
      case "awaiting_invoice":
        return "bg-amber-50 text-amber-600 border-amber-100";
      case "finished":
      case "completed":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "cancelled":
        return "bg-rose-50 text-rose-700 border-rose-100";
      default:
        return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  const getStatusLabel = (status: any) => {
    const normalizedStatus = (status || "").toLowerCase();
    const labels: Record<string, string> = {
      active: "АКТИВНА",
      finished: "ЗАВЕРШЕНА",
      cancelled: "ОТМЕНЕНА",
      awaiting_odo_start: "ОЖИДАЕТ СТАРТ",
      awaiting_odo_end: "ОЖИДАЕТ ФИНИШ",
      awaiting_invoice: "ОЖИДАЕТ НАКЛАДНУЮ",
      pending_site: "ОЖИДАЕТ ОБЪЕКТ",
      pending_truck: "ОЖИДАЕТ МАШИНУ",
    };
    return labels[normalizedStatus] || String(status || "-").toUpperCase();
  };

  const isValidDate = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !Number.isNaN(date.getTime());
  };

  const formatShiftTime = (shift: DisplayShift) => {
    const status = (shift.status || "").toLowerCase();

    if (status === "finished" || status === "completed") {
      if (isValidDate(shift.start_time) && isValidDate(shift.end_time)) {
        const startDate = formatForDisplay(
          shift.start_time!,
          timezone,
          "DD.MM.YYYY"
        );
        const startTime = formatForDisplay(shift.start_time!, timezone, "HH:mm");
        const endDate = formatForDisplay(shift.end_time!, timezone, "DD.MM.YYYY");
        const endTime = formatForDisplay(shift.end_time!, timezone, "HH:mm");

        if (startDate === endDate) {
          return `${startDate} ${startTime} - ${endTime}`;
        }

        return `${startDate} ${startTime} - ${endDate} ${endTime}`;
      }
    }

    if (status === "active" && isValidDate(shift.start_time)) {
      const startDate = formatForDisplay(
        shift.start_time!,
        timezone,
        "DD.MM.YYYY"
      );
      const startTime = formatForDisplay(shift.start_time!, timezone, "HH:mm");
      return `${startDate} ${startTime} -`;
    }

    if (isValidDate(shift.created_at)) {
      const date = new Date(shift.created_at!);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    }

    return "-";
  };

  const formatMileage = (mileage: number | null | undefined): string => {
    if (mileage === null || mileage === undefined || mileage === 0) {
      return "-";
    }

    return mileage.toLocaleString("ru-RU");
  };

  const loadMore = () => {
    setPage((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="animate-pulse p-20 text-center text-[10px] font-semibold uppercase tracking-widest text-[#0a192f]">
        Загрузка истории...
      </div>
    );
  }

  const activeFilterCount = [
    filters.driver_id,
    filters.truck_id,
    filters.site_id,
    filters.date_from,
    filters.date_to,
    filters.status,
    filters.accounting !== "included" ? filters.accounting : "",
  ].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

  const updateFilters = (next: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
    setShifts([]);
  };

  return (
    <div className="space-y-4">
      {previewError && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{previewError}</span>
          <button
            type="button"
            onClick={() => setPreviewError(null)}
            className="shrink-0 text-red-500 transition-colors hover:text-red-700"
            aria-label="Закрыть сообщение об ошибке"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="rounded-lg border border-slate-50 bg-white p-4 shadow-sm">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-700 transition-colors hover:text-[#0a192f]"
          >
            <Filter size={16} />
            Фильтры
            {hasActiveFilters && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-[#0a192f]">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              size={16}
              className={`transition-transform ${
                showFilters ? "rotate-180" : ""
              }`}
            />
          </button>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">
                  Водитель
                </label>
                <select
                  value={filters.driver_id}
                  onChange={(event) => {
                    updateFilters({ driver_id: event.target.value });
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Все водители</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">
                  Машина
                </label>
                <select
                  value={filters.truck_id}
                  onChange={(event) => {
                    updateFilters({ truck_id: event.target.value });
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Все машины</option>
                  {trucks.map((truck) => (
                    <option key={truck.id} value={truck.id}>
                      {truck.name} ({truck.plate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">
                  Объект
                </label>
                <select
                  value={filters.site_id}
                  onChange={(event) => updateFilters({ site_id: event.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Все объекты</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">
                  Период с
                </label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(event) => updateFilters({ date_from: event.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">
                  Период по
                </label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(event) => updateFilters({ date_to: event.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">
                  Статус
                </label>
                <select
                  value={filters.status}
                  onChange={(event) => updateFilters({ status: event.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Все статусы</option>
                  <option value="active">Активна</option>
                  <option value="finished">Завершена</option>
                  <option value="cancelled">Отменена</option>
                  <option value="awaiting_odo_start">Ожидает старт</option>
                  <option value="awaiting_odo_end">Ожидает финиш</option>
                  <option value="awaiting_invoice">Ожидает накладную</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">
                  Учёт
                </label>
                <select
                  value={filters.accounting}
                  onChange={(event) =>
                    updateFilters({
                      accounting: event.target.value as "included" | "excluded" | "all",
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="included">Учитываемые</option>
                  <option value="excluded">Не учитываемые</option>
                  <option value="all">Все</option>
                </select>
              </div>

              {hasActiveFilters && (
                <div className="flex justify-end sm:col-span-2 xl:col-span-4">
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 transition-colors hover:text-red-600"
                  >
                    <X size={16} />
                    Сбросить фильтры
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-50 bg-white shadow-sm">
        <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-50 px-6 py-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold text-[#1B254B]">
              {isAdmin ? "Реестр смен" : "Мои записи"}
            </h2>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">
              {isAdmin
                ? "Все смены компании: активные, завершённые и созданные администратором."
                : displayTotalCount > 0
                  ? `Показано: ${displayShifts.length} из ${displayTotalCount}`
                  : "История и текущий статус смен водителей."}
            </p>
          </div>

          {isAdmin && (
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    updateFilters({
                      accounting: showCancelled ? "included" : "all",
                    })
                  }
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                    showCancelled
                      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {showCancelled ? "Скрыть отмененные" : "Показать отмененные"}
                </button>
                <button
                  onClick={handleExcelExport}
                  disabled={exporting || exportingZip}
                  className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={15} />
                  {exporting ? "Загрузка..." : "Выгрузить в Excel"}
                </button>
                <button
                  onClick={handleZipExport}
                  disabled={exportingZip || exporting}
                  className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={15} />
                  {exportingZip ? "Загрузка..." : "Выгрузить фото ZIP"}
                </button>
              </div>
              {isDemoMode && (
                <p className="text-xs leading-5 text-amber-700">
                  Созданная в демо смена хранится только в браузере и не входит в экспорт.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-2">ID смены</th>
                <th className="px-4 py-2">
                  {isAdmin ? "Водитель" : "Машина"}
                </th>
                <th className="hidden px-4 py-2 md:table-cell">Объект</th>
                <th className="hidden px-4 py-2 md:table-cell">Время</th>
                <th className="hidden px-4 py-2 md:table-cell">Пробег</th>
                <th className="px-4 py-2">Статус</th>
                <th className="px-4 py-2 text-right">Детали</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {displayShifts.length > 0 ? (
                displayShifts.map((shift) => (
                  <tr
                    key={shift.id}
                    className={`transition-colors hover:bg-indigo-50/10 ${
                      shift.is_excluded ? "bg-slate-50/60 text-slate-500 opacity-75" : ""
                    }`}
                  >
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs font-semibold text-slate-600">
                        #{shift.id}
                      </span>
                      {shift.is_demo_synthetic && (
                        <span className="mt-1 block text-[9px] font-semibold uppercase text-amber-700">
                          Демонстрационная смена
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <p className="text-xs font-semibold text-[#1B254B]">
                        {isAdmin ? shift.driver_name : shift.truck_name}
                      </p>
                      {isAdmin && (
                        <p className="text-[10px] font-semibold text-slate-400">
                          {shift.truck_name}
                        </p>
                      )}
                      {shift.is_excluded && (
                        <span
                          title={shift.exclusion_reason || undefined}
                          className="mt-1 inline-flex rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 text-[9px] font-bold uppercase text-rose-700"
                        >
                          НЕ УЧИТЫВАТЬ
                        </span>
                      )}
                      {shift.exclusion_reason && (
                        <p className="mt-1 max-w-[18rem] text-[10px] leading-relaxed text-rose-700">
                          Причина: {shift.exclusion_reason}
                        </p>
                      )}
                    </td>
                    <td className="hidden px-4 py-2 text-xs font-medium text-slate-600 md:table-cell">
                      {(shift as any).site?.name || shift.site_name || "-"}
                    </td>
                    <td className="hidden px-4 py-2 font-mono text-[11px] text-slate-500 md:table-cell">
                      {formatShiftTime(shift)}
                    </td>
                    <td className="hidden px-4 py-2 font-mono text-[11px] text-slate-500 md:table-cell">
                      {formatMileage((shift as any).mileage)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase ${getStatusStyle(
                          shift.status
                        )}`}
                      >
                        {getStatusLabel(shift.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {shift.is_demo_synthetic
                          ? (
                              Object.entries(
                                shift.demo_photo_metadata || {}
                              ) as Array<[DemoPhotoType, DemoPhotoMetadata]>
                            ).map(([type, metadata]) => {
                              const preview = getDemoPhotoPreview(
                                String(shift.id),
                                type
                              );
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => {
                                    if (preview) {
                                      setDemoPreview(preview);
                                    } else {
                                      setPreviewError(
                                        "Демонстрационное фото добавлено, локальный предпросмотр завершён после перезагрузки."
                                      );
                                    }
                                  }}
                                  aria-label={`Проверить демонстрационное фото: ${getDemoPhotoLabel(type)} — ${metadata.fileName}`}
                                  className="inline-flex min-h-8 items-center justify-center rounded-full bg-amber-50 px-2 text-[10px] font-semibold text-amber-700"
                                  title={`${getDemoPhotoLabel(type)}: ${metadata.fileName}`}
                                >
                                  {getDemoPhotoLabel(type)}
                                </button>
                              );
                            })
                          : (
                            <>
                              <PhotoLink
                                shiftId={shift.id}
                                type="start"
                                hasPhoto={Boolean((shift as any).photo_start_url)}
                                icon="S"
                                title="Одометр (старт)"
                                isDemoMode={isDemoMode}
                                onError={setPreviewError}
                              />
                              <PhotoLink
                                shiftId={shift.id}
                                type="end"
                                hasPhoto={Boolean((shift as any).photo_end_url)}
                                icon="F"
                                title="Одометр (финиш)"
                                isDemoMode={isDemoMode}
                                onError={setPreviewError}
                              />
                              <PhotoLink
                                shiftId={shift.id}
                                type="invoice"
                                hasPhoto={Boolean((shift as any).photo_invoice_url)}
                                icon="I"
                                title="Накладная"
                                isDemoMode={isDemoMode}
                                onError={setPreviewError}
                              />
                            </>
                          )}
                        {isAdmin && !shift.is_demo_synthetic && (
                          <button
                            onClick={() => {
                              if (
                                !shift.is_demo_synthetic &&
                                typeof shift.id === "number"
                              ) {
                                setEditingShift(shift as Shift);
                              }
                              setIsEditModalOpen(true);
                            }}
                            className="flex h-7 w-7 items-center justify-center text-xs text-slate-400 transition-colors hover:text-[#0a192f]"
                            title="Редактировать"
                          >
                            Edit
                          </button>
                        )}
                        {shift.is_demo_synthetic && (
                          <span
                            className="text-[10px] font-semibold text-slate-400"
                            title="Демонстрационная смена недоступна для редактирования"
                          >
                            Без действий
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <h3 className="text-lg font-semibold text-[#1B254B]">
                      {hasActiveFilters ? "Нет данных, соответствующих фильтрам" : "Смен пока нет"}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {hasActiveFilters
                        ? "Попробуйте изменить фильтры или сбросить их."
                        : "Когда водитель начнет смену, она появится здесь. Для проверки можно создать смену вручную на главной странице."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {hasMore && !loading && (
          <div className="flex justify-center border-t border-slate-50 p-4">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 rounded-lg bg-indigo-50 px-6 py-2 text-sm font-semibold text-[#0a192f] transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingMore ? "Загрузка..." : "Загрузить еще"}
              {displayTotalCount > 0 &&
                ` (${displayShifts.length}/${displayTotalCount})`}
            </button>
          </div>
        )}
      </div>

      {isEditModalOpen && editingShift && (
        <Suspense
          fallback={
            <div className="p-8 text-center text-sm text-slate-400">
              Загрузка...
            </div>
          }
        >
          <EditShiftModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setEditingShift(null);
            }}
            onSave={(updatedShift, options) => {
              if (updatedShift) {
                setEditingShift((current) =>
                  current ? { ...current, ...updatedShift } : current
                );
                setShifts((prev) =>
                  prev.map((item) =>
                    item.id === updatedShift.id
                      ? { ...item, ...updatedShift }
                      : item
                  )
                );
              }

              if (options?.refreshList !== false) {
                void fetchShifts({
                  pageNumber: page,
                  showLoader: false,
                  preserveVisiblePages: true,
                });
              }
            }}
            shift={editingShift}
            timezone={timezone}
            timezoneLoaded={timezoneLoaded}
          />
        </Suspense>
      )}
      <DemoPhotoPreviewDialog
        preview={demoPreview}
        onClose={() => setDemoPreview(null)}
      />
    </div>
  );
};

export default Shifts;
