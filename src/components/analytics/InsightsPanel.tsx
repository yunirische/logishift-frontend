import React, { useState, useEffect } from "react";
import { AlertTriangle, TrendingDown, Info, AlertCircle, RefreshCw } from "lucide-react";
import { getAnalyticsInsights } from "../../services/api";
import { AnalyticsInsights } from "../../types";

interface InsightsPanelProps {
  days: number;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ days }) => {
  const [insights, setInsights] = useState<AnalyticsInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAnalyticsInsights(days);
      setInsights(data);
    } catch (err) {
      console.error("Failed to fetch insights:", err);
      setError(err instanceof Error ? err.message : "Ошибка загрузки рекомендаций");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [days]);

  // Loading skeleton matching component structure
  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-6 bg-slate-200 rounded w-8 animate-pulse"></div>
          <div className="h-6 bg-slate-200 rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cost per shift skeleton */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-5 animate-pulse">
            <div className="h-4 bg-indigo-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-indigo-200 rounded w-2/3"></div>
          </div>
          {/* Underutilized resources skeleton */}
          <div className="bg-amber-50 rounded-2xl p-5 animate-pulse">
            <div className="h-4 bg-amber-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-amber-200 rounded w-3/4"></div>
          </div>
          {/* Near limit warnings skeleton */}
          <div className="bg-orange-50 rounded-2xl p-5 animate-pulse">
            <div className="h-4 bg-orange-200 rounded w-1/2 mb-2"></div>
            <div className="h-2 bg-orange-200 rounded w-full mb-1"></div>
            <div className="h-2 bg-orange-200 rounded w-1/2"></div>
          </div>
          {/* Recommendations skeleton */}
          <div className="bg-blue-50 rounded-2xl p-5 animate-pulse">
            <div className="h-4 bg-blue-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-blue-200 rounded w-full mb-1"></div>
            <div className="h-3 bg-blue-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state with retry button
  if (error) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
          <p className="text-red-600 text-center mb-4">{error}</p>
          <button
            onClick={fetchInsights}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // Empty state when no insights available
  if (!insights) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <Info className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-slate-500 text-center">Недостаточно данных для анализа</p>
          <p className="text-sm text-slate-400 text-center mt-1">Попробуйте увеличить период анализа</p>
        </div>
      </div>
    );
  }

  const {
    underutilizedResources,
    nearLimitResources,
    costPerShift,
    recommendedActions,
  } = insights;

  // Check if there are any insights to display
  const hasUnderutilized =
    underutilizedResources.trucks.length > 0 ||
    underutilizedResources.sites.length > 0;
  const hasNearLimit =
    nearLimitResources.trucks !== null ||
    nearLimitResources.drivers !== null ||
    nearLimitResources.sites !== null;
  const hasRecommendations = recommendedActions.length > 0;

  const hasAnyInsights = hasUnderutilized || hasNearLimit || hasRecommendations;

  // Empty state when no actionable insights
  if (!hasAnyInsights) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <Info className="w-12 h-12 text-emerald-500 mb-3" />
          <p className="text-slate-700 text-center font-medium">Все работает отлично!</p>
          <p className="text-sm text-slate-500 text-center mt-1">
            Ресурсы используются эффективно, предупреждений нет
          </p>
        </div>
      </div>
    );
  }

  // Format currency for cost per shift (Russian locale)
  const formatCost = (cost: number): string => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cost);
  };

  // Near limit resource component
  const NearLimitItem = ({
    label,
    resource,
  }: {
    label: string;
    resource: { current: number; limit: number; percent: number };
  }) => (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-orange-800">{label}</span>
        <span className="text-sm font-bold text-orange-900">
          {resource.current} / {resource.limit} ({resource.percent}%)
        </span>
      </div>
      <div className="h-2 bg-orange-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(resource.percent, 100)}%` }}
          role="progressbar"
          aria-valuenow={resource.percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 rounded-xl">
          <Info className="w-5 h-5 text-indigo-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Рекомендации и инсайты</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cost per shift card - always visible */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-700">
              Стоимость смены
            </span>
          </div>
          <p className="text-2xl font-bold text-indigo-900">
            {formatCost(costPerShift)}
          </p>
          <p className="text-xs text-indigo-600 mt-1">
            Среднее значение за выбранный период
          </p>
        </div>

        {/* Underutilized resources - amber alert styling */}
        {hasUnderutilized && (
          <div className="bg-amber-50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">
                Недоиспользуемые ресурсы
              </span>
            </div>
            <div className="space-y-2">
              {underutilizedResources.trucks.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-800 mb-1">
                    Грузовики:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {underutilizedResources.trucks.map((truck, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-amber-200 text-amber-800 rounded-md text-xs font-medium"
                      >
                        {truck}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {underutilizedResources.sites.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-800 mb-1">
                    Объекты:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {underutilizedResources.sites.map((site, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-amber-200 text-amber-800 rounded-md text-xs font-medium"
                      >
                        {site}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Near limit warnings - orange styling */}
        {hasNearLimit && (
          <div className="bg-orange-50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">
                Близко к лимиту
              </span>
            </div>
            <div>
              {nearLimitResources.trucks && (
                <NearLimitItem label="Грузовики" resource={nearLimitResources.trucks} />
              )}
              {nearLimitResources.drivers && (
                <NearLimitItem label="Водители" resource={nearLimitResources.drivers} />
              )}
              {nearLimitResources.sites && (
                <NearLimitItem label="Объекты" resource={nearLimitResources.sites} />
              )}
            </div>
          </div>
        )}

        {/* Recommended actions - blue info styling */}
        {hasRecommendations && (
          <div className="bg-blue-50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                Рекомендации
              </span>
            </div>
            <ul className="space-y-2">
              {recommendedActions.map((action, idx) => (
                <li
                  key={idx}
                  className="text-sm text-blue-900 flex items-start gap-2"
                >
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
