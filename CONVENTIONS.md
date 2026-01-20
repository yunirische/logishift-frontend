# LogiShift Backend - Code Conventions

## Table of Contents
1. [Naming Conventions](#naming-conventions)
2. [TypeScript Rules](#typescript-rules)
3. [Code Style & Formatting](#code-style--formatting)
4. [JSDoc & Documentation](#jsdoc--documentation)
5. [Git Commit Messages](#git-commit-messages)
6. [Import Structure](#import-structure)
7. [Preferred Libraries](#preferred-libraries)

## Naming Conventions

### Files & Directories
- **Directories:** kebab-case
  - `services/`, `middleware/`, `routes/`, `core/`, `utils/`
- **Files:** kebab-case with `.ts` extension
  - `web-api.controller.ts`, `auth.middleware.ts`, `shift.service.ts`
- **Test files:** append `.test.ts` or `.spec.ts`
  - `shift.service.test.ts`, `auth.spec.ts`

### Variables & Functions
- **Variables:** camelCase
  ```typescript
  const userId = 123;
  const tenantId = 456;
  const activeShift = null;
  ```
- **Functions/Methods:** camelCase, descriptive verbs
  ```typescript
  async startShiftDraft(userId: number, tenantId: number) { }
  async handleShiftPhoto(userId: number, fileId: string) { }
  function parseId(id: any): number { }
  ```

### Classes & Interfaces
- **Classes:** PascalCase, singular
  ```typescript
  class ShiftService { }
  class WebApiController { }
  class OnboardingService { }
  ```
- **Interfaces:** PascalCase, singular
  ```typescript
  interface AuthRequest extends Request {
    user?: { id: number; tenant_id: number; role: string };
  }
  interface ApiResponse {
    success: boolean;
    data?: any;
    error?: string;
  }
  ```

### Constants
- **Global constants:** UPPER_SNAKE_CASE
  ```typescript
  const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
  const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
  const TEMP_DIR = path.join(UPLOAD_DIR, "temp");
  ```
- **Local constants:** camelCase for module-level constants
  ```typescript
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const defaultPasswordHash = await bcrypt.hash("password123", 10);
  ```

### Private Members
- Use `private` keyword, snake_case for naming not required
  ```typescript
  private async finalizeShiftInternal(tx: any, shiftId: number, finalData: any = {}) { }
  ```

### Database Fields
- **Tables:** snake_case
  - `audit_logs`, `dict_trucks`, `dict_sites`
- **Columns:** snake_case
  - `tenant_id`, `current_state`, `hourly_rate`, `photo_start_url`

### Routes
- **URL paths:** kebab-case, lowercase
  ```typescript
  /api/v1/dashboard/stats
  /api/v1/shifts/start
  /api/v1/reports/excel
  ```
- **Callback data:** UPPER_SNAKE_CASE with underscores
  ```typescript
  "START_SHIFT", "ADMIN_MAIN", "MS_DRV_123", "VIEW_TRK_456"
  ```

## TypeScript Rules

### Current Configuration
```json
{
  "compilerOptions": {
    "target": "es2016",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": false,              // ❌ Currently disabled
    "noImplicitAny": false,       // ❌ Currently disabled
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Type vs Interface
**Use `interface` for:**
- Object shapes that may be extended
- React props (if using React)
- Public API contracts

```typescript
interface AuthRequest extends Request {
  user?: { id: number; tenant_id: number; role: string };
}

interface ShiftWithRelations {
  id: number;
  status: string;
  user: { full_name: string };
  truck: { name: string };
}
```

**Use `type` for:**
- Union types, intersections
- Primitive types, function types
- Utility types

```typescript
type UserRole = "admin" | "driver" | "foreman";
type ShiftStatus = "idle" | "pending_truck" | "active" | "finished";
type AsyncHandler = (req: any, res: Response) => Promise<void>;
```

### Type Definitions

**Request Types:**
```typescript
// Extend Express Request for authenticated routes
interface AuthRequest extends Request {
  user?: {
    id: number;
    tenant_id: number;
    role: string;
  };
}

// Route handler signature
type RouteHandler = (req: AuthRequest, res: Response) => Promise<void>;
```

**Service Method Types:**
```typescript
// Service methods should have explicit parameter and return types
async startShiftDraft(userId: number, tenantId: number): Promise<void> { }
async selectTruck(userId: number, truckId: number): Promise<Shift> { }
async getCurrentShift(userId: number): Promise<Shift | null> { }
```

**Database Result Types:**
```typescript
// Use Prisma-generated types when possible
import { User, Shift, Tenant, Truck, Site } from "@prisma/client";

// Custom types for includes
type ShiftWithUser = Shift & { user: User };
type ShiftWithRelations = Shift & {
  user: User;
  truck: Truck | null;
  site: Site | null;
  tenant: Tenant;
};
```

### Type Assertions
```typescript
// Common pattern for plan limits
const limits = (tenant.plan as any)?.limit_machines ?? Infinity;
const plan = (tenant.plan as any)?.name || "Unknown";

// Parse ID helper
const parsed = parseInt(id);
if (isNaN(parsed)) throw new Error("Invalid ID format");
return parsed;
```

### Best Practices (Future Enhancement)
When `strict: true` is enabled:
- Remove `any` type where possible
- Use `unknown` instead of `any` for generic types
- Add proper null checks with optional chaining
- Use non-null assertion operator (`!`) sparingly
- Leverage `Pick`, `Partial`, `Omit` utility types

## Code Style & Formatting

### Current Status
- **No ESLint configured** - Add ESLint with TypeScript support
- **No Prettier configured** - Add Prettier for consistent formatting
- **No test framework** - Add Jest or Vitest for testing

### Recommended ESLint Configuration
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "error",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### Code Formatting Style

**Indentation:** 2 spaces
```typescript
if (condition) {
  doSomething();
}
```

**Brace Style:** Allman style for control flow (currently used inconsistently)
```typescript
// PREFERRED (consistent with Express middleware)
if (condition)
{
  doSomething();
}

// ALSO ACCEPTABLE (K&R style)
if (condition) {
  doSomething();
}
```

**Semicolons:** Required (no ASI)
```typescript
const userId = 123;
console.log(userId);
```

**Quotes:** Single quotes for strings, double quotes for HTML (if any)
```typescript
const message = 'Error occurred';
const html = "<div>Content</div>";
```

**Line Length:** Max 100-120 characters
```typescript
// OK
const result = await prisma.users.findMany({
  where: { tenant_id: tid, role: 'driver' }
});

// Too long - break it
const result = await prisma.users.findMany({
  where: { tenant_id: tid, role: 'driver' },
  include: { tenant: { include: { plan: true } } }
});
```

### Function Declarations
```typescript
// Named function
async function handleWebhook(req: Request, res: Response): Promise<void> {
  // implementation
}

// Method in class
async startShiftDraft(userId: number, tenantId: number): Promise<void> {
  // implementation
}

// Arrow function (for callbacks)
apiRouter.get('/endpoint', async (req, res) => {
  // implementation
});
```

### Object Formatting
```typescript
// Multi-line for complex objects
const shift = await prisma.shifts.create({
  data: {
    tenant_id: tenantId,
    user_id: userId,
    truck_id: truckId,
    site_id: siteId,
    status: 'active',
    start_time: new Date()
  }
});

// Single-line for simple objects
const response = { success: true, data: result };
```

### Error Handling Pattern
```typescript
async methodName(req: any, res: Response) {
  try {
    // Business logic
    const result = await someOperation();
    res.json(result);
  } catch (error: any) {
    // Log error with context
    console.error(`Operation failed for user ${req.user.id}:`, error.message);
    // Return error response
    res.status(500).json({ error: error.message });
  }
}
```

### Logging Pattern
```typescript
// Use L() helper for structured logging
L(tenantId, userId, "action_type", "Description message");

// Console logging levels
console.log("Info message");
console.warn("Warning message");
console.error("Error message:", error);
```

## JSDoc & Documentation

### JSDoc for Functions (Recommended)
```typescript
/**
 * Starts a new shift draft for a user
 * @param userId - The user ID starting the shift
 * @param tenantId - The tenant ID for isolation
 * @throws Error if user already has an active shift
 */
async startShiftDraft(userId: number, tenantId: number): Promise<void> {
  // implementation
}
```

### Inline Comments (Current Standard)
```typescript
// Cleanup stale shifts older than 30 minutes
await this.cleanupStaleShifts(tenantId);

// Check if truck is available
if (truck?.is_busy) throw new Error("Машина уже занята");

// Update user state to active
await prisma.users.update({
  where: { id: userId },
  data: { current_state: "active" }
});
```

### Comment Guidelines
- **Language:** Russian (current codebase standard)
- **Single-line comments** for simple explanations
- **Block comments** for complex logic sections
- **TODO comments** for future improvements
  ```typescript
  // TODO: Add validation for truck_id parameter
  // FIXME: Handle edge case when site is null
  // NOTE: This transaction ensures data consistency
  ```

## Git Commit Messages

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring without functional changes
- `style`: Code style changes (formatting, no code changes)
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `chore`: Build process, tooling, dependencies

### Examples
```
feat(shift): add photo upload for PWA endpoint

- Implement handlePWAPhotoUpload method
- Add validation for file types
- Update user state machine transitions

Closes #123

fix(auth): correct JWT token expiration validation

Token validation was not checking expiration time correctly,
causing expired tokens to be accepted.

chore: upgrade Prisma to 5.7.0

- Update package.json
- Regenerate Prisma client
- Update binary targets for Docker support
```

### Subject Line Rules
- Imperative mood ("add" not "added")
- Lowercase except for acronyms
- No period at the end
- Limit to 50 characters

### Body Rules
- Wrap at 72 characters
- Explain what and why, not how
- Use bullet points for multiple items

## Import Structure

### Import Order
```typescript
// 1. External dependencies (Node.js)
import express from "express";
import path from "path";
import fs from "fs/promises";

// 2. Third-party libraries
import axios from "axios";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// 3. Internal imports (relative paths)
import prisma from "../core/prisma";
import { shiftService } from "./services/shift.service";
import { authenticateJWT, AuthRequest } from "./middleware/auth";
import { parseId, formatInTimezone, L } from "./utils/helpers";
```

### Absolute vs Relative Imports
**Prefer relative imports** (current convention):
```typescript
import prisma from "../core/prisma";
import { shiftService } from "./services/shift.service";
```

**Consider path aliases** for larger projects:
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@core/*": ["src/core/*"],
      "@services/*": ["src/services/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

### Named vs Default Exports
**Default exports for classes:**
```typescript
class WebApiController { }
export class WebApiController { }

export const webCtrl = new WebApiController();
```

**Named exports for utilities:**
```typescript
export { parseId, formatInTimezone, formatDuration, L };
export const onboardingService = new OnboardingService();
export const shiftService = new ShiftService();
```

**Mixed exports:**
```typescript
// Export multiple items
export { authenticateJWT, AuthRequest };

// Default export (routes)
const apiRouter = express.Router();
export default apiRouter;
```

### Import Best Practices
- Group imports logically
- Keep import sections separated by blank lines
- Remove unused imports
- Use tree-shaking friendly named exports when appropriate

## Preferred Libraries

### HTTP Server
- **express** - Web framework (current)
- Avoid: Koa, Hapi, Fastify (unless specifically required)

### Database
- **@prisma/client** - ORM (current, strongly recommended)
- Avoid: Direct SQL queries, TypeORM, Sequelize

### Authentication
- **jsonwebtoken** - JWT handling (current)
- **bcrypt** - Password hashing (current)
- Avoid: MD5, SHA-1 (insecure), plain text

### Validation
- **Currently:** Manual validation in controllers
- **Recommended:** Add Zod or Joi for runtime validation
  ```typescript
  import { z } from "zod";

  const StartShiftSchema = z.object({
    truck_id: z.number().int().positive(),
    site_id: z.number().int().positive()
  });
  ```

### HTTP Client
- **axios** - HTTP requests (current)
- **fetch** - Native, available in Node 18+
- Avoid: request (deprecated), superagent (less popular)

### Date Handling
- **Currently:** Native Date object
- **Recommended:** Add date-fns or luxon for complex date operations
  ```typescript
  import { format, addHours, differenceInMinutes } from "date-fns";
  ```

### Environment Config
- **dotenv** - Environment variables (current)
- **config** - More complex configuration (future consideration)

### Logging
- **Currently:** console.log, console.error, custom L() helper
- **Recommended:** Add Winston or Pino for production logging
  ```typescript
  import winston from "winston";

  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
      new winston.transports.File({ filename: 'error.log', level: 'error' }),
      new winston.transports.File({ filename: 'combined.log' })
    ]
  });
  ```

### File Upload
- **multer** - Multipart form data (current)
- Avoid: formidable, busboy (lower-level)

### Excel Generation
- **exceljs** - Excel file generation (current)
- Alternative: xlsx (simpler API)

### Testing (Future Addition)
- **Jest** - Testing framework (recommended for TypeScript)
- Alternative: Vitest (faster, modern)
- **Supertest** - HTTP endpoint testing

### Code Quality Tools (Future Addition)
- **ESLint** - Linting
- **Prettier** - Formatting
- **Husky** - Git hooks
- **lint-staged** - Run linters on staged files

## Anti-Patterns to Avoid

### ❌ DO NOT
- Use `any` type excessively
- Mix languages in comments (keep consistent - Russian or English)
- Copy-paste code without extracting to functions
- Create functions > 100 lines
- Use magic numbers without constants
- Hardcode secrets in code
- Skip transactions for multi-table operations
- Use direct SQL queries instead of Prisma
- Forget tenant_id filters in queries
- Mix business logic in controllers

### ✅ DO
- Use descriptive variable names
- Break large functions into smaller, focused ones
- Add error handling with try-catch
- Use async/await consistently
- Log important operations
- Write tests for critical business logic
- Use TypeScript interfaces for complex types
- Follow consistent naming conventions
- Document complex business logic
- Keep imports organized
