import React, { useState, useEffect } from "react";
import { Calendar, Download, Truck, Users, Building2 } from "lucide-react";
import { API_ENDPOINTS } from "../constants";
import { getAnalyticsUsage } from "../services/api";
import { AnalyticsUsage } from "../types";
import { UsageCard } from "./analytics/UsageCard";

type TimeRangePreset = 7 | 30 | 90;

const Analytics: React.FC = () => {
  const [selectedDays, setSelectedDays] = useState<TimeRangePreset>(30);
  const [isLoading, setIsLoading] = useState(false);
  const [isRangeLoading, setIsRangeLoading] = useState(false);

  // Usage data state
  const [usageData, setUsageData] = useState<AnalyticsUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState<string | null>(null);

  const fetchUsage = async () => {
    setUsageLoading(true);
    setUsageError(null);
    try {
      const data = await getAnalyticsUsage();
      setUsageData(data);
    } catch (error) {
      console.error("Failed to fetch usage data:", error);
      setUsageError(error instanceof Error ? error.message : "Ошибка загрузки данных");
    } finally {
      setUsageLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [selectedDays]); // Re-fetch when time range changes

  const handleRangeChange = async (days: TimeRangePreset) => {
    if (days === selectedDays) return;
    setIsRangeLoading(true);
    setSelectedDays(days);
    // fetchUsage will be called by useEffect when selectedDays changes
    await fetchUsage();
    setIsRangeLoading(false);
  };

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("logishift_auth_token");
      if (!token) {
        throw new Error("Не авторизован");
      }

      const response = await fetch(
        `${API_ENDPOINTS.ANALYTICS_EXPORT}?days=${selectedDays}&format=csv`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Ошибка экспорта: ${response.status}`);
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `logishift-analytics-${selectedDays}d-${new Date().toISOString().split("T")[0]}.csv`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, "");
        }
      }

      // Download blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Не удалось экспортировать данные. Попробуйте позже.");
    } finally {
      setIsLoading(false);
    }
  };

  const getDateRangeDisplay = (days: TimeRangePreset): string => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const formatDate = (d: Date) => d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const timeRangePresets: TimeRangePreset[] = [7, 30, 90];

  return (
    <div className="analytics-dashboard">
      {/* Top Controls Bar - will be implemented in next task */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        {/* Time Range Selector - next task */}
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <div className="flex bg-slate-100 rounded-lg p-1">
            {timeRangePresets.map((days) => {
              const isActive = selectedDays === days;
              return (
                <button
                  key={days}
                  onClick={() => handleRangeChange(days)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {days} д
                </button>
              );
            })}
          </div>
          <span className="text-sm text-slate-500 hidden sm:inline">
            {getDateRangeDisplay(selectedDays)}
          </span>
        </div>

        {/* Export Button - next task */}
        <button
          onClick={handleExport}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] touch-manipulation"
        >
          <Download className="w-4 h-4" />
          <span>{isLoading ? "Загрузка..." : "Экспорт"}</span>
        </button>
      </div>

      {/* Content Grid - will be implemented in later task */}
      <div className="relative">
        {isRangeLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-3xl flex items-center justify-center z-10">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-sm text-slate-600">Загрузка данных...</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {usageLoading ? (
            // Loading skeleton
            <>
              <div className="bg-white rounded-3xl shadow-lg p-6 min-h-[180px] animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="h-10 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              </div>
              <div className="bg-white rounded-3xl shadow-lg p-6 min-h-[180px] animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="h-10 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              </div>
              <div className="bg-white rounded-3xl shadow-lg p-6 min-h-[180px] animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="h-10 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              </div>
            </>
          ) : usageError ? (
            // Error state
            <div className="col-span-full bg-white rounded-3xl shadow-lg p-6">
              <p className="text-red-600 text-center">{usageError}</p>
              <button
                onClick={fetchUsage}
                className="mx-auto mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Попробовать снова
              </button>
            </div>
          ) : usageData && (
            <>
              <UsageCard
                title="Грузовики"
                icon={Truck}
                usage={usageData.trucks}
              />
              <UsageCard
                title="Водители"
                icon={Users}
                usage={usageData.drivers}
              />
              <UsageCard
                title="Объекты"
                icon={Building2}
                usage={usageData.sites}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
