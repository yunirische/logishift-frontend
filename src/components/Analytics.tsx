import React, { useState, useEffect } from "react";
import { Calendar, Download, Truck, Users, Building2, AlertCircle, RefreshCw } from "lucide-react";
import { API_ENDPOINTS } from "../constants";
import { getAnalyticsUsage, getAnalyticsTrends, getAnalyticsDrivers, getAnalyticsInsights, ApiErrorType } from "../services/api";
import { AnalyticsUsage, AnalyticsTrend, AnalyticsDriver, AnalyticsInsights } from "../types";
import { UsageCard } from "./analytics/UsageCard";
import { TrendsChart } from "./analytics/TrendsChart";
import { DriverRankings } from "./analytics/DriverRankings";
import { InsightsPanel } from "./analytics/InsightsPanel";
import { ErrorBoundary } from "./analytics/ErrorBoundary";

type TimeRangePreset = 7 | 30 | 90;

const Analytics: React.FC = () => {
  const [selectedDays, setSelectedDays] = useState<TimeRangePreset>(30);
  const [isLoading, setIsLoading] = useState(false);
  const [isRangeLoading, setIsRangeLoading] = useState(false);

  // Subscription and global error state
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isRetryingAll, setIsRetryingAll] = useState(false);

  // Usage data state
  const [usageData, setUsageData] = useState<AnalyticsUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState<string | null>(null);

  // Trends data state
  const [trendsData, setTrendsData] = useState<AnalyticsTrend[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [trendsError, setTrendsError] = useState<string | null>(null);

  // Driver rankings data state
  const [driversData, setDriversData] = useState<AnalyticsDriver[]>([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [driversError, setDriversError] = useState<string | null>(null);

  // Insights data state
  const [insightsData, setInsightsData] = useState<AnalyticsInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Centralized error handler
  const handleApiError = (error: unknown) => {
    if (error && typeof error === 'object' && 'type' in error) {
      if ((error as any).type === ApiErrorType.SUBSCRIPTION_EXPIRED) {
        setSubscriptionExpired(true);
        return;
      }
    }
    // For other errors, set global error
    setGlobalError(error instanceof Error ? error.message : 'Ошибка загрузки');
  };

  const fetchUsage = async () => {
    setUsageLoading(true);
    setUsageError(null);
    try {
      const data = await getAnalyticsUsage();
      // Ensure data is not undefined before setting
      setUsageData(data ?? null);
    } catch (error) {
      console.error("Failed to fetch usage data:", error);
      handleApiError(error);
      setUsageError(error instanceof Error ? error.message : "Ошибка загрузки данных");
      setUsageData(null); // Explicitly set to null on error
    } finally {
      setUsageLoading(false);
    }
  };

  const fetchTrends = async () => {
    setTrendsLoading(true);
    setTrendsError(null);
    try {
      const data = await getAnalyticsTrends(selectedDays);
      // Ensure data is always an array
      setTrendsData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch trends data:", error);
      handleApiError(error);
      setTrendsError(error instanceof Error ? error.message : "Ошибка загрузки данных");
      setTrendsData([]); // Explicitly set to empty array on error
    } finally {
      setTrendsLoading(false);
    }
  };

  const fetchDrivers = async () => {
    setDriversLoading(true);
    setDriversError(null);
    try {
      const data = await getAnalyticsDrivers(selectedDays, 10);
      setDriversData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch drivers data:", error);
      handleApiError(error);
      setDriversError(error instanceof Error ? error.message : "Ошибка загрузки данных");
    } finally {
      setDriversLoading(false);
    }
  };

  const fetchInsights = async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const data = await getAnalyticsInsights(selectedDays);
      // Ensure data is not undefined before setting
      setInsightsData(data ?? null);
    } catch (error) {
      console.error("Failed to fetch insights data:", error);
      handleApiError(error);
      setInsightsError(error instanceof Error ? error.message : "Ошибка загрузки данных");
      setInsightsData(null); // Explicitly set to null on error
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleRetryAll = async () => {
    setIsRetryingAll(true);
    setGlobalError(null);
    try {
      await Promise.all([
        fetchUsage(),
        fetchTrends(),
        fetchDrivers(),
        fetchInsights()
      ]);
    } finally {
      setIsRetryingAll(false);
    }
  };

  useEffect(() => {
    fetchUsage();
    fetchTrends();
    fetchDrivers();
    fetchInsights();
  }, [selectedDays]); // Re-fetch all when time range changes

  const handleRangeChange = async (days: TimeRangePreset) => {
    if (days === selectedDays) return;
    setIsRangeLoading(true);
    setSelectedDays(days);
    // All fetch functions will be called by useEffect
    await Promise.all([fetchUsage(), fetchTrends(), fetchDrivers(), fetchInsights()]);
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

  // Early return for subscription expired
  if (subscriptionExpired) {
    return (
      <div className="analytics-dashboard">
        {/* Subscription-expired banner */}
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-amber-800 font-medium">Подписка истекла</p>
              <p className="text-amber-700 text-sm mt-1">
                Данные аналитики недоступны. Продлите подписку для доступа к статистике.
              </p>
            </div>
          </div>
        </div>

        {/* Top Controls Bar (disabled) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 opacity-50 pointer-events-none">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-[#0a192f]" />
            <div className="flex bg-slate-100 rounded-lg p-1">
              {timeRangePresets.map((days) => {
                const isActive = selectedDays === days;
                return (
                  <button
                    key={days}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      isActive
                        ? "bg-white text-[#0a192f] shadow-sm"
                        : "text-slate-600"
                    }`}
                  >
                    {days} д
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        {/* Time Range Selector */}
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-[#0a192f]" />
          <div className="flex bg-slate-100 rounded-lg p-1">
            {timeRangePresets.map((days) => {
              const isActive = selectedDays === days;
              return (
                <button
                  key={days}
                  onClick={() => handleRangeChange(days)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white text-[#0a192f] shadow-sm"
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Global Refresh Button */}
          <button
            onClick={handleRetryAll}
            disabled={isRetryingAll}
            className="flex items-center gap-2 px-4 py-2 bg-[#0a192f] text-white rounded-lg hover:bg-[#152238] disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] touch-manipulation"
          >
            <RefreshCw className={`w-4 h-4 ${isRetryingAll ? 'animate-spin' : ''}`} />
            <span>{isRetryingAll ? "Обновление..." : "Обновить"}</span>
          </button>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e293b] text-white rounded-lg hover:bg-[#334155] disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] touch-manipulation"
          >
            <Download className="w-4 h-4" />
            <span>{isLoading ? "Загрузка..." : "Экспорт"}</span>
          </button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="relative">
        {isRangeLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-3xl flex items-center justify-center z-10">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-3 border-[#0a192f] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-sm text-slate-600">Загрузка данных...</p>
            </div>
          </div>
        )}
        <ErrorBoundary onReset={handleRetryAll}>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Row 1: Usage cards (3 columns) */}
          {usageLoading ? (
            // Loading skeletons for usage cards
            <>
              <div className="bg-white rounded-lg shadow-sm p-4 min-h-[160px] animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="h-10 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 min-h-[160px] animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="h-10 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 min-h-[160px] animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="h-10 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              </div>
            </>
          ) : usageError ? (
            <div className="col-span-full lg:col-span-3 bg-white rounded-lg shadow-sm p-4">
              <p className="text-red-600 text-center">{usageError}</p>
              <button
                onClick={fetchUsage}
                className="mx-auto mt-4 flex items-center gap-2 px-4 py-2 bg-[#0a192f] text-white rounded-lg hover:bg-[#152238]"
              >
                Попробовать снова
              </button>
            </div>
          ) : !usageData ? (
            // Fallback: show skeleton if data is missing (null/undefined)
            <>
              <div className="bg-white rounded-lg shadow-sm p-4 min-h-[160px] animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="h-10 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 min-h-[160px] animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="h-10 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 min-h-[160px] animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="h-10 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              </div>
            </>
          ) : (
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

          {/* Row 2: Trends chart (full width) */}
          <div className="lg:col-span-2 xl:col-span-3">
            <TrendsChart
              data={trendsData}
              days={selectedDays}
              isLoading={trendsLoading}
              error={trendsError}
              onRetry={fetchTrends}
            />
          </div>

          {/* Row 3: Driver rankings (full width) */}
          <div className="lg:col-span-2 xl:col-span-3">
            <DriverRankings days={selectedDays} />
          </div>

          {/* Row 4: Insights panel (full width) */}
          <div className="lg:col-span-2 xl:col-span-3">
            <InsightsPanel days={selectedDays} />
          </div>
        </div>
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default Analytics;
