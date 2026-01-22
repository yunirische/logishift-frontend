# LogiShift Backend - Architecture Documentation

## Overview

LogiShift is a multi-tenant SaaS platform for shift management of heavy machinery operators. The backend serves both Telegram Bot (via n8n gateway) and Web PWA frontend through a unified API architecture.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  ┌──────────────┐          ┌──────────────┐                    │
│  │ Telegram Bot │          │  Web PWA App │                    │
│  └──────┬───────┘          └──────┬───────┘                    │
└─────────┼──────────────────────────┼──────────────────────────┘
          │                          │
          │ n8n Gateway              │ HTTP/REST
          │ Webhook                  │ JWT Auth
          └──────────┬───────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                  EXPRESS API SERVER                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      MIDDLEWARE                            │  │
│  │  - CORS (all origins)                                     │  │
│  │  - Express.json/urlencoded                               │  │
│  │  - No-cache headers                                       │  │
│  │  - Multer (file upload)                                   │  │
│  │  - JWT Authentication (for protected routes)              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │   /api/v1       │  │  /api/v1/gateway│                     │
│  │  (Web API)      │  │   (Telegram)    │                     │
│  └────────┬────────┘  └────────┬────────┘                     │
│           │                    │                               │
│  ┌────────▼────────────────────▼────────┐                     │
│  │         CONTROLLERS                   │                     │
│  │  - WebApiController (PWA endpoints)   │                     │
│  │  - GatewayController (Bot routes)    │                     │
│  └────────┬────────────────────────────┘                     │
│           │                                                    │
│  ┌────────▼────────────────────────────┐                       │
│  │           SERVICES LAYER            │                       │
│  │  - ShiftService                     │                       │
│  │  - MediaService                     │                       │
│  │  - OnboardingService                │                       │
│  │  - ExcelService                     │                       │
│  └────────┬────────────────────────────┘                       │
│           │                                                    │
│  ┌────────▼────────────────────────────┐                       │
│  │         CORE UTILITIES               │                       │
│  │  - Prisma Client (ORM)              │                       │
│  │  - Bot (Telegram API integration)    │                       │
│  │  - Helper Functions                 │                       │
│  └────────┬────────────────────────────┘                       │
└───────────┼────────────────────────────────────────────────────┘
            │
┌───────────▼────────────────────────────────────────────────────┐
│              POSTGRESQL DATABASE                                │
│  - Multi-tenant architecture with tenant_id isolation           │
│  - Shifts, Users, Trucks, Sites, Audit Logs                    │
└─────────────────────────────────────────────────────────────────┘

External Services:
- n8n Gateway: Telegram Bot webhook proxy
- Telegram API: Bot API for notifications
- File Storage: Local filesystem (./uploads)
```

## Core Components & Modules

### 1. Entry Point (`src/index.ts`)

- Express app initialization
- Middleware setup (CORS, JSON, no-cache)
- Multer configuration for file uploads
- Route mounting for API and Gateway
- Server startup

### 2. Controllers

#### WebApiController (`src/web-api.controller.ts`)

Handles Web PWA endpoints:

- Dashboard statistics
- Shift management (start/end/photo)
- Truck and Site CRUD
- Tenant settings
- Authentication flow
- `normalizeShiftPhotoPaths()` - Normalizes photo paths in database (replaces `https://bot.kontrolsmen.ru/` with `/`, adds leading `/` to `uploads/` paths)
- `prefixPhotoUrl()` - Ensures photo URLs returned to client have leading `/uploads/` prefix

#### GatewayController (`src/routes/gateway.ts`)

Handles Telegram Bot integration via n8n:

- Webhook processing
- User state machine management
- Callback query handling
- Photo upload handling
- Admin panel rendering

### 3. Services Layer

#### ShiftService (`src/services/shift.service.ts`)

Core business logic for shift lifecycle:

- `startShiftDraft()` - Initialize shift creation
- `selectTruck()` - Select and reserve truck
- `selectSite()` - Select site and determine requirements
- `handleShiftPhoto()` - Process odometer/invoice photos
- `requestEndShift()` - Initiate shift completion
- `finalizeShiftInternal()` - Complete shift, calculate salary
- `createManualShift()` - Admin creates shift for driver
- PWA methods: `startShiftPWA()`, `endShiftPWA()`, `handlePWAPhotoUpload()`

#### MediaService (`src/services/media.service.ts`)

File handling:

- `downloadAndSave()` - Download from Telegram API
- `saveRawFile()` - Save uploaded files from PWA
- Organizes files by: `tenant_id/year/month/`
- All paths returned with leading `/uploads/` prefix (e.g., `/uploads/10/2026/01/1234567890-photo.jpg`)

#### OnboardingService (`src/services/onboarding.service.ts`)

New tenant registration:

- `performOnboarding()` - Create tenant, plan, admin user
- Default email: `admin_{tg_user_id}@logishift.ru`
- Default password: `password123`

#### ExcelService (`src/services/excel.service.ts`)

Reporting:

- `generateShiftReport()` - Create Excel file of completed shifts

#### TenantService (`src/services/tenant.service.ts`)

Plan‑limit enforcement:

- `checkTruckLimit()` – verifies if tenant has reached the maximum allowed trucks according to their subscription plan
- `checkDriverLimit()` – same for drivers
- `checkSiteLimit()` – same for sites
- Throws descriptive errors when limit is exceeded, used by fleet and site CRUD endpoints

### 4. Core Utilities

#### Prisma Client (`src/core/prisma.ts`)

- Singleton Prisma Client instance
- All database operations

#### Bot Integration (`src/core/bot.ts`)

- `notifyAdmin()` - Send notifications to tenant admins
- `saveAuditLog()` - Log actions to audit_logs table
- `answerCallbackQuery()` - Telegram API callback response

#### Helpers (`src/utils/helpers.ts`)

- `parseId()` - Parse and validate ID
- `formatInTimezone()` - Format date with timezone
- `formatDuration()` - Convert decimal hours to human readable
- `L()` - Structured logging function

### 5. Middleware

#### Authentication (`src/middleware/auth.ts`)

- JWT token verification
- Token expiration: 12 hours
- Extends Request with user object (id, tenant_id, role)

### 6. Routes

#### API Router (`src/routes/api.ts`)

Web PWA endpoints (JWT protected):

- `/auth/login` - User authentication
- `/auth/onboard` - Self-registration
- `/dashboard/stats` - Dashboard statistics
- `/shifts/*` - Shift management (including `/shifts/normalize-paths` for path normalization)
- `/trucks`, `/sites` - Dictionary endpoints
- `/reports/*` - Reports export
- `/users` - User management
- `/audit` - Audit logs

#### Gateway Router (`src/routes/gateway.ts`)

Telegram Bot integration:

- `/gateway` - POST endpoint for webhook processing
- Processes: callbacks, text messages, photos

## Design Patterns

### 1. Service Layer Pattern

Business logic separated from controllers:

- Controllers handle HTTP request/response
- Services contain reusable business logic
- Services can be called by multiple controllers

### 2. Repository Pattern (via Prisma)

All database access through Prisma Client:

- Type-safe database operations
- Automatic migrations
- Transaction support

### 3. State Machine Pattern (User Workflow)

User state transitions for shift management:

```
idle → pending_truck → pending_site → awaiting_odo_start → active
  ↑                                                         │
  └────────── awaiting_odo_end → awaiting_invoice ────────┘
                                    ↓
                                 finished
```

Admin states:

- `admin_adding_site` - Adding new site
- `admin_adding_truck` - Adding new truck

### 4. Transaction Pattern

All critical operations in Prisma transactions:

- Prevents data inconsistency
- Atomic multi-table operations
- Automatic rollback on failure

### 5. Gateway Pattern (Telegram Integration)

n8n acts as gateway between Telegram Bot API and backend:

- Single endpoint: `/api/v1/gateway`
- Standardized request/response format
- Centralized bot interaction logic

### 6. Singleton Pattern

- Prisma Client - Single instance
- Services - Single exported instance (e.g., `shiftService`)

## Data Flow

### 1. Telegram Bot Flow

```
Telegram User → n8n Gateway → Backend /gateway
                              ↓
                    GatewayController.handleWebhook()
                              ↓
                    ┌─────────────────────┐
                    │  User Lookup/Onboard│
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ State Machine Check │
                    └──────────┬──────────┘
                               ↓
              ┌────────────────┼────────────────┐
              ↓                ↓                ↓
         processCallback()  processText()  processPhoto()
              │                │                │
              ↓                ↓                ↓
         ShiftService    State Updates   MediaService
              │                │                │
              └────────────────┼────────────────┘
                               ↓
                    formatResponse() → Telegram UI
```

### 2. Web PWA Flow

```
PWA App → JWT Auth Token → Protected API Endpoint
                              ↓
                    authenticateJWT Middleware
                              ↓
                    Controller Method
                              ↓
                    Service Layer
                              ↓
                    Prisma Transaction
                              ↓
                    Response → PWA App
```

### 3. Shift Lifecycle Flow

```
START SHIFT:
User → /shifts/start → shiftService.startShiftPWA()
                              ↓
                    Prisma Transaction:
                    - Check truck availability
                    - Create shift record
                    - Mark truck busy
                    - Update user state
                              ↓
                    Return shift object

PHOTO UPLOAD:
User → POST /shifts/photo → mediaService.saveRawFile()
                              ↓
                    shiftService.handlePWAPhotoUpload()
                              ↓
                    Prisma Transaction:
                    - Update shift with photo URL
                    - Transition user state
                    - Finalize if complete
                              ↓
                    Return updated shift

END SHIFT:
User → /shifts/end → shiftService.endShiftPWA()
                              ↓
                    Prisma Transaction:
                    - Check requirements
                    - Update state or finalize
                    - Calculate hours/salary
                    - Release truck
                    - Notify admins
                              ↓
                    Return result
```

## Technologies & Libraries

### Backend Framework

- **Node.js 20+** - Runtime
- **Express.js 4.18** - HTTP server framework
- **TypeScript 5.0** - Type-safe JavaScript

### Database & ORM

- **PostgreSQL** - Primary database
- **Prisma 5.7** - ORM and migration tool
- **Binary Targets:** native, linux-musl-openssl-3.0.x (Docker support)

### Authentication & Security

- **jsonwebtoken 9.0** - JWT token generation/verification
- **bcrypt 5.1** - Password hashing
- **cors 2.8** - Cross-origin resource sharing

### External Integrations

- **axios 1.6** - HTTP client for Telegram API
- **Multer 1.4** - File upload handling

### File Processing

- **ExcelJS 4.4** - Excel report generation
- **fs/fs-extra** - File system operations

### Configuration

- **dotenv 16.3** - Environment variable management

### Deployment

- **Docker & Docker Compose** - Containerization
- **Network:** smenabot-net (external network)

## Directory Structure & Purpose

```
logishift-backend/
├── src/
│   ├── index.ts                    # Application entry point
│   ├── web-api.controller.ts       # Web API controller (PWA)
│   ├── routes/                     # Express route definitions
│   │   ├── api.ts                  # Web PWA API routes (JWT protected)
│   │   └── gateway.ts              # Telegram Bot gateway routes
│   ├── services/                   # Business logic layer
│   │   ├── shift.service.ts        # Shift lifecycle management
│   │   ├── media.service.ts       # File upload/download handling
│   │   ├── onboarding.service.ts  # New tenant registration
│   │   └── excel.service.ts       # Excel report generation
│   ├── middleware/                  # Express middleware
│   │   └── auth.ts                 # JWT authentication middleware
│   ├── core/                       # Core utilities & integrations
│   │   ├── prisma.ts              # Prisma Client singleton
│   │   └── bot.ts                 # Telegram API integration
│   └── utils/                      # Helper functions
│       └── helpers.ts              # Common utility functions
├── prisma/
│   └── schema.prisma               # Database schema definition
├── uploads/                        # File storage (created at runtime)
│   └── temp/                       # Temporary upload directory
├── dist/                           # Compiled JavaScript (generated)
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── docker-compose.yml              # Docker service definition
└── .env                            # Environment variables (not in repo)
```

## Security Architecture

### Authentication

- JWT tokens with 12-hour expiration
- Token payload: `{ id, role, tenant_id }`
- HTTP header: `Authorization: Bearer <token>`

### Authorization (RBAC)

Roles:

- **admin** - Full access to all endpoints
- **driver** - Limited to shift operations and view access

### Multi-Tenant Isolation

- All database queries filtered by `tenant_id`
- Tenant ID extracted from JWT token
- Automatic enforcement at service layer

### Data Protection

- Passwords hashed with bcrypt (10 rounds)
- No secrets in code (environment variables only)
- CORS enabled for all origins (consider restricting in production)

### Audit Logging

- All critical actions logged to `audit_logs` table
- Includes: tenant_id, user_id, action, entity, details, timestamp

## Deployment Architecture

### Docker Environment

- **Container:** logishift_api
- **Port Mapping:** 3000:3000
- **Volume:** `/opt/docker-data/static_files:/app/uploads` (persistent storage)
- **Network:** smenabot-net (external, shared with n8n)

### Environment Variables Required

- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `TELEGRAM_BOT_TOKEN` - Telegram Bot API token
- `UPLOAD_DIR` - File upload directory (default: ./uploads)

## Data Synchronization & Busy Flag Handling

### Busy Flag Synchronization

To prevent `is_busy` flag in `dict_trucks` from getting stuck in `true` when no active shift exists:

- `WebApiController.getTrucks` now performs a `left join` with `shifts` where `status != 'finished'`
- Each truck includes a `shifts` array containing active shift(s) with driver information
- Frontend can detect "hanging" busy states: if `is_busy === true` but `shifts.length === 0`, the truck is considered "stuck"
- Admin can manually reset the flag via `PATCH /trucks/:id` with `is_busy: false` (forced reset)

### Real‑time Usage Counters

- Dashboard statistics now include two distinct truck counters:
  - `usage.trucks.current` – total trucks in the dictionary (for plan‑limit enforcement)
  - `trucksInWork` – unique trucks currently assigned to active shifts (`status != 'finished'`)
- The `busyTrucksCount` (used in admin widget) is derived from `trucksInWork`, not from the `is_busy` flag

### Limit Checking

- All CRUD operations for trucks and sites call `TenantService.checkTruckLimit` / `checkSiteLimit` before creating new records
- Limits are enforced per the tenant’s plan (`limit_machines`, `limit_sites`, `limit_drivers`)
- A `403` error with message "Лимит тарифа исчерпан" is returned when the limit is reached

## Performance Considerations

### Database

- Prisma connection pooling
- Transactions for multi-table operations
- Indexed fields: `user_id`, `tenant_id`, `created_at`

### Caching

- No caching headers for API responses (real-time data)
- Consider implementing Redis for future scaling

### File Storage

- Local filesystem storage
- Organized by tenant/date for efficient access
- Consider moving to S3/object storage for production scaling

### Media Storage

- Paths in database and API responses must start with `/uploads/` and be relative to the domain root
- Database stores relative paths (e.g., `tenant_id/year/month/filename.jpg`)
- API responses automatically prefix with `/uploads/` for frontend consumption
- Example: DB stores `1/2024/01/1234567890-photo.jpg`, API returns `/uploads/1/2024/01/1234567890-photo.jpg`

## Scalability Path

1. **Horizontal Scaling**
   - Stateless application (except file storage)
   - Load balancer + multiple instances
   - Shared PostgreSQL database

2. **Caching Layer**
   - Redis for session/token caching
   - Cache frequently accessed data (trucks, sites)

3. **Message Queue**
   - Background job processing for notifications
   - Excel report generation

4. **File Storage**
   - Move from local filesystem to S3/GCS
   - CDN for photo delivery

# LogiShift Backend - Database Schema

## Overview

- **Database:** PostgreSQL
- **ORM:** Prisma
- **Multi-tenant:** All data isolated by `tenant_id`
- **Binary Targets:** native, linux-musl-openssl-3.0.x (Docker support)

---

## Tables & Models

### 1. `plans`

Subscription plans for tenants.

| Column         | Type            | Default       | Nullable | Description                          |
| -------------- | --------------- | ------------- | -------- | ------------------------------------ |
| id             | `Int`           | autoincrement | NO       | Primary key                          |
| code           | `String(50)`    | -             | NO       | Plan code (e.g., "free", "pro")      |
| name           | `String(100)`   | -             | NO       | Display name                         |
| price_monthly  | `Decimal(10,2)` | 0.00          | NO       | Monthly price                        |
| limit_machines | `Int`           | 0             | NO       | Max trucks allowed                   |
| limit_drivers  | `Int`           | 0             | NO       | Max drivers allowed (0 = unlimited?) |
| limit_sites    | `Int`           | -1            | NO       | Max sites allowed (-1 = unlimited)   |
| is_active      | `Boolean`       | true          | NO       | Plan availability                    |

**Unique Index:** `code`
**Relations:**

- One-to-many: `plans` → `tenants`

**Example Data:**

```sql
INSERT INTO plans (code, name, price_monthly, limit_machines, limit_drivers, limit_sites, is_active)
VALUES
  ('free', 'Бесплатный', 0.00, 3, 5, -1, true),
  ('pro', 'Профессиональный', 999.00, 10, 20, 50, true),
  ('enterprise', 'Корпоративный', 4999.00, -1, -1, -1, true);
```

---

### 2. `tenants`

Multi-tenant isolation - companies/organizations.

| Column           | Type      | Default         | Nullable | Description                    |
| ---------------- | --------- | --------------- | -------- | ------------------------------ |
| id               | `Int`     | autoincrement   | NO       | Primary key                    |
| name             | `String`  | -               | NO       | Company name                   |
| plan_id          | `Int`     | -               | NO       | Foreign key to `plans.id`      |
| api_key          | `String?` | -               | YES      | API key for n8n integration    |
| timezone         | `String`  | "Europe/Moscow" | NO       | Default timezone for tenant    |
| invoice_required | `Boolean` | false           | NO       | Require invoice photo globally |

**Unique Index:** `api_key`
**Foreign Keys:**

- `plan_id` → `plans(id)`

**Relations:**

- Many-to-one: `tenants.plan` → `plans`
- One-to-many: `tenants` → `users`
- One-to-many: `tenants` → `dict_trucks`
- One-to-many: `tenants` → `dict_sites`
- One-to-many: `tenants` → `shifts`
- One-to-many: `tenants` → `invites`
- One-to-many: `tenants` → `audit_logs`

**Example Data:**

```sql
INSERT INTO tenants (name, plan_id, api_key, timezone, invoice_required)
VALUES
  ('СтройМастер ООО', 1, 'sk_test_12345', 'Europe/Moscow', false);
```

---

### 3. `users`

System users (admins, drivers, foremen).

| Column               | Type            | Default       | Nullable | Description                               |
| -------------------- | --------------- | ------------- | -------- | ----------------------------------------- |
| id                   | `Int`           | autoincrement | NO       | Primary key                               |
| tenant_id            | `Int`           | -             | NO       | Foreign key to `tenants.id` (isolation)   |
| role                 | `String`        | -             | NO       | User role: "admin", "driver", "foreman"   |
| full_name            | `String?`       | -             | YES      | User full name                            |
| tg_user_id           | `BigInt?`       | -             | YES      | Telegram user ID (for bot integration)    |
| email                | `String?`       | -             | YES      | Email for PWA login (unique)              |
| password_hash        | `String?`       | -             | YES      | Bcrypt hashed password                    |
| current_state        | `String`        | "idle"        | NO       | User state machine (see States section)   |
| hourly_rate          | `Decimal(12,2)` | 0.00          | NO       | Hourly wage rate (for salary calculation) |
| last_menu_message_id | `BigInt?`       | -             | YES      | Last Telegram menu message ID             |
| settings             | `Json?`         | -             | YES      | User settings (language, theme, etc.)     |

**Unique Indexes:** `tg_user_id`, `email`
**Foreign Keys:**

- `tenant_id` → `tenants(id)`

**Relations:**

- Many-to-one: `users.tenant` → `tenants`
- One-to-many: `users` → `shifts`
- One-to-many: `users` → `audit_logs`

**User States (State Machine):**

```
idle                    # No active shift
pending_truck           # Selecting truck
pending_site            # Selecting site
awaiting_odo_start      # Waiting for odometer start photo
active                  # Shift in progress
awaiting_odo_end        # Waiting for odometer end photo
awaiting_invoice        # Waiting for invoice photo

Admin States:
admin_adding_site       # Adding new site (text input mode)
admin_adding_truck      # Adding new truck (text input mode)
```

**Example Data:**

```sql
INSERT INTO users (tenant_id, role, full_name, email, password_hash, current_state, hourly_rate)
VALUES
  (10, 'admin', 'Алексей Петров', 'admin@example.com', '$2b$10$...', 'idle', 500.00),
  (10, 'driver', 'Иван Иванов', 'ivan@example.com', '$2b$10$...', 'idle', 400.00);
```

---

### 4. `dict_trucks`

Vehicle/truck catalog (dictionary).

| Column    | Type      | Default       | Nullable | Description                             |
| --------- | --------- | ------------- | -------- | --------------------------------------- |
| id        | `Int`     | autoincrement | NO       | Primary key                             |
| tenant_id | `Int`     | -             | NO       | Foreign key to `tenants.id` (isolation) |
| name      | `String`  | -             | NO       | Truck display name                      |
| plate     | `String?` | -             | YES      | License plate number                    |
| code      | `String?` | -             | YES      | Internal code                           |
| is_active | `Boolean` | true          | NO       | Truck availability status               |
| is_busy   | `Boolean` | false         | NO       | Truck current usage status              |

**Foreign Keys:**

- `tenant_id` → `tenants(id)`

**Relations:**

- Many-to-one: `dict_trucks.tenant` → `tenants`
- One-to-many: `dict_trucks` → `shifts`

**Example Data:**

```sql
INSERT INTO dict_trucks (tenant_id, name, plate, code, is_active, is_busy)
VALUES
  (10, 'МАЗ-533', 'А123БВ777', 'M1', true, false),
  (10, 'КАМАЗ-55111', 'В456ДЕ777', 'K1', true, false);
```

---

### 5. `dict_sites`

Work sites/locations catalog (dictionary).

| Column            | Type      | Default       | Nullable | Description                             |
| ----------------- | --------- | ------------- | -------- | --------------------------------------- |
| id                | `Int`     | autoincrement | NO       | Primary key                             |
| tenant_id         | `Int`     | -             | NO       | Foreign key to `tenants.id` (isolation) |
| name              | `String`  | -             | NO       | Site display name                       |
| address           | `String?` | -             | YES      | Physical address                        |
| code              | `String?` | -             | YES      | Internal code                           |
| odometer_required | `Boolean` | false         | NO       | Require odometer photos                 |
| invoice_required  | `Boolean` | false         | NO       | Require invoice photo                   |
| is_active         | `Boolean` | true          | NO       | Site availability status                |

**Foreign Keys:**

- `tenant_id` → `tenants(id)`

**Relations:**

- Many-to-one: `dict_sites.tenant` → `tenants`
- One-to-many: `dict_sites` → `shifts`

**Example Data:**

```sql
INSERT INTO dict_sites (tenant_id, name, address, code, odometer_required, invoice_required, is_active)
VALUES
  (10, 'Стройплощадка №1', 'ул. Строителей, 10', 'SP1', true, false, true),
  (10, 'Склад №3', 'ул. Складская, 5', 'SK3', false, true, true);
```

---

### 6. `shifts`

Work shifts - core business entity.

| Column            | Type            | Default       | Nullable | Description                                                                      |
| ----------------- | --------------- | ------------- | -------- | -------------------------------------------------------------------------------- |
| id                | `Int`           | autoincrement | NO       | Primary key                                                                      |
| tenant_id         | `Int`           | -             | NO       | Foreign key to `tenants.id` (isolation)                                          |
| user_id           | `Int`           | -             | NO       | Foreign key to `users.id`                                                        |
| truck_id          | `Int?`          | -             | YES      | Foreign key to `dict_trucks.id`                                                  |
| site_id           | `Int?`          | -             | YES      | Foreign key to `dict_sites.id`                                                   |
| status            | `String`        | -             | NO       | Shift status                                                                     |
| start_time        | `DateTime?`     | -             | YES      | Shift start timestamp                                                            |
| end_time          | `DateTime?`     | -             | YES      | Shift end timestamp                                                              |
| hours_worked      | `Decimal(12,2)` | 0.00          | NO       | Calculated hours worked                                                          |
| salary            | `Decimal(12,2)` | 0.00          | NO       | Calculated salary (hours × rate)                                                 |
| photo_start_url   | `String?`       | -             | YES      | Odometer start photo path (format: `/uploads/tenant_id/year/month/filename.jpg`) |
| photo_end_url     | `String?`       | -             | YES      | Odometer end photo path (format: `/uploads/tenant_id/year/month/filename.jpg`)   |
| photo_invoice_url | `String?`       | -             | YES      | Invoice photo path (format: `/uploads/tenant_id/year/month/filename.jpg`)        |
| geo_start         | `Json?`         | -             | YES      | Start location {lat, lon}                                                        |
| geo_end           | `Json?`         | -             | YES      | End location {lat, lon}                                                          |
| mileage_start     | `Int?`          | -             | YES      | Odometer reading at start                                                        |
| mileage_end       | `Int?`          | -             | YES      | Odometer reading at end                                                          |
| comment           | `String?`       | -             | YES      | Shift comment                                                                    |
| updated_at        | `DateTime`      | auto          | NO       | Last update timestamp                                                            |
| created_at        | `DateTime`      | now()         | NO       | Creation timestamp                                                               |

**Foreign Keys:**

- `tenant_id` → `tenants(id)`
- `user_id` → `users(id)`
- `truck_id` → `dict_trucks(id)`
- `site_id` → `dict_sites(id)`

**Relations:**

- Many-to-one: `shifts.tenant` → `tenants`
- Many-to-one: `shifts.user` → `users`
- Many-to-one: `shifts.truck` → `dict_trucks`
- Many-to-one: `shifts.site` → `dict_sites`

**Shift Statuses:**

```
pending_truck           # Truck selection in progress
pending_site            # Site selection in progress
awaiting_odo_start      # Waiting for odometer start photo
active                  # Shift in progress
awaiting_odo_end        # Waiting for odometer end photo
awaiting_invoice        # Waiting for invoice photo
finished                # Shift completed
```

**Example Data:**

```sql
INSERT INTO shifts (tenant_id, user_id, truck_id, site_id, status, start_time, end_time, hours_worked, salary)
VALUES
  (10, 5, 3, 7, 'finished', '2024-01-15 08:00:00', '2024-01-15 12:30:00', 4.50, 1800.00);
```

---

### 7. `invites`

Invitation codes for new driver registration.

| Column     | Type       | Default       | Nullable | Description                 |
| ---------- | ---------- | ------------- | -------- | --------------------------- |
| id         | `Int`      | autoincrement | NO       | Primary key                 |
| tenant_id  | `Int`      | -             | NO       | Foreign key to `tenants.id` |
| code       | `String`   | -             | NO       | Invitation code (unique)    |
| expires_at | `DateTime` | -             | NO       | Expiration timestamp        |
| status     | `String`   | "pending"     | NO       | Invitation status           |

**Unique Index:** `code`
**Foreign Keys:**

- `tenant_id` → `tenants(id)`

**Relations:**

- Many-to-one: `invites.tenant` → `tenants`

**Status Values:**

- `pending` - Not yet used
- `used` - Already used

**Example Data:**

```sql
INSERT INTO invites (tenant_id, code, expires_at, status)
VALUES
  (10, 'ABC123XYZ', '2024-01-22 00:00:00', 'pending');
```

---

### 8. `audit_logs`

Audit trail for system actions.

| Column     | Type       | Default       | Nullable | Description                                         |
| ---------- | ---------- | ------------- | -------- | --------------------------------------------------- |
| id         | `Int`      | autoincrement | NO       | Primary key                                         |
| tenant_id  | `Int`      | -             | NO       | Foreign key to `tenants.id` (isolation)             |
| user_id    | `Int?`     | -             | YES      | Foreign key to `users.id` (null for system actions) |
| action     | `String`   | -             | NO       | Action type (e.g., "SHIFT_FINISHED")                |
| entity     | `String?`  | -             | YES      | Entity type (e.g., "shift")                         |
| entity_id  | `Int?`     | -             | YES      | Entity ID                                           |
| details    | `Json?`    | -             | YES      | Additional action details                           |
| created_at | `DateTime` | now()         | NO       | Timestamp of action                                 |

**Foreign Keys:**

- `tenant_id` → `tenants(id)`
- `user_id` → `users(id)`

**Relations:**

- Many-to-one: `audit_logs.tenant` → `tenants`
- Many-to-one: `audit_logs.user` → `users`

**Indexes:**

- `idx_audit_logs_user_id` on `user_id`
- `idx_audit_logs_tenant_id` on `tenant_id`
- `idx_audit_logs_created_at` on `created_at`

**Example Data:**

```sql
INSERT INTO audit_logs (tenant_id, user_id, action, entity, entity_id, details, created_at)
VALUES
  (10, 5, 'SHIFT_FINISHED', 'shift', 45, '{"shift_id":45,"hours":4.5}', '2024-01-15 12:30:00');
```

---

## Relationships (ER Diagram)

```
plans (1) ──────< (N) tenants
  │
  └─ limit_machines, limit_drivers, limit_sites

tenants (1) ──────< (N) users
                 │
                 ├─ (N) dict_trucks
                 ├─ (N) dict_sites
                 ├─ (N) shifts
                 ├─ (N) invites
                 └─ (N) audit_logs

users (1) ──────< (N) shifts
                 └─ (N) audit_logs

dict_trucks (1) ──< (N) shifts

dict_sites (1) ───< (N) shifts
```

---

## Indexes

### User-defined indexes:

- `audit_logs` table:
  - `idx_audit_logs_user_id` on `user_id`
  - `idx_audit_logs_tenant_id` on `tenant_id`
  - `idx_audit_logs_created_at` on `created_at`

### Unique indexes:

- `plans.code`
- `tenants.api_key`
- `users.tg_user_id`
- `users.email`
- `invites.code`

### Foreign key indexes (created automatically):

- `tenants.plan_id`
- `users.tenant_id`
- `dict_trucks.tenant_id`
- `dict_sites.tenant_id`
- `shifts.tenant_id`, `shifts.user_id`, `shifts.truck_id`, `shifts.site_id`
- `invites.tenant_id`
- `audit_logs.tenant_id`, `audit_logs.user_id`

---

## Migration & Schema Management

### Prisma Migrations

**Generate Prisma Client:**

```bash
npx prisma generate
```

**Create a new migration:**

```bash
npx prisma migrate dev --name <migration_name>
```

**Apply migrations in production:**

```bash
npx prisma migrate deploy
```

**Reset database (development only):**

```bash
npx prisma migrate reset
```

**View migration history:**

```bash
npx prisma migrate status
```

### Schema File Location

```
prisma/schema.prisma
```

### Migration Storage

Migrations are stored in `prisma/migrations/` directory (not visible in current codebase - may need to initialize).

### Recommended Workflow

1. Modify `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name`
3. Review generated migration SQL in `prisma/migrations/`
4. Commit both schema and migration files
5. Test migration locally
6. Deploy to production with `npx prisma migrate deploy`

---

## Common CRUD Queries

### Create

**Create new user:**

```typescript
await prisma.users.create({
  data: {
    tenant_id: 10,
    role: "driver",
    full_name: "Иван Иванов",
    email: "ivan@example.com",
    password_hash: hashedPassword,
    current_state: "idle",
    hourly_rate: 400,
  },
});
```

**Create new shift:**

```typescript
await prisma.shifts.create({
  data: {
    tenant_id: 10,
    user_id: 5,
    truck_id: 3,
    site_id: 7,
    status: "active",
    start_time: new Date(),
  },
});
```

### Read

**Get user with tenant:**

```typescript
const user = await prisma.users.findUnique({
  where: { id: 5 },
  include: { tenant: true },
});
```

**Get active shifts for tenant:**

```typescript
const shifts = await prisma.shifts.findMany({
  where: {
    tenant_id: 10,
    status: "active",
  },
  include: {
    user: true,
    truck: true,
    site: true,
  },
});
```

**Get trucks (filtered by tenant):**

```typescript
const trucks = await prisma.dict_trucks.findMany({
  where: {
    tenant_id: 10,
    is_active: true,
    is_busy: false,
  },
  orderBy: { name: "asc" },
});
```

### Update

**Update user state:**

```typescript
await prisma.users.update({
  where: { id: 5 },
  data: { current_state: "active" },
});
```

**Mark truck as busy:**

```typescript
await prisma.dict_trucks.update({
  where: { id: 3 },
  data: { is_busy: true },
});
```

**Update shift with photo:**

```typescript
await prisma.shifts.update({
  where: { id: 45 },
  data: {
    photo_start_url: "1/2024/01/1705315200000-photo.jpg",
    status: "active",
    start_time: new Date(),
  },
});
```

### Delete

**Delete draft shift:**

```typescript
await prisma.shifts.delete({
  where: { id: 46 },
});
```

**Delete expired invites:**

```typescript
await prisma.invites.deleteMany({
  where: {
    expires_at: { lt: new Date() },
    status: "pending",
  },
});
```

---

## Transactions

All critical multi-table operations must use Prisma transactions.

### Transaction Pattern:

```typescript
await prisma.$transaction(async (tx) => {
  // Atomic operations
  const shift = await tx.shifts.create({
    data: {
      /* ... */
    },
  });

  await tx.dict_trucks.update({
    where: { id: truckId },
    data: { is_busy: true },
  });

  await tx.users.update({
    where: { id: userId },
    data: { current_state: "active" },
  });

  // All changes commit together or rollback together
});
```

### Common Transaction Use Cases:

- Starting a shift (create shift + mark truck busy + update user state)
- Ending a shift (calculate salary + release truck + update user state)
- Creating manual shift (admin action)
- User registration with invite (create user + mark invite used)

---

## Constraints & Validation

### Data Integrity

**Foreign Key Constraints:**

- All foreign keys enforce referential integrity
- Cascade behavior: Restrict (default)

**Unique Constraints:**

- User email unique per system
- Telegram user ID unique per system
- Invite code unique per system

### Business Logic Constraints

**Tenant Isolation:**

- ALL queries MUST filter by `tenant_id`
- Enforced at service layer

**Shift Constraints:**

- User can only have one active shift (status != 'finished')
- Truck can only be used by one shift at a time (`is_busy` flag)

**Plan Limits:**

- Check `limit_machines` before creating truck
- Check `limit_drivers` before creating user
- Check `limit_sites` before creating site
- `-1` means unlimited

**State Machine Constraints:**

- User state transitions must follow valid paths
- Shift status transitions must be valid

### Validation at Application Layer

```typescript
// Example: Truck availability check
const truck = await prisma.dict_trucks.findUnique({ where: { id: truckId } });
if (truck?.is_busy) {
  throw new Error("Машина уже занята");
}

// Example: Active shift check
const existing = await prisma.shifts.findFirst({
  where: {
    user_id: userId,
    status: { not: "finished" },
  },
});
if (existing) {
  throw new Error("У вас уже есть активная смена");
}

// Example: Plan limit check
const count = await prisma.dict_trucks.count({ where: { tenant_id } });
if (count >= limit_machines) {
  throw new Error("Лимит машин исчерпан");
}
```

---

## Performance Considerations

### Indexed Queries

Always use indexed fields in WHERE clauses:

- `user_id`, `tenant_id`, `created_at` (in audit_logs)
- `id` (all primary keys)
- `tg_user_id`, `email` (in users)

### N+1 Query Prevention

Use `include` or `select` to fetch related data:

```typescript
// ❌ Bad (N+1 queries)
const shifts = await prisma.shifts.findMany();
for (const shift of shifts) {
  const user = await prisma.users.findUnique({ where: { id: shift.user_id } });
}

// ✅ Good (single query)
const shifts = await prisma.shifts.findMany({
  include: { user: true, truck: true, site: true },
});
```

### Pagination (Future Enhancement)

For large datasets, use cursor-based or offset pagination:

```typescript
const shifts = await prisma.shifts.findMany({
  where: { tenant_id: tid },
  take: 20,
  skip: 0,
  orderBy: { created_at: "desc" },
});
```

---

## Backup & Recovery

### Backup Commands

```bash
# Full database backup
pg_dump -U username -d database_name > backup.sql

# Schema-only backup
pg_dump -U username -d database_name --schema-only > schema.sql

# Data-only backup
pg_dump -U username -d database_name --data-only > data.sql
```

### Recovery Commands

```bash
# Restore from backup
psql -U username -d database_name < backup.sql
```

---

## Security Considerations

### Sensitive Data Protection

- Passwords hashed with bcrypt (10 rounds)
- Never store plain text passwords
- JWT tokens stored client-side only

### Access Control

- Multi-tenant isolation via `tenant_id`
- Role-based access control (admin, driver, foreman)
- Never expose other tenants' data

### SQL Injection Prevention

- All queries through Prisma ORM (parameterized)
- Never use raw SQL queries with user input
- Validate all input before database operations

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
  id: number; // User ID
  role: string; // "admin" | "driver" | "foreman"
  tenant_id: number; // Tenant ID for multi-tenant isolation
  iat: number; // Issued at timestamp
  exp: number; // Expiration timestamp (12 hours)
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
  },
  "activeShiftsDetails": [
    {
      "driver_name": "Иван Иванов",
      "truck_name": "МАЗ-533",
      "site_name": "Стройплощадка №1",
      "start_time": "2024-01-15T08:00:00.000Z"
    }
  ],
  "currentPlan": {
    "name": "Профессиональный",
    "billingUrl": "https://pwa.kontrolsmen.ru/billing"
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
- `activeShiftsDetails` – array of active shift objects with `driver_name`, `truck_name`, `site_name`, `start_time`
- `currentPlan.name` – tenant's subscription plan name
- `currentPlan.billingUrl` – link to billing page

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
- If `is_busy` is `true` but `shifts` array is empty, the truck’s busy flag is considered **stuck** (no actual active shift). Frontend should display a warning and offer a “Force free” button.

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
  "address": "ул. Обновленная, 30",
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
  "address": "ул. Обновленная, 30",
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
