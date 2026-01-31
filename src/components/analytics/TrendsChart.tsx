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
import { TrendingUp } from "lucide-react";

interface TrendsChartProps {
  data: AnalyticsTrend[];
  days: number;
  isLoading?: boolean;
}

// Metric configuration with labels and units
const METRIC_CONFIG = {
  shifts: {
    label: "Смены",
    key: "shifts_count" as const,
    color: "fill-indigo-600",
    unit: "",
    formatValue: (v: number) => v.toString(),
  },
  hours: {
    label: "Часы",
    key: "hours_worked" as const,
    color: "fill-indigo-700",
    unit: " ч",
    formatValue: (v: number) => v.toString(),
  },
  salary: {
    label: "Зарплата",
    key: "salary_paid" as const,
    color: "fill-indigo-800",
    unit: " ₽",
    formatValue: (v: number) => v.toLocaleString("ru-RU"),
  },
} as const;

// Format date for x-axis (short: "Jan 15" or "15 янв")
const formatXAxisDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

// Format date for tooltip (long: "January 15, 2026")
const formatTooltipDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Format y-axis value with K suffix
const formatYAxisValue = (value: number): string => {
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
      <p className="text-sm text-slate-500 mb-1">{formatTooltipDate(label)}</p>
      <p className="text-lg font-semibold text-slate-800">
        {displayValue}{config.unit}
      </p>
    </div>
  );
};

export const TrendsChart: React.FC<TrendsChartProps> = ({ data, days, isLoading = false }) => {
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
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="h-6 bg-slate-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
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
    <div className="bg-white rounded-3xl shadow-lg p-6">
      {/* Header with icon and metric tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
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
                  ? "bg-white text-indigo-600 shadow-sm"
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
              className="fill-indigo-600"
              animationDuration={300} // Smooth 300ms transition
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  className={`${
                    selectedMetric === "shifts"
                      ? "fill-indigo-600"
                      : selectedMetric === "hours"
                      ? "fill-indigo-700"
                      : "fill-indigo-800"
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
