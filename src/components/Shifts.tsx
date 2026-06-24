import React, { Suspense, useCallback, useEffect, useState } from "react";
import { Filter, X, ChevronDown, Download } from "lucide-react";
import { isDemoTenantId } from "../config/demo";
import { API_ENDPOINTS } from "../constants";
import api, { openShiftFilePreview, ShiftFileType } from "../services/api";
import { Shift, UserRole } from "../types";
import { formatForDisplay } from "../utils/dateUtils";

const PAGE_SIZE = 20;

const EditShiftModal = React.lazy(() => import("./EditShiftModal"));

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

const Shifts: React.FC = () => {
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
    date: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const user = api.getUserInfo();
  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FOREMAN;
  const isDemoMode = isDemoTenantId(user?.tenant_id);

  const handleExcelExport = async () => {
    setExporting(true);
    try {
      const token = api.getAuthToken();
      const response = await fetch(API_ENDPOINTS.REPORTS_EXCEL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        alert((err as any).error || `Ошибка экспорта (${response.status})`);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const contentDisposition = response.headers.get("Content-Disposition");
      const match = contentDisposition?.match(
        /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
      );
      link.download =
        match?.[1]?.replace(/['"]/g, "") || "logishift-shifts-report.xlsx";

      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error: any) {
      alert(error.message || "Не удалось скачать отчет");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const fetchFilterData = async () => {
      if (!isAdmin) return;

      try {
        const [driversRes, trucksRes] = await Promise.all([
          api.get(API_ENDPOINTS.DRIVERS),
          api.get(API_ENDPOINTS.TRUCKS),
        ]);

        setDrivers(Array.isArray(driversRes) ? driversRes : []);
        setTrucks(Array.isArray(trucksRes) ? trucksRes : []);
      } catch (error) {
        console.error("Failed to load filter data:", error);
      }
    };

    void fetchFilterData();
  }, [isAdmin]);

  const buildQueryString = useCallback(
    (pageNumber: number) => {
      const params = new URLSearchParams();
      params.append("page", pageNumber.toString());
      params.append("limit", PAGE_SIZE.toString());

      if (filters.driver_id) params.append("driver_id", filters.driver_id);
      if (filters.truck_id) params.append("truck_id", filters.truck_id);
      if (filters.date) params.append("date", filters.date);

      return params.toString();
    },
    [filters]
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

  const displayShifts = isAdmin
    ? shifts
    : shifts.filter((shift) => shift.driver_name === user?.full_name);

  const resetFilters = () => {
    setFilters({ driver_id: "", truck_id: "", date: "" });
    setPage(1);
    setShifts([]);
  };

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
      default:
        return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  const isValidDate = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !Number.isNaN(date.getTime());
  };

  const formatShiftTime = (shift: Shift) => {
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

  const hasActiveFilters =
    filters.driver_id || filters.truck_id || filters.date;

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
                {
                  [filters.driver_id, filters.truck_id, filters.date].filter(
                    Boolean
                  ).length
                }
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
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">
                  Водитель
                </label>
                <select
                  value={filters.driver_id}
                  onChange={(event) => {
                    setFilters((prev) => ({
                      ...prev,
                      driver_id: event.target.value,
                    }));
                    setPage(1);
                    setShifts([]);
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
                    setFilters((prev) => ({
                      ...prev,
                      truck_id: event.target.value,
                    }));
                    setPage(1);
                    setShifts([]);
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
                  Дата
                </label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(event) => {
                    setFilters((prev) => ({
                      ...prev,
                      date: event.target.value,
                    }));
                    setPage(1);
                    setShifts([]);
                  }}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {hasActiveFilters && (
                <div className="flex justify-end md:col-span-3">
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
              {totalCount > 0
                ? `Показано: ${displayShifts.length} из ${totalCount}`
                : "История и текущий статус смен водителей."}
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={handleExcelExport}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={15} />
              {exporting ? "Загрузка..." : "Выгрузить в Excel"}
            </button>
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
                    className="transition-colors hover:bg-indigo-50/10"
                  >
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs font-semibold text-slate-600">
                        #{shift.id}
                      </span>
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
                        {shift.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
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
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setEditingShift(shift);
                              setIsEditModalOpen(true);
                            }}
                            className="flex h-7 w-7 items-center justify-center text-xs text-slate-400 transition-colors hover:text-[#0a192f]"
                            title="Редактировать"
                          >
                            Edit
                          </button>
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
              {totalCount > 0 && ` (${displayShifts.length}/${totalCount})`}
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
    </div>
  );
};

export default Shifts;
