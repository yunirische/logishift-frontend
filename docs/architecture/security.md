---
title: Security Architecture
domain: architecture
related:
  - overview.md
  - ../backend/database-operations.md#security-considerations
last_updated: 2026-01-27
context_priority: high
---

# Security Architecture

## Overview

LogiShift implements multiple layers of security to protect multi-tenant data, ensure proper authentication, and maintain audit trails.

## Authentication

### JWT Token Authentication

**Token Configuration:**
- **Algorithm:** HS256
- **Expiration:** 12 hours
- **Header:** `Authorization: Bearer <token>`
- **Secret:** `process.env.JWT_SECRET`

**Token Payload:**
```typescript
{
  id: number;        // User ID
  role: string;      // "admin" | "driver" | "foreman"
  tenant_id: number; // Tenant ID for multi-tenant isolation
  iat: number;       // Issued at timestamp
  exp: number;       // Expiration timestamp (12 hours)
}
```

**Token Generation:**
```typescript
// src/middleware/auth.ts
const token = jwt.sign(
  {
    id: user.id,
    role: user.role,
    tenant_id: user.tenant_id
  },
  process.env.JWT_SECRET,
  { expiresIn: '12h' }
);
```

**Token Verification:**
```typescript
// src/middleware/auth.ts
export async function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1]; // "Bearer <token>"
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

    req.user = {
      id: decoded.id,
      role: decoded.role,
      tenant_id: decoded.tenant_id
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

**Protected Routes:**
```typescript
// src/routes/api.ts
router.post('/shifts/start', authenticateJWT, WebApiController.startShift);
router.get('/dashboard/stats', authenticateJWT, WebApiController.getDashboardStats);
router.post('/users', authenticateJWT, requireAdmin, WebApiController.createUser);
```

## Authorization (RBAC)

### Role-Based Access Control

**Roles:**
- **admin** - Full access to all endpoints
- **driver** - Limited to shift operations and view access
- **foreman** - Extended driver permissions (future use)

**Admin Check Middleware:**
```typescript
// src/middleware/auth.ts
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}
```

**Role Permissions:**

| Endpoint | Admin | Driver | Foreman |
|----------|-------|--------|---------|
| `/dashboard/stats` | ✓ | ✓ | ✓ |
| `/shifts/start` | ✓ | ✓ | ✓ |
| `/shifts/end` | ✓ | ✓ | ✓ |
| `/trucks` (GET) | ✓ | ✓ | ✓ |
| `/trucks` (POST) | ✓ | ✗ | ✗ |
| `/sites` (POST) | ✓ | ✗ | ✗ |
| `/users` (GET) | ✓ | ✗ | ✗ |
| `/users` (POST) | ✓ | ✗ | ✗ |
| `/audit` | ✓ | ✗ | ✗ |
| `/reports/excel` | ✓ | ✓ | ✓ |

## Multi-Tenant Isolation

### Tenant ID Filtering

**All database queries filtered by `tenant_id`:**
```typescript
// Example: Get trucks for current tenant
const trucks = await prisma.dict_trucks.findMany({
  where: {
    tenant_id: req.user.tenant_id, // Isolation
    is_active: true
  }
});
```

**Automatic Enforcement at Service Layer:**
```typescript
// src/services/shift.service.ts
async startShiftPWA(userId: number, data: StartShiftData) {
  // Get user with tenant
  const user = await prisma.users.findUnique({
    where: { id: userId }
  });

  // All operations use user.tenant_id
  const shift = await prisma.shifts.create({
    data: {
      tenant_id: user.tenant_id, // Automatic isolation
      user_id: userId,
      truck_id: data.truck_id,
      site_id: data.site_id
    }
  });

  return shift;
}
```

**JWT Token Includes tenant_id:**
- Ensures user can only access their tenant's data
- No cross-tenant data leaks possible
- Automatic filtering in all queries

## Data Protection

### Password Security

**Hashing with bcrypt:**
- **Library:** bcrypt 5.1
- **Rounds:** 10
- **Never store plain text passwords**

**Password Hashing:**
```typescript
import bcrypt from 'bcrypt';

const hash = await bcrypt.hash(password, 10);

// Store hash in database
await prisma.users.create({
  data: {
    email: 'user@example.com',
    password_hash: hash
  }
});
```

**Password Verification:**
```typescript
const user = await prisma.users.findUnique({
  where: { email: login }
});

const isValid = await bcrypt.compare(password, user.password_hash);
if (!isValid) {
  return res.status(401).json({ error: 'Invalid password' });
}
```

### Secrets Management

**Environment Variables Only:**
```bash
# .env (never commit to git)
DATABASE_URL=postgresql://user:password@host:5432/db
JWT_SECRET=your-secret-key-min-32-chars
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

**No Secrets in Code:**
- All secrets in `.env` file
- `.env` in `.gitignore`
- Different secrets for dev/staging/prod
- Rotate secrets periodically

### CORS Configuration

**Current Setup:**
```typescript
// src/index.ts
app.use(cors()); // Allows all origins
```

**⚠️ Security Recommendation:**
Restrict CORS in production:
```typescript
app.use(cors({
  origin: [
    'https://pwa.kontrolsmen.ru',
    'https://app.logishift.ru'
  ],
  credentials: true
}));
```

## Audit Logging

### Audit Trail

**All critical actions logged:**
- Shift started/completed
- Users created/modified
- Trucks/sites added
- Settings changed

**Audit Log Schema:**
```typescript
{
  id: number;
  tenant_id: number;
  user_id: number | null;  // null for system actions
  action: string;          // e.g., "SHIFT_FINISHED"
  entity: string | null;   // e.g., "shift"
  entity_id: number | null;
  details: Json | null;    // Additional context
  created_at: DateTime;
}
```

**Audit Logging Function:**
```typescript
// src/core/bot.ts
export async function saveAuditLog(
  tx: PrismaTransaction,
  data: {
    tenant_id: number;
    user_id?: number;
    action: string;
    entity?: string;
    entity_id?: number;
    details?: any;
  }
) {
  await tx.audit_logs.create({
    data: {
      tenant_id: data.tenant_id,
      user_id: data.user_id || null,
      action: data.action,
      entity: data.entity || null,
      entity_id: data.entity_id || null,
      details: data.details || null
    }
  });
}
```

**Usage Example:**
```typescript
await saveAuditLog(tx, {
  tenant_id: shift.tenant_id,
  user_id: shift.user_id,
  action: 'SHIFT_FINISHED',
  entity: 'shift',
  entity_id: shift.id,
  details: { hours: 4.5, salary: 1800 }
});
```

**View Audit Logs:**
```typescript
// GET /audit (admin only)
const logs = await prisma.audit_logs.findMany({
  where: { tenant_id: req.user.tenant_id },
  include: { user: true },
  orderBy: { created_at: 'desc' },
  take: 100
});
```

## Input Validation

### ID Validation
```typescript
// src/utils/helpers.ts
export function parseId(id: string): number {
  const num = parseInt(id, 10);
  if (isNaN(num)) {
    throw new Error('Invalid ID format');
  }
  return num;
}
```

### Business Logic Validation
```typescript
// Truck availability check
const truck = await prisma.dict_trucks.findUnique({ where: { id: truckId } });
if (truck?.is_busy) {
  throw new Error("Машина уже занята");
}

// Active shift check
const existing = await prisma.shifts.findFirst({
  where: {
    user_id: userId,
    status: { not: "finished" }
  }
});
if (existing) {
  throw new Error("У вас уже есть активная смена");
}

// Plan limit check
const count = await prisma.dict_trucks.count({ where: { tenant_id } });
if (count >= limit_machines) {
  throw new Error("Лимит машин исчерпан");
}
```

## SQL Injection Prevention

### Prisma ORM Protection
- All queries through Prisma (parameterized)
- Never use raw SQL with user input
- Type-safe query building

**✅ Safe (Prisma):**
```typescript
await prisma.users.findMany({
  where: {
    email: userInput  // Automatically escaped
  }
});
```

**❌ Unsafe (Raw SQL):**
```typescript
// NEVER DO THIS
await prisma.$queryRaw`SELECT * FROM users WHERE email = '${userInput}'`;
```

## Security Best Practices

### Implemented ✓
- [x] JWT authentication with 12-hour expiration
- [x] Password hashing with bcrypt (10 rounds)
- [x] Multi-tenant isolation via tenant_id
- [x] Role-based access control (admin/driver)
- [x] Audit logging for critical actions
- [x] SQL injection prevention (Prisma ORM)
- [x] Environment variables for secrets

### Recommended Improvements ⚠️
- [ ] Restrict CORS to specific origins
- [ ] Implement rate limiting
- [ ] Add request logging
- [ ] Implement HTTPS-only in production
- [ ] Add content security policy headers
- [ ] Implement refresh token rotation
- [ ] Add brute force protection for login
- [ ] Sanitize user input in text fields
- [ ] Implement file upload validation (size, type)
- [ ] Add API key rotation for n8n gateway

## Related Documentation

- [Overview](./overview.md) - System architecture
- [Deployment](./deployment.md) - Environment configuration
- [Database Schema](../backend/database-schema.md) - Database structure
- [Decisions](../decisions/architecture-decisions.md) - Security design decisions
