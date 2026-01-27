---
title: Architecture Overview
domain: architecture
related:
  - design-patterns.md
  - data-flow.md
  - tech-stack.md
last_updated: 2026-01-27
context_priority: high
---

# Architecture Overview

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

## Related Documentation

- [Design Patterns](./design-patterns.md) - Service Layer, Repository, State Machine, and other patterns
- [Data Flow](./data-flow.md) - Telegram Bot, Web PWA, and Shift Lifecycle flows
- [Tech Stack](./tech-stack.md) - Technologies and libraries used
- [Security](./security.md) - Authentication, authorization, and data protection
- [Deployment](./deployment.md) - Docker environment and configuration
- [Scalability](./scalability.md) - Performance and scaling considerations
