# Architecture

**Analysis Date:** 2024-01-28

## Pattern Overview

**Overall:** Role-based MVC with state machine pattern for drivers

**Key Characteristics:**
- Dual interface architecture (Admin/Driver views)
- State machine driver workflow
- Centralized API layer with auth handling
- Component-based UI with lazy loading
- PWA capabilities with offline support

## Layers

### Presentation Layer (`src/components/`, `src/views/`)
- **Purpose:** UI components and screen rendering
- **Location:** `C:\logishift-frontend\src\components\`, `C:\logishift-frontend\src\views\`
- **Contains:** React components, layouts, views
- **Depends on:** Business logic, API services, auth context
- **Used by:** App entry point

### Business Logic Layer (`src/`)
- **Purpose:** Application state and core functionality
- **Location:** `C:\logishift-frontend\src\types.ts`, `C:\logishift-frontend\src\services\api.ts`
- **Contains:** Type definitions, API abstractions, business rules
- **Depends on:** External APIs, local storage
- **Used by:** Presentation layer, context

### Data Access Layer (`src/services/api.ts`)
- **Purpose:** API communication and data persistence
- **Location:** `C:\logishift-frontend\src\services\api.ts`
- **Contains:** HTTP client, auth management, photo URL handling
- **Depends on:** Fetch API, localStorage
- **Used by:** Business logic layer

### Context Layer (`src/context/`)
- **Purpose:** Global state management
- **Location:** `C:\logishift-frontend\src\context\AuthContext.tsx`
- **Contains:** Authentication state, user data
- **Depends on:** LocalStorage, API service
- **Used by:** All components

## Data Flow

### Authentication Flow:

1. User login → `POST /auth/login`
2. Token stored in localStorage
3. User info stored in localStorage
4. AuthContext provides global state
5. 401 triggers logout and page reload

### Driver State Machine:

1. `idle` → Select truck & site
2. `awaiting_odo_start` → Upload odometer photo (start)
3. `active` → Shift in progress with timer
4. `awaiting_odo_end` → Upload odometer photo (end)
5. `awaiting_invoice` → Upload invoice photo

### Admin Flow:

1. Dashboard statistics loading
2. Resource management (drivers, trucks, sites)
3. Manual shift creation
4. Audit log monitoring

## Key Abstractions

### State Machine (`src/types.ts`):
- **Purpose:** Driver workflow management
- **Examples:** `C:\logishift-frontend\src\types.ts` (DriverState enum)
- **Pattern:** Finite state machine with API transitions

### API Service (`src/services/api.ts`):
- **Purpose:** Centralized API communication
- **Examples:** `apiRequest()`, `get()`, `post()`, `patch()`, `del()`
- **Pattern:** Repository pattern with auth handling

### Auth Context (`src/context/AuthContext.tsx`):
- **Purpose:** Authentication state management
- **Examples:** `useAuth()` hook
- **Pattern:** React Context with custom hook

## Entry Points

### Main Application (`src/App.tsx`):
- **Location:** `C:\logishift-frontend\src\App.tsx`
- **Triggers:** Route changes, authentication state
- **Responsibilities:** Route management, lazy loading, error boundaries

### Dashboard (`src/components/Dashboard.tsx`):
- **Location:** `C:\logishift-frontend\src\components\Dashboard.tsx`
- **Triggers:** User role, active shift state
- **Responsibilities:** Dual interface rendering, state machine orchestration

### Layout (`src/components/Layout.tsx`):
- **Location:** `C:\logishift-frontend\src\components\Layout.tsx`
- **Triggers:** Tab navigation, user role
- **Responsibilities:** Navigation, sidebar management, responsive design

## Error Handling

**Strategy:** Centralized error handling with user-friendly messages

**Patterns:**
- HTTP error handling in `apiRequest()`
- 401 auto-logout with page reload
- Error boundaries for component errors
- Alert dialogs for user actions

## Cross-Cutting Concerns

**Logging:** Console logging with version tracking
**Validation:** API response validation with fallbacks
**Authentication:** JWT-based with automatic refresh
**State Synchronization:** Database-driven state machine for drivers
**Performance:** Lazy loading, memoization, debouncing

---

*Architecture analysis: 2024-01-28*