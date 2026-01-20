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
- `/shifts/*` - Shift management
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
