import React, { useEffect, useState, useCallback, Suspense } from "react";
import { API_ENDPOINTS } from "../constants";
import api, { getPhotoUrl } from "../services/api";
import { Shift, UserRole } from "../types";
import { formatForDisplay } from "../utils/dateUtils";
import { Filter, X, ChevronDown, Download } from "lucide-react";

// Dynamic import for code splitting
const EditShiftModal = React.lazy(() => import("./EditShiftModal"));

// Memoized component to prevent unnecessary re-renders
const PhotoLink = React.memo(({ url, icon, title }: { url?: string; icon: string; title: string }) => {
  const photoUrl = getPhotoUrl(url);
  if (!photoUrl) return null;
  return (
    <a
      href={photoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-[#0a192f] transition-colors"
      title={title}
    >
      {icon}
    </a>
  );
});

PhotoLink.displayName = "PhotoLink";

const Shifts: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [timezone, setTimezone] = useState("Europe/Moscow");
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Фильтры
  const [filters, setFilters] = useState({
    driver_id: "",
    truck_id: "",
    date: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  // Пагинация
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Данные для фильтров
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

  const user = api.getUserInfo();
  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FOREMAN;

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
      const a = document.createElement("a");
      a.href = url;
      const cd = response.headers.get("Content-Disposition");
      const match = cd?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      a.download = match?.[1]?.replace(/['"]/g, "") || "logishift-shifts-report.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      alert(e.message || "Не удалось скачать отчёт");
    } finally {
      setExporting(false);
    }
  };

  // Загрузка данных для фильтров
  useEffect(() => {
    const fetchFilterData = async () => {
      if (isAdmin) {
        try {
          const [driversRes, trucksRes] = await Promise.all([
            api.get(API_ENDPOINTS.DRIVERS),
            api.get(API_ENDPOINTS.TRUCKS),
          ]);
          setDrivers(Array.isArray(driversRes) ? driversRes : []);
          setTrucks(Array.isArray(trucksRes) ? trucksRes : []);
        } catch (err) {
          console.error("Failed to load filter data:", err);
        }
      }
    };
    fetchFilterData();
  }, [isAdmin]);

  // Построение Query String параметров
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", "20");

    if (filters.driver_id) params.append("driver_id", filters.driver_id);
    if (filters.truck_id) params.append("truck_id", filters.truck_id);
    if (filters.date) params.append("date", filters.date);

    return params.toString();
  }, [page, filters]);

  const fetchShifts = useCallback(async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const queryString = buildQueryString();
      const url = `${API_ENDPOINTS.SHIFTS}?${queryString}`;
      const response = await api.get(url);

      // API может вернуть данные в разных форматах
      let newData = [];
      let totalCountValue = 0;

      if (response && typeof response === 'object') {
        if (response.data && Array.isArray(response.data)) {
          newData = response.data;
          totalCountValue = response.total || response.count || newData.length;
        } else if (Array.isArray(response)) {
          newData = response;
          totalCountValue = newData.length;
        }
      } else if (Array.isArray(response)) {
        newData = response;
        totalCountValue = newData.length;
      }

      if (loadMore) {
        setShifts((prev) => {
          const updated = [...prev, ...newData];
          setHasMore(newData.length === 20 && updated.length < totalCountValue);
          return updated;
        });
      } else {
        setShifts(newData);
        setHasMore(newData.length === 20 && newData.length < totalCountValue);
      }

      setTotalCount(totalCountValue);
    } catch (err) {
      console.error("Shifts fetch error:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildQueryString]); // Removed shifts.length dependency

  useEffect(() => {
    fetchShifts();
  }, [filters, page]);

  useEffect(() => {
    const fetchTimezone = async () => {
      try {
        const data = await api.get(API_ENDPOINTS.TENANT_SETTINGS);
        setTimezone(data.timezone || "Europe/Moscow");
      } catch (err) {
        console.error("Failed to fetch timezone:", err);
      }
    };
    fetchTimezone();
  }, []);

  const displayShifts = isAdmin
    ? shifts
    : shifts.filter((s) => s.driver_name === user?.full_name);

  // Сброс фильтров
  const resetFilters = () => {
    setFilters({ driver_id: "", truck_id: "", date: "" });
    setPage(1);
    setShifts([]);
  };

  // Изменили тип на any и добавили .toLowerCase() для надежности
  const getStatusStyle = (status: any) => {
    const s = (status || "").toLowerCase();

    switch (s) {
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

  // Проверка валидности даты
  const isValidDate = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  };

  // Format time display based on shift status
  const formatShiftTime = (s: Shift) => {
    const status = (s.status || "").toLowerCase();

    // For finished shifts, show start and end time range with date
    if (status === "finished" || status === "completed") {
      if (isValidDate(s.start_time) && isValidDate(s.end_time)) {
        const startDate = formatForDisplay(s.start_time!, timezone, "DD.MM.YYYY");
        const startTime = formatForDisplay(s.start_time!, timezone, "HH:mm");
        const endDate = formatForDisplay(s.end_time!, timezone, "DD.MM.YYYY");
        const endTime = formatForDisplay(s.end_time!, timezone, "HH:mm");

        // Check if start and end are on the same day
        if (startDate === endDate) {
          // Same day: show date once on the left
          return `${startDate} ${startTime} - ${endTime}`;
        } else {
          // Different days: show both dates
          return `${startDate} ${startTime} - ${endDate} ${endTime}`;
        }
      }
    }

    // For active shifts, show start time with date
    if (status === "active" && isValidDate(s.start_time)) {
      const startDate = formatForDisplay(s.start_time!, timezone, "DD.MM.YYYY");
      const startTime = formatForDisplay(s.start_time!, timezone, "HH:mm");
      return `${startDate} ${startTime} —`;
    }

    // For other shifts, show created_at time with date
    if (isValidDate(s.created_at)) {
      const date = new Date(s.created_at!);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    }

    return "—";
  };

  // Форматирование пробега
  const formatMileage = (mileage: number | null | undefined): string => {
    if (mileage === null || mileage === undefined || mileage === 0) {
      return "—";
    }
    return mileage.toLocaleString('ru-RU');
  };

  const loadMore = () => {
    setPage((prev) => prev + 1);
  };

  if (loading)
    return (
      <div className="p-20 text-center animate-pulse font-semibold text-[#0a192f] uppercase tracking-widest text-[10px]">
        Загрузка истории...
      </div>
    );

  const hasActiveFilters = filters.driver_id || filters.truck_id || filters.date;

  return (
    <div className="space-y-4">
      {/* Панель фильтров */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-50 p-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-[#0a192f] transition-colors"
          >
            <Filter size={16} />
            Фильтры
            {hasActiveFilters && (
              <span className="px-2 py-0.5 bg-indigo-100 text-[#0a192f] text-xs rounded-full">
                {[filters.driver_id, filters.truck_id, filters.date].filter(Boolean).length}
              </span>
            )}
            <ChevronDown
              size={16}
              className={`transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </button>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Фильтр по водителю */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                  Водитель
                </label>
                <select
                  value={filters.driver_id}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, driver_id: e.target.value }));
                    setPage(1);
                    setShifts([]);
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm bg-white"
                >
                  <option value="">Все водители</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Фильтр по машине */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                  Машина
                </label>
                <select
                  value={filters.truck_id}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, truck_id: e.target.value }));
                    setPage(1);
                    setShifts([]);
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm bg-white"
                >
                  <option value="">Все машины</option>
                  {trucks.map((truck) => (
                    <option key={truck.id} value={truck.id}>
                      {truck.name} ({truck.plate})
                    </option>
                  ))}
                </select>
              </div>

              {/* Фильтр по дате */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                  Дата
                </label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, date: e.target.value }));
                    setPage(1);
                    setShifts([]);
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                />
              </div>

              {/* Кнопка сброса */}
              {hasActiveFilters && (
                <div className="md:col-span-3 flex justify-end">
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-red-600 transition-colors"
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

      {/* Таблица смен */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#1B254B]">
              {isAdmin ? "Реестр всех смен" : "Мои записи"}
            </h2>
            <p className="text-slate-400 text-[10px] font-medium mt-0.5">
              {totalCount > 0 ? `Показано: ${displayShifts.length} из ${totalCount}` : `Отображено: ${displayShifts.length}`}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={handleExcelExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={15} />
              {exporting ? "Загрузка..." : "Выгрузить в Excel"}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-2">ID смены</th>
                <th className="px-4 py-2">{isAdmin ? "Водитель" : "Машина"}</th>
                <th className="px-4 py-2 hidden md:table-cell">Объект</th>
                <th className="px-4 py-2 hidden md:table-cell">Время</th>
                <th className="px-4 py-2 hidden md:table-cell">Пробег</th>
                <th className="px-4 py-2">Статус</th>
                <th className="px-4 py-2 text-right">Детали</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {displayShifts.length > 0 ? (
                displayShifts.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-indigo-50/10 transition-colors"
                  >
                    <td className="px-4 py-2">
                      <span className="text-xs font-semibold text-slate-600 font-mono">
                        #{s.id}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <p className="font-semibold text-[#1B254B] text-xs">
                        {isAdmin ? s.driver_name : s.truck_name}
                      </p>
                      {isAdmin && (
                        <p className="text-[10px] font-semibold text-slate-400">
                          {s.truck_name}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2 font-medium text-slate-600 hidden md:table-cell text-xs">
                      {(s as any).site?.name || s.site_name || "—"}
                    </td>
                    <td className="px-4 py-2 text-[11px] font-mono text-slate-500 hidden md:table-cell">
                      {formatShiftTime(s)}
                    </td>
                    <td className="px-4 py-2 text-[11px] font-mono text-slate-500 hidden md:table-cell">
                      {formatMileage((s as any).mileage)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase border ${getStatusStyle(
                          s.status
                        )}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <PhotoLink url={(s as any).photo_start_url} icon="🏁" title="Одометр (старт)" />
                        <PhotoLink url={(s as any).photo_end_url} icon="🏁" title="Одометр (финиш)" />
                        <PhotoLink url={(s as any).photo_invoice_url} icon="📄" title="Накладная" />
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setEditingShift(s);
                              setIsEditModalOpen(true);
                            }}
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-[#0a192f] transition-colors text-xs"
                            title="Редактировать"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-slate-300 italic"
                  >
                    {hasActiveFilters ? "Нет данных, соответствующих фильтрам" : "Данных нет"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Кнопка "Загрузить еще" */}
        {hasMore && !loading && (
          <div className="p-4 border-t border-slate-50 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-6 py-2 bg-indigo-50 text-[#0a192f] font-semibold text-sm rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loadingMore ? "Загрузка..." : "Загрузить еще"}
              {totalCount > 0 && ` (${displayShifts.length}/${totalCount})`}
            </button>
          </div>
        )}
      </div>

      {isEditModalOpen && editingShift && (
        <Suspense fallback={<div className="p-8 text-center text-slate-400 text-sm">Загрузка...</div>}>
          <EditShiftModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setEditingShift(null);
            }}
            onSave={() => {
              fetchShifts();
            }}
            shift={editingShift}
            timezone={timezone}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Shifts;
