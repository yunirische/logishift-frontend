---
phase: 04-driver-performance
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/types.ts
  - src/constants.ts
  - src/services/api.ts
  - src/components/analytics/DriverRankings.tsx
  - src/components/Analytics.tsx
autonomous: true

must_haves:
  truths:
    - "User can view ranked list of drivers sorted by hours worked (highest first)"
    - "Driver list displays driver name, shifts count, hours worked, and salary paid in table format"
    - "List shows top 10 drivers with medal icons for top 3 rankings"
    - "List updates when user changes time range filter (7/30/90 days)"
    - "List is scrollable on mobile with sticky header for column labels"
    - "Numeric columns (Shifts, Hours, Salary) are sortable with visual indicators"
    - "Empty state shows context-aware message with time range shortcuts"
    - "Error state shows retry button for failed API requests"
  artifacts:
    - path: "src/types.ts"
      provides: "AnalyticsDriver type definition"
      contains: "AnalyticsDriver"
      min_lines: 5
    - path: "src/constants.ts"
      provides: "ANALYTICS_DRIVERS endpoint"
      exports: ["ANALYTICS_DRIVERS"]
    - path: "src/services/api.ts"
      provides: "getAnalyticsDrivers function"
      exports: ["getAnalyticsDrivers"]
    - path: "src/components/analytics/DriverRankings.tsx"
      provides: "Driver rankings table component with sorting"
      min_lines: 150
    - path: "src/components/Analytics.tsx"
      provides: "Integration of DriverRankings component"
      contains: "DriverRankings"
  key_links:
    - from: "src/components/Analytics.tsx"
      to: "src/components/analytics/DriverRankings.tsx"
      via: "component import and prop passing (data, days, onTimeRangeChange)"
      pattern: "DriverRankings"
    - from: "src/components/analytics/DriverRankings.tsx"
      to: "/api/v1/analytics/drivers"
      via: "getAnalyticsDrivers API call"
      pattern: "ANALYTICS_DRIVERS"
    - from: "src/components/Analytics.tsx"
      to: "src/components/analytics/DriverRankings.tsx"
      via: "selectedDays state passed as prop"
      pattern: "days={selectedDays}"
---

<objective>
Build a driver performance rankings table that displays top drivers by hours worked with sortable columns, medal icons for top performers, and responsive design for mobile viewing.

Purpose: Admins and foremen can identify top-performing drivers, track their productivity metrics (shifts, hours, salary), and recognize top contributors. This complements the trends chart (which shows "what") by answering "who" is driving the results.

Output: Working DriverRankings component integrated into Analytics dashboard with table view, sorting by hours/shifts/salary, medal icons for top 3, tie handling, empty/error states, and time range reactivity.
</objective>

<execution_context>
@C:\Users\1\.claude/get-shit-done/workflows/execute-plan.md
@C:\Users\1\.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/04-driver-performance/04-CONTEXT.md
@C:\logishift-frontend\docs\api\analytics.md
@C:\logishift-frontend\src\types.ts
@C:\logishift-frontend\src\constants.ts
@C:\logishift-frontend\src\services\api.ts
@C:\logishift-frontend\src\components\Analytics.tsx
@C:\logishift-frontend\src\components\analytics\UsageCard.tsx
@C:\logishift-frontend\src\components\analytics\TrendsChart.tsx
</context>

<tasks>

<task type="auto">
  <name>Add AnalyticsDriver Type and API Service</name>
  <files>
    src/types.ts
    src/constants.ts
    src/services/api.ts
  </files>
  <action>
    Add driver rankings types and API integration:

    1. In `src/types.ts`, add after AnalyticsTrend interface (around line 120):
       ```typescript
       export interface AnalyticsDriver {
         driver_id: number;
         driver_name: string;
         shifts_count: number;
         hours_worked: number;
         salary_paid: number;
       }

       export type DriverSortField = 'hours_worked' | 'shifts_count' | 'salary_paid';
       export type SortDirection = 'asc' | 'desc';
       ```

    2. In `src/constants.ts`, add to API_ENDPOINTS object after ANALYTICS_TRENDS:
       ```typescript
       ANALYTICS_DRIVERS: `${API_BASE_URL}/analytics/drivers`,
       ```

    3. In `src/services/api.ts`, add after getAnalyticsTrends function (around line 148):
       ```typescript
       export const getAnalyticsDrivers = async (days: number = 30, limit: number = 10) => {
         return get(`${API_ENDPOINTS.ANALYTICS_DRIVERS}?days=${days}&limit=${limit}`);
       };
       ```

    API endpoint details:
    - GET /api/v1/analytics/drivers?days=30&limit=10
    - Returns array sorted by hours_worked descending
    - Response format: [{ driver_id, driver_name, shifts_count, hours_worked, salary_paid }, ...]
  </action>
  <verify>
    1. Check `src/types.ts` contains AnalyticsDriver interface with all 5 fields
    2. Check `src/constants.ts` contains ANALYTICS_DRIVERS endpoint
    3. Check `src/services/api.ts` exports getAnalyticsDrivers function
    4. Run TypeScript check: `npx tsc --noEmit` (no errors expected)
  </verify>
  <done>
    AnalyticsDriver type defined with 5 fields (driver_id, driver_name, shifts_count, hours_worked, salary_paid). API endpoint added to constants. getAnalyticsDrivers service function accepts days and limit parameters.
  </done>
</task>

<task type="auto">
  <name>Create DriverRankings Component with Table View</name>
  <files>
    src/components/analytics/DriverRankings.tsx
  </files>
  <action>
    Create `src/components/analytics/DriverRankings.tsx`:

    ```tsx
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

    const formatHours = (value: number): string => {
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
          <div className="bg-white rounded-3xl shadow-lg p-8">
            <div className="flex flex-col items-center text-center py-8">
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
                  onClick={() => {/* Parent will handle time range change */}}
                  className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  30 дней
                </button>
                <button
                  onClick={() => {/* Parent will handle time range change */}}
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
          <div className="bg-white rounded-3xl shadow-lg p-8">
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Не удалось загрузить рейтинг
              </h3>
              <p className="text-sm text-slate-500 mb-6">{error}</p>
              <button
                onClick={fetchDrivers}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Попробовать снова
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="bg-white rounded-3xl shadow-lg p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <Trophy className="w-5 h-5 text-indigo-600" />
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
                        #
                      </th>
                      <th className="py-3 px-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Водитель
                      </th>
                      {SORTABLE_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className={`py-3 px-2 text-${col.align} text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors select-none ${
                            sortField === col.key ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-500'
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
                              <span className="text-slate-400 font-medium text-xs">#{rank}</span>
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
    ```

    Component features:
    - Medal icons (emoji) for top 3 ranks
    - Sortable columns (Shifts, Hours, Salary) with visual indicators
    - Sticky header on scroll for mobile
    - Tie handling at cutoff (shows all ties at rank 10)
    - Empty state with context-aware message and time range shortcut buttons
    - Error state with retry button
    - Loading skeleton matching table row height
    - Compact information density (8pt/10pt fonts, tight padding)
  </action>
  <verify>
    1. Check file exists at `src/components/analytics/DriverRankings.tsx`
    2. Check TypeScript compiles without errors
    3. Check component exports named export `DriverRankings`
    4. Check component accepts `days` prop
    5. Check sortable columns use DriverSortField type
  </verify>
  <done>
    DriverRankings component created with table view, medal icons for top 3, sortable columns (Shifts/Hours/Salary), sticky header, tie handling, empty state with time range shortcuts, error state with retry button, and loading skeleton.
  </done>
</task>

<task type="auto">
  <name>Integrate DriverRankings into Analytics Dashboard</name>
  <files>
    src/components/Analytics.tsx
  </files>
  <action>
    Update `src/components/Analytics.tsx` to include DriverRankings component:

    1. Add import at top with other analytics components:
       ```tsx
       import { DriverRankings } from "./analytics/DriverRankings";
       ```

    2. Add state for driver rankings after trends state (around line 24):
       ```typescript
       // Driver rankings data state
       const [driversData, setDriversData] = useState<AnalyticsDriver[]>([]);
       const [driversLoading, setDriversLoading] = useState(true);
       const [driversError, setDriversError] = useState<string | null>(null);
       ```

    3. Add import for AnalyticsDriver type:
       ```typescript
       import { AnalyticsUsage, AnalyticsTrend, AnalyticsDriver } from "../types";
       ```

    4. Add fetchDrivers function after fetchTrends (around line 52):
       ```typescript
       const fetchDrivers = async () => {
         setDriversLoading(true);
         setDriversError(null);
         try {
           const data = await getAnalyticsDrivers(selectedDays, 10);
           setDriversData(Array.isArray(data) ? data : []);
         } catch (error) {
           console.error("Failed to fetch drivers data:", error);
           setDriversError(error instanceof Error ? error.message : "Ошибка загрузки данных");
         } finally {
           setDriversLoading(false);
         }
       };
       ```

    5. Update useEffect to include fetchDrivers (around line 54-57):
       ```typescript
       useEffect(() => {
         fetchUsage();
         fetchTrends();
         fetchDrivers();
       }, [selectedDays]);
       ```

    6. Update handleRangeChange to include fetchDrivers (around line 59-66):
       ```typescript
       const handleRangeChange = async (days: TimeRangePreset) => {
         if (days === selectedDays) return;
         setIsRangeLoading(true);
         setSelectedDays(days);
         await Promise.all([fetchUsage(), fetchTrends(), fetchDrivers()]);
         setIsRangeLoading(false);
       };
       ```

    7. Add DriverRankings component to content grid after trends chart (around line 247):
       ```tsx
       {/* Row 3: Driver rankings (full width) */}
       <div className="lg:col-span-2 xl:col-span-3">
         <DriverRankings days={selectedDays} />
       </div>
       ```

    8. Add getAnalyticsDrivers to imports from services:
       ```tsx
       import { getAnalyticsUsage, getAnalyticsTrends, getAnalyticsDrivers } from "../services/api";
       ```

    Layout positioning:
    - Row 1: Usage cards (3 columns)
    - Row 2: Trends chart (full width)
    - Row 3: Driver rankings (full width, new)
  </action>
  <verify>
    1. Check `src/components/Analytics.tsx` imports DriverRankings component
    2. Check `src/components/Analytics.tsx` imports getAnalyticsDrivers from api service
    3. Check AnalyticsDriver type is imported from types
    4. Check drivers state variables are declared
    5. Check fetchDrivers function is defined
    6. Check useEffect calls fetchDrivers
    7. Check DriverRankings component is rendered in grid with full width
    8. Run `npm run dev` and verify analytics page loads with driver rankings visible
  </verify>
  <done>
    DriverRankings component integrated into Analytics dashboard. Component fetches data via getAnalyticsDrivers, updates when time range changes, and displays in full-width row below trends chart. Drivers data state managed alongside usage and trends data.
  </done>
</task>

</tasks>

<verification>
Overall phase verification:

1. **Data Layer:**
   - AnalyticsDriver type defined in types.ts with 5 fields
   - ANALYTICS_DRIVERS endpoint added to constants
   - getAnalyticsDrivers function added to api service

2. **Component Structure:**
   - DriverRankings component exists in src/components/analytics/
   - Component accepts days prop for time range reactivity
   - Component renders table with 5 columns (Rank, Name, Shifts, Hours, Salary)
   - Medal icons display for top 3 rankings (🥇🥈🥉)

3. **Sorting Behavior:**
   - Clickable column headers for Shifts, Hours, Salary columns
   - Arrow icons (↑ ↓) indicate sort direction
   - Active sort column has highlight color (indigo-600)
   - Clicking same column toggles between ascending/descending

4. **Tie Handling:**
   - Drivers with same hours_worked share rank (e.g., 10, 10, 10, 13)
   - All ties at cutoff included (may show 11-13 drivers)
   - Explanatory text appears when ties exist: "Показано 12 водителей (3 на 10-м месте)"

5. **Empty/Error States:**
   - Empty state shows Trophy icon + context-aware message
   - Empty state includes time range shortcut buttons (30/90 days)
   - Error state shows AlertCircle icon + error message + retry button
   - Loading state shows skeleton rows matching table structure

6. **Mobile Responsiveness:**
   - Table uses overflow-x-auto for horizontal scroll on mobile
   - Table header uses sticky positioning (stays visible while scrolling)
   - Touch-friendly column headers with sufficient tap target size

7. **Integration:**
   - DriverRankings rendered in Analytics.tsx below trends chart
   - Data re-fetches when time range changes
   - Component integrated with existing loading overlay pattern
</verification>

<success_criteria>
Phase 4 is complete when:

1. User can view ranked list of drivers sorted by hours worked (highest first)
2. Driver list displays driver name, shifts count, hours worked, and salary paid in table format
3. Top 3 drivers display medal icons (🥇🥈🥉) instead of rank numbers
4. Numeric columns (Shifts, Hours, Salary) are sortable with arrow indicators
5. List updates when user changes time range filter (7/30/90 days)
6. Empty state shows context-aware message with time range shortcut buttons
7. Error state shows retry button that re-fetches data from API
8. Table is horizontally scrollable on mobile with sticky header
</success_criteria>

<output>
After completion, create `.planning/phases/04-driver-performance/04-01-SUMMARY.md`
</output>
