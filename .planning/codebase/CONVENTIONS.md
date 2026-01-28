# Coding Conventions

**Analysis Date:** 2026-01-28

## Naming Patterns

**Files:**
- PascalCase for components: `Dashboard.tsx`, `AuthContext.tsx`
- camelCase for utilities and services: `api.ts`, `dateUtils.ts`
- kebab-case for views: `DriverView.tsx`, `AdminView.tsx`

**Functions:**
- camelCase for all functions: `getAuthToken()`, `setUserInfo()`, `formatForDisplay()`
- Async functions prefixed with `get`, `set`, or action verbs: `loginUser()`, `refreshStatus()`

**Variables:**
- camelCase for local variables: `activeShift`, `selectedTruck`, `isLoading`
- ALL_CAPS for constants: `TOKEN_KEY`, `USER_KEY`, `API_BASE_URL`
- Prefix state variables with `is` for booleans: `isAuthenticated`, `isLoading`

**Types:**
- PascalCase for interfaces and types: `User`, `Shift`, `AuthContextType`
- Enum names are PascalCase with values in SCREAMING_SNAKE_CASE: `UserRole`, `DriverState`

## Code Style

**Formatting:**
- No formal linting configuration detected
- Prettier configuration not found
- Manual formatting with 2-space indentation
- Curly braces always used for blocks

**TypeScript Configuration:**
- Target: ES2020
- Module: ESNext
- JSX: react-jsx
- Strict mode disabled (`"strict": false`)
- Unused checks disabled (`noUnusedLocals`, `noUnusedParameters`)

## Import Organization

**Order:**
1. React imports: `import React, { ... } from "react"`
2. Third-party libraries: `import dayjs from 'dayjs'`
3. Local relative imports: `import { ... } from "../types"`
4. Absolute imports (when used): `import { ... } from "@/components"`

**Path Aliases:**
- No path aliases configured in `tsconfig.json`
- Relative imports used throughout the codebase

## Error Handling

**Patterns:**
```typescript
// Centralized error handling in api.ts
if (!response.ok) {
  let errorMessage = `HTTP Error ${response.status}`;
  try {
    const errorData = await response.json();
    errorMessage = errorData.detail || errorData.message || errorMessage;
  } catch {
    errorMessage = response.statusText || errorMessage;
  }
  throw new Error(errorMessage);
}

// Local error handling with try-catch
try {
  const data = await apiRequest(endpoint, options);
  return data;
} catch (error) {
  console.error("Operation failed:", error);
  throw error;
}
```

**Network Errors:**
- Timeout handling with `AbortSignal.timeout(30000)`
- Authentication errors clear auth and reload page
- User-facing error messages in Russian

**Validation:**
- JWT token format validation
- User object validation on login
- Type guards for photo URLs

## Logging

**Framework:**
- Native `console.error()` for error logging
- No structured logging library detected
- Debug logging in development (e.g., Dashboard version logging)

**Patterns:**
```typescript
// Error logging
console.error('Error during logout:', err);
console.error("Failed to load filter data:", err);

// Debug logging
console.log("Dashboard Version 2.0 Loaded");
console.log("Audit data:", data);
```

## Comments

**When to Comment:**
- Complex business logic (e.g., state machine logic in Dashboard)
- Workarounds for platform issues (e.g., PWA cache configuration)
- Translation notes and TODOs for Sentry integration

**JSDoc/TSDoc:**
- Minimal usage - only utility functions have comments
- Function-level comments explain parameters and return values

## Function Design

**Size:**
- Generally small functions (<50 lines)
- Complex functions broken down with helper functions
- Callbacks and hooks for side effects

**Parameters:**
- Destructured props for components
- Optional parameters with default values
- Explicit types for all parameters

**Return Values:**
- Consistent return types
- Union types for error handling
- `void` for functions with side effects

## Module Design

**Exports:**
- Named exports for components and utilities
- Default export for main API service
- Barrel files not used

**Component Structure:**
- Functional components with hooks
- TypeScript interfaces for props
- React.memo for optimization where needed
- Dynamic imports for bundle optimization

**State Management:**
- useState for component state
- useContext for global auth state
- useCallback and useMemo for performance

---

*Convention analysis: 2026-01-28*