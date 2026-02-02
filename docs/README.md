---
title: LogiShift Documentation Index
domain: navigation
related:
  - ./architecture/overview.md
  - ./frontend/architecture.md
last_updated: 2026-02-02
context_priority: high
---

# LogiShift Documentation

Welcome to the LogiShift documentation. This documentation covers the architecture, API, workflows, and design decisions for the LogiShift shift management platform.

## Quick Navigation

### 📋 Architecture

High-level system architecture and design patterns.

- [Overview](./architecture/overview.md) - System architecture and components
- [Design Patterns](./architecture/design-patterns.md) - Patterns used in the system
- [Data Flow](./architecture/data-flow.md) - How data flows through the system
- [Tech Stack](./architecture/tech-stack.md) - Technologies and libraries
- [Security](./architecture/security.md) - Authentication, authorization, and data protection
- [Deployment](./architecture/deployment.md) - Docker environment and configuration
- [Scalability](./architecture/scalability.md) - Performance and scaling considerations

### 🔧 Backend

Backend API, database, and server-side documentation.

- [Database Schema](./backend/database-schema.md) - Complete database schema definition
- [Database Operations](./backend/database-operations.md) - Migrations, CRUD, transactions, and constraints
- [API Reference](./backend/api-reference.md) - Complete REST API documentation

### 🎨 Frontend

Frontend application architecture and design system.

- [Frontend Architecture](./frontend/architecture.md) - Complete frontend architecture with change history
- [Frontend README](./frontend/README.md) - Frontend tech stack and getting started
- [Design System](./frontend/design-system.md) - Industrial UI colors, typography, spacing, and components
- [Analytics Dashboard](./frontend/analytics-dashboard.md) - Analytics feature documentation and implementation

### 📊 Analytics API

Analytics endpoints for resource tracking and business insights.

- [Analytics API](./api/analytics.md) - Analytics endpoints and frontend integration

### 🤖 Telegram Bot

Telegram Bot integration and workflow.

- [Gateway API](./telegram-bot/gateway-api.md) - Gateway API specification and commands
- [State Machine](./telegram-bot/state-machine.md) - User workflow and state transitions
- [Integration](./telegram-bot/integration.md) - n8n gateway architecture

### 📱 Workflows

User workflow documentation for different interfaces.

- [Telegram Bot Flow](./workflows/telegram-bot-flow.md) - Complete bot workflow
- [PWA Flow](./workflows/pwa-flow.md) - Web application workflow
- [Shift Lifecycle](./workflows/shift-lifecycle.md) - Detailed shift process from start to finish

### 📝 Decisions

Architecture and design decision records.

- [Architecture Decisions](./decisions/architecture-decisions.md) - Major architectural decisions and rationale
- [Data Sync Decisions](./decisions/data-sync-decisions.md) - Synchronization and data handling decisions

## Getting Started

### For New Developers

1. **Start Here:** Read [Architecture Overview](./architecture/overview.md) to understand the system
2. **Database:** Review [Database Schema](./backend/database-schema.md) to understand data models
3. **API:** Check [API Reference](./backend/api-reference.md) to see available endpoints
4. **Workflows:** Read [Shift Lifecycle](./workflows/shift-lifecycle.md) to understand core business logic

### For Frontend Developers

1. **Start Here:** Read [Frontend Architecture](./frontend/architecture.md) for complete project overview
2. **API:** Check [API Reference](./backend/api-reference.md) for available endpoints
3. **Design:** Review [Design System](./frontend/design-system.md) for styling guidelines
4. **Authentication:** Study [Security](./architecture/security.md#authentication) for auth flow
5. **Integration:** Read [PWA Flow](./workflows/pwa-flow.md) for integration details

### For Backend Developers

1. **Architecture:** Read [Architecture Overview](./architecture/overview.md) and [Design Patterns](./architecture/design-patterns.md)
2. **Database:** Study [Database Schema](./backend/database-schema.md) and [Database Operations](./backend/database-operations.md)
3. **API:** Reference [API Reference](./backend/api-reference.md)
4. **Decisions:** Review [Architecture Decisions](./decisions/architecture-decisions.md) for design rationale

### For DevOps Engineers

1. **Deployment:** Read [Deployment](./architecture/deployment.md)
2. **Security:** Review [Security](./architecture/security.md)
3. **Scalability:** Check [Scalability](./architecture/scalability.md)
4. **Environment:** See [Deployment](./architecture/deployment.md#environment-variables)

## System Overview

LogiShift is a multi-tenant SaaS platform for shift management of heavy machinery operators. The system serves both Telegram Bot (via n8n gateway) and Web PWA frontend through a unified API architecture.

### Key Technologies

- **Backend:** Node.js, TypeScript, Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT with 12-hour expiration
- **Bot Integration:** n8n gateway pattern
- **Deployment:** Docker with Docker Compose

### Architecture Highlights

- **Service Layer Pattern:** Business logic separated from controllers
- **State Machine:** User workflow management
- **Multi-Tenant:** Complete tenant isolation via `tenant_id`
- **Transaction Safety:** All critical operations in database transactions
- **Audit Logging:** Complete audit trail for compliance

### Design System

For UI/UX implementation guidelines:

1. **Design System** - Read [Design System](./frontend/design-system.md) for colors, typography, spacing
2. **Analytics** - Check [Analytics Dashboard](./frontend/analytics-dashboard.md) for component patterns
3. **Architecture** - Review [Frontend Architecture](./frontend/architecture.md) for component structure

## Documentation Structure

```
docs/
├── architecture/          # System architecture and design
│   ├── overview.md        # High-level architecture
│   ├── design-patterns.md # Design patterns used
│   ├── data-flow.md       # Data flow diagrams
│   ├── tech-stack.md      # Technology stack
│   ├── security.md        # Security architecture
│   ├── deployment.md      # Deployment configuration
│   └── scalability.md     # Performance and scaling
│
├── backend/              # Backend documentation
│   ├── database-schema.md    # Complete database schema
│   ├── database-operations.md # Migrations, CRUD, transactions
│   └── api-reference.md      # REST API documentation
│
├── frontend/             # Frontend documentation
│   ├── README.md              # Frontend overview and tech stack
│   ├── architecture.md        # Complete frontend architecture
│   ├── design-system.md       # UI/UX guidelines
│   └── analytics-dashboard.md # Analytics feature docs
│
├── telegram-bot/         # Telegram Bot integration
│   ├── gateway-api.md    # Gateway API specification
│   ├── state-machine.md  # User state machine
│   └── integration.md    # n8n integration
│
├── workflows/            # User workflows
│   ├── telegram-bot-flow.md  # Bot workflow
│   ├── pwa-flow.md           # Web app workflow
│   ├── shift-lifecycle.md    # Shift lifecycle
│   └── development.md        # Development workflow
│
├── decisions/            # Architecture decisions
│   ├── architecture-decisions.md   # Major decisions
│   ├── data-sync-decisions.md      # Data sync decisions
│   └── analytics-fix-2026-02-01.md # Analytics bug fix decision
│
├── api/                  # API documentation
│   └── analytics.md          # Analytics endpoints specification
│
├── CONTRIBUTING.md       # Contribution guidelines
└── README.md             # This file
```

## Core Concepts

### Multi-Tenancy

All data is isolated by `tenant_id`. Every query automatically filters by tenant to ensure complete data separation between organizations.

### State Machine

Users progress through states during shift operations:

```
idle → pending_truck → pending_site → awaiting_odo_start → active
  ↑                                                         │
  └────────── awaiting_odo_end → awaiting_invoice ────────┘
                                    ↓
                                 finished
```

### Service Layer

Business logic is encapsulated in services:

- **ShiftService** - Shift lifecycle management
- **MediaService** - File upload/download
- **OnboardingService** - New tenant registration
- **ExcelService** - Report generation
- **TenantService** - Plan limit enforcement

## API Endpoints Summary

### Public Endpoints

- `GET /health` - Health check
- `POST /auth/login` - User authentication
- `POST /auth/onboard` - Self-registration

### Protected Endpoints (JWT Required)

- `GET /dashboard/stats` - Dashboard statistics
- `GET|POST /shifts/*` - Shift management
- `GET|POST|PATCH /trucks` - Truck management
- `GET|POST|PATCH /sites` - Site management
- `GET|POST /users` - User management
- `GET /reports/*` - Reports and exports
- `GET /audit` - Audit logs
- `GET|PATCH /tenant/settings` - Tenant settings

### Gateway Endpoint

- `POST /gateway` - Telegram Bot webhook (via n8n)

## Common Tasks

### Starting a Shift (Bot)

1. User clicks "✅ Начать смену"
2. Select truck from list
3. Select site from list
4. Upload odometer photo (if required)
5. Shift becomes active

### Starting a Shift (PWA)

1. User selects truck and site in UI
2. Clicks "Start Shift"
3. Uploads odometer photo (if required)
4. Shift becomes active

### Ending a Shift

1. User clicks "🏁 Завершить смену"
2. Upload odometer end photo (if required)
3. Upload invoice photo (if required)
4. Shift finalized, salary calculated
5. Truck released, user returns to idle

## Troubleshooting

### Common Issues

**Truck stuck in busy state:**

- Check GET `/trucks` - shows active shifts per truck
- If `is_busy: true` but `shifts: []`, flag is stuck
- Use PATCH `/trucks/:id` with `is_busy: false` to force reset

**User cannot start shift:**

- Check for existing active shift
- Verify truck availability
- Check plan limits

**Telegram bot not responding:**

- Verify n8n gateway is running
- Check backend `/health` endpoint
- Verify tenant API key

## Contributing to Documentation

When adding new features or making changes:

1. Update relevant documentation sections
2. Add ADR (Architecture Decision Record) for significant changes
3. Update API reference for new endpoints
4. Add diagrams for complex flows
5. Update this README if needed

## Additional Resources

- [Frontend Repository](../) - Source code
- [Deployment Guide](./architecture/deployment.md) - Production deployment
- [Contribution Guidelines](./CONTRIBUTING.md) - How to contribute

## Support

For questions or issues:

1. Check relevant documentation section
2. Review architecture decisions for context
3. Check API reference for endpoint details
4. Review workflow documentation for process understanding

---

**Last Updated:** 2026-02-02
**Documentation Version:** 1.1.0
