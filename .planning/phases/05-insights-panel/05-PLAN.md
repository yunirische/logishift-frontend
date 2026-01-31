---
phase: 05-insights-panel
plan: 01
type: execute
wave: 1
depends_on: ["04"]
files_modified:
  - src/types.ts
  - src/constants.ts
  - src/services/api.ts
  - src/components/analytics/InsightsPanel.tsx
  - src/components/Analytics.tsx
autonomous: true

must_haves:
  truths:
    - "User can view insights panel with underutilized resources list (trucks, sites)"
    - "Insights panel displays near-limit resources with current/limit/percent (warnings)"
    - "Panel shows cost per shift metric formatted as currency"
    - "Panel displays recommended actions list from backend"
    - "Insights use alert styling (warnings in amber/orange, info in blue)"
    - "Insights data updates when user changes time range filter (7/30/90 days)"
    - "Empty state shows when no insights are available"
    - "Error state shows retry button for failed API requests"
  artifacts:
    - path: "src/types.ts"
      provides: "AnalyticsInsights type definition"
      contains: "AnalyticsInsights"
      min_lines: 15
    - path: "src/constants.ts"
      provides: "ANALYTICS_INSIGHTS endpoint"
      exports: ["ANALYTICS_INSIGHTS"]
    - path: "src/services/api.ts"
      provides: "getAnalyticsInsights function"
      exports: ["getAnalyticsInsights"]
    - path: "src/components/analytics/InsightsPanel.tsx"
      provides: "Insights panel with alert styling"
      min_lines: 200
    - path: "src/components/Analytics.tsx"
      provides: "Integration of InsightsPanel component"
      contains: "InsightsPanel"
  key_links:
    - from: "src/components/Analytics.tsx"
      to: "src/components/analytics/InsightsPanel.tsx"
      via: "component import and prop passing (data, days)"
      pattern: "InsightsPanel"
    - from: "src/components/analytics/InsightsPanel.tsx"
      to: "/api/v1/analytics/insights"
      via: "getAnalyticsInsights API call"
      pattern: "ANALYTICS_INSIGHTS"
    - from: "src/components/Analytics.tsx"
      to: "src/components/analytics/InsightsPanel.tsx"
      via: "selectedDays state passed as prop"
      pattern: "days={selectedDays}"
---

<objective>
Build an insights panel that displays plan optimization recommendations, underutilized resources, near-limit warnings, and cost per shift metric with alert-based styling (amber/orange for warnings, blue for info).

Purpose: Admins and foremen can identify optimization opportunities (underutilized trucks/sites), see resource warnings (approaching plan limits), understand costs per shift, and receive actionable recommendations (downgrade plan, upgrade limits). This completes the analytics story by adding "so what" - not just what happened, but what to do about it.

Output: Working InsightsPanel component integrated into Analytics dashboard with underutilized resources list, near-limit warnings, cost per shift metric, recommended actions, alert styling, empty/error states, and time range reactivity.
</objective>

<execution_context>
@C:\Users\1\.claude/get-shit-done/workflows/execute-plan.md
@C:\Users\1\.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@C:\logishift-frontend\docs\api\analytics.md
@C:\logishift-frontend\src\types.ts
@C:\logishift-frontend\src\constants.ts
@C:\logishift-frontend\src\services\api.ts
@C:\logishift-frontend\src\components\Analytics.tsx
@C:\logishift-frontend\src\components\analytics\UsageCard.tsx
@C:\logishift-frontend\src\components\analytics\TrendsChart.tsx
@C:\logishift-frontend\src\components\analytics\DriverRankings.tsx
</context>

<tasks>

<task type="auto">
  <name>Add AnalyticsInsights Type and API Service</name>
  <files>
    src/types.ts
    src/constants.ts
    src/services/api.ts
  </files>
  <action>
    Add insights types and API integration:

    1. In `src/types.ts`, add after AnalyticsDriver interface (around line 132):
       ```typescript
       export interface AnalyticsInsights {
         underutilizedResources: {
           trucks: string[];
           sites: string[];
         };
         nearLimitResources: {
           trucks: NearLimitResource | null;
           drivers: NearLimitResource | null;
           sites: NearLimitResource | null;
         };
         costPerShift: number;
         recommendedActions: string[];
       }

       export interface NearLimitResource {
         current: number;
         limit: number;
         percent: number;
       }
       ```

    2. In `src/constants.ts`, add to API_ENDPOINTS object after ANALYTICS_DRIVERS:
       ```typescript
       ANALYTICS_INSIGHTS: `${API_BASE_URL}/analytics/insights`,
       ```

    3. In `src/services/api.ts`, add after getAnalyticsDrivers function (around line 152):
       ```typescript
       export const getAnalyticsInsights = async (days: number = 30) => {
         return get(`${API_ENDPOINTS.ANALYTICS_INSIGHTS}?days=${days}`);
       };
       ```

    API endpoint details:
    - GET /api/v1/analytics/insights?days=30
    - Returns insights object with underutilized resources, near-limit warnings, cost metrics, and recommendations
    - Response format documented in docs/api/analytics.md
  </action>
  <verify>
    1. Check `src/types.ts` contains AnalyticsInsights interface with all 4 fields
    2. Check `src/types.ts` contains NearLimitResource interface with 3 fields
    3. Check `src/constants.ts` contains ANALYTICS_INSIGHTS endpoint
    4. Check `src/services/api.ts` exports getAnalyticsInsights function
    5. Run TypeScript check: `npx tsc --noEmit` (no errors expected)
  </verify>
  <done>
    AnalyticsInsights type defined with 4 fields (underutilizedResources, nearLimitResources, costPerShift, recommendedActions). NearLimitResource type defined with 3 fields (current, limit, percent). API endpoint added to constants. getAnalyticsInsights service function accepts days parameter.
  </done>
</task>

<task type="auto">
  <name>Create InsightsPanel Component with Alert Styling</name>
  <files>
    src/components/analytics/InsightsPanel.tsx
  </files>
  <action>
    Create `src/components/analytics/InsightsPanel.tsx`:

    ```tsx
    import React, { useState, useEffect } from "react";
    import { Lightbulb, AlertTriangle, Info, RefreshCw, TrendingDown } from "lucide-react";
    import { AnalyticsInsights } from "../../types";
    import { getAnalyticsInsights } from "../../services/api";

    interface InsightsPanelProps {
      days: number;
    }

    const formatCurrency = (value: number): string => {
      return value.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
    };

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
          console.error('Failed to fetch insights:', err);
          setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
        } finally {
          setLoading(false);
        }
      };

      useEffect(() => {
        fetchInsights();
      }, [days]);

      // Loading skeleton
      if (loading) {
        return (
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-50 rounded-xl animate-pulse">
                <div className="w-5 h-5 bg-amber-200 rounded" />
              </div>
              <div className="h-6 bg-slate-200 rounded w-48 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        );
      }

      // Error state with retry
      if (error) {
        return (
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-1">
                Не удалось загрузить рекомендации
              </h3>
              <p className="text-sm text-slate-500 mb-4">{error}</p>
              <button
                onClick={fetchInsights}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Попробовать снова
              </button>
            </div>
          </div>
        );
      }

      // Empty state
      if (!insights) {
        return null;
      }

      const hasUnderutilizedTrucks = insights.underutilizedResources.trucks.length > 0;
      const hasUnderutilizedSites = insights.underutilizedResources.sites.length > 0;
      const hasNearLimitResources = Object.values(insights.nearLimitResources).some(r => r !== null);
      const hasRecommendations = insights.recommendedActions.length > 0;
      const hasAnyContent = hasUnderutilizedTrucks || hasUnderutilizedSites || hasNearLimitResources || hasRecommendations;

      // Empty state when no insights available
      if (!hasAnyContent) {
        return (
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Lightbulb className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Рекомендации</h3>
              </div>
            </div>
            <div className="flex flex-col items-center text-center py-8 px-4">
              <Info className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">
                Недостаточно данных для рекомендаций. Продолжайте использовать систему для получения персонализированных советов.
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="bg-white rounded-3xl shadow-lg p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-50 rounded-xl">
              <Lightbulb className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Рекомендации</h3>
              <p className="text-xs text-slate-500">Оптимизация ресурсов и планов</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cost per shift - Always show if available */}
            {insights.costPerShift > 0 && (
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-medium text-indigo-700 uppercase tracking-wide">
                    Стоимость смены
                  </span>
                </div>
                <div className="text-2xl font-bold text-indigo-900">
                  {formatCurrency(insights.costPerShift)}
                </div>
                <p className="text-xs text-indigo-600/70 mt-1">
                  Среднее за выбранный период
                </p>
              </div>
            )}

            {/* Underutilized trucks */}
            {hasUnderutilizedTrucks && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                    Недоиспользуемые грузовики
                  </span>
                </div>
                <ul className="space-y-1">
                  {insights.underutilizedResources.trucks.map((truck, idx) => (
                    <li key={idx} className="text-sm text-amber-900 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" />
                      {truck}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Underutilized sites */}
            {hasUnderutilizedSites && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                    Малоактивные объекты
                  </span>
                </div>
                <ul className="space-y-1">
                  {insights.underutilizedResources.sites.map((site, idx) => (
                    <li key={idx} className="text-sm text-amber-900 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" />
                      {site}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Near limit: trucks */}
            {insights.nearLimitResources.trucks && (
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-700 uppercase tracking-wide">
                    Грузовики: nearing limit
                  </span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-orange-900">
                    {insights.nearLimitResources.trucks.current}
                  </span>
                  <span className="text-sm text-orange-600 mb-1">/ {insights.nearLimitResources.trucks.limit}</span>
                  <span className="ml-auto text-sm font-semibold text-orange-600">
                    {insights.nearLimitResources.trucks.percent}%
                  </span>
                </div>
                <div className="mt-2 h-2 bg-orange-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${insights.nearLimitResources.trucks.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Near limit: drivers */}
            {insights.nearLimitResources.drivers && (
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-700 uppercase tracking-wide">
                    Водители: nearing limit
                  </span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-orange-900">
                    {insights.nearLimitResources.drivers.current}
                  </span>
                  <span className="text-sm text-orange-600 mb-1">/ {insights.nearLimitResources.drivers.limit}</span>
                  <span className="ml-auto text-sm font-semibold text-orange-600">
                    {insights.nearLimitResources.drivers.percent}%
                  </span>
                </div>
                <div className="mt-2 h-2 bg-orange-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${insights.nearLimitResources.drivers.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Near limit: sites */}
            {insights.nearLimitResources.sites && (
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-700 uppercase tracking-wide">
                    Объекты: nearing limit
                  </span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-orange-900">
                    {insights.nearLimitResources.sites.current}
                  </span>
                  <span className="text-sm text-orange-600 mb-1">/ {insights.nearLimitResources.sites.limit}</span>
                  <span className="ml-auto text-sm font-semibold text-orange-600">
                    {insights.nearLimitResources.sites.percent}%
                  </span>
                </div>
                <div className="mt-2 h-2 bg-orange-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${insights.nearLimitResources.sites.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Recommended actions - Full width if has content */}
            {hasRecommendations && (
              <div className="md:col-span-2 bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                    Рекомендации
                  </span>
                </div>
                <ul className="space-y-2">
                  {insights.recommendedActions.map((action, idx) => (
                    <li key={idx} className="text-sm text-blue-900 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Empty filler for grid when no recommendations */}
          {!hasRecommendations && insights.costPerShift > 0 && (
            <div className="hidden md:block bg-slate-50 rounded-xl p-4 border border-slate-100 border-dashed">
              <p className="text-xs text-slate-400 text-center">
                Дополнительные рекомендации появятся после сбора большего количества данных
              </p>
            </div>
          )}
        </div>
      );
    };
    ```

    Component features:
    - Cost per shift card with indigo gradient styling
    - Underutilized resources (trucks, sites) with amber alert styling
    - Near-limit warnings with orange styling and progress bars
    - Recommended actions with blue info styling
    - Responsive grid layout (1 column mobile, 2 columns desktop)
    - Loading skeleton matching component structure
    - Error state with retry button
    - Empty state when no insights available
    - Currency formatting for cost per shift (Russian locale)
  </action>
  <verify>
    1. Check file exists at `src/components/analytics/InsightsPanel.tsx`
    2. Check TypeScript compiles without errors
    3. Check component exports named export `InsightsPanel`
    4. Check component accepts `days` prop
    5. Check component handles all 4 insight types (underutilized, nearLimit, cost, actions)
  </verify>
  <done>
    InsightsPanel component created with alert-based styling (amber for underutilized, orange for near-limit, blue for recommendations, indigo for cost metric). Responsive grid layout, loading skeleton, error state with retry button, empty state when no insights available. All 4 insight categories displayed with appropriate visual hierarchy.
  </done>
</task>

<task type="auto">
  <name>Integrate InsightsPanel into Analytics Dashboard</name>
  <files>
    src/components/Analytics.tsx
  </files>
  <action>
    Update `src/components/Analytics.tsx` to include InsightsPanel component:

    1. Add import at top with other analytics components:
       ```tsx
       import { InsightsPanel } from "./analytics/InsightsPanel";
       ```

    2. Add state for insights data after drivers state (around line 30):
       ```typescript
       // Insights data state
       const [insightsData, setInsightsData] = useState<AnalyticsInsights | null>(null);
       const [insightsLoading, setInsightsLoading] = useState(true);
       const [insightsError, setInsightsError] = useState<string | null>(null);
       ```

    3. Add import for AnalyticsInsights type:
       ```typescript
       import { AnalyticsUsage, AnalyticsTrend, AnalyticsDriver, AnalyticsInsights } from "../types";
       ```

    4. Add fetchInsights function after fetchDrivers (around line 72):
       ```typescript
       const fetchInsights = async () => {
         setInsightsLoading(true);
         setInsightsError(null);
         try {
           const data = await getAnalyticsInsights(selectedDays);
           setInsightsData(data);
         } catch (error) {
           console.error("Failed to fetch insights data:", error);
           setInsightsError(error instanceof Error ? error.message : "Ошибка загрузки данных");
         } finally {
           setInsightsLoading(false);
         }
       };
       ```

    5. Update useEffect to include fetchInsights (around line 74-78):
       ```typescript
       useEffect(() => {
         fetchUsage();
         fetchTrends();
         fetchDrivers();
         fetchInsights();
       }, [selectedDays]); // Re-fetch all when time range changes
       ```

    6. Update handleRangeChange to include fetchInsights (around line 80-87):
       ```typescript
       const handleRangeChange = async (days: TimeRangePreset) => {
         if (days === selectedDays) return;
         setIsRangeLoading(true);
         setSelectedDays(days);
         // All fetch functions will be called by useEffect
         await Promise.all([fetchUsage(), fetchTrends(), fetchDrivers(), fetchInsights()]);
         setIsRangeLoading(false);
       };
       ```

    7. Add InsightsPanel component to content grid after driver rankings (around line 273):
       ```tsx
       {/* Row 4: Insights panel (full width) */}
       <div className="lg:col-span-2 xl:col-span-3">
         <InsightsPanel days={selectedDays} />
       </div>
       ```

    8. Add getAnalyticsInsights to imports from services:
       ```tsx
       import { getAnalyticsUsage, getAnalyticsTrends, getAnalyticsDrivers, getAnalyticsInsights } from "../services/api";
       ```

    Layout positioning:
    - Row 1: Usage cards (3 columns)
    - Row 2: Trends chart (full width)
    - Row 3: Driver rankings (full width)
    - Row 4: Insights panel (full width, new)
  </action>
  <verify>
    1. Check `src/components/Analytics.tsx` imports InsightsPanel component
    2. Check `src/components/Analytics.tsx` imports getAnalyticsInsights from api service
    3. Check AnalyticsInsights type is imported from types
    4. Check insights state variables are declared
    5. Check fetchInsights function is defined
    6. Check useEffect calls fetchInsights
    7. Check InsightsPanel component is rendered in grid with full width
    8. Run `npm run dev` and verify analytics page loads with insights panel visible
  </verify>
  <done>
    InsightsPanel component integrated into Analytics dashboard. Component fetches data via getAnalyticsInsights, updates when time range changes, and displays in full-width row below driver rankings. Insights data state managed alongside usage, trends, and drivers data. All 4 analytics sections now complete on dashboard.
  </done>
</task>

</tasks>

<verification>
Overall phase verification:

1. **Data Layer:**
   - AnalyticsInsights type defined in types.ts with 4 fields (underutilizedResources, nearLimitResources, costPerShift, recommendedActions)
   - NearLimitResource type defined with 3 fields (current, limit, percent)
   - ANALYTICS_INSIGHTS endpoint added to constants
   - getAnalyticsInsights function added to api service

2. **Component Structure:**
   - InsightsPanel component exists in src/components/analytics/
   - Component accepts days prop for time range reactivity
   - Component renders responsive grid (1 col mobile, 2 col desktop)

3. **Alert Styling:**
   - Cost per shift: indigo gradient card with TrendingDown icon
   - Underutilized resources: amber background with AlertTriangle icon
   - Near-limit warnings: orange background with progress bar
   - Recommended actions: blue background with Info icon

4. **Content Sections:**
   - Cost per shift displays formatted as Russian currency (₽)
   - Underutilized trucks listed with bullet points
   - Underutilized sites listed with bullet points
   - Near-limit resources show current/limit/percent with progress bar
   - Recommended actions listed as actionable items

5. **Empty/Error States:**
   - Loading state shows skeleton cards matching grid structure
   - Empty state shows Info icon + helpful message when no insights available
   - Error state shows AlertTriangle icon + error message + retry button

6. **Mobile Responsiveness:**
   - Grid collapses to 1 column on mobile
   - Touch-friendly card tap targets
   - Information density maintained across breakpoints

7. **Integration:**
   - InsightsPanel rendered in Analytics.tsx below driver rankings
   - Data re-fetches when time range changes
   - Component integrated with existing loading overlay pattern
   - All 4 analytics sections complete (Usage, Trends, Rankings, Insights)
</verification>

<success_criteria>
Phase 5 is complete when:

1. User can view insights panel with underutilized resources list (trucks, sites)
2. Insights panel displays near-limit resources with current/limit/percent (warnings)
3. Panel shows cost per shift metric formatted as Russian currency
4. Panel displays recommended actions list from backend
5. Insights use alert styling (amber for underutilized, orange for near-limit, blue for recommendations, indigo for cost)
6. Insights data updates when user changes time range filter (7/30/90 days)
7. Empty state shows helpful message when no insights available
8. Error state shows retry button that re-fetches data from API
</success_criteria>

<output>
After completion, create `.planning/phases/05-insights-panel/05-01-SUMMARY.md`
</output>
