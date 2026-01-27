---
title: Database Operations
domain: backend
related:
  - database-schema.md
  - ../architecture/scalability.md
last_updated: 2026-01-27
context_priority: high
---

# Database Operations

## Overview

This document covers common database operations, migration management, constraints, validation, and security best practices for the LogiShift database.

---

## Migration & Schema Management

### Prisma Migrations

**Generate Prisma Client:**
```bash
npx prisma generate
```

**Create a new migration:**
```bash
npx prisma migrate dev --name <migration_name>
```

**Apply migrations in production:**
```bash
npx prisma migrate deploy
```

**Reset database (development only):**
```bash
npx prisma migrate reset
```

**View migration history:**
```bash
npx prisma migrate status
```

### Schema File Location
```
prisma/schema.prisma
```

### Migration Storage
Migrations are stored in `prisma/migrations/` directory (not visible in current codebase - may need to initialize).

### Recommended Workflow
1. Modify `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name`
3. Review generated migration SQL in `prisma/migrations/`
4. Commit both schema and migration files
5. Test migration locally
6. Deploy to production with `npx prisma migrate deploy`

---

## Common CRUD Queries

### Create

**Create new user:**
```typescript
await prisma.users.create({
  data: {
    tenant_id: 10,
    role: 'driver',
    full_name: 'Иван Иванов',
    email: 'ivan@example.com',
    password_hash: hashedPassword,
    current_state: 'idle',
    hourly_rate: 400
  }
});
```

**Create new shift:**
```typescript
await prisma.shifts.create({
  data: {
    tenant_id: 10,
    user_id: 5,
    truck_id: 3,
    site_id: 7,
    status: 'active',
    start_time: new Date()
  }
});
```

### Read

**Get user with tenant:**
```typescript
const user = await prisma.users.findUnique({
  where: { id: 5 },
  include: { tenant: true }
});
```

**Get active shifts for tenant:**
```typescript
const shifts = await prisma.shifts.findMany({
  where: {
    tenant_id: 10,
    status: 'active'
  },
  include: {
    user: true,
    truck: true,
    site: true
  }
});
```

**Get trucks (filtered by tenant):**
```typescript
const trucks = await prisma.dict_trucks.findMany({
  where: {
    tenant_id: 10,
    is_active: true,
    is_busy: false
  },
  orderBy: { name: 'asc' }
});
```

### Update

**Update user state:**
```typescript
await prisma.users.update({
  where: { id: 5 },
  data: { current_state: 'active' }
});
```

**Mark truck as busy:**
```typescript
await prisma.dict_trucks.update({
  where: { id: 3 },
  data: { is_busy: true }
});
```

**Update shift with photo:**
```typescript
await prisma.shifts.update({
  where: { id: 45 },
  data: {
    photo_start_url: '1/2024/01/1705315200000-photo.jpg',
    status: 'active',
    start_time: new Date()
  }
});
```

### Delete

**Delete draft shift:**
```typescript
await prisma.shifts.delete({
  where: { id: 46 }
});
```

**Delete expired invites:**
```typescript
await prisma.invites.deleteMany({
  where: {
    expires_at: { lt: new Date() },
    status: 'pending'
  }
});
```

---

## Transactions

All critical multi-table operations must use Prisma transactions.

### Transaction Pattern:
```typescript
await prisma.$transaction(async (tx) => {
  // Atomic operations
  const shift = await tx.shifts.create({
    data: { /* ... */ }
  });

  await tx.dict_trucks.update({
    where: { id: truckId },
    data: { is_busy: true }
  });

  await tx.users.update({
    where: { id: userId },
    data: { current_state: 'active' }
  });

  // All changes commit together or rollback together
});
```

### Common Transaction Use Cases:
- Starting a shift (create shift + mark truck busy + update user state)
- Ending a shift (calculate salary + release truck + update user state)
- Creating manual shift (admin action)
- User registration with invite (create user + mark invite used)

---

## Constraints & Validation

### Data Integrity

**Foreign Key Constraints:**
- All foreign keys enforce referential integrity
- Cascade behavior: Restrict (default)

**Unique Constraints:**
- User email unique per system
- Telegram user ID unique per system
- Invite code unique per system

### Business Logic Constraints

**Tenant Isolation:**
- ALL queries MUST filter by `tenant_id`
- Enforced at service layer

**Shift Constraints:**
- User can only have one active shift (status != 'finished')
- Truck can only be used by one shift at a time (`is_busy` flag)

**Plan Limits:**
- Check `limit_machines` before creating truck
- Check `limit_drivers` before creating user
- Check `limit_sites` before creating site
- `-1` means unlimited

**State Machine Constraints:**
- User state transitions must follow valid paths
- Shift status transitions must be valid

### Validation at Application Layer

```typescript
// Example: Truck availability check
const truck = await prisma.dict_trucks.findUnique({ where: { id: truckId } });
if (truck?.is_busy) {
  throw new Error("Машина уже занята");
}

// Example: Active shift check
const existing = await prisma.shifts.findFirst({
  where: {
    user_id: userId,
    status: { not: "finished" }
  }
});
if (existing) {
  throw new Error("У вас уже есть активная смена");
}

// Example: Plan limit check
const count = await prisma.dict_trucks.count({ where: { tenant_id } });
if (count >= limit_machines) {
  throw new Error("Лимит машин исчерпан");
}
```

---

## Performance Considerations

### Indexed Queries
Always use indexed fields in WHERE clauses:
- `user_id`, `tenant_id`, `created_at` (in audit_logs)
- `id` (all primary keys)
- `tg_user_id`, `email` (in users)

### N+1 Query Prevention
Use `include` or `select` to fetch related data:
```typescript
// ❌ Bad (N+1 queries)
const shifts = await prisma.shifts.findMany();
for (const shift of shifts) {
  const user = await prisma.users.findUnique({ where: { id: shift.user_id } });
}

// ✅ Good (single query)
const shifts = await prisma.shifts.findMany({
  include: { user: true, truck: true, site: true }
});
```

### Pagination (Future Enhancement)
For large datasets, use cursor-based or offset pagination:
```typescript
const shifts = await prisma.shifts.findMany({
  where: { tenant_id: tid },
  take: 20,
  skip: 0,
  orderBy: { created_at: 'desc' }
});
```

---

## Backup & Recovery

### Backup Commands
```bash
# Full database backup
pg_dump -U username -d database_name > backup.sql

# Schema-only backup
pg_dump -U username -d database_name --schema-only > schema.sql

# Data-only backup
pg_dump -U username -d database_name --data-only > data.sql
```

### Recovery Commands
```bash
# Restore from backup
psql -U username -d database_name < backup.sql
```

---

## Security Considerations

### Sensitive Data Protection
- Passwords hashed with bcrypt (10 rounds)
- Never store plain text passwords
- JWT tokens stored client-side only

### Access Control
- Multi-tenant isolation via `tenant_id`
- Role-based access control (admin, driver, foreman)
- Never expose other tenants' data

### SQL Injection Prevention
- All queries through Prisma ORM (parameterized)
- Never use raw SQL queries with user input
- Validate all input before database operations

---

## Related Documentation

- [Database Schema](./database-schema.md) - Complete table definitions
- [API Reference](./api-reference.md) - API endpoints that use database
- [Architecture: Security](../architecture/security.md) - Security architecture
