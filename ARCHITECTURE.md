# LogiShift - Architecture Overview

## Quick Start

LogiShift is a multi-tenant SaaS platform for shift management of heavy machinery operators. The system serves both Telegram Bot (via n8n gateway) and Web PWA frontend through a unified API architecture, enabling drivers to start/end shifts, upload photos, and track work hours with automatic salary calculation.

## Documentation Map

### Architecture
- [Overview](./docs/architecture/overview.md) - System architecture and components
- [Design Patterns](./docs/architecture/design-patterns.md) - Service Layer, Repository, State Machine
- [Data Flow](./docs/architecture/data-flow.md) - Telegram Bot, PWA, and Shift Lifecycle flows
- [Tech Stack](./docs/architecture/tech-stack.md) - Technologies and why they were chosen
- [Security](./docs/architecture/security.md) - Authentication, authorization, and data protection
- [Deployment](./docs/architecture/deployment.md) - Docker environment and configuration
- [Scalability](./docs/architecture/scalability.md) - Performance and scaling considerations

### Backend
- [Database Schema](./docs/backend/database-schema.md) - Complete database schema (tables, relationships, indexes)
- [Database Operations](./docs/backend/database-operations.md) - Migrations, CRUD, transactions, constraints
- [API Reference](./docs/backend/api-reference.md) - Complete REST API documentation (all endpoints)
- [Analytics API](./docs/api/analytics.md) - Analytics endpoints and usage (v1.5)

### Telegram Bot
- [Gateway API](./docs/telegram-bot/gateway-api.md) - Gateway API specification and callback commands
- [State Machine](./docs/telegram-bot/state-machine.md) - User workflow and state transitions
- [Integration](./docs/telegram-bot/integration.md) - n8n gateway architecture and setup
- [User Scenarios](./docs/telegram-bot/scenarios.md) - Typical user flows and error handling

### Workflows
- [Telegram Bot Flow](./docs/workflows/telegram-bot-flow.md) - Complete bot workflow step-by-step
- [PWA Flow](./docs/workflows/pwa-flow.md) - Web application workflow
- [Shift Lifecycle](./docs/workflows/shift-lifecycle.md) - Detailed shift process from start to finish
- [Development Workflow](./docs/workflows/development.md) - Dev environment, Git workflow, code review process

### Decisions
- [Architecture Decisions](./docs/decisions/architecture-decisions.md) - Major architectural decisions and rationale
- [Data Sync Decisions](./docs/decisions/data-sync-decisions.md) - Synchronization and data handling decisions

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTS                             │
│  ┌──────────────┐          ┌──────────────┐           │
│  │ Telegram Bot │          │  Web PWA App │           │
│  └──────┬───────┘          └──────┬───────┘           │
└─────────┼──────────────────────────┼───────────────────┘
          │ n8n Gateway              │ HTTP/REST
          │ Webhook                  │ JWT Auth
          └──────────┬───────────────┘
                     │
┌────────────────────▼───────────────────────────────────┐
│               EXPRESS API SERVER                        │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │  /api/v1        │  │  /api/v1/gateway│              │
│  │  (Web API)      │  │   (Telegram)    │              │
│  └────────┬────────┘  └────────┬────────┘              │
│           │                    │                        │
│  ┌────────▼────────────────────▼────────┐              │
│  │      SERVICES LAYER                   │              │
│  │  Shift, Media, Onboarding, Excel     │              │
│  └────────┬─────────────────────────────┘              │
│           │                                    │
│  ┌────────▼─────────────────────────────┐             │
│  │       PRISMA ORM (PostgreSQL)        │             │
│  └──────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

## Core Principles

### 1. Multi-Tenant Isolation
All data is isolated by `tenant_id`, ensuring complete separation between organizations while sharing infrastructure.

### 2. Service Layer Pattern
Business logic is separated from HTTP controllers, enabling code reuse and maintainability.

### 3. State Machine Workflow
User interactions follow a strict state machine pattern, preventing invalid states and ensuring data consistency.

### 4. Transaction Safety
All critical operations use database transactions to maintain ACID guarantees and data integrity.

### 5. Gateway Integration
n8n acts as a gateway between Telegram Bot API and backend, providing a unified interface for bot interactions.

## Tech Stack

**Backend:**
- Node.js 20+ - Runtime
- TypeScript 5.0 - Type-safe JavaScript
- Express.js 4.18 - HTTP server framework
- PostgreSQL - Primary database
- Prisma 5.7 - ORM and migrations

**Authentication:**
- JWT (12-hour expiration)
- bcrypt for password hashing

**Integrations:**
- n8n - Telegram Bot gateway
- Telegram Bot API - Bot platform
- ExcelJS 4.4 - Report generation

**Deployment:**
- Docker & Docker Compose
- nginx (reverse proxy)
- External network: smenabot-net

## Key Features

- **Telegram Bot Interface** - Drivers can manage shifts entirely via Telegram
- **PWA Web Interface** - Modern web app for admins and drivers
- **Multi-Tenant SaaS** - Serve multiple organizations from single instance
- **Plan Limits** - Subscription-based resource limits (machines, drivers, sites)
- **Real-Time Dashboard** - Active shifts, truck usage, plan statistics
- **Analytics Dashboard** - Resource utilization trends, driver performance, optimization insights (v1.5)
- **Photo Documentation** - Odometer and invoice photos attached to shifts
- **Automatic Salary Calculation** - Hours worked × hourly rate
- **Audit Logging** - Complete trail of all critical actions
- **Excel Reports** - Export shift data to Excel spreadsheets

## Getting Started

**For Developers:**
1. Read [Architecture Overview](./docs/architecture/overview.md)
2. Review [Database Schema](./docs/backend/database-schema.md)
3. Check [API Reference](./docs/backend/api-reference.md)
4. Follow [Development Workflow](./docs/workflows/development.md)

**For Frontend Developers:**
1. Start with [API Reference](./docs/backend/api-reference.md)
2. Review [Security](./docs/architecture/security.md#authentication)
3. Check [PWA Flow](./docs/workflows/pwa-flow.md)

**For DevOps:**
1. Read [Deployment](./docs/architecture/deployment.md)
2. Review [Security](./docs/architecture/security.md)
3. Check [Scalability](./docs/architecture/scalability.md)

## Documentation Index

Complete documentation is available in the `/docs` directory:

```
docs/
├── architecture/          # System architecture
├── backend/              # Database and API
├── telegram-bot/         # Bot integration
├── workflows/            # User workflows
├── decisions/            # Design decisions
└── README.md             # Detailed documentation index
```

See [docs/README.md](./docs/README.md) for complete documentation navigation.

---

**Last Updated:** 2026-02-01 (v1.5 Analytics Dashboard)
**Documentation Version:** 2.1.0
**For detailed information, see linked documents above.**
