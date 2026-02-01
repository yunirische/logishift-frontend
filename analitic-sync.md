---
title: Analytics API Data Sync
domain: backend
related:
  - backend/api-reference.md
  - ../src/services/usage-analytics.service.ts
  - ../src/web-api.controller.ts
last_updated: 2026-02-01
context_priority: critical
---

# Analytics API Data Sync - Frontend Integration Guide

## Critical Issue: TypeError - Cannot read properties of undefined (reading 'trucks')

### Problem Description
Frontend error: `Analytics ErrorBoundary caught: TypeError: Cannot read properties of undefined (reading 'trucks')`

**Root Cause:** Error responses from analytics endpoints return `{ error: string }` with HTTP 500 status, but frontend code may be attempting to access `.trucks` on error objects without proper error handling.

---

## Analytics Endpoints Overview

### Base URL
```
Production: https://pwa.kontrolsmen.ru/api/v1
Local: http://localhost:3000/api/v1
```

### Authentication
All analytics endpoints require JWT authentication:
```typescript
headers: {
  'Authorization': `Bearer ${token}`
}
```

---

## Endpoint 1: Current Usage

### `GET /analytics/usage`

**Purpose:** Get current resource usage vs plan limits

**Success Response (200):**
```json
{
  "trucks": {
    "current": 8,
    "limit": 10,
    "utilizationPercentage": 80
  },
  "drivers": {
    "current": 12,
    "limit": -1,
    "utilizationPercentage": 0
  },
  "sites": {
    "current": 5,
    "limit": 10,
    "utilizationPercentage": 50
  }
}
```

**Field Descriptions:**
| Field | Type | Description |
|-------|------|-------------|
| `current` | number | Current count of active resources |
| `limit` | number | Plan limit (-1 = unlimited) |
| `utilizationPercentage` | number | Usage % (0 for unlimited plans) |

**Error Response (500):**
```json
{
  "error": "Тенант не найден"
}
```

**Common Error Causes:**
1. Invalid/expired JWT token
2. Tenant not found in database
3. Tenant has no associated plan

---

## Endpoint 2: Usage Trends

### `GET /analytics/trends?days=30`

**Purpose:** Get daily usage trends over time

**Query Parameters:**
| Parameter | Type | Default | Min | Max | Description |
|-----------|------|---------|-----|-----|-------------|
| `days` | integer | 30 | 1 | 365 | Number of days to analyze |

**Success Response (200):**
```json
[
  {
    "date": "2026-01-15",
    "shiftsCount": 12,
    "totalHours": 96.5,
    "totalSalary": 38600,
    "finishedShiftsCount": 10
  },
  {
    "date": "2026-01-16",
    "shiftsCount": 15,
    "totalHours": 120,
    "totalSalary": 48000,
    "finishedShiftsCount": 14
  }
]
```

**Field Descriptions:**
| Field | Type | Description |
|-------|------|-------------|
| `date` | string | Date in YYYY-MM-DD format |
| `shiftsCount` | number | Total shifts created |
| `totalHours` | number | Total hours worked (decimal) |
| `totalSalary` | number | Total salary paid (decimal) |
| `finishedShiftsCount` | number | Number of completed shifts |

**Error Response (400):**
```json
{
  "error": "Параметр days должен быть от 1 до 365"
}
```

---

## Endpoint 3: Resource Summary

### `GET /analytics/summary`

**Purpose:** Get detailed resource usage summary

**Success Response (200):**
```json
{
  "trucks": {
    "total": 8,
    "inUse": 3,
    "available": 2,
    "limit": 10
  },
  "drivers": {
    "total": 12,
    "active": 5,
    "available": -1,
    "limit": -1
  },
  "sites": {
    "total": 5,
    "active": 3,
    "available": 5,
    "limit": 10
  }
}
```

**Field Descriptions:**
| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total active resources |
| `inUse` / `active` | number | Currently in use |
| `available` | number | Available slots (-1 = unlimited) |
| `limit` | number | Plan limit (-1 = unlimited) |

---

## Endpoint 4: Top Drivers

### `GET /analytics/drivers?limit=10&days=30`

**Purpose:** Get top drivers by hours worked

**Query Parameters:**
| Parameter | Type | Default | Min | Max | Description |
|-----------|------|---------|-----|-----|-------------|
| `limit` | integer | 10 | 1 | 100 | Number of drivers to return |
| `days` | integer | 30 | 1 | - | Analysis period |

**Success Response (200):**
```json
[
  {
    "driverId": 5,
    "driverName": "Иван Иванов",
    "totalHours": 156.5,
    "totalSalary": 62600,
    "shiftsCount": 32
  },
  {
    "driverId": 8,
    "driverName": "Петр Петров",
    "totalHours": 142,
    "totalSalary": 56800,
    "shiftsCount": 28
  }
]
```

---

## Endpoint 5: Plan Optimization Insights

### `GET /analytics/insights?days=30`

**Purpose:** Get plan usage recommendations

**Query Parameters:**
| Parameter | Type | Default | Min | Max | Description |
|-----------|------|---------|-----|-----|-------------|
| `days` | integer | 30 | 1 | 365 | Analysis period |

**Success Response (200):**
```json
{
  "period": {
    "days": 30,
    "startDate": "2026-01-02T00:00:00.000Z",
    "endDate": "2026-02-01T00:00:00.000Z"
  },
  "utilization": {
    "trucks": {
      "current": 8,
      "limit": 10,
      "percentage": 80
    },
    "drivers": {
      "current": 12,
      "limit": -1,
      "percentage": 0
    },
    "sites": {
      "current": 5,
      "limit": 10,
      "percentage": 50
    }
  },
  "activityMetrics": {
    "avgDailyActiveShifts": 4.5,
    "peakSimultaneousUsage": 6,
    "finishedShifts": 135
  },
  "insights": {
    "underutilizedResources": ["sites"],
    "nearLimitResources": [],
    "recommendedActions": [],
    "costPerShift": 0
  }
}
```

**IMPORTANT:** `costPerShift` now returns `0` instead of `null` (v1.1.1 fix)

---

## Endpoint 6: Shift Analytics

### `GET /analytics/shifts?days=30`

**Purpose:** Get shift statistics

**Query Parameters:**
| Parameter | Type | Default | Min | Max | Description |
|-----------|------|---------|-----|-----|-------------|
| `days` | integer | 30 | 1 | 365 | Analysis period |

**Success Response (200):**
```json
{
  "period": {
    "days": 30,
    "startDate": "2026-01-02T00:00:00.000Z",
    "endDate": "2026-02-01T00:00:00.000Z"
  },
  "shiftCounts": {
    "totalCreated": 150,
    "finished": 135,
    "completionRate": 90
  },
  "duration": {
    "avg": 8.5,
    "min": 2,
    "max": 14,
    "median": 8
  },
  "totals": {
    "totalHoursWorked": 1147.5,
    "totalSalaryPaid": 459000
  }
}
```

---

## Endpoint 7: Site Utilization

### `GET /analytics/sites?days=30`

**Purpose:** Get usage metrics per site

**Query Parameters:**
| Parameter | Type | Default | Min | Max | Description |
|-----------|------|---------|-----|-----|-------------|
| `days` | integer | 30 | 1 | 365 | Analysis period |

**Success Response (200):**
```json
[
  {
    "siteId": 1,
    "siteName": "Стройплощадка №1",
    "shiftsCount": 45,
    "totalHours": 360,
    "avgHoursPerShift": 8,
    "uniqueDrivers": 5
  }
]
```

---

## Endpoint 8: Export Report

### `GET /analytics/export?days=30&format=csv`

**Purpose:** Export usage data as CSV or JSON

**Query Parameters:**
| Parameter | Type | Default | Valid Values | Description |
|-----------|------|---------|--------------|-------------|
| `days` | integer | 30 | 1-365 | Analysis period |
| `format` | string | csv | csv, json | Export format |

**Success Response for CSV (200):**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="usage-report-2026-02-01.csv"

Дата,Смен,Часов,Зарплата
01.01.2026,12,96,38400
02.01.2026,15,120,48000
```

**Success Response for JSON (200):**
```json
{
  "format": "json",
  "data": [
    {
      "date": "2026-01-01",
      "shiftsCount": 12,
      "totalHours": 96,
      "totalSalary": 38400,
      "finishedShiftsCount": 10
    }
  ]
}
```

---

## Frontend Integration Checklist

### ✅ Proper Error Handling

**WRONG:**
```typescript
const response = await fetch('/analytics/usage');
const data = await response.json();
const trucks = data.trucks; // ❌ Will fail if data is { error: "..." }
```

**CORRECT:**
```typescript
const response = await fetch('/analytics/usage', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

if (!response.ok) {
  const error = await response.json();
  console.error('Analytics error:', error.error);
  // Show error message to user
  return;
}

const data = await response.json();

// Additional safety check
if (!data || typeof data !== 'object') {
  console.error('Invalid data format');
  return;
}

const trucks = data.trucks; // ✅ Safe to access
```

### ✅ Response Type Guards

```typescript
interface AnalyticsUsageResponse {
  trucks: {
    current: number;
    limit: number;
    utilizationPercentage: number;
  };
  drivers: {
    current: number;
    limit: number;
    utilizationPercentage: number;
  };
  sites: {
    current: number;
    limit: number;
    utilizationPercentage: number;
  };
}

interface ErrorResponse {
  error: string;
}

function isAnalyticsResponse(data: any): data is AnalyticsUsageResponse {
  return data &&
    typeof data === 'object' &&
    'trucks' in data &&
    'drivers' in data &&
    'sites' in data;
}

function isErrorResponse(data: any): data is ErrorResponse {
  return data &&
    typeof data === 'object' &&
    'error' in data &&
    typeof data.error === 'string';
}

// Usage
const data = await response.json();
if (isErrorResponse(data)) {
  showError(data.error);
} else if (isAnalyticsResponse(data)) {
  renderAnalytics(data);
} else {
  showError('Unknown response format');
}
```

### ✅ Null Safety for All Numeric Fields

```typescript
// All numeric fields should be treated as potentially null/undefined
const safeNumber = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const usage = await getUsageAnalytics();
const truckUsage = safeNumber(usage?.trucks?.current);
const truckLimit = safeNumber(usage?.trucks?.limit);
```

---

## Testing Checklist

### Test Case 1: Normal Operation
- [ ] User is logged in with valid JWT
- [ ] All endpoints return 200 status
- [ ] Data structure matches expected format
- [ ] All numeric fields are valid numbers

### Test Case 2: Authentication Error
- [ ] No JWT token provided → 401 Unauthorized
- [ ] Expired JWT token → 401 Unauthorized
- [ ] Invalid JWT token → 401 Unauthorized

### Test Case 3: Server Error
- [ ] Tenant not found → 500 with `{ error: "..." }`
- [ ] Database connection error → 500 with `{ error: "..." }`
- [ ] Frontend handles error gracefully

### Test Case 4: Edge Cases
- [ ] Unlimited plans (`limit: -1`)
- [ ] Zero resources (empty database)
- [ ] Very large numbers (1000+ shifts)

---

## Debugging Steps for Current Issue

### Step 1: Check Browser Network Tab
1. Open DevTools → Network tab
2. Navigate to Analytics page
3. Look for request to `/api/v1/analytics/usage`
4. Check:
   - Request headers (Authorization present?)
   - Response status (200, 401, 500?)
   - Response body

### Step 2: Check Response Format
If status is 500, the response will be:
```json
{
  "error": "Тенант не найден"
}
```
If status is 200, the response will be:
```json
{
  "trucks": { ... },
  "drivers": { ... },
  "sites": { ... }
}
```

### Step 3: Check Frontend Code
Look for code that does:
```typescript
// ❌ BAD - Direct access without checking
data.trucks.current

// ✅ GOOD - Check first
if (data && data.trucks) {
  data.trucks.current
}
```

### Step 4: Check JWT Token
```javascript
// In browser console
localStorage.getItem('token'); // or sessionStorage
// Decode JWT and check exp field
```

---

## Quick Fix Template

```typescript
// React component example
import { useState, useEffect } from 'react';

function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/v1/analytics/usage', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch analytics');
        }

        const jsonData = await response.json();

        // Type guard check
        if (!jsonData || typeof jsonData !== 'object') {
          throw new Error('Invalid response format');
        }

        setData(jsonData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No data available</div>;

  return (
    <div>
      <h2>Trucks: {data?.trucks?.current ?? 0} / {data?.trucks?.limit ?? 'Unlimited'}</h2>
      {/* Render other fields with null safety */}
    </div>
  );
}
```

---

## Backend Debugging

If you need to verify the backend is working correctly:

```bash
# Test endpoint with curl (replace TOKEN)
curl -H "Authorization: Bearer TOKEN" \
  https://pwa.kontrolsmen.ru/api/v1/analytics/usage

# Check backend logs
docker-compose logs -f logishift_api
```

---

## Contact

If the issue persists after implementing these fixes:
1. Check backend logs for specific error messages
2. Verify tenant has a valid plan in database
3. Confirm JWT token is valid and not expired
4. Test endpoint directly with curl/Postman
