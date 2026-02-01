import React, { useState, useEffect, useMemo } from "react";
import { Trophy, ChevronUp, ChevronDown, AlertCircle, RefreshCw } from "lucide-react";
import { AnalyticsDriver, DriverSortField, SortDirection } from "../../types";
import { getAnalyticsDrivers } from "../../services/api";

interface DriverRankingsProps {
  days: number;
}

// Medal component for top 3
const Medal = ({ rank }: { rank: number }) => {
  const medals: Record<number, { emoji: string; color: string }> = {
    1: { emoji: "🥇", color: "text-yellow-500" },
    2: { emoji: "🥈", color: "text-gray-400" },
    3: { emoji: "🥉", color: "text-amber-600" },
  };
  const medal = medals[rank];
  if (!medal) return null;
  return (
    <span className={`text-lg ${medal.color}`} aria-label={`Rank ${rank}`}>
      {medal.emoji}
    </span>
  );
};

type SortableColumn = {
  key: DriverSortField;
  label: string;
  align: 'left' | 'right';
};

const SORTABLE_COLUMNS: SortableColumn[] = [
  { key: 'shifts_count', label: 'Смены', align: 'right' },
  { key: 'hours_worked', label: 'Часы', align: 'right' },
  { key: 'salary_paid', label: 'Зарплата', align: 'right' },
];

const formatSalary = (value: number): string => {
  return value.toLocaleString('ru-RU') + ' ₽';
};

const formatHours = (value: number | null | undefined): string => {
  if (value == null || isNaN(value)) return "0.0";
  return value.toFixed(1);
};

export const DriverRankings: React.FC<DriverRankingsProps> = ({ days }) => {
  const [drivers, setDrivers] = useState<AnalyticsDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<DriverSortField>('hours_worked');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const fetchDrivers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAnalyticsDrivers(days, 10);
      setDrivers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch driver rankings:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [days]);

  // Sort drivers client-side
  const sortedDrivers = useMemo(() => {
    return [...drivers].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [drivers, sortField, sortDirection]);

  // Calculate ranks with tie handling
  const rankedDrivers = useMemo(() => {
    if (sortedDrivers.length === 0) return [];

    const result: Array<{ driver: AnalyticsDriver; rank: number }> = [];
    let currentRank = 1;

    for (let i = 0; i < sortedDrivers.length; i++) {
      const driver = sortedDrivers[i];
      // Check for tie: same hours_worked as previous
      if (i > 0 && driver.hours_worked === sortedDrivers[i - 1].hours_worked) {
        // Same rank as previous
        result.push({ driver, rank: result[i - 1].rank });
      } else {
        result.push({ driver, rank: currentRank });
      }
      currentRank++;
    }

    // Handle ties at cutoff - include all ties at rank 10
    const cutoffIndex = result.findIndex((r) => r.rank > 10);
    if (cutoffIndex > 0) {
      return result.slice(0, cutoffIndex);
    }

    return result;
  }, [sortedDrivers]);

  // Count ties for explanatory text
  const tiesAtCutoff = useMemo(() => {
    const rank10Count = rankedDrivers.filter((r) => r.rank === 10).length;
    return rank10Count > 1 ? rank10Count : 0;
  }, [rankedDrivers]);

  const handleSort = (field: DriverSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to descending for new column
    }
  };

  // Empty state with time range shortcuts
  if (!loading && rankedDrivers.length === 0 && !error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Нет данных за период
          </h3>
          <p className="text-sm text-slate-500 mb-6 max-w-xs">
            Нет завершенных смен за последние {days} дней. Выберите более длительный период.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                // Parent component handles time range changes
                const event = new CustomEvent('timeRangeChange', { detail: { days: 30 } });
                window.dispatchEvent(event);
              }}
              className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              30 дней
            </button>
            <button
              onClick={() => {
                const event = new CustomEvent('timeRangeChange', { detail: { days: 90 } });
                window.dispatchEvent(event);
              }}
              className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              90 дней
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state with retry
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Не удалось загрузить рейтинг
          </h3>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <button
            onClick={fetchDrivers}
            className="flex items-center gap-2 px-4 py-2 bg-[#0a192f] text-white rounded-lg hover:bg-[#152238] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-[#0a192f]/10 rounded-lg">
          <Trophy className="w-5 h-5 text-[#0a192f]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Рейтинг водителей</h3>
          {tiesAtCutoff > 1 && (
            <p className="text-xs text-slate-500">
              Показано {rankedDrivers.length} водителей ({tiesAtCutoff} на 10-м месте)
            </p>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        /* Table */
        <div className="overflow-x-auto -mx-6 px-6">
          {/* Mobile scrollable container */}
          <div className="min-w-[500px]">
            {/* Sticky header table */}
            <table className="w-full">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-slate-100">
                  <th className="py-3 px-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">
                    <span className="mono-id">#</span>
                  </th>
                  <th className="py-3 px-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Водитель
                  </th>
                  {SORTABLE_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className={`py-3 px-2 text-${col.align} text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors select-none ${
                        sortField === col.key ? 'text-[#0a192f] bg-[#0a192f]/5' : 'text-slate-500'
                      }`}
                      onClick={() => handleSort(col.key)}
                    >
                      <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                        {col.label}
                        {sortField === col.key && (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rankedDrivers.map(({ driver, rank }) => (
                  <tr
                    key={driver.driver_id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3 px-2 text-sm">
                      <div className="flex items-center gap-1">
                        {rank <= 3 ? (
                          <Medal rank={rank} />
                        ) : (
                          <span className="mono-id mono-number text-slate-400 font-medium text-xs">#{rank}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="text-sm font-medium text-slate-900">
                        {driver.driver_name}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-600 text-right font-mono">
                      {driver.shifts_count}
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-600 text-right font-mono">
                      {formatHours(driver.hours_worked)}
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-600 text-right font-mono">
                      {formatSalary(driver.salary_paid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
