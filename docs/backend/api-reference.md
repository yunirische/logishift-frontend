---
title: API Reference
domain: backend
related:
  - database-schema.md
  - ../architecture/security.md
last_updated: 2026-01-31
context_priority: high
---

# API Reference

## Base URL
```
Production: https://pwa.kontrolsmen.ru/api/v1
Local: http://localhost:3000/api/v1
```

## Authentication

### JWT Token Authentication

Most endpoints require JWT authentication via `Authorization` header.

**Header:**
```
Authorization: Bearer <token>
```

**Token Payload:**
```typescript
{
  id: number;        // User ID
  role: string;      // "admin" | "driver" | "foreman"
  tenant_id: number; // Tenant ID for multi-tenant isolation
  iat: number;       // Issued at timestamp
  exp: number;       // Expiration timestamp (12 hours)
}
```

**Token Expiration:** 12 hours

### Public Endpoints (No Auth Required)
- `GET /health` - Health check
- `POST /auth/login` - User login
- `POST /auth/onboard` - Self-registration

## Response Format

### Success Response
```typescript
{
  // Single object
  success: true,
  data: { /* object */ }
}

// Or direct object for list responses
[
  { /* item 1 */ },
  { /* item 2 */ }
]
```

### Error Response
```typescript
{
  error: string;  // Error message (Russian)
  // Optionally:
  status?: number;  // HTTP status code
  details?: any;    // Additional error details
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad request / validation error
- `401` - Unauthorized (no token or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `500` - Internal server error

---

## API Endpoints

### Health Check

**GET** `/health`

No authentication required.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "modules": "refactored"
}
```

---

### Authentication

#### POST `/auth/login`

User authentication via email/password.

**Request Body:**
```json
{
  "login": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "full_name": "Иван Иванов",
    "role": "admin",
    "tenant_id": 10
  }
}
```

**Error Response (401):**
```json
{
  "error": "User not found"
}
```

#### POST `/auth/onboard`

Self-registration for new tenants.

**Request Body:**
```json
{
  "company_name": "СтройМастер ООО",
  "admin_name": "Алексей Петров",
  "tg_user_id": "123456789"
}
```

**Response (200):**
```json
{
  "tenant": {
    "id": 20,
    "name": "СтройМастер ООО",
    "plan_id": 1
  },
  "user": {
    "id": 15,
    "full_name": "Алексей Петров",
    "email": "admin_123456789@logishift.ru"
  },
  "defaultEmail": "admin_123456789@logishift.ru",
  "message": "Пароль по умолчанию: password123"
}
```

---

### Dashboard

#### GET `/dashboard/stats`

Get dashboard statistics for admin view. **[AUTH REQUIRED]**

**Response (200):**
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

**Field descriptions:**
- `activeShifts` – number of shifts with status not equal to `'finished'`
- `activeDrivers` – number of drivers with `current_state = 'active'` and role `'driver'`
- `trucksInWork` – count of **unique** `truck_id` values in `shifts` where `status != 'finished'` (real machines currently on‑site)
- `usage.trucks.current` – total number of trucks in the tenant's dictionary (for plan‑limit control)
- `usage.trucks.limit` – maximum allowed trucks according to the tenant's plan (`-1` means unlimited)
- `usage.drivers.current`, `usage.drivers.limit` – similar for drivers
- `usage.sites.current`, `usage.sites.limit` – similar for sites

---

### Shifts

#### GET `/shifts`

Get list of recent shifts (last 10). **[AUTH REQUIRED]**

**Response (200):**
```json
[
  {
    "id": 45,
    "driver_name": "Иван Иванов",
    "truck_name": "МАЗ-533",
    "status": "finished",
    "created_at": "2024-01-15T08:00:00.000Z",
    "photo_start_url": "1/2024/01/1705315200000-photo.jpg",
    "photo_end_url": "1/2024/01/1705336800000-photo.jpg",
    "photo_invoice_url": "1/2024/01/1705336800000-invoice.jpg"
  }
]
```

#### GET `/shifts/current`

Get current active shift for authenticated user. **[AUTH REQUIRED]**

Always returns `200 OK`. If no active shift exists, returns `null`.

**Response (200) - Active shift found:**
```json
{
  "id": 50,
  "tenant_id": 10,
  "user_id": 5,
  "truck_id": 3,
  "site_id": 7,
  "status": "active",
  "start_time": "2024-01-15T08:00:00.000Z",
  "end_time": null,
  "hours_worked": "0.00",
  "salary": "0.00",
  "photo_start_url": "1/2024/01/1705315200000-photo.jpg",
  "photo_end_url": null,
  "photo_invoice_url": null,
  "comment": null,
  "updated_at": "2024-01-15T08:00:00.000Z",
  "created_at": "2024-01-15T08:00:00.000Z",
  "user": {
    "full_name": "Иван Иванов"
  },
  "truck": {
    "name": "МАЗ-533"
  },
  "site": {
    "name": "Стройплощадка №1",
    "odometer_required": true,
    "invoice_required": false
  }
}
```

**Response (200) - No active shift:**
```json
null
```

#### GET `/shifts/:id`

Get a specific shift by ID. **[AUTH REQUIRED]**

**URL Parameters:**
- `id` - Shift ID

**Response (200):**
```json
{
  "id": 52,
  "tenant_id": 10,
  "user_id": 5,
  "truck_id": 3,
  "site_id": 7,
  "status": "finished",
  "start_time": "2024-01-15T08:00:00.000Z",
  "end_time": "2024-01-15T12:30:00.000Z",
  "hours_worked": "4.50",
  "salary": "1800.00",
  "photo_start_url": "/uploads/10/2024/01/1705315200000-photo.jpg",
  "photo_end_url": "/uploads/10/2024/01/1705336800000-photo.jpg",
  "photo_invoice_url": "/uploads/10/2024/01/1705336800000-invoice.jpg",
  "comment": "[15.01 14:30 Driver]: Смена завершена успешно",
  "created_at": "2024-01-15T08:00:00.000Z",
  "updated_at": "2024-01-15T12:30:00.000Z",
  "user": {
    "id": 5,
    "full_name": "Иван Иванов",
    "current_state": "idle"
  },
  "truck": {
    "id": 3,
    "name": "МАЗ-533",
    "plate": "А123БВ777",
    "is_active": true,
    "is_busy": false
  },
  "site": {
    "id": 7,
    "name": "Стройплощадка №1",
    "address": "ул. Строителей, 10",
    "odometer_required": true,
    "invoice_required": false
  }
}
```

**Error Response (404):**
```json
{
  "error": "Смена не найдена"
}
```

**Use Cases:**
- Load shift details for edit modal
- View complete shift information with related data
- Fetch shift for audit or review

#### POST `/shifts/start`

Start a new shift. **[AUTH REQUIRED]**

**Request Body:**
```json
{
  "truck_id": 3,
  "site_id": 7
}
```

**Response (200):**
```json
{
  "id": 50,
  "tenant_id": 10,
  "user_id": 5,
  "truck_id": 3,
  "site_id": 7,
  "status": "awaiting_odo_start",
  "start_time": null,
  "created_at": "2024-01-15T08:00:00.000Z",
  "truck": { "name": "МАЗ-533" },
  "site": { "name": "Стройплощадка №1" }
}
```

**Possible statuses:**
- `awaiting_odo_start` - Waiting for odometer start photo
- `active` - Shift is active (no odometer required)

**Error Response (400):**
```json
{
  "error": "Машина уже занята или не найдена"
}
```

#### POST `/shifts/end`

End the current shift. **[AUTH REQUIRED]**

**Request Body:** Empty

**Response (200):**
```json
{
  "message": "🏁 Смена завершена!\nОтработано: 4 ч. 30 мин.",
  "newState": "finished"
}
```

**Or if photo required:**
```json
{
  "message": "📸 Пришлите фото одометра (ФИНИШ):",
  "newState": "awaiting_odo_end"
}
```

**Or if invoice required:**
```json
{
  "message": "📸 Пришлите фото НАКЛАДНОЙ:",
  "newState": "awaiting_invoice"
}
```

#### POST `/shifts/photo`

Upload shift photo (odometer/invoice). **[AUTH REQUIRED]**

**Content-Type:** `multipart/form-data`

**Request:**
```
photo: <file>
```

**Response (200):**
```json
{
  "message": "Фото успешно загружено",
  "newState": "active"
}
```

#### POST `/shifts/:id/proxy-photo`

Upload shift photo on behalf of driver (admin only). **[AUTH REQUIRED - ADMIN]**
**Use this endpoint for editing shifts in modal.**

**URL Parameters:**
- `id` - Shift ID

**Content-Type:** `multipart/form-data`

**Request:**
```
photo: <file>
type: "odo_start" | "odo_end" | "invoice"
```

**Response (200):**
```json
{
  "message": "Фото успешно загружено (odo_end)",
  "shift": {
    "id": 50,
    "status": "finished",
    "photo_type": "odo_end"
  }
}
```

**State Transitions:**
- `odo_start` → Sets status to `'active'`, sets `start_time` if null
- `odo_end` → Transitions to `'awaiting_invoice'` or `'finished'`
- `invoice` → Finalizes shift to `'finished'` and calculates salary

**Error Response (400):**
```json
{
  "error": "Некорректный тип фото. Укажите: odo_start, odo_end или invoice"
}
```

**Important:**
- This is the correct endpoint for **editing shifts in modal**
- `POST /shifts/photo` is for **drivers in active shift flow only** (state machine based)
- For modal editing, always use this proxy-photo endpoint with explicit `type` parameter

#### PATCH `/shifts/:id`

Update shift (add comment, modify times, or force-close). **[AUTH REQUIRED]**

**URL Parameters:**
- `id` - Shift ID

**Authorization Logic (as of v1.1.2):**
- **Comment-only updates** (only `comment` field provided):
  - **Drivers**: Can add comments to their own shifts (any status including "finished")
  - **Admins**: Can add comments to any shift (any status)
- **Time changes or force-close** (`start_time`, `end_time` provided):
  - **Admins only**

**Request Body (Comment only - works for ANY shift status):**
```json
{
  "comment": "Добавлен комментарий к смене"
}
```

**Request Body (Force close with times - admin only):**
```json
{
  "start_time": "2024-01-15T08:00:00.000Z",
  "end_time": "2024-01-15T12:30:00.000Z",
  "comment": "Пояснение к смене"
}
```

**Important Behavior (as of v1.1.2):**
- **Comment-only mode**: Works on **active AND finished shifts**. Only updates comment, no time validation.
- **Force-close mode**: Only works on **active shifts**. Validates times, checks overlaps, finalizes shift.
- **Finished shifts with times**: Returns error "Смена уже завершена. Для добавления комментария используйте только поле comment."

**Response (200) - Comment only (works for finished shifts too):**
```json
{
  "message": "✅ Комментарий добавлен к смене 52",
  "shift": {
    "id": 52,
    "comment": "[01.02 16:45 Driver]: Добавлен комментарий к завершенной смене"
  }
}
```

**Response (200) - Force close (active shift):**
```json
{
  "message": "✅ Смена принудительно закрыта!\nОтработано: 4 ч. 30 мин.",
  "shift": {
    "id": 50,
    "hours_worked": 4.5,
    "salary": 1800,
    "start_time": "2024-01-15T08:00:00.000Z",
    "end_time": "2024-01-15T12:30:00.000Z"
  }
}
```

**Error Responses:**

**Finished shift with time changes (400):**
```json
{
  "error": "Смена уже завершена. Для добавления комментария используйте только поле comment."
}
```

**Driver commenting on another driver's shift (403):**
```json
{
  "error": "Водитель может добавлять комментарии только к своим сменам"
}
```

**Time changes by non-admin (403):**
```json
{
  "error": "Только администратор может изменять время или закрывать смены"
}
```

**Overlap detected (400):**
```json
{
  "error": "OVERLAP",
  "message": "Время смены пересекается с существующей записью\nКонфликт ресурсов: Водитель \"Иван Иванов\"\nСуществующая смена: #45 (08:00 - 12:00)"
}
```

**Time validation (400):**
```json
{
  "error": "Время окончания должно быть позже времени начала"
}
```

**Future time (400):**
```json
{
  "error": "Время окончания не может быть в будущем"
}
```

**Use Cases:**
- **Add comment to finished shift** (driver/admin): `{ "comment": "text" }`
- **Add comment to active shift** (driver/admin): `{ "comment": "text" }`
- **Force-close active shift** (admin only): `{ "start_time", "end_time" }`
- **Correct shift times** (admin only): `{ "start_time", "end_time" }`

#### POST `/shifts/:id/comments`

Add comment to shift (any role). **[AUTH REQUIRED]**

**URL Parameters:**
- `id` - Shift ID

**Request Body:**
```json
{
  "text": "Комментарий к смене"
}
```

**Response (200):**
```json
{
  "success": true,
  "comment": "[01.02 14:30 Admin]: Комментарий к смене"
}
```

**Access Control:**
- **Drivers**: Can only comment on their own shifts
- **Admins**: Can comment on any shift in their tenant

#### PATCH `/shifts/:id/times`

Update shift times without closing (admin only). **[AUTH REQUIRED - ADMIN]**

**URL Parameters:**
- `id` - Shift ID

**Request Body:**
```json
{
  "start_time": "2024-01-15T08:00:00.000Z",
  "end_time": "2024-01-15T13:30:00.000Z"
}
```

**Response (200):**
```json
{
  "success": true,
  "shift": {
    "id": 50,
    "start_time": "2024-01-15T08:00:00.000Z",
    "end_time": "2024-01-15T13:30:00.000Z",
    "hours_worked": 5.5,
    "salary": 2200
  }
}
```

**Notes:**
- This endpoint updates times and recalculates `hours_worked` and `salary` **without changing shift status**
- Useful for correcting time errors in finished or active shifts
- Performs overlap validation with other shifts

#### POST `/shifts/manual`

Create a shift manually (admin only). **[AUTH REQUIRED - ADMIN]**

**Request Body:**
```json
{
  "driver_id": 5,
  "truck_id": 3,
  "site_id": 7
}
```

**Response (200):**
```json
{
  "id": 51,
  "tenant_id": 10,
  "user_id": 5,
  "truck_id": 3,
  "site_id": 7,
  "status": "active",
  "start_time": "2024-02-01T14:30:00.000Z",
  "end_time": "2024-02-01T14:30:00.000Z",
  "hours_worked": 0,
  "salary": 0,
  "created_at": "2024-02-01T14:30:00.000Z"
}
```

**Important Behavior (as of v1.1.1):**
- Admin-created shifts **bypass pending states** and go directly to `status: "active"`
- Initial `hours_worked` and `salary` are `0` (admin can edit times later)
- Both `start_time` and `end_time` are set to `new Date()` initially
- Use `PATCH /shifts/:id/times` to correct the times after creation

---

### Trucks (Dictionary)

#### GET `/trucks`

Get list of all trucks with active shift information. **[AUTH REQUIRED]**

**Response (200):**
```json
[
  {
    "id": 1,
    "tenant_id": 10,
    "name": "МАЗ-533",
    "plate": "А123БВ777",
    "code": "M1",
    "is_active": true,
    "is_busy": false,
    "shifts": [
      {
        "id": 50,
        "user": {
          "id": 5,
          "full_name": "Иван Иванов"
        }
      }
    ]
  }
]
```

**Field descriptions:**
- Standard truck fields (`id`, `tenant_id`, `name`, `plate`, `code`, `is_active`, `is_busy`)
- `shifts` – array of **active** shifts (where `status != 'finished'`) assigned to this truck
  - Each shift includes `id` and the driver (`user`) with `id` and `full_name`
- If `is_busy` is `true` but `shifts` array is empty, the truck's busy flag is considered **stuck** (no actual active shift). Frontend should display a warning and offer a "Force free" button.

#### POST `/trucks`

Add a new truck. **[AUTH REQUIRED - ADMIN]**

**Request Body:**
```json
{
  "name": "КАМАЗ-55111",
  "plate": "В456ДЕ777",
  "code": "K1",
  "is_active": true
}
```

**Response (200):**
```json
{
  "id": 4,
  "tenant_id": 10,
  "name": "КАМАЗ-55111",
  "plate": "В456ДЕ777",
  "code": "K1",
  "is_active": true,
  "is_busy": false
}
```

#### PATCH `/trucks/:id`

Update truck details. **[AUTH REQUIRED - ADMIN]**

**URL Parameters:**
- `id` - Truck ID

**Request Body:**
```json
{
  "name": "КАМАЗ-55111 (обновлено)",
  "plate": "В456ДЕ777",
  "is_active": true,
  "is_busy": false
}
```

**Notes:**
- Setting `is_busy: false` will **force‑reset** the busy flag, even if there is an active shift in the database. This is intentional to resolve stuck‑busy situations.
- Other fields (`name`, `plate`, `is_active`) behave as usual.

**Response (200):**
```json
{
  "id": 4,
  "tenant_id": 10,
  "name": "КАМАЗ-55111 (обновлено)",
  "plate": "В456ДЕ777",
  "code": "K1",
  "is_active": true,
  "is_busy": false
}
```

#### DELETE `/trucks/:id`

Delete a truck (requires admin role). **[AUTH REQUIRED - ADMIN]**

**URL Parameters:**
- `id` - Truck ID

**Important Behavior:**
- Cannot delete truck with an **active shift** (`status != 'finished'`)
- Truck ID must be parsed as Integer
- Validates tenant ownership before deletion

**Response (200):**
```json
{
  "message": "Техника удалена",
  "id": 4
}
```

**Error Response (400) - Active shift exists:**
```json
{
  "error": "Нельзя удалить технику с активной сменой. Сначала завершите смену.",
  "shift_id": 123
}
```

**Error Response (404):**
```json
{
  "error": "Техника не найдена"
}
```

---

### Sites (Dictionary)

#### GET `/sites`

Get list of active sites. **[AUTH REQUIRED]**

**Response (200):**
```json
[
  {
    "id": 1,
    "tenant_id": 10,
    "name": "Стройплощадка №1",
    "address": "ул. Строителей, 10",
    "code": "SP1",
    "odometer_required": true,
    "invoice_required": false,
    "is_active": true
  }
]
```

#### POST `/sites`

Create a new site. **[AUTH REQUIRED - ADMIN]**

**Request Body:**
```json
{
  "name": "Стройплощадка №5",
  "address": "ул. Новая, 25",
  "odometer_required": true,
  "invoice_required": false,
  "is_active": true
}
```

**Response (200):**
```json
{
  "id": 8,
  "tenant_id": 10,
  "name": "Стройплощадка №5",
  "address": "ул. Новая, 25",
  "odometer_required": true,
  "invoice_required": false,
  "is_active": true
}
```

**Error Response (403):**
```json
{
  "error": "Лимит тарифа исчерпан"
}
```

#### PATCH `/sites/:id`

Update site settings. **[AUTH REQUIRED - ADMIN]**

**URL Parameters:**
- `id` - Site ID

**Request Body:**
```json
{
  "name": "Стройплощадка №5 (обновлено)",
  "odometer_required": false,
  "invoice_required": true,
  "is_active": true
}
```

**Response (200):**
```json
{
  "id": 8,
  "tenant_id": 10,
  "name": "Стройплощадка №5 (обновлено)",
  "odometer_required": false,
  "invoice_required": true,
  "is_active": true
}
```

#### DELETE `/sites/:id`

Delete a site (requires admin role). **[AUTH REQUIRED - ADMIN]**

**URL Parameters:**
- `id` - Site ID

**Important Behavior:**
- Cannot delete site with an **active shift** (`status != 'finished'`)
- Site ID must be parsed as Integer
- Validates tenant ownership before deletion

**Response (200):**
```json
{
  "message": "Объект удален",
  "id": 8
}
```

**Error Response (400) - Active shift exists:**
```json
{
  "error": "Нельзя удалить объект с активной сменой. Сначала завершите смену.",
  "shift_id": 123
}
```

**Error Response (404):**
```json
{
  "error": "Объект не найден"
}
```

---

### Users

#### GET `/users`

Get list of all users (requires admin role). **[AUTH REQUIRED - ADMIN]**

**Response (200):**
```json
[
  {
    "id": 1,
    "tenant_id": 10,
    "role": "admin",
    "full_name": "Алексей Петров",
    "tg_user_id": "123456789",
    "email": "admin_123456789@logishift.ru",
    "current_state": "idle",
    "hourly_rate": "500.00"
  }
]
```

#### POST `/users`

Create a new user (requires admin role). **[AUTH REQUIRED - ADMIN]**

**Request Body:**
```json
{
  "full_name": "Иван Иванов",
  "email": "ivan@example.com",
  "password": "password123",
  "role": "driver",
  "hourly_rate": 400
}
```

**Response (200):**
```json
{
  "id": 20,
  "tenant_id": 10,
  "role": "driver",
  "full_name": "Иван Иванов",
  "email": "ivan@example.com",
  "current_state": "idle",
  "hourly_rate": "400.00"
}
```

**Error Response (403):**
```json
{
  "error": "Access denied"
}
```

#### PATCH `/users/:id`

Update user details (requires admin role). **[AUTH REQUIRED - ADMIN]**

**URL Parameters:**
- `id` - User ID to update

**Request Body:**
```json
{
  "full_name": "Иван Иванов (обновлено)",
  "role": "driver",
  "hourly_rate": 450
}
```

**Response (200):**
```json
{
  "id": 20,
  "tenant_id": 10,
  "role": "driver",
  "full_name": "Иван Иванов (обновлено)",
  "email": "ivan@example.com",
  "current_state": "idle",
  "hourly_rate": "450.00"
}
```

**Error Response (404):**
```json
{
  "error": "Пользователь не найден"
}
```

#### DELETE `/users/:id`

Delete a user (requires admin role). **[AUTH REQUIRED - ADMIN]**

**URL Parameters:**
- `id` - User ID to delete

**Important Behavior:**
- Cannot delete user with an **active shift** (`status != 'finished'`)
- User ID must be parsed as Integer
- Validates tenant ownership before deletion

**Response (200):**
```json
{
  "message": "Пользователь удален",
  "id": 20
}
```

**Error Response (400) - Active shift exists:**
```json
{
  "error": "Нельзя удалить водителя с активной сменой. Сначала завершите смену.",
  "shift_id": 123
}
```

**Error Response (404):**
```json
{
  "error": "Пользователь не найден"
}
```

#### POST `/users/set-menu-id`

Update Telegram menu message ID (public endpoint for bot integration).

**Request Body:**
```json
{
  "user_id": 5,
  "message_id": 12345
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

### Reports

#### GET `/reports/excel`

Download Excel report of finished shifts. **[AUTH REQUIRED]**

**Query Parameters:** None

**Response (200):**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename=shifts_report.xlsx`
- Body: Binary Excel file data

#### GET `/reports/photos`

Get archive of shift photos. **[AUTH REQUIRED]**

**Query Parameters:**
- `driver_id` (optional) - Filter by driver ID
- `truck_id` (optional) - Filter by truck ID

**Response (200):**
```json
[
  {
    "id": 45,
    "photo_start_url": "1/2024/01/1705315200000-photo.jpg",
    "photo_end_url": "1/2024/01/1705336800000-photo.jpg",
    "photo_invoice_url": "1/2024/01/1705336800000-invoice.jpg",
    "user": {
      "full_name": "Иван Иванов"
    },
    "truck": {
      "name": "МАЗ-533"
    }
  }
]
```

#### GET `/reports/export`

Export shifts as JSON with date filtering. **[AUTH REQUIRED]**

**Query Parameters:**
- `start` (optional) - Start date (ISO format)
- `end` (optional) - End date (ISO format)

**Example:**
```
GET /reports/export?start=2024-01-01T00:00:00.000Z&end=2024-01-31T23:59:59.999Z
```

**Response (200):**
```json
[
  {
    "id": 45,
    "status": "finished",
    "start_time": "2024-01-15T08:00:00.000Z",
    "end_time": "2024-01-15T12:30:00.000Z",
    "hours_worked": "4.50",
    "salary": "1800.00",
    "user": {
      "full_name": "Иван Иванов"
    },
    "truck": {
      "name": "МАЗ-533"
    },
    "site": {
      "name": "Стройплощадка №1"
    }
  }
]
```

---

### Audit

#### GET `/audit`

Get audit log entries. **[AUTH REQUIRED - ADMIN]**

**Query Parameters:** None

**Response (200):**
```json
[
  {
    "id": 100,
    "action": "SHIFT_FINISHED",
    "performed_by": "Иван Иванов",
    "timestamp": "2024-01-15T12:30:00.000Z",
    "details": "{\"shift_id\":45,\"hours\":4.5}"
  }
]
```

---

### Analytics

Usage analytics for resource tracking and plan optimization. **[AUTH REQUIRED]**

#### GET `/analytics/usage`

Get current resource usage vs plan limits.

**Response (200):**
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

**Field descriptions:**
- `limit: -1` indicates unlimited resources
- `utilization_percent` is `null` for unlimited plans

#### GET `/analytics/trends`

Get time-series usage trends for specified period.

**Query Parameters:**
- `days` (optional) - Number of days (1-365, default: 30)

**Example:**
```
GET /analytics/trends?days=90
```

**Response (200):**
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

#### GET `/analytics/drivers`

Get top drivers ranked by hours worked.

**Query Parameters:**
- `limit` (optional) - Number of drivers (1-100, default: 10)
- `days` (optional) - Number of days to look back (1-365, default: 30)

**Example:**
```
GET /analytics/drivers?limit=5&days=90
```

**Response (200):**
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

#### GET `/analytics/summary`

Get comprehensive resource summary (active/in-work/available).

**Response (200):**
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

**Field descriptions:**
- `total` – Total count in tenant's dictionary
- `active` – Active (not deleted) items
- `in_work` – Currently assigned to active shifts
- `available` – Active but not in work

#### GET `/analytics/insights`

Get plan optimization insights and recommendations.

**Query Parameters:**
- `days` (optional) - Analysis period in days (1-365, default: 30)

**Response (200):**
```json
{
  "underutilizedResources": {
    "trucks": ["МАЗ-533", "КАМАЗ-55111"],
    "sites": ["Склад №3"]
  },
  "nearLimitResources": {
    "trucks": { "current": 9, "limit": 10, "percent": 90 }
  },
  "costPerShift": 2500.00,
  "recommendedActions": [
    "Рассмотрите downgrade плана: 2 машины используются редко"
  ]
}
```

#### GET `/analytics/shifts`

Get shift statistics and duration metrics.

**Query Parameters:**
- `days` (optional) - Analysis period in days (1-365, default: 30)

**Response (200):**
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

#### GET `/analytics/sites`

Get site utilization metrics.

**Query Parameters:**
- `days` (optional) - Analysis period in days (1-365, default: 30)

**Response (200):**
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

#### GET `/analytics/export`

Export usage data as JSON or CSV file.

**Query Parameters:**
- `days` (optional) - Number of days (1-365, default: 30)
- `format` (optional) - Export format: `json` or `csv` (default: `json`)

**Example:**
```
GET /analytics/export?days=90&format=csv
```

**Response (200) for CSV:**
- Content-Type: `text/csv; charset=utf-8`
- Content-Disposition: `attachment; filename="usage_report_2024-01-30.csv"`
- Body: CSV file with UTF-8 BOM (for Excel compatibility)
- Headers: Дата; Смен; Часов; Выплачено (date, shifts, hours, salary)
- Date format: DD.MM.YYYY

**Response (200) for JSON:**
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

---

### Tenant Settings

#### GET `/tenant/settings`

Get tenant configuration. **[AUTH REQUIRED]**

**Response (200):**
```json
{
  "name": "СтройМастер ООО",
  "timezone": "Europe/Moscow",
  "invoice_required": false
}
```

#### PATCH `/tenant/settings`

Update tenant settings. **[AUTH REQUIRED - ADMIN]**

**Request Body:**
```json
{
  "timezone": "Asia/Yekaterinburg",
  "invoice_required": true
}
```

**Response (200):**
```json
{
  "id": 10,
  "name": "СтройМастер ООО",
  "timezone": "Asia/Yekaterinburg",
  "invoice_required": true
}
```

---

### Admin Stats

#### GET `/admin/stats`

Get admin dashboard statistics. **[AUTH REQUIRED - ADMIN]**

**Response (200):**
```json
{
  "activeShifts": 5,
  "busyTrucks": 5,
  "photos24h": 15
}
```

---

## Gateway API (Telegram Bot Integration)

### POST `/gateway`

Telegram Bot webhook endpoint (via n8n gateway).

**Request Body:**
```typescript
{
  user_id: string;        // Telegram user ID (string)
  type: "text" | "callback" | "photo";
  payload: {
    // For callback:
    callback_query_id?: string;
    data?: string;        // Callback data (e.g., "START_SHIFT")

    // For text:
    text?: string;        // Message text

    // For photo:
    file_id?: string;     // Telegram file ID
  };
  tg_name?: string;       // Telegram username
}
```

**Response (200):**
```typescript
{
  ui: {
    method: "sendMessage" | "editMessage",
    text: string;         // Message text (HTML formatted)
    buttons: Array<Array<{
      text: string;
      callback_data: string;
    }>>;
    delete_original: boolean;  // Whether to delete previous menu
  };
  state: {
    current_step: string;      // User current state
    active_shift_id: number | null;
    user_internal_id: number;
    last_menu_message_id: string | null;
  };
  callback_query_id?: string;  // For callback responses
}
```

**Response Example:**
```json
{
  "ui": {
    "method": "sendMessage",
    "text": "🚙 <b>МЕНЮ ВОДИТЕЛЯ</b>\n🕒 15:30\n────────────────────\n\nСтатус: 💤 <b>ОТДЫХ</b>\n\nУ вас нет активной смены.",
    "buttons": [
      [
        {
          "text": "✅ Начать смену",
          "callback_data": "START_SHIFT"
        }
      ],
      [
        {
          "text": "⚙️ Панель управления",
          "callback_data": "ADMIN_MAIN"
        }
      ]
    ],
    "delete_original": false
  },
  "state": {
    "current_step": "idle",
    "active_shift_id": null,
    "user_internal_id": 5,
    "last_menu_message_id": "12345"
  }
}
```

**Callback Data Commands:**

**Driver commands:**
- `START_SHIFT` - Start new shift
- `END_SHIFT` - End current shift
- `CANCEL` - Cancel shift draft
- `REQUEST_COMMENT` - Add comment to shift

**Admin commands:**
- `ADMIN_MAIN` - Admin main menu
- `ADMIN_SETTINGS` - Settings menu
- `DRIVER_MENU` - Switch to driver menu
- `VIEW_ACTIVE` - View active shifts
- `VIEW_USERS` - View users list
- `EDIT_TRUCKS` - Edit trucks
- `EDIT_SITES` - Edit sites
- `ADD_TRUCK` - Add truck (enter text next)
- `ADD_SITE` - Add site (enter text next)
- `GEN_INVITE` - Generate invite link
- `DOWNLOAD_EXCEL` - Get Excel download link

**Interactive commands:**
- `TRK_<truck_id>` - Select truck
- `STE_<site_id>` - Select site
- `MS_DRV_<driver_id>` - Manual shift: select driver
- `MS_TRK_<driver_id>_<truck_id>` - Manual shift: select truck
- `MS_FIN_<driver_id>_<truck_id>_<site_id>` - Manual shift: finalize
- `VIEW_TRK_<truck_id>` - View truck details
- `VIEW_STE_<site_id>` - View site details
- `DELETE_STE_<site_id>` - Delete site
- `FORCE_FREE_TRK_<truck_id>` - Force free truck
- `TOGGLE_STE_ODO_<site_id>` - Toggle odometer requirement
- `TOGGLE_STE_INV_<site_id>` - Toggle invoice requirement
- `SET_TZ_LIST` - Show timezone list
- `SAVE_TZ_<timezone>` - Save timezone

---

## Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "error": "Invalid ID format"
}
```

**401 Unauthorized:**
```json
{
  "error": "User not found"
}
```

```json
{
  "error": "Invalid password"
}
```

**403 Forbidden:**
```json
{
  "error": "Access denied"
}
```

```json
{
  "error": "Лимит тарифа исчерпан"
}
```

**403 Forbidden – limit reached:**
```json
{
  "error": "Достигнут лимит машин (10 шт.). Тарифный план: Бесплатный"
}
```

**404 Not Found:**
```json
{
  "error": "Tenant not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Server error"
}
```

### Business Logic Errors
```json
{
  "error": "У вас уже есть активная смена или черновик"
}
```

```json
{
  "error": "Машина уже занята"
}
```

```json
{
  "error": "Водитель уже в смене"
}
```

```json
{
  "error": "Достигнут лимит машин (10 шт.). Тарифный план: Бесплатный"
}
```

```json
{
  "error": "Достигнут лимит объектов (5 шт.). Тарифный план: Профессиональный"
}
```

```json
{
  "error": "Достигнут лимит водителей (20 шт.). Тарифный план: Корпоративный"
}
```

---

## Rate Limiting

Currently **no rate limiting** is implemented. Consider implementing:
- Per-tenant rate limits
- Per-user rate limits for sensitive operations
- IP-based rate limiting for public endpoints

**Recommended libraries:**
- `express-rate-limit` - Basic rate limiting
- `rate-limiter-flexible` - Advanced rate limiting with Redis

---

## API Versioning Strategy

**Current Version:** `/api/v1`

**Strategy:** URL-based versioning

**Migration Path:**
1. New features added to `/api/v1`
2. Breaking changes require `/api/v2`
3. Deprecated endpoints remain for 6 months with warning headers
4. Remove deprecated endpoints after deprecation period

**Deprecation Header:**
```
Deprecation: true
Warning: This endpoint is deprecated and will be removed on 2024-07-01
Link: <https://api.example.com/v2/endpoint>; rel="successor-version"
```

---

## Pagination

Currently **no pagination** is implemented for list endpoints. Lists return all items or limited to fixed count (e.g., last 10 shifts).

**Recommended Pagination Pattern:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

---

## Caching

**Current Policy:** No caching (cache headers disabled)

**Cache Headers:**
```
Cache-Control: no-store, no-cache, must-revalidate, private
Pragma: no-cache
Expires: 0
```

**Future Considerations:**
- Implement Redis caching for frequently accessed data
- Cache dictionary data (trucks, sites) for 5 minutes
- Cache dashboard stats for 1 minute
- Use ETag for conditional requests

---

## Related Documentation

- [Database Schema](./database-schema.md) - Data models
- [Database Operations](./database-operations.md) - How database is used
- [Architecture: Security](../architecture/security.md) - Authentication and authorization
- [Telegram Bot: Gateway API](../telegram-bot/gateway-api.md) - Detailed gateway documentation
