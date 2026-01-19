# LogiShift Backend - API Contract

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

**Response (200) or `null`:**
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

---

### Trucks (Dictionary)

#### GET `/trucks`
Get list of all trucks. **[AUTH REQUIRED]**

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
    "is_busy": false
  }
]
```

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

Driver commands:
- `START_SHIFT` - Start new shift
- `END_SHIFT` - End current shift
- `CANCEL` - Cancel shift draft
- `REQUEST_COMMENT` - Add comment to shift

Admin commands:
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

Interactive commands:
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

---

## Rate Limiting

Currently **no rate limiting** is implemented. Consider implementing:
- Per-tenant rate limits
- Per-user rate limits for sensitive operations
- IP-based rate limiting for public endpoints

Recommended libraries:
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
