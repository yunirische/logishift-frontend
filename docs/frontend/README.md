---
title: Frontend Documentation
domain: frontend
related:
  - ../backend/api-reference.md
  - architecture.md
  - design-system.md
last_updated: 2026-02-02
context_priority: high
---

# Frontend Documentation

LogiShift frontend is a React + TypeScript + Vite PWA application for shift management of heavy machinery operators.

## Quick Navigation

### 📖 Core Documentation
- [Frontend Architecture](./architecture.md) - Project structure, components, and patterns
- [Design System](./design-system.md) - UI/UX guidelines and styling
- [API Integration](./api-integration.md) - How frontend calls backend API (coming soon)

### 🔌 Backend Integration
- [API Reference](../backend/api-reference.md) - Complete REST API documentation
- [Analytics API](../api/analytics.md) - Analytics endpoints specification

## Tech Stack

- **React 18** - UI framework
- **TypeScript 5.0** - Type-safe JavaScript
- **Vite 5** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **dayjs** - Date/time handling with timezone support

## Key Features

### Admin/Foreman View
- Dashboard with real-time statistics
- Fleet and site management
- Shift history and editing
- Analytics dashboard
- Audit logs

### Driver View
- State machine-based shift workflow
- Photo uploads (odometer, invoice)
- Real-time shift timer
- Mobile-first design

## Project Structure

```
logishift-frontend/
├── src/
│   ├── components/          # React components
│   │   ├── Dashboard.tsx    # Role-based UI
│   │   ├── EditShiftModal.tsx
│   │   └── Layout.tsx       # Navigation
│   ├── context/
│   │   └── AuthContext.tsx  # JWT auth context
│   ├── services/
│   │   └── api.ts           # Centralized API wrapper
│   ├── utils/
│   │   └── dateUtils.ts     # Timezone utilities
│   ├── App.tsx              # Main app
│   ├── constants.ts         # API endpoints
│   ├── types.ts             # TypeScript types
│   └── index.css            # Global styles
├── public/                  # Static assets
└── vite.config.ts          # PWA config
```

## Getting Started

1. **Read Architecture**: Start with [Frontend Architecture](./architecture.md)
2. **Review Design System**: Understand styling in [Design System](./design-system.md)
3. **Check API**: Review [API Reference](../backend/api-reference.md)
4. **Development**: Follow existing component patterns

## Agent Instructions

For AI agents working on the frontend:

- **Read**: `frontend/architecture.md`, `frontend/design-system.md`, `backend/api-reference.md`
- **Develop**: React components with TypeScript
- **Integrate**: Use `src/services/api.ts` for API calls
- **Style**: Follow Industrial Navy theme (#0a192f)
- **Handle Errors**: Always show loading states and handle 401/403 errors

## Related Documentation

- [Backend API Reference](../backend/api-reference.md) - All API endpoints
- [Analytics Dashboard](../api/analytics.md) - Analytics endpoints
- [System Architecture](../architecture/overview.md) - Overall system design

---

**Last Updated:** 2026-02-02
**Documentation Version:** 1.0.0
