---
phase: 01-dashboard-layout
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/Layout.tsx
  - src/App.tsx
  - src/components/Analytics.tsx
  - src/constants.ts
autonomous: true

must_haves:
  truths:
    - "User can navigate to analytics page via new sidebar tab with BarChart icon"
    - "User can see time range selector (7/30/90 days) at top of analytics dashboard"
    - "User can change time range preset and dashboard updates immediately"
    - "User can click Export Report button to download CSV file"
    - "Dashboard displays in single-column layout on mobile and multi-column on desktop"
    - "All interactive elements are touch-friendly and accessible on mobile"
  artifacts:
    - path: "src/components/Analytics.tsx"
      provides: "Analytics dashboard container with controls layout"
      min_lines: 150
    - path: "src/components/Layout.tsx"
      provides: "Navigation entry point with BarChart icon"
      contains: "analytics"
    - path: "src/constants.ts"
      provides: "Analytics API endpoints"
      exports: ["ANALYTICS_EXPORT"]
  key_links:
    - from: "src/components/Layout.tsx"
      to: "src/components/Analytics.tsx"
      via: "activeTab state 'analytics'"
      pattern: "case \"analytics\""
    - from: "src/components/Analytics.tsx"
      to: "/api/v1/analytics/export"
      via: "fetch CSV export"
      pattern: "ANALYTICS_EXPORT"
---

<objective>
Build the foundational analytics dashboard structure: a new navigation entry point, responsive layout skeleton with time range controls, and CSV export functionality.

Purpose: This phase establishes the container and control mechanisms that all later analytics phases (usage cards, trends, driver rankings, insights) will fill with content.

Output: Working analytics page with navigation access, time range filtering, and CSV export capability.
</objective>

<execution_context>
@C:\Users\1\.claude/get-shit-done/workflows/execute-plan.md
@C:\Users\1\.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-dashboard-layout/01-CONTEXT.md
@C:\logishift-frontend\ARCHITECTURE-FRONT.md
@C:\logishift-frontend\AGENTS.md
@C:\logishift-frontend\docs\api\analytics.md
@C:\logishift-frontend\src\App.tsx
@C:\logishift-frontend\src\components\Layout.tsx
@C:\logishift-frontend\src\constants.ts
@C:\logishift-frontend\src\types.ts
</context>

<tasks>

<task type="auto">
  <name>Add Analytics Tab to Navigation Layout</name>
  <files>
    src/components/Layout.tsx
    src/App.tsx
  </files>
  <action>
    Add new analytics tab to the navigation sidebar:

    1. In `src/components/Layout.tsx`:
       - Import `BarChart` icon from lucide-react
       - Add analytics item to `mainItems` array AFTER dashboard (position: second item)
       - Use `id: "analytics"`, `label: "Аналитика"`, `icon: BarChart`
       - Set `roles: [UserRole.ADMIN, UserRole.FOREMAN]` (DRIVER excluded)
       - Place between dashboard and shifts items

    2. In `src/App.tsx`:
       - Add lazy-loaded Analytics component (following pattern of Shifts, Drivers, etc.):
         `const Analytics = lazy(() => import("./components/Analytics"));`
       - Add case in `renderContent()` for `"analytics"`:
         ```tsx
         case "analytics":
           return (
             <Suspense fallback={loadingFallback}>
               <Analytics />
             </Suspense>
           );
         ```

    3. Verify role-based access: Only ADMIN and FOREMAN should see the tab.
  </action>
  <verify>
    1. Check `src/components/Layout.tsx` contains analytics entry with BarChart icon
    2. Check `src/App.tsx` contains analytics case in renderContent switch
    3. Run `npm run dev` and verify:
       - ADMIN user sees "Аналитика" tab in sidebar (second position)
       - FOREMAN user sees "Аналитика" tab in sidebar
       - DRIVER user does NOT see "Аналитика" tab
  </verify>
  <done>
    Analytics tab appears in navigation sidebar with BarChart icon, positioned after Dashboard, accessible only to ADMIN and FOREMAN roles. Clicking tab shows lazy-loaded Analytics component.
  </done>
</task>

<task type="auto">
  <name>Create Analytics Component with Responsive Layout</name>
  <files>
    src/components/Analytics.tsx
  </files>
  <action>
    Create `src/components/Analytics.tsx` with responsive layout structure:

    Component structure:
    ```tsx
    import React, { useState } from "react";
    import { Download, Calendar } from "lucide-react";

    type TimeRangePreset = 7 | 30 | 90;

    const Analytics: React.FC = () => {
      const [selectedDays, setSelectedDays] = useState<TimeRangePreset>(30);
      const [isLoading, setIsLoading] = useState(false);

      // Calculate date range display
      const getDateRangeDisplay = (days: TimeRangePreset): string => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        const formatDate = (d: Date) => d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
        return `${formatDate(start)} - ${formatDate(end)}`;
      };

      const handleExport = async () => {
        setIsLoading(true);
        try {
          // Export logic (next task)
        } finally {
          setIsLoading(false);
        }
      };

      return (
        <div className="analytics-dashboard">
          {/* Top Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            {/* Time Range Selector - Left */}
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <div className="flex bg-slate-100 rounded-lg p-1">
                {[7, 30, 90] as TimeRangePreset[].map((days) => (
                  <button
                    key={days}
                    onClick={() => setSelectedDays(days)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      selectedDays === days
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {days} д
                  </button>
                ))}
              </div>
              <span className="text-sm text-slate-500 hidden sm:inline">
                {getDateRangeDisplay(selectedDays)}
              </span>
            </div>

            {/* Export Button - Right */}
            <button
              onClick={handleExport}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] touch-manipulation"
            >
              <Download className="w-4 h-4" />
              <span>{isLoading ? "Загрузка..." : "Экспорт"}</span>
            </button>
          </div>

          {/* Content Grid - Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Placeholder cards for now - will be filled in later phases */}
            <div className="bg-white rounded-3xl shadow-lg p-6 min-h-[200px] flex items-center justify-center">
              <p className="text-slate-400">Карточки аналитики будут здесь</p>
            </div>
            <div className="bg-white rounded-3xl shadow-lg p-6 min-h-[200px] flex items-center justify-center">
              <p className="text-slate-400">Графики будут здесь</p>
            </div>
            <div className="bg-white rounded-3xl shadow-lg p-6 min-h-[200px] flex items-center justify-center">
              <p className="text-slate-400">Статистика будет здесь</p>
            </div>
          </div>
        </div>
      );
    };

    export default Analytics;
    ```

    Layout requirements:
    - Top controls bar: flexbox, column on mobile, row on desktop (sm breakpoint)
    - Time range selector: left side, button group with active state styling
    - Export button: right side, icon + text, min-height 44px for touch
    - Content grid: 1 column mobile, 2 columns lg (1024px+), 3 columns xl (1280px+)
    - Card styling: rounded-3xl, shadow-lg, white background, consistent with design system
  </action>
  <verify>
    1. Check `src/components/Analytics.tsx` file exists
    2. Run `npm run dev` and verify:
       - Analytics page loads without errors
       - Top controls bar displays correctly on desktop (row layout)
       - Top controls bar stacks vertically on mobile (column layout)
       - Time range buttons are clickable and show active state
       - Export button is present with Download icon
       - Content grid shows 1 column on mobile, 2-3 columns on desktop
       - All buttons have min-height 44px for touch-friendly interaction
  </verify>
  <done>
    Analytics component renders with responsive layout: controls bar on top (time range left, export right), content grid below with responsive columns (1/2/3 based on screen width). Placeholder cards show layout structure.
  </done>
</task>

<task type="auto">
  <name>Implement Time Range State Management</name>
  <files>
    src/components/Analytics.tsx
  </files>
  <action>
    Enhance time range selector with proper state management and date range display:

    1. Add state management for time range:
       - `selectedDays` state already exists from Task 2
       - Add effect to log/track when time range changes (for future data fetching)
       - Display actual date range below buttons on all screen sizes

    2. Improve date range display:
       - Show on mobile: format as "24 янв - 31 янв"
       - Show on desktop: format as "24 янв - 31 янв"
       - Update immediately when user clicks different preset
       - Show loading state indicator when time range changes

    3. Add visual feedback for time range changes:
       - Brief loading state on the selector when changing
       - Smooth transition on preset buttons
       - Selected preset has distinct styling (white bg, indigo text, shadow)

    Update the component to:
    ```tsx
    const [selectedDays, setSelectedDays] = useState<TimeRangePreset>(30);
    const [isRangeLoading, setIsRangeLoading] = useState(false);

    const handleRangeChange = async (days: TimeRangePreset) => {
      if (days === selectedDays) return;
      setIsRangeLoading(true);
      setSelectedDays(days);
      // Simulate data fetch delay - will be real API call in later phases
      setTimeout(() => setIsRangeLoading(false), 500);
    };
    ```

    Update button click handler to use `handleRangeChange` instead of `setSelectedDays`.
    Add loading overlay or indicator on content area during `isRangeLoading`.
  </action>
  <verify>
    1. Click each time range preset (7, 30, 90 days)
    2. Verify:
       - Selected preset shows active styling immediately
       - Date range display updates to show correct date range
       - Brief loading indicator appears when changing ranges
       - Clicking already-selected preset does nothing (no reload)
       - Date range format is Russian locale (DD MMM - DD MMM)
  </verify>
  <done>
    Time range selector manages state correctly: clicking presets updates selectedDays, displays correct date range in Russian format, shows loading state during transition, and prevents redundant re-selection.
  </done>
</task>

<task type="auto">
  <name>Implement CSV Export Functionality</name>
  <files>
    src/components/Analytics.tsx
    src/constants.ts
  </files>
  <action>
    Add CSV export functionality with proper filename and error handling:

    1. First, add analytics endpoints to `src/constants.ts`:
       ```typescript
       // Add to API_ENDPOINTS object:
       ANALYTICS_EXPORT: `${API_BASE_URL}/analytics/export`,
       ```

    2. Implement export function in Analytics component:
       ```tsx
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
       ```

    3. Import API_ENDPOINTS from constants at top of component

    Export behavior:
    - Uses current selectedDays value (7, 30, or 90)
    - Requests CSV format from backend
    - Generates filename: logishift-analytics-[30d]-2025-01-31.csv
    - Shows loading state on button during fetch
    - Handles errors with user-friendly message
    - Revokes blob URL after download to prevent memory leaks
  </action>
  <verify>
    1. Check `src/constants.ts` contains ANALYTICS_EXPORT endpoint
    2. Run `npm run dev` and test export:
       - Click "Экспорт" button
       - Verify button shows "Загрузка..." during fetch
       - Verify CSV file downloads with correct filename format
       - Open downloaded CSV and verify it contains data (with UTF-8 BOM for Excel)
       - Test with different time ranges selected (verify days parameter is passed)
  </verify>
  <done>
    Export button downloads CSV file with filename containing preset and date (e.g., logishift-analytics-30d-2025-01-31.csv). Button shows loading state during fetch. Error handling shows user-friendly message on failure.
  </done>
</task>

</tasks>

<verification>
Overall phase verification:

1. **Navigation Access:**
   - ADMIN and FOREMAN users see "Аналитика" tab in sidebar (second position after Dashboard)
   - DRIVER users do NOT see analytics tab
   - Clicking tab navigates to analytics page without errors

2. **Time Range Selector:**
   - Three preset buttons visible: 7 д, 30 д, 90 д
   - Clicking preset updates selected state immediately
   - Date range display shows correct range (e.g., "24 янв - 31 янв")
   - Selected preset has distinct visual styling (white bg, indigo text)
   - Date range updates to reflect selected preset

3. **Export Functionality:**
   - Export button visible with Download icon and "Экспорт" label
   - Clicking button triggers CSV download
   - Filename format: logishift-analytics-[preset]d-[date].csv
   - Button shows "Загрузка..." during export
   - Downloaded CSV contains data with proper encoding

4. **Responsive Layout:**
   - Desktop (>1024px): Controls in row, content grid 2-3 columns
   - Tablet (768-1024px): Controls stack, content grid 2 columns
   - Mobile (<768px): Controls stack vertically, single column content
   - All interactive elements have min-height 44px for touch

5. **Touch-Friendly Interaction:**
   - All buttons are tappable (min-height 44px)
   - No hover-only interactions
   - Feedback on all touch actions (loading states, active states)
</verification>

<success_criteria>
Phase 1 is complete when:

1. User can navigate to analytics page via sidebar tab (ADMIN/FOREMAN only)
2. Time range selector (7/30/90 days) displays at top of dashboard
3. Changing time range preset updates date range display immediately
4. Export Report button downloads CSV file with correct filename
5. Layout is single-column on mobile, multi-column on desktop
6. All interactive elements are touch-friendly (min-height 44px)
</success_criteria>

<output>
After completion, create `.planning/phases/01-dashboard-layout/01-01-SUMMARY.md`
</output>
