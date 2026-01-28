# Codebase Structure

**Analysis Date:** 2024-01-28

## Directory Layout

```
C:\logishift-frontend\
├── .planning\codebase\         # Architecture documentation
├── src\                       # Source code
│   ├── components\            # UI components
│   ├── context\              # React contexts
│   ├── hooks\                # Custom hooks
│   ├── services\             # API and business services
│   ├── utils\                # Utility functions
│   ├── types.ts              # TypeScript type definitions
│   ├── constants.ts          # Application constants
│   ├── App.tsx               # Main application component
│   └── main.tsx              # Application entry point
├── public\                   # Static assets
├── docs\                     # Documentation
└── dist\                     # Build output
```

## Directory Purposes

**src/components/:**
- Purpose: React UI components and page views
- Contains: Main components, modals, forms, data displays
- Key files:
  - `Dashboard.tsx` - Main dashboard with dual interface
  - `Layout.tsx` - Navigation and layout structure
  - `Drivers.tsx` - Driver management interface
  - `Shifts.tsx` - Shift registry and management
  - `Fleet.tsx` - Vehicle fleet management
  - `Objects.tsx` - Work sites management
  - `AuditLogs.tsx` - System audit logs

**src/context/:**
- Purpose: Global state management
- Contains: Authentication context
- Key files: `AuthContext.tsx` - JWT auth state management

**src/services/:**
- Purpose: API communication and business services
- Contains: API client, auth service, photo handling
- Key files:
  - `api.ts` - Centralized API service with auth
  - `geminiService.ts` - AI service integration

**src/utils/:**
- Purpose: Utility functions and helpers
- Contains: Date formatting, data processing
- Key files: `dateUtils.ts` - Date/time utilities

**src/views/:**
- Purpose: Alternative view components
- Contains: Role-specific views
- Key files:
  - `AdminView.tsx` - Admin dashboard view
  - `DriverView.tsx` - Driver-specific view
  - `LoginView.tsx` - Login page view

## Key File Locations

**Entry Points:**
- `C:\logishift-frontend\src\main.tsx`: Application bootstrap
- `C:\logishift-frontend\src\App.tsx`: Main app with routing

**Configuration:**
- `C:\logishift-frontend\src\types.ts`: Type definitions and enums
- `C:\logishift-frontend\src\constants.ts`: API endpoints and constants

**Core Logic:**
- `C:\logishift-frontend\src\services\api.ts`: API service layer
- `C:\logishift-frontend\src\context\AuthContext.tsx`: Auth state management

**Testing:**
- No dedicated test directory detected

## Naming Conventions

**Files:**
- Components: PascalCase (e.g., `Dashboard.tsx`)
- Views: PascalCase with View suffix (e.g., `AdminView.tsx`)
- Services: lowercase (e.g., `api.ts`)
- Utils: lowercase (e.g., `dateUtils.ts`)
- Types: PascalCase (e.g., `types.ts`)
- Contexts: PascalCase with Context suffix (e.g., `AuthContext.tsx`)

**Directories:**
- Lowercase with plural form (e.g., `components`, `services`)

**API Endpoints:**
- Upper case with descriptive names (e.g., `AUTH_LOGIN`, `CURRENT_SHIFT`)
- Located in `constants.ts`

## Where to Add New Code

**New Feature:**
- Primary code: `src/components/` (UI components)
- API endpoints: `src/constants.ts`
- Types: `src/types.ts`
- Business logic: `src/services/`

**New Component/Module:**
- Implementation: `src/components/` for UI components
- Types: Add to `src/types.ts` or create new types file

**Utilities:**
- Shared helpers: `src/utils/`
- Service functions: `src/services/`

## Special Directories

**src/context/:**
- Purpose: Global state management
- Generated: No - manually written
- Committed: Yes

**src/hooks/:**
- Purpose: Custom React hooks
- Generated: No - manually written
- Committed: Yes

**.planning/codebase/:**
- Purpose: Architecture documentation
- Generated: Yes - by GSD tools
- Committed: Yes

---

*Structure analysis: 2024-01-28*