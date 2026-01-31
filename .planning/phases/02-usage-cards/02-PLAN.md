---
phase: 02-usage-cards
plan: 01
type: execute
wave: 1
depends_on:
  - 01-01
files_modified:
  - src/constants.ts
  - src/services/api.ts
  - src/components/Analytics.tsx
  - src/components/analytics/UsageCard.tsx
autonomous: true

must_haves:
  truths:
    - "User can view three resource usage cards (trucks, drivers, sites) showing current count vs limit"
    - "Usage cards display visual progress bar representing utilization percentage"
    - "System displays '∞' symbol for unlimited resources (when limit is -1 or percent is null)"
    - "Usage cards show color-coded indicators (green < 70%, yellow 70-90%, red > 90%)"
    - "Usage card data updates when user changes time range filter"
  artifacts:
    - path: "src/components/analytics/UsageCard.tsx"
      provides: "Reusable usage card component with progress bar"
      min_lines: 80
    - path: "src/types.ts"
      provides: "Analytics usage type definitions"
      contains: "ResourceUsage|AnalyticsUsage"
    - path: "src/constants.ts"
      provides: "Analytics usage API endpoint"
      exports: ["ANALYTICS_USAGE"]
  key_links:
    - from: "src/components/Analytics.tsx"
      to: "/api/v1/analytics/usage"
      via: "get() helper from api.ts"
      pattern: "ANALYTICS_USAGE"
    - from: "src/components/analytics/UsageCard.tsx"
      to: "src/components/Analytics.tsx"
      via: "props (title, current, limit, percent)"
      pattern: "UsageCard"
---

<objective>
Build usage overview cards that display resource utilization metrics for trucks, drivers, and sites with visual progress bars, color-coded status indicators, and unlimited resource handling.

Purpose: Provide users immediate visibility into resource utilization vs plan limits, enabling quick assessment of capacity and identifying resources approaching limits.

Output: Three usage cards (trucks, drivers, sites) in the analytics dashboard showing current/limit counts, progress bars with color coding, and infinity symbol for unlimited resources.
</objective>

<execution_context>
@C:\Users\1\.claude/get-shit-done/workflows/execute-plan.md
@C:\Users\1\.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-dashboard-layout/01-01-SUMMARY.md
@C:\logishift-frontend\docs\api\analytics.md
@C:\logishift-frontend\src\components\Analytics.tsx
@C:\logishift-frontend\src\constants.ts
@C:\logishift-frontend\src\services\api.ts
@C:\logishift-frontend\src\types.ts
</context>

<tasks>

<task type="auto">
  <name>Add Analytics Types and API Endpoint</name>
  <files>
    src/types.ts
    src/constants.ts
    src/services/api.ts
  </files>
  <action>
    Add TypeScript types and API configuration for analytics usage endpoint:

    1. In `src/types.ts`, add analytics-related type definitions at the end of the file:
    ```typescript
    // Analytics types
    export interface ResourceUsage {
      current: number;
      limit: number;
      utilization_percent: number | null;
    }

    export interface AnalyticsUsage {
      trucks: ResourceUsage;
      drivers: ResourceUsage;
      sites: ResourceUsage;
    }
    ```

    2. In `src/constants.ts`, add the ANALYTICS_USAGE endpoint to the API_ENDPOINTS object:
    ```typescript
    // In API_ENDPOINTS object, after ANALYTICS_EXPORT:
    ANALYTICS_USAGE: `${API_BASE_URL}/analytics/usage`,
    ```

    3. In `src/services/api.ts`, add a helper function for fetching analytics usage:
    ```typescript
    // After the get() helper, add:
    export const getAnalyticsUsage = async () => {
      return get(API_ENDPOINTS.ANALYTICS_USAGE);
    };
    ```

    These additions provide:
    - Type-safe resource usage data structures
    - Centralized endpoint configuration
    - Reusable API helper with built-in auth and error handling
  </action>
  <verify>
    1. Check `src/types.ts` contains ResourceUsage and AnalyticsUsage interfaces
    2. Check `src/constants.ts` contains ANALYTICS_USAGE endpoint
    3. Check `src/services/api.ts` exports getAnalyticsUsage function
    4. Run `npx tsc --noEmit` to verify no TypeScript errors
  </verify>
  <done>
    Analytics types (ResourceUsage, AnalyticsUsage) are defined in types.ts, ANALYTICS_USAGE endpoint is in constants.ts, and getAnalyticsUsage helper function exists in api.ts. All type-checking passes.
  </done>
</task>

<task type="auto">
  <name>Create UsageCard Component</name>
  <files>
    src/components/analytics/UsageCard.tsx
  </files>
  <action>
    Create a reusable UsageCard component at `src/components/analytics/UsageCard.tsx`:

    ```typescript
    import React from "react";
    import { ResourceUsage } from "../../types";

    interface UsageCardProps {
      title: string;
      icon: React.ComponentType<{ className?: string }>;
      usage: ResourceUsage;
    }

    // Helper to determine progress bar color with optional pulse animation
    const getUtilizationColor = (percent: number | null, limit: number): { bg: string; pulse: boolean } => {
      // Unlimited resources
      if (limit === -1 || percent === null) {
        return { bg: "bg-slate-200", pulse: false };
      }

      // Color coding: green < 70%, yellow 70-90%, red > 90%
      // Pulse animation for red (>90%) as per context decision
      if (percent < 70) return { bg: "bg-emerald-500", pulse: false };
      if (percent < 90) return { bg: "bg-amber-500", pulse: false };
      return { bg: "bg-red-500", pulse: true };
    };

    const getTextColor = (percent: number | null, limit: number): string => {
      if (limit === -1 || percent === null) return "text-slate-600";
      if (percent < 70) return "text-emerald-600";
      if (percent < 90) return "text-amber-600";
      return "text-red-600";
    };

    export const UsageCard: React.FC<UsageCardProps> = ({ title, icon: Icon, usage }) => {
      const { current, limit, utilization_percent: percent } = usage;
      const isUnlimited = limit === -1;
      const { bg: colorClass, pulse: shouldPulse } = getUtilizationColor(percent, limit);

      return (
        <div className="bg-white rounded-3xl shadow-lg p-6">
          {/* Header with icon and title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <Icon className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          </div>

          {/* Current / Limit display */}
          <div className="mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{current}</span>
              <span className="text-slate-400">/</span>
              <span className="text-xl font-medium text-slate-600">
                {isUnlimited ? (
                  // Infinity symbol with 60% opacity per context decision
                  <span className="text-2xl opacity-60">&infin;</span>
                ) : (
                  limit
                )}
              </span>
            </div>

            {/* Percentage display (not shown for unlimited) */}
            {!isUnlimited && percent !== null && (
              <p className={`text-sm font-medium mt-1 ${getTextColor(percent, limit)}`}>
                {percent}% использовано
              </p>
            )}
          </div>

          {/* Progress bar (only for limited resources) */}
          {!isUnlimited && percent !== null && (
            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${colorClass} ${
                  shouldPulse ? "animate-pulse" : ""
                }`}
                style={{ width: `${Math.min(percent, 100)}%` }}
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          )}

          {/* Unlimited indicator */}
          {isUnlimited && (
            <div className="h-2 bg-slate-200 rounded-full mt-3" />
          )}
        </div>
      );
    };
    ```

    Component features:
    - Icon display with indigo accent background
    - Large current count, slash separator, limit (or infinity symbol with 60% opacity)
    - Color-coded percentage text (emerald/amber/red)
    - Animated progress bar with rounded caps and 500ms ease-out transition
    - Subtle pulse animation on red progress bars (>90% utilization) for emphasis
    - Gray bar for unlimited resources
    - Accessible with ARIA attributes
  </action>
  <verify>
    1. Check `src/components/analytics/UsageCard.tsx` file exists
    2. Run `npx tsc --noEmit` to verify no TypeScript errors
    3. Verify component exports UsageCard as named export
  </verify>
  <done>
    UsageCard component exists with icon/title header, current/limit display, color-coded percentage text, progress bar with color thresholds, and infinity symbol for unlimited resources.
  </done>
</task>

<task type="auto">
  <name>Integrate Usage Cards into Analytics Dashboard</name>
  <files>
    src/components/Analytics.tsx
  </files>
  <action>
    Update the Analytics component to fetch and display usage cards:

    1. Add imports at the top:
    ```typescript
    import React, { useState, useEffect } from "react";
    import { Calendar, Download, Truck, Users, Building2 } from "lucide-react";
    import { API_ENDPOINTS } from "../constants";
    import { getAnalyticsUsage } from "../services/api";
    import { AnalyticsUsage } from "../types";
    import { UsageCard } from "./analytics/UsageCard";
    ```

    2. Add state for usage data:
    ```typescript
    const [usageData, setUsageData] = useState<AnalyticsUsage | null>(null);
    const [usageLoading, setUsageLoading] = useState(true);
    const [usageError, setUsageError] = useState<string | null>(null);
    ```

    3. Create a fetchUsage function and useEffect:
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

    useEffect(() => {
      fetchUsage();
    }, [selectedDays]); // Re-fetch when time range changes
    ```

    4. Update handleRangeChange to remove the setTimeout and instead trigger real data fetch:
    ```typescript
    const handleRangeChange = async (days: TimeRangePreset) => {
      if (days === selectedDays) return;
      setIsRangeLoading(true);
      setSelectedDays(days);
      // fetchUsage will be called by useEffect when selectedDays changes
      await fetchUsage();
      setIsRangeLoading(false);
    };
    ```

    5. Replace the placeholder cards in the grid with actual UsageCards:
    ```typescript
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
    ```

    Key changes:
    - Added state management for usage data, loading, and error
    - fetchUsage function using getAnalyticsUsage helper
    - useEffect dependency on selectedDays for auto-refresh
    - Loading skeletons with pulse animation
    - Error display with retry button
    - Three UsageCards with Truck, Users, and Building2 icons
  </action>
  <verify>
    1. Run `npx tsc --noEmit` to verify no TypeScript errors
    2. Run `npm run dev` and verify:
       - Three usage cards display with icons (Truck, Users, Building2)
       - Cards show current/limit values from API
       - Progress bars display with correct color coding
       - Infinity symbol appears for unlimited resources
       - Loading skeletons show while fetching
       - Error message displays on fetch failure
       - Changing time range triggers data refresh
  </verify>
  <done>
    Analytics dashboard displays three usage cards (trucks, drivers, sites) with current/limit values, color-coded progress bars, infinity symbol for unlimited resources, loading states, error handling with retry, and auto-refresh on time range change.
  </done>
</task>

</tasks>

<verification>
Overall phase verification:

1. **API Integration:**
   - ANALYTICS_USAGE endpoint defined in constants.ts
   - getAnalyticsUsage helper function in api.ts
   - ResourceUsage and AnalyticsUsage types in types.ts
   - Data fetches successfully from /api/v1/analytics/usage

2. **UsageCard Component:**
   - Icon displays with indigo accent background
   - Current value shows in large bold text
   - Limit shows with slash separator (or infinity for unlimited)
   - Percentage text appears with correct color (emerald < 70%, amber 70-90%, red > 90%)
   - Progress bar animates to correct width
   - Progress bar color matches percentage threshold
   - ARIA attributes present for accessibility

3. **Analytics Dashboard Integration:**
   - Three cards render: Trucks (Truck icon), Drivers (Users icon), Sites (Building2 icon)
   - Loading skeletons display during initial fetch
   - Error state shows message with retry button
   - Data refreshes when user changes time range (7/30/90 days)
   - Cards display in responsive grid (1 column mobile, 2 columns lg, 3 columns xl)

4. **Unlimited Resources:**
   - When limit === -1 or percent === null, infinity symbol displays
   - No percentage text shown for unlimited
   - Gray bar displays instead of colored progress

5. **Color Coding:**
   - Percent < 70%: emerald-500 (green)
   - Percent 70-89%: amber-500 (yellow)
   - Percent >= 90%: red-500 with subtle pulse animation

6. **Visual Details:**
   - Infinity symbol displays with 60% opacity for unlimited resources
   - Progress bar transition: 500ms ease-out
   - Pulse animation only on red (>90%) utilization bars
</verification>

<success_criteria>
Phase 2 is complete when:

1. Three usage cards display (trucks, drivers, sites) with current count vs limit
2. Visual progress bar shows utilization percentage
3. Infinity symbol displays for unlimited resources (limit === -1 or percent === null) with 60% opacity
4. Color-coded indicators work (green < 70%, yellow 70-90%, red > 90%)
5. Red progress bars (>90%) have subtle pulse animation
6. Usage data refreshes when time range filter changes
</success_criteria>

<output>
After completion, create `.planning/phases/02-usage-cards/02-01-SUMMARY.md`
</output>
