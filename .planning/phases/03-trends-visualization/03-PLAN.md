---
phase: 03-trends-visualization
plan: 01
type: execute
wave: 1
depends_on:
  - 02-01
files_modified:
  - src/types.ts
  - src/constants.ts
  - src/services/api.ts
  - src/components/analytics/TrendsChart.tsx
  - src/components/Analytics.tsx
autonomous: true

must_haves:
  truths:
    - "User can view bar chart displaying daily data for selected time range (shifts, hours, or salary)"
    - "Chart shows date labels on x-axis and metric values on y-axis"
    - "User can toggle between metrics (shifts count, hours worked, salary paid) via tab bar"
    - "Chart updates to reflect selected time range filter (7/30/90 days)"
    - "Chart displays tooltips with date and exact values on hover"
  artifacts:
    - path: "src/components/analytics/TrendsChart.tsx"
      provides: "Reusable bar chart component with metric tabs"
      min_lines: 150
    - path: "src/types.ts"
      provides: "AnalyticsTrend type definition"
      contains: "AnalyticsTrend|TrendMetric"
    - path: "src/constants.ts"
      provides: "ANALYTICS_TRENDS endpoint"
      exports: ["ANALYTICS_TRENDS"]
  key_links:
    - from: "src/components/analytics/TrendsChart.tsx"
      to: "/api/v1/analytics/trends"
      via: "getAnalyticsTrends() from api.ts"
      pattern: "ANALYTICS_TRENDS"
    - from: "src/components/Analytics.tsx"
      to: "src/components/analytics/TrendsChart.tsx"
      via: "component import with selectedDays prop"
      pattern: "TrendsChart"
---

<objective>
Build a trends visualization bar chart showing shifts, hours worked, and salary paid over daily intervals. Users toggle between metrics via tab bar, view tooltips on hover with exact values, and the chart refreshes when time range changes.

Purpose: Enable users to see patterns over time - identifying trends, spikes, and dips in operational metrics. This transforms static usage numbers into actionable temporal insights.

Output: Full-width bar chart card in analytics dashboard with metric tabs (Shifts/Hours/Salary), date x-axis, value y-axis with K suffix, and styled tooltips.
</objective>

<execution_context>
@C:\Users\1\.claude/get-shit-done/workflows/execute-plan.md
@C:\Users\1\.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/02-usage-cards/02-01-SUMMARY.md
@.planning/phases/03-trends-visualization/03-CONTEXT.md
@C:\logishift-frontend\docs\api\analytics.md
@C:\logishift-frontend\src\components\Analytics.tsx
@C:\logishift-frontend\src\types.ts
@C:\logishift-frontend\src\constants.ts
@C:\logishift-frontend\src\services\api.ts
</context>

<tasks>

<task type="auto">
  <name>Add Trends Types and API Endpoint</name>
  <files>
    src/types.ts
    src/constants.ts
    src/services/api.ts
  </files>
  <action>
    Add TypeScript types and API configuration for analytics trends endpoint:

    1. In `src/types.ts`, add trends-related type definitions at the end of the file (after AnalyticsUsage):
    ```typescript
    // Trends types
    export type TrendMetric = "shifts" | "hours" | "salary";

    export interface AnalyticsTrend {
      date: string;
      shifts_count: number;
      hours_worked: number;
      salary_paid: number;
    }

    export interface TrendsData {
      data: AnalyticsTrend[];
      metric: TrendMetric;
    }
    ```

    2. In `src/constants.ts`, add the ANALYTICS_TRENDS endpoint to the API_ENDPOINTS object (after ANALYTICS_USAGE):
    ```typescript
    ANALYTICS_TRENDS: `${API_BASE_URL}/analytics/trends`,
    ```

    3. In `src/services/api.ts`, add a helper function for fetching trends data (after getAnalyticsUsage):
    ```typescript
    // After getAnalyticsUsage, add:
    export const getAnalyticsTrends = async (days: number = 30) => {
      return get(`${API_ENDPOINTS.ANALYTICS_TRENDS}?days=${days}`);
    };
    ```

    These additions provide:
    - TrendMetric union type for type-safe metric selection
    - AnalyticsTrend interface matching backend response shape
    - Centralized endpoint configuration
    - Reusable API helper with built-in auth and error handling
  </action>
  <verify>
    1. Check `src/types.ts` contains AnalyticsTrend interface and TrendMetric type
    2. Check `src/constants.ts` contains ANALYTICS_TRENDS endpoint
    3. Check `src/services/api.ts` exports getAnalyticsTrends function
    4. Run `npx tsc --noEmit` to verify no TypeScript errors
  </verify>
  <done>
    AnalyticsTrend type with date/shifts/hours/salary fields, TrendMetric union type, ANALYTICS_TRENDS endpoint in constants, and getAnalyticsTrends helper function exist. All type-checking passes.
  </done>
</task>

<task type="auto">
  <name>Create TrendsChart Component with Recharts</name>
  <files>
    src/components/analytics/TrendsChart.tsx
  </files>
  <action>
    Create a reusable TrendsChart component at `src/components/analytics/TrendsChart.tsx` using Recharts:

    ```typescript
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
    ```

    Component features (per CONTEXT decisions):
    - **Bar chart** with sharp corners (industrial aesthetic)
    - **Tab bar control** above chart, full-width stretch
    - **Three metrics**: Shifts (indigo-600), Hours (indigo-700), Salary (indigo-800)
    - **Short date format** on x-axis: "15 янв" (compact)
    - **K suffix** on y-axis values: "15K", "2.5K", "500"
    - **Horizontal grid lines** (dashed, slate-200) for easier reading
    - **Styled tooltip** with rounded corners, shadow, long date format
    - **Smart precision**: No decimals for counts/hours, 2 decimals for salary
    - **300ms animation** on data/metric changes
    - **Loading skeleton** with pulse animation
    - **Empty state** when no data available
  </action>
  <verify>
    1. Check `src/components/analytics/TrendsChart.tsx` file exists
    2. Run `npx tsc --noEmit` to verify no TypeScript errors
    3. Verify component exports TrendsChart as named export
    4. Confirm Recharts imports are correct (BarChart, Bar, XAxis, YAxis, etc.)
  </verify>
  <done>
    TrendsChart component exists with metric tab bar (Shifts/Hours/Salary), Recharts bar chart with sharp corners, short date x-axis format, K suffix y-axis, horizontal grid lines, styled tooltip with long date format, smart value precision, 300ms animations, and loading skeleton.
  </done>
</task>

<task type="auto">
  <name>Integrate TrendsChart into Analytics Dashboard</name>
  <files>
    src/components/Analytics.tsx
  </files>
  <action>
    Update the Analytics component to fetch trends data and display the TrendsChart:

    1. Add imports at the top (update existing imports):
    ```typescript
    import React, { useState, useEffect } from "react";
    import { Calendar, Download, Truck, Users, Building2 } from "lucide-react";
    import { API_ENDPOINTS } from "../constants";
    import { getAnalyticsUsage, getAnalyticsTrends } from "../services/api";
    import { AnalyticsUsage, AnalyticsTrend } from "../types";
    import { UsageCard } from "./analytics/UsageCard";
    import { TrendsChart } from "./analytics/TrendsChart";
    ```

    2. Add state for trends data (after usageData state):
    ```typescript
    // Trends data state
    const [trendsData, setTrendsData] = useState<AnalyticsTrend[]>([]);
    const [trendsLoading, setTrendsLoading] = useState(true);
    const [trendsError, setTrendsError] = useState<string | null>(null);
    ```

    3. Create a fetchTrends function and add to existing useEffect (modify existing useEffect):
    ```typescript
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

    const fetchTrends = async () => {
      setTrendsLoading(true);
      setTrendsError(null);
      try {
        const data = await getAnalyticsTrends(selectedDays);
        setTrendsData(data);
      } catch (error) {
        console.error("Failed to fetch trends data:", error);
        setTrendsError(error instanceof Error ? error.message : "Ошибка загрузки данных");
      } finally {
        setTrendsLoading(false);
      }
    };

    useEffect(() => {
      fetchUsage();
      fetchTrends();
    }, [selectedDays]); // Re-fetch both when time range changes
    ```

    4. Update handleRangeChange to trigger both fetches:
    ```typescript
    const handleRangeChange = async (days: TimeRangePreset) => {
      if (days === selectedDays) return;
      setIsRangeLoading(true);
      setSelectedDays(days);
      // Both fetchUsage and fetchTrends will be called by useEffect
      await Promise.all([fetchUsage(), fetchTrends()]);
      setIsRangeLoading(false);
    };
    ```

    5. Update the content grid to include trends chart (replace the existing grid with a 2-row layout):
    ```typescript
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Row 1: Usage cards (3 columns) */}
      {usageLoading ? (
        // Loading skeletons for usage cards
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
        <div className="col-span-full lg:col-span-3 bg-white rounded-3xl shadow-lg p-6">
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
          <UsageCard title="Грузовики" icon={Truck} usage={usageData.trucks} />
          <UsageCard title="Водители" icon={Users} usage={usageData.drivers} />
          <UsageCard title="Объекты" icon={Building2} usage={usageData.sites} />
        </>
      )}

      {/* Row 2: Trends chart (full width) */}
      <div className="lg:col-span-2 xl:col-span-3">
        {trendsLoading ? (
          // TrendsChart handles its own loading state
          <TrendsChart data={[]} days={selectedDays} isLoading={true} />
        ) : trendsError ? (
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <p className="text-red-600 text-center">{trendsError}</p>
            <button
              onClick={fetchTrends}
              className="mx-auto mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Попробовать снова
            </button>
          </div>
        ) : (
          <TrendsChart data={trendsData} days={selectedDays} />
        )}
      </div>
    </div>
    ```

    Key changes:
    - Added trendsData, trendsLoading, trendsError state
    - fetchTrends function using getAnalyticsTrends helper with selectedDays parameter
    - useEffect dependency on selectedDays for both usage and trends auto-refresh
    - handleRangeChange now awaits both fetchUsage and fetchTrends in parallel
    - TrendsChart spans full width (lg:col-span-2 xl:col-span-3)
    - TrendsChart receives data, days, and isLoading props
    - Error state for trends with retry button
  </action>
  <verify>
    1. Run `npx tsc --noEmit` to verify no TypeScript errors
    2. Run `npm run dev` and verify:
       - Trends chart displays below usage cards
       - Chart spans full width on large screens
       - Metric tabs (Смены/Часы/Зарплата) are visible and clickable
       - Clicking metric tabs updates the displayed data
       - Changing time range (7/30/90 days) refreshes chart data
       - Tooltips appear on hover with formatted dates and values
       - Loading skeleton shows while fetching
       - Error message displays on fetch failure
  </verify>
  <done>
    Analytics dashboard displays trends chart below usage cards. Chart spans full width, has metric tabs (Shifts/Hours/Salary), updates on time range change, shows styled tooltips on hover, and handles loading/error states with retry.
  </done>
</task>

</tasks>

<verification>
Overall phase verification:

1. **API Integration:**
   - ANALYTICS_TRENDS endpoint defined in constants.ts
   - getAnalyticsTrends helper function in api.ts with days parameter
   - AnalyticsTrend type in types.ts with date/shifts_count/hours_worked/salary_paid fields
   - TrendMetric union type (shifts | hours | salary)
   - Data fetches successfully from /api/v1/analytics/trends?days=N

2. **TrendsChart Component:**
   - Icon (TrendingUp) with indigo accent background in header
   - Metric tab bar above chart with three options: Смены/Часы/Зарплата
   - Active tab has white bg, indigo text, shadow; inactive has slate text
   - Bar chart with sharp corners (no radius)
   - X-axis shows short date format: "15 янв"
   - Y-axis shows K suffix for large values: "15K", "2.5K"
   - Horizontal dashed grid lines (slate-200)
   - Bars use indigo-600/700/800 based on metric
   - Tooltip shows long date format: "15 января 2026"
   - Tooltip shows value with smart precision (no decimals for counts/hours)
   - 300ms animation duration on metric changes

3. **Analytics Dashboard Integration:**
   - Trends chart displays below usage cards
   - Chart spans full width (lg:col-span-2 xl:col-span-3)
   - Data refreshes when user changes time range (7/30/90 days)
   - Loading skeleton displays during initial fetch
   - Error state shows message with retry button
   - Metric tabs are clickable and update chart visualization

4. **Mobile Responsiveness:**
   - Chart is responsive (ResponsiveContainer from Recharts)
   - Metric tabs are full-width and stretch to fill container
   - Touch-friendly buttons with adequate padding
   - Chart scales properly on mobile viewports

5. **Visual Details:**
   - Bars use Navy/Indigo color palette (indigo-600/700/800)
   - Rounded-3xl card styling matches design system
   - TrendingUp icon from Lucide React
   - Card has shadow-lg for depth
</verification>

<success_criteria>
Phase 3 is complete when:

1. User can view bar chart displaying daily trends for selected time range
2. Chart shows date labels on x-axis and metric values on y-axis
3. User can toggle between metrics (shifts/hours/salary) via tab bar
4. Chart updates when time range filter changes (7/30/90 days)
5. Tooltips display date and exact values on hover
6. Bars use indigo color palette with sharp corners
7. Loading skeleton shows during data fetch
</success_criteria>

<output>
After completion, create `.planning/phases/03-trends-visualization/03-01-SUMMARY.md`
</output>
