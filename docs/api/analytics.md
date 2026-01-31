# Analytics API Documentation

## Overview

The Analytics API provides comprehensive usage metrics and insights for resource tracking and plan optimization. All endpoints require JWT authentication and automatically filter data by the tenant's ID from the token.

**Base URL:** `https://pwa.kontrolsmen.ru/api/v1`

**Authentication:** Bearer JWT token (required for all endpoints)

## Frontend Integration

### Adding Analytics Endpoints to constants.ts

```typescript
// src/constants.ts

export const API_ENDPOINTS = {
  // ... existing endpoints

  // Analytics (v2.5 Phase 4)
  ANALYTICS_USAGE: `${API_BASE_URL}/analytics/usage`,
  ANALYTICS_TRENDS: `${API_BASE_URL}/analytics/trends`,
  ANALYTICS_DRIVERS: `${API_BASE_URL}/analytics/drivers`,
  ANALYTICS_SUMMARY: `${API_BASE_URL}/analytics/summary`,
  ANALYTICS_INSIGHTS: `${API_BASE_URL}/analytics/insights`,
  ANALYTICS_SHIFTS: `${API_BASE_URL}/analytics/shifts`,
  ANALYTICS_SITES: `${API_BASE_URL}/analytics/sites`,
  ANALYTICS_EXPORT: `${API_BASE_URL}/analytics/export`,
};
```

### API Service Usage Examples

```typescript
// src/services/api.ts or create analytics.ts

import { get } from './api';
import { API_ENDPOINTS } from '../constants';

// Get current resource usage vs plan limits
export const getAnalyticsUsage = async () => {
  return get(API_ENDPOINTS.ANALYTICS_USAGE);
};

// Get usage trends for specified period
export const getAnalyticsTrends = async (days: number = 30) => {
  return get(`${API_ENDPOINTS.ANALYTICS_TRENDS}?days=${days}`);
};

// Get top drivers ranking
export const getAnalyticsDrivers = async (limit: number = 10, days: number = 30) => {
  return get(`${API_ENDPOINTS.ANALYTICS_DRIVERS}?limit=${limit}&days=${days}`);
};

// Get resource summary
export const getAnalyticsSummary = async () => {
  return get(API_ENDPOINTS.ANALYTICS_SUMMARY);
};

// Get plan optimization insights
export const getAnalyticsInsights = async (days: number = 30) => {
  return get(`${API_ENDPOINTS.ANALYTICS_INSIGHTS}?days=${days}`);
};

// Get shift statistics
export const getAnalyticsShifts = async (days: number = 30) => {
  return get(`${API_ENDPOINTS.ANALYTICS_SHIFTS}?days=${days}`);
};

// Get site utilization
export const getAnalyticsSites = async (days: number = 30) => {
  return get(`${API_ENDPOINTS.ANALYTICS_SITES}?days=${days}`);
};

// Export data as JSON or CSV
export const getAnalyticsExport = async (days: number = 30, format: 'json' | 'csv' = 'json') => {
  const response = await fetch(`${API_ENDPOINTS.ANALYTICS_EXPORT}?days=${days}&format=${format}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('logishift_auth_token')}`,
    },
  });

  if (format === 'csv') {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    return null;
  }

  return response.json();
};
```

## React Component Example

### Analytics Dashboard Component

```typescript
// src/components/AnalyticsDashboard.tsx

import React, { useState, useEffect } from 'react';
import { getAnalyticsUsage, getAnalyticsTrends, getAnalyticsInsights } from '../services/analytics';

interface AnalyticsData {
  usage?: {
    trucks: { current: number; limit: number; utilization_percent: number | null };
    drivers: { current: number; limit: number; utilization_percent: number | null };
    sites: { current: number; limit: number; utilization_percent: number | null };
  };
  trends?: Array<{
    date: string;
    shifts_count: number;
    hours_worked: number;
    salary_paid: number;
  }>;
  insights?: {
    underutilizedResources: {
      trucks: string[];
      sites: string[];
    };
    nearLimitResources: {
      trucks: { current: number; limit: number; percent: number } | null;
    };
    costPerShift: number;
    recommendedActions: string[];
  };
}

export const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [usage, trends, insights] = await Promise.all([
          getAnalyticsUsage(),
          getAnalyticsTrends(30), // Last 30 days
          getAnalyticsInsights(30),
        ]);

        setData({ usage, trends, insights });
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics');
        if (err.message?.includes('Срок действия подписки истек')) {
          // Show subscription expired notification
          setError('Ваша подписка истекла. Обновите её для доступа к аналитике.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <div>Loading analytics...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="analytics-dashboard">
      {/* Usage Cards */}
      <div className="usage-cards">
        <UsageCard
          title="Грузовики"
          current={data.usage?.trucks.current || 0}
          limit={data.usage?.trucks.limit || 0}
          percent={data.usage?.trucks.utilization_percent}
        />
        <UsageCard
          title="Водители"
          current={data.usage?.drivers.current || 0}
          limit={data.usage?.drivers.limit || 0}
          percent={data.usage?.drivers.utilization_percent}
        />
        <UsageCard
          title="Объекты"
          current={data.usage?.sites.current || 0}
          limit={data.usage?.sites.limit || 0}
          percent={data.usage?.sites.utilization_percent}
        />
      </div>

      {/* Insights */}
      {data.insights && (
        <div className="insights-section">
          <h3>Рекомендации</h3>
          <ul>
            {data.insights.recommendedActions.map((action, idx) => (
              <li key={idx}>{action}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Trends Chart - integrate with your charting library */}
      {/* ... */}
    </div>
  );
};

interface UsageCardProps {
  title: string;
  current: number;
  limit: number;
  percent: number | null;
}

const UsageCard: React.FC<UsageCardProps> = ({ title, current, limit, percent }) => {
  const isUnlimited = limit === -1;

  return (
    <div className="usage-card">
      <h4>{title}</h4>
      <div className="usage-stats">
        <span className="current">{current}</span>
        <span className="separator">/</span>
        <span className="limit">{isUnlimited ? '∞' : limit}</span>
      </div>
      {!isUnlimited && percent !== null && (
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${percent}%` }}
            role="progressbar"
          />
          <span className="percent">{percent}%</span>
        </div>
      )}
    </div>
  );
};
```

## Endpoint Reference

### 1. GET /analytics/usage

Get current resource usage compared to plan limits.

**Response:**
```json
{
  "trucks": {
    "current": 8,
    "limit": 10,
    "utilization_percent": 80
  },
  "drivers": {
    "current": 12,
    "limit": -1,
    "utilization_percent": null
  },
  "sites": {
    "current": 5,
    "limit": 10,
    "utilization_percent": 50
  }
}
```

**Notes:**
- `limit: -1` indicates unlimited resources
- `utilization_percent: null` for unlimited plans

### 2. GET /analytics/trends

Get time-series usage trends with daily aggregation.

**Query Parameters:**
- `days` (optional): Number of days (1-365, default: 30)

**Example Request:**
```
GET /analytics/trends?days=90
```

**Response:**
```json
[
  {
    "date": "2024-01-15",
    "shifts_count": 15,
    "hours_worked": 67.5,
    "salary_paid": 27000.00
  }
]
```

### 3. GET /analytics/drivers

Get top drivers ranked by hours worked.

**Query Parameters:**
- `limit` (optional): Number of drivers (1-100, default: 10)
- `days` (optional): Analysis period (1-365, default: 30)

**Example Request:**
```
GET /analytics/drivers?limit=5&days=90
```

**Response:**
```json
[
  {
    "driver_id": 5,
    "driver_name": "Иван Иванов",
    "shifts_count": 45,
    "hours_worked": 202.5,
    "salary_paid": 81000.00
  }
]
```

### 4. GET /analytics/summary

Get comprehensive resource summary with status breakdown.

**Response:**
```json
{
  "trucks": {
    "total": 10,
    "active": 8,
    "in_work": 3,
    "available": 5
  },
  "drivers": {
    "total": 12,
    "active": 10,
    "in_work": 3,
    "available": 7
  },
  "sites": {
    "total": 5,
    "active": 5
  }
}
```

**Field Descriptions:**
- `total`: Total count in tenant's dictionary
- `active`: Active (not deleted) items
- `in_work`: Currently assigned to active shifts
- `available`: Active but not in work

### 5. GET /analytics/insights

Get plan optimization insights and recommendations.

**Query Parameters:**
- `days` (optional): Analysis period (1-365, default: 30)

**Response:**
```json
{
  "underutilizedResources": {
    "trucks": ["МАЗ-533", "КАМАЗ-55111"],
    "sites": ["Склад №3"]
  },
  "nearLimitResources": {
    "trucks": {
      "current": 9,
      "limit": 10,
      "percent": 90
    }
  },
  "costPerShift": 2500.00,
  "recommendedActions": [
    "Рассмотрите downgrade плана: 2 машины используются редко"
  ]
}
```

### 6. GET /analytics/shifts

Get shift statistics and duration metrics.

**Query Parameters:**
- `days` (optional): Analysis period (1-365, default: 30)

**Response:**
```json
{
  "total_shifts": 150,
  "finished_shifts": 145,
  "completion_rate": 96.67,
  "duration_stats": {
    "avg_hours": 4.5,
    "min_hours": 1.0,
    "max_hours": 12.0,
    "median_hours": 4.2
  }
}
```

### 7. GET /analytics/sites

Get site utilization metrics.

**Query Parameters:**
- `days` (optional): Analysis period (1-365, default: 30)

**Response:**
```json
[
  {
    "site_id": 1,
    "site_name": "Стройплощадка №1",
    "shifts_count": 50,
    "unique_drivers": 8,
    "hours_worked": 225.0
  }
]
```

### 8. GET /analytics/export

Export usage data as JSON or CSV file.

**Query Parameters:**
- `days` (optional): Number of days (1-365, default: 30)
- `format` (optional): Export format - `json` or `csv` (default: `json`)

**Example Request:**
```
GET /analytics/export?days=90&format=csv
```

**CSV Response:**
- Content-Type: `text/csv; charset=utf-8`
- Content-Disposition: `attachment; filename="usage_report_2024-01-30.csv"`
- UTF-8 BOM for Excel compatibility
- Headers: Дата; Смен; Часов; Выплачено
- Date format: DD.MM.YYYY

**JSON Response:**
```json
[
  {
    "date": "2024-01-15",
    "shifts_count": 15,
    "hours_worked": 67.5,
    "salary_paid": 27000.00
  }
]
```

## Error Handling

### Subscription Expired (403)

When the subscription has expired, write operations are blocked but read operations (including analytics) remain accessible.

**Error Response:**
```json
{
  "error": "Срок действия подписки истек"
}
```

**Frontend Handling:**
```typescript
try {
  const data = await getAnalyticsUsage();
  // Process data
} catch (error: any) {
  if (error.message?.includes('Срок действия подписки истек')) {
    // Show subscription expired banner
    showSubscriptionExpiredNotification();
  } else {
    // Handle other errors
    showGenericError(error.message);
  }
}
```

### Validation Errors (400)

**Query Parameter Validation:**
- `days`: Must be between 1 and 365
- `limit`: Must be between 1 and 100
- `format`: Must be either `json` or `csv`

**Error Response:**
```json
{
  "error": "Invalid parameter value",
  "details": {
    "parameter": "days",
    "constraints": {
      "min": 1,
      "max": 365
    }
  }
}
```

## TypeScript Types

```typescript
// src/types/analytics.ts

export interface AnalyticsUsage {
  trucks: ResourceUsage;
  drivers: ResourceUsage;
  sites: ResourceUsage;
}

export interface ResourceUsage {
  current: number;
  limit: number;
  utilization_percent: number | null;
}

export interface AnalyticsTrend {
  date: string;
  shifts_count: number;
  hours_worked: number;
  salary_paid: number;
}

export interface AnalyticsDriver {
  driver_id: number;
  driver_name: string;
  shifts_count: number;
  hours_worked: number;
  salary_paid: number;
}

export interface AnalyticsSummary {
  trucks: ResourceSummary;
  drivers: ResourceSummary;
  sites: SiteSummary;
}

export interface ResourceSummary {
  total: number;
  active: number;
  in_work: number;
  available: number;
}

export interface SiteSummary {
  total: number;
  active: number;
}

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

export interface AnalyticsShifts {
  total_shifts: number;
  finished_shifts: number;
  completion_rate: number;
  duration_stats: DurationStats;
}

export interface DurationStats {
  avg_hours: number;
  min_hours: number;
  max_hours: number;
  median_hours: number;
}

export interface AnalyticsSite {
  site_id: number;
  site_name: string;
  shifts_count: number;
  unique_drivers: number;
  hours_worked: number;
}
```

## Best Practices

1. **Caching**: Cache analytics data for 5-15 minutes to reduce API load
2. **Error Boundaries**: Use React error boundaries for analytics components
3. **Loading States**: Show skeleton screens while fetching analytics
4. **Progressive Enhancement**: Load critical analytics first, then optional insights
5. **CSV Download**: Handle CSV downloads with proper file naming and encoding
6. **Subscription Check**: Verify subscription status before displaying subscription-only features

## Integration Checklist

- [ ] Add analytics endpoints to `src/constants.ts`
- [ ] Create analytics service functions in `src/services/analytics.ts`
- [ ] Add TypeScript types for analytics responses
- [ ] Create analytics dashboard component
- [ ] Add usage cards component
- [ ] Implement insights/recommendations display
- [ ] Add CSV export functionality
- [ ] Handle subscription expired errors
- [ ] Add loading and error states
- [ ] Test with different tenant plans (limited/unlimited)
- [ ] Verify multi-tenant isolation (only see your own data)
