# Analytics Dashboard (v1.5)

## Overview

The Analytics Dashboard provides comprehensive insights into resource utilization, performance trends, and optimization opportunities for LogiShift administrators and foremen. Shipped in v1.5 (2026-02-01), the dashboard enables data-driven decision making through interactive visualizations and actionable recommendations.

## Features

### 1. Usage Overview Cards

Real-time resource utilization tracking for plan management:

- **Trucks Usage** - Current trucks in use vs plan limit with progress bar
- **Drivers Usage** - Active drivers vs plan limit
- **Sites Usage** - Active work sites vs plan limit
- **Color-coded Indicators:**
  - 🟢 Green: < 70% utilization (healthy)
  - 🟡 Yellow: 70-90% utilization (approaching limit)
  - 🔴 Red: > 90% utilization (near/at capacity)
- **Unlimited Resources** - Displays ∞ symbol when plan limit is -1

**API Endpoint:** `GET /api/v1/analytics/usage`

### 2. Trends Visualization

Interactive time-series charts showing operational metrics over time:

- **Shifts Count** - Daily shift volume
- **Hours Worked** - Total hours per day
- **Salary Paid** - Daily labor costs in RUB
- **Time Range Selection** - 7, 30, or 90 days
- **Interactive Tooltips** - Hover for exact values
- **Metric Toggle** - Switch between metrics with tab controls

**Technology:** Recharts library with bar visualization
**API Endpoint:** `GET /api/v1/analytics/trends?days={n}`

### 3. Driver Performance Rankings

Ranked leaderboard of top drivers by hours worked:

- **Top 10 Drivers** - Sorted by hours worked (descending)
- **Medal Icons** - 🥇🥈🥉 for top 3 performers
- **Sortable Columns** - Click to sort by shifts, hours, or salary
- **Performance Metrics:**
  - Driver name
  - Shifts count
  - Hours worked
  - Salary paid (RUB)
- **Tie Handling** - Same hours = same rank

**API Endpoint:** `GET /api/v1/analytics/drivers?days={n}&limit={n}`

### 4. Insights Panel

Optimization recommendations and resource warnings:

#### Cost Per Shift
- Average labor cost per shift (RUB)
- Russian locale formatting

#### Underutilized Resources
- Trucks with low usage (< 50%)
- Sites with low activity
- Amber alert styling

#### Near-Limit Warnings
- Resources approaching plan limits (> 80%)
- Current/limit/percentage display
- Orange warning styling

#### Recommended Actions
- Actionable optimization suggestions
- Examples:
  - "Reduce truck count to optimize costs"
  - "Upgrade plan for more capacity"
  - "Increase site utilization"

**API Endpoint:** `GET /api/v1/analytics/insights?days={n}`

### 5. CSV Export

Export analytics data for offline analysis:

- **Filename Format:** `logishift-analytics-{preset}-{date}.csv`
- **UTF-8 BOM** - Excel-compatible encoding
- **Time Range** - Exports data for selected period
- **Authentication** - Requires valid JWT token

**API Endpoint:** `GET /api/v1/analytics/export?days={n}&format=csv`

### 6. Error Handling

Comprehensive error management and recovery:

- **Loading States** - Skeleton components during data fetch
- **Subscription Expired (403)** - Read-only mode without logout
  - Yellow banner notification
  - Data shows empty states (not errors)
- **API Errors** - Retry button with error messages
- **Global Refresh** - Refresh all data sources simultaneously
- **React Error Boundary** - Catches and recovers from render errors

### 7. Styling & Design

Professional industrial aesthetic matching LogiShift design system:

- **Typography** - JetBrains Mono font for all chart elements
- **Color Palette** - Navy/Indigo (indigo-600 to indigo-900)
- **Card Styling** - Rounded-3xl corners, p-6 padding
- **Icons** - Lucide React icons throughout
- **Responsive** - Single-column mobile, multi-column desktop

## User Interface

### Navigation

- **Tab Position:** Second tab after Dashboard
- **Access Control:** ADMIN and FOREMAN roles only
- **Driver Role:** Analytics tab hidden

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Time Range: [7 д] [30 д] [90 д]    [Экспорт] [Обновить]    │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │  Trucks    │ │  Drivers   │ │   Sites    │              │
│  │  8 / 10    │ │  15 / 20   │ │   5 / 8    │              │
│  │  ▓▓▓▓▓▓▓▓░░ │ │  ▓▓▓▓▓▓░░░░ │ │  ▓▓▓▓▓░░░░░ │              │
│  └────────────┘ └────────────┘ └────────────┘              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Trends Chart                                    [Смены] ││
│  │  ┌─────┐                                              ││
│  │  │  ███│     ████    █████                          ││
│  │  │  ███│     ████    █████                          ││
│  │  └─────┘                                              ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐ ┌───────────────────────────┐│
│  │  Driver Rankings         │ │  Insights                 ││
│  │  🥇 Ivanov     150h      │ │  💰 Cost/Shift: 12,500₽  ││
│  │  🥈 Petrov      142h      │ │  ⚠️  Underutilized:       ││
│  │  🥉 Sidorov     138h      │ │     Truck #3, Site B     ││
│  │  4. Kozlov     125h      │ │  📊 Near Limit:           ││
│  │  ...                      │ │     Drivers (18/20)      ││
│  └──────────────────────────┘ └───────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Technical Implementation

### Frontend Components

**Main Container:**
- `src/components/Analytics.tsx` - Orchestrator component with time range state

**Child Components:**
- `src/components/analytics/UsageCard.tsx` - Resource usage cards
- `src/components/analytics/TrendsChart.tsx` - Recharts bar visualization
- `src/components/analytics/DriverRankings.tsx` - Sortable driver table
- `src/components/analytics/InsightsPanel.tsx` - Optimization recommendations
- `src/components/analytics/ErrorBoundary.tsx` - React error catching

### Type Definitions

```typescript
// Resource Usage
interface ResourceUsage {
  current: number;
  limit: number;
  utilization_percent: number | null;
}

// Analytics Usage
interface AnalyticsUsage {
  trucks: ResourceUsage;
  drivers: ResourceUsage;
  sites: ResourceUsage;
}

// Trend Data
interface AnalyticsTrend {
  date: string;        // "2026-01-15"
  shifts_count: number;
  hours_worked: number;
  salary_paid: number;
}

// Driver Performance
interface AnalyticsDriver {
  driver_id: number;
  driver_name: string;
  shifts_count: number;
  hours_worked: number;
  salary_paid: number;
}

// Insights
interface AnalyticsInsights {
  underutilized_trucks: string[];
  underutilized_sites: string[];
  near_limit: NearLimitResource[];
  cost_per_shift: number;
  recommended_actions: string[];
}
```

### State Management

**Parent State (Analytics.tsx):**
```typescript
const [selectedDays, setSelectedDays] = useState<TimeRangePreset>(30);
const [subscriptionExpired, setSubscriptionExpired] = useState(false);
const [usageData, setUsageData] = useState<AnalyticsUsage | null>(null);
const [trendsData, setTrendsData] = useState<AnalyticsTrend[]>([]);
// ... error states, loading states
```

**Child State (Self-Managed):**
- `TrendsChart` - `selectedMetric` (shifts/hours/salary)
- `DriverRankings` - `sortField`, `sortDirection`
- `InsightsPanel` - `insights`, loading, error

### Data Flow

```
User changes time range (7/30/90 days)
  ↓
handleRangeChange updates selectedDays
  ↓
useEffect triggers fetch functions
  ↓
Promise.all parallel API calls:
  - getAnalyticsUsage(days)
  - getAnalyticsTrends(days)
  - Child components fetch independently
  ↓
Components update with new data
  ↓
Loading skeletons → Display data
```

### Error Handling Flow

```
API Error (403, 500, network)
  ↓
apiRequest throws typed ApiError
  ↓
handleApiError checks error.type
  ↓
SUBSCRIPTION_EXPIRED → setSubscriptionExpired(true)
  → Show banner, keep data read-only
OTHER ERROR → setGlobalError(message)
  → Show error UI with retry button
```

## API Integration

### Authentication

All analytics endpoints require JWT authentication:

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### Time Range Parameter

Most endpoints accept `days` query parameter:

```typescript
// 7 days
GET /api/v1/analytics/trends?days=7

// 30 days (default)
GET /api/v1/analytics/trends?days=30

// 90 days
GET /api/v1/analytics/trends?days=90
```

### Response Format

**Usage Endpoint:**
```json
{
  "trucks": {
    "current": 8,
    "limit": 10,
    "utilization_percent": 80.0
  },
  "drivers": {
    "current": 15,
    "limit": 20,
    "utilization_percent": 75.0
  },
  "sites": {
    "current": 5,
    "limit": -1,
    "utilization_percent": null
  }
}
```

**Trends Endpoint:**
```json
[
  {
    "date": "2026-01-15",
    "shifts_count": 12,
    "hours_worked": 96.5,
    "salary_paid": 121500.00
  },
  ...
]
```

**Drivers Endpoint:**
```json
[
  {
    "driver_id": 123,
    "driver_name": "Ivanov Ivan",
    "shifts_count": 15,
    "hours_worked": 120.0,
    "salary_paid": 150000.00
  },
  ...
]
```

**Insights Endpoint:**
```json
{
  "underutilized_trucks": [" Truck #3", " Truck #7"],
  "underutilized_sites": [" Site B"],
  "near_limit": [
    {
      "resource_type": "drivers",
      "current": 18,
      "limit": 20,
      "utilization_percent": 90.0
    }
  ],
  "cost_per_shift": 12500.00,
  "recommended_actions": [
    "Reduce truck count to optimize costs",
    "Upgrade plan for more driver capacity"
  ]
}
```

## Performance Considerations

### Optimization Opportunities (Technical Debt)

1. **Double API Fetching** - Time range changes trigger duplicate API calls
   - **Issue:** `handleRangeChange` and `useEffect` both fetch data
   - **Impact:** 2x API load on time range changes
   - **Priority:** LOW (works correctly, just inefficient)
   - **Fix:** Remove Promise.all, rely solely on useEffect

2. **Broken Time Range Shortcuts** - DriverRankings empty state buttons
   - **Issue:** CustomEvents not wired to parent
   - **Impact:** Buttons don't work when no data
   - **Priority:** MEDIUM (broken user interaction)
   - **Fix:** Remove buttons or accept onTimeRangeChange prop

3. **Unused Global Error State** - globalError set but never displayed
   - **Issue:** Wasted state management
   - **Impact:** None (cosmetic)
   - **Priority:** LOW
   - **Fix:** Remove state or add global error banner

### Caching Strategy

Analytics data changes infrequently (daily aggregated data). Consider:
- **Client-Side Cache:** 5-15 minute cache lifetime
- **Stale-While-Revalidate:** Show cached data, refresh in background
- **React Query:** Automatic caching and refetching (future enhancement)

## Accessibility

- **Touch Targets:** 44px minimum for interactive elements
- **ARIA Labels:** Progress bars have proper roles and values
- **Keyboard Navigation:** All controls accessible via keyboard
- **Screen Reader Support:** Semantic HTML and proper labeling
- **Color Contrast:** WCAG AA compliant color ratios

## Responsive Design

### Mobile (< 768px)
- Single column layout
- Full-width cards
- Touch-manipulation CSS class
- Sticky table headers for horizontal scrolling
- Simplified controls (vertical stacking)

### Desktop (≥ 1024px)
- Multi-column grid layout
- 2 columns on lg (1024px+)
- 3 columns on xl (1280px+)
- Hover states on interactive elements
- Optimized for mouse interaction

## Future Enhancements (v1.6+)

### Advanced Analytics
- Custom date range picker (beyond 7/30/90 presets)
- Period comparison (week over week, month over month)
- Real-time updates via polling or WebSocket
- Drill-down to individual shifts for specific days
- Site-level analytics breakdown

### Export & Reporting
- Export charts as images (PNG/SVG)
- Schedule automated email reports
- Custom report templates
- PDF generation for printing

### Performance
- React Query for data fetching and caching
- Virtualization for large driver lists
- Chart performance optimization for large datasets

## Documentation Links

- **API Reference:** [Analytics API Documentation](./api/analytics.md)
- **Architecture:** [Architecture Overview](./architecture/overview.md)
- **Security:** [Authentication & Authorization](./architecture/security.md)

---

**Version:** 1.5.0
**Shipped:** 2026-02-01
**Status:** ✅ Production Ready
