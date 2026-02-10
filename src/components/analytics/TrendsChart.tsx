import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { AnalyticsTrend, TrendMetric } from "../../types";
import { TrendingUp, AlertCircle, RefreshCw } from "lucide-react";

interface TrendsChartProps {
  data: AnalyticsTrend[];
  days: number;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

// Metric configuration with labels and units
const METRIC_CONFIG = {
  shifts: {
    label: "Смены",
    key: "shifts_count" as const,
    color: "fill-[#0a192f]",
    unit: "",
    formatValue: (v: number) => v.toString(),
  },
  hours: {
    label: "Часы",
    key: "hours_worked" as const,
    color: "fill-[#152238]",
    unit: " ч",
    formatValue: (v: number) => v.toString(),
  },
  salary: {
    label: "Зарплата",
    key: "salary_paid" as const,
    color: "fill-[#1e293b]",
    unit: " ₽",
    formatValue: (v: number | null | undefined) => (v == null || isNaN(v) ? "0" : v.toLocaleString("ru-RU")),
  },
} as const;

// Format date for x-axis (short: "Jan 15" or "15 янв")
const formatXAxisDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

// Format date for tooltip (long: "January 15, 2026")
const formatTooltipDate = (dateStr: string): string => {
  if (!dateStr) return "Неизвестная дата";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Некорректная дата";
  return date.toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Format y-axis value with K suffix
const formatYAxisValue = (value: number | null | undefined): string => {
  if (value == null || isNaN(value)) return "0";
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

// Custom tooltip with styled card
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  const metric = data.name as keyof typeof METRIC_CONFIG;
  const config = METRIC_CONFIG[metric];

  // Smart precision: no decimals for counts/hours, 2 decimals for salary
  let displayValue: string;
  if (metric === "salary") {
    displayValue = config.formatValue(data.value);
  } else {
    displayValue = Math.round(data.value).toString();
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-100 px-4 py-3">
      <p className="text-sm text-slate-500 mb-1">{formatTooltipDate(label || "")}</p>
      <p className="text-lg font-semibold text-slate-800 font-mono">
        {displayValue}{config.unit}
      </p>
    </div>
  );
};

export const TrendsChart: React.FC<TrendsChartProps> = ({ data, days, isLoading = false, error, onRetry }) => {
  const [selectedMetric, setSelectedMetric] = useState<TrendMetric>("shifts");

  // Transform data for selected metric
  const chartData = useMemo(() => {
    const config = METRIC_CONFIG[selectedMetric];
    return data.map((item) => ({
      date: item.date,
      [selectedMetric]: item[config.key],
    }));
  }, [data, selectedMetric]);

  const config = METRIC_CONFIG[selectedMetric];

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#0a192f]/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-[#0a192f]" />
          </div>
          <div className="h-6 bg-slate-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="h-64 bg-slate-100 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#0a192f]/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-[#0a192f]" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Динамика</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
          <p className="text-red-600 text-center mb-4">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 bg-[#0a192f] text-white rounded-lg hover:bg-[#152238] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Попробовать снова
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#0a192f]/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-[#0a192f]" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Динамика</h3>
        </div>
        <div className="h-64 flex items-center justify-center text-slate-400">
          Нет данных за выбранный период
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      {/* Header with icon and metric tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#0a192f]/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-[#0a192f]" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Динамика</h3>
        </div>

        {/* Metric tabs - full width stretch, positioned above chart */}
        <div className="flex bg-slate-100 rounded-lg p-1">
          {(Object.keys(METRIC_CONFIG) as TrendMetric[]).map((metric) => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                selectedMetric === metric
                  ? "bg-white text-[#0a192f] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {METRIC_CONFIG[metric].label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            {/* Horizontal grid lines for easier value reading */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              horizontal={true}
              vertical={false}
            />

            <XAxis
              dataKey="date"
              tickFormatter={formatXAxisDate}
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              // Recharts auto-scales label spacing based on width
            />

            <YAxis
              tickFormatter={formatYAxisValue}
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              // Bars start from zero (not auto-scaled)
            />

            <Tooltip content={<CustomTooltip />} />

            <Bar
              dataKey={selectedMetric}
              radius={[0, 0, 0, 0]} // Sharp corners (industrial aesthetic)
              className="fill-[#0a192f]"
              animationDuration={300} // Smooth 300ms transition
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  className={`${
                    selectedMetric === "shifts"
                      ? "fill-[#0a192f]"
                      : selectedMetric === "hours"
                      ? "fill-[#152238]"
                      : "fill-[#1e293b]"
                  }`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
