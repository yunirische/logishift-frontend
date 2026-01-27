---
title: Web PWA Flow
domain: workflows
related:
  - ../backend/api-reference.md
  - shift-lifecycle.md
last_updated: 2026-01-27
context_priority: medium
---

# Web PWA Flow

## Overview

This document describes the workflow for users interacting with LogiShift through the Progressive Web App (PWA).

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      PWA APPLICATION                       │
│                                                             │
│  User → Open App                                           │
│    ↓                                                        │
│  Login Screen                                               │
│    ↓                                                        │
│  POST /auth/login                                          │
│    ↓                                                        │
│  JWT Token Received                                        │
│    ↓                                                        │
│  Token Stored (localStorage)                               │
│    ↓                                                        │
│  Dashboard Loaded                                           │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Flow

### Login

**User Action:** Enter email/password

**Request:**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "login": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 5,
    "full_name": "Иван Иванов",
    "role": "driver",
    "tenant_id": 10
  }
}
```

**PWA Processing:**
```typescript
// Store token
localStorage.setItem('authToken', response.token);

// Store user info
localStorage.setItem('user', JSON.stringify(response.user));

// Set default header
axios.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;

// Navigate to dashboard
router.push('/dashboard');
```

### Token Refresh

**Middleware Check:**
```typescript
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Clear stored data
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');

      // Redirect to login
      router.push('/login');
    }
    return Promise.reject(error);
  }
);
```

## Dashboard Flow

### Load Dashboard

**User Action:** Open dashboard

**Request:**
```http
GET /api/v1/dashboard/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "activeShifts": 5,
  "activeDrivers": 4,
  "trucksInWork": 3,
  "usage": {
    "trucks": {
      "current": 8,
      "limit": 10
    },
    "drivers": {
      "current": 12,
      "limit": -1
    },
    "sites": {
      "current": 5,
      "limit": 10
    }
  }
}
```

**PWA Display:**
```
┌─────────────────────────────────────┐
│         DASHBOARD                   │
├─────────────────────────────────────┤
│ Active Shifts: 5                   │
│ Active Drivers: 4                  │
│ Trucks in Work: 3                  │
│                                     │
│ Usage:                              │
│ Trucks: 8/10  ████░░░░░            │
│ Drivers: 12/∞                       │
│ Sites: 5/10   █████░░░░            │
└─────────────────────────────────────┘
```

## Shift Management Flow

### Start Shift (PWA)

**User Action:** Select truck and site, click "Start"

**PWA Validation:**
```typescript
// Form validation
if (!selectedTruck) {
  showError('Выберите машину');
  return;
}

if (!selectedSite) {
  showError('Выберите объект');
  return;
}

// Check truck availability
if (selectedTruck.is_busy) {
  showError('Эта машина уже занята');
  return;
}
```

**Request:**
```http
POST /api/v1/shifts/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "truck_id": 3,
  "site_id": 7
}
```

**Response:**
```json
{
  "id": 50,
  "status": "awaiting_odo_start",
  "truck": { "name": "МАЗ-533" },
  "site": {
    "name": "Стройплощадка №1",
    "odometer_required": true
  }
}
```

**PWA Processing:**
```typescript
// Update UI state
setCurrentShift(response);

if (response.site.odometer_required) {
  // Show photo upload screen
  setShowPhotoUpload(true);
  setPhotoType('start');
} else {
  // Show active shift screen
  setShowActiveShift(true);
}
```

### Photo Upload (PWA)

**User Action:** Take/select photo

**PWA Processing:**
```typescript
// Capture photo
const file = await capturePhoto();

// Create FormData
const formData = new FormData();
formData.append('photo', file);

// Upload
const response = await axios.post('/api/v1/shifts/photo', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
    'Authorization': `Bearer ${token}`
  }
});

// Update state
setCurrentShift(response.data);
```

**Request:**
```http
POST /api/v1/shifts/photo
Authorization: Bearer <token>
Content-Type: multipart/form-data

photo: <binary>
```

**Response:**
```json
{
  "message": "Фото успешно загружено",
  "newState": "active"
}
```

### Active Shift Display

**PWA UI:**
```
┌─────────────────────────────────────┐
│        АКТИВНАЯ СМЕНА              │
├─────────────────────────────────────┤
│ 🚛 МАЗ-533                          │
│ 🏗️ Стройплощадка №1                 │
│ ⏰ Начало: 15:35                    │
│ ⏱️ Длительность: 2ч 10мин          │
│                                     │
│ [📷 Фото] [💬 Коммент.] [🏁 Конец] │
└─────────────────────────────────────┘
```

### End Shift (PWA)

**User Action:** Click "Конец"

**PWA Confirmation:**
```typescript
const confirm = await showConfirmDialog(
  'Завершить смену?',
  'Смена будет завершена и рассчитана'
);

if (!confirm) return;
```

**Request:**
```http
POST /api/v1/shifts/end
Authorization: Bearer <token>
```

**Response (if photo required):**
```json
{
  "message": "📸 Пришлите фото одометра (ФИНИШ):",
  "newState": "awaiting_odo_end"
}
```

**Response (if finished):**
```json
{
  "message": "🏁 Смена завершена!\nОтработано: 4 ч. 30 мин.",
  "newState": "finished"
}
```

**PWA Processing:**
```typescript
if (response.newState === 'finished') {
  // Show summary
  showShiftSummary();

  // Clear current shift
  setCurrentShift(null);

  // Navigate to dashboard
  router.push('/dashboard');
} else if (response.newState === 'awaiting_odo_end') {
  // Show photo upload
  setShowPhotoUpload(true);
  setPhotoType('end');
}
```

## Dictionary Management

### Load Trucks

**Request:**
```http
GET /api/v1/trucks
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "МАЗ-533",
    "plate": "А123БВ777",
    "is_active": true,
    "is_busy": false,
    "shifts": []
  },
  {
    "id": 2,
    "name": "КАМАЗ-55111",
    "plate": "В456ДЕ777",
    "is_active": true,
    "is_busy": true,
    "shifts": [
      {
        "id": 45,
        "user": {
          "id": 3,
          "full_name": "Петр Петров"
        }
      }
    ]
  }
]
```

**PWA Display:**
```typescript
// Group trucks by status
const availableTrucks = trucks.filter(t => !t.is_busy);
const busyTrucks = trucks.filter(t => t.is_busy);

// Display with indicators
availableTrucks.forEach(truck => {
  renderTruckCard(truck, 'available');
});

busyTrucks.forEach(truck => {
  const driver = truck.shifts[0]?.user?.full_name;
  renderTruckCard(truck, 'busy', driver);
});
```

### Load Sites

**Request:**
```http
GET /api/v1/sites
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Стройплощадка №1",
    "address": "ул. Строителей, 10",
    "odometer_required": true,
    "invoice_required": false,
    "is_active": true
  }
]
```

## Error Handling

### PWA Error Display

```typescript
// Error interceptor
axios.interceptors.response.use(
  response => response,
  error => {
    const message = error.response?.data?.error || 'Произошла ошибка';

    // Show toast/notification
    showError(message);

    // Handle specific errors
    if (error.response?.status === 401) {
      // Redirect to login
      router.push('/login');
    } else if (error.response?.status === 403) {
      // Show permission error
      showPermissionError(message);
    }

    return Promise.reject(error);
  }
);
```

### Common Error Messages

| Error | Display | Action |
|-------|---------|--------|
| User not found | Пользователь не найден | Check credentials |
| Invalid password | Неверный пароль | Retry login |
| Truck busy | Машина уже занята | Select another truck |
| Active shift exists | У вас уже есть активная смена | End current shift first |
| Plan limit | Лимит тарифа исчерпан | Contact admin |

## Offline Support

### Service Worker

```typescript
// Cache strategy
const CACHE_NAME = 'logishift-v1';

// Cache API responses
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/v1')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
```

### Offline Data

```typescript
// Store shifts locally
const saveShiftsLocally = (shifts) => {
  localStorage.setItem('cached_shifts', JSON.stringify(shifts));
};

// Load from cache when offline
const loadShifts = async () => {
  if (navigator.onLine) {
    const response = await axios.get('/api/v1/shifts');
    saveShiftsLocally(response.data);
    return response.data;
  } else {
    return JSON.parse(localStorage.getItem('cached_shifts') || '[]');
  }
};
```

## Related Documentation

- [Telegram Bot Flow](./telegram-bot-flow.md) - Bot workflow
- [Shift Lifecycle](./shift-lifecycle.md) - Shift process details
- [API Reference](../backend/api-reference.md) - Complete API docs
