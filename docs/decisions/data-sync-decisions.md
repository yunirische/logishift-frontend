---
title: Data Synchronization Decisions
domain: decisions
related:
  - architecture-decisions.md
  - ../architecture/data-flow.md
last_updated: 2026-01-27
context_priority: low
---

# Data Synchronization Decisions

## Overview

This document records decisions related to data synchronization, busy flag handling, and limit checking strategies in LogiShift.

## Decision Records

### DSD-001: Busy Flag Synchronization Strategy

**Status:** Accepted

**Context:**
- `is_busy` flag in `dict_trucks` table
- Flag can get stuck if shift ends unexpectedly
- Need reliable way to detect and resolve stuck flags

**Decision:**
Implement left join synchronization to detect stuck busy flags, with force-reset capability.

**Problem:**
When a shift ends unexpectedly (crash, network failure, etc.), the truck's `is_busy` flag may remain `true` even though no active shift exists.

**Solution:**
1. **Detection:** GET `/trucks` endpoint performs left join with active shifts
2. **Identification:** Frontend detects `is_busy === true` AND `shifts.length === 0`
3. **Resolution:** Admin can force-reset via PATCH `/trucks/:id` with `is_busy: false`

**Implementation:**
```typescript
// Backend: Get trucks with active shifts
const trucks = await prisma.dict_trucks.findMany({
  where: {
    tenant_id,
    is_active: true
  },
  include: {
    shifts: {
      where: { status: { not: 'finished' } },
      include: {
        user: {
          select: {
            id: true,
            full_name: true
          }
        }
      }
    }
  }
});

// Frontend: Detect stuck state
if (truck.is_busy && truck.shifts.length === 0) {
  // Flag is stuck!
  showWarning('Truck is stuck in busy state');
  showForceResetButton();
}
```

**Rationale:**
- **Detection:** Always check actual data, not just flags
- **Transparency:** Frontend can see inconsistency
- **Manual Resolution:** Admins have control to fix issues
- **Audit Trail:** Force-reset is explicit action

**Consequences:**
- ✅ Stuck flags detectable
- ✅ Manual resolution available
- ✅ Audit trail maintained
- ⚠️ Requires admin intervention
- ⚠️ Frontend must handle special case

**Alternatives Considered:**
1. **Automatic Cleanup Cron Job**
   - Pros: Automatic resolution
   - Cons: Can hide underlying problems, timing issues

2. **Database Triggers**
   - Pros: Automatic synchronization
   - Cons: Complex, harder to debug

3. **Remove Flag Entirely**
   - Pros: No synchronization issue
   - Cons: Performance (must query shifts table every time)

**Related:**
- [Architecture: Data Flow](../architecture/data-flow.md)
- [Database Schema](../backend/database-schema.md)
- [API Reference: Trucks](../backend/api-reference.md#trucks-dictionary)

---

### DSD-002: Real-Time Usage Counters

**Status:** Accepted

**Context:**
- Need accurate dashboard statistics
- Track current usage vs. plan limits
- Busy flag not reliable for counting

**Decision:**
Calculate `trucksInWork` by counting unique truck IDs in active shifts, not by busy flags.

**Problem:**
Busy flag can be inaccurate (see DSD-001), so dashboard counters based on flags will also be inaccurate.

**Solution:**
```typescript
// Count unique trucks in active shifts
const activeShifts = await prisma.shifts.findMany({
  where: {
    tenant_id,
    status: { not: 'finished' }
  },
  select: {
    truck_id: true
  }
});

// Count unique truck IDs
const trucksInWork = new Set(activeShifts.map(s => s.truck_id)).size;
```

**Dashboard Stats Response:**
```json
{
  "activeShifts": 5,
  "activeDrivers": 4,
  "trucksInWork": 3,
  "usage": {
    "trucks": {
      "current": 8,  // Total in dictionary
      "limit": 10
    }
  }
}
```

**Counters Explained:**
- `activeShifts` – Number of shifts where `status != 'finished'`
- `activeDrivers` – Users where `current_state = 'active'` AND `role = 'driver'`
- `trucksInWork` – Unique `truck_id` values in active shifts
- `usage.trucks.current` – Total trucks in dictionary (for limit checking)

**Rationale:**
- **Accuracy:** Based on actual shift data, not flags
- **Real-time:** Always reflects current state
- **Transparent:** Can distinguish between "total" and "in work"
- **Reliable:** No dependency on potentially incorrect flags

**Consequences:**
- ✅ Accurate counters
- ✅ Clear distinction between total and in-use
- ✅ No flag dependency
- ⚠️ Slightly more complex query
- ⚠️ Different counters can be confusing

**Alternatives Considered:**
1. **Use Busy Flag Count**
   - Pros: Simpler query
   - Cons: Inaccurate (stuck flags)

2. **Add In-Use Counter Column**
   - Pros: Fast query
   - Cons: Synchronization issues, redundant

**Related:**
- [Architecture: Data Flow](../architecture/data-flow.md)
- [API Reference: Dashboard](../backend/api-reference.md#dashboard)

---

### DSD-003: Limit Checking Strategy

**Status:** Accepted

**Context:**
- Subscription plans have resource limits
- Need to enforce limits at CRUD time
- Unlimited plans use `-1`

**Decision:**
Check limits before creating resources, throw 403 error when limit reached.

**Problem:**
Tenants can create unlimited resources without enforcement of plan limits.

**Solution:**
```typescript
// TenantService
async checkTruckLimit(tenantId: number) {
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    include: { plan: true }
  });

  const limit = tenant.plan.limit_machines;
  if (limit === -1) return; // Unlimited

  const current = await prisma.dict_trucks.count({
    where: { tenant_id: tenantId }
  });

  if (current >= limit) {
    throw new Error(
      `Достигнут лимит машин (${limit} шт.). Тарифный план: ${tenant.plan.name}`
    );
  }
}
```

**Usage:**
```typescript
// Controller
router.post('/trucks', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // Check limit first
    await tenantService.checkTruckLimit(req.user.tenant_id);

    // Create truck
    const truck = await prisma.dict_trucks.create({
      data: {
        tenant_id: req.user.tenant_id,
        ...req.body
      }
    });

    res.json(truck);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
});
```

**Limits:**
- `limit_machines` – Max trucks (-1 = unlimited)
- `limit_drivers` – Max drivers (-1 = unlimited)
- `limit_sites` – Max sites (-1 = unlimited)

**Rationale:**
- **Enforcement:** Cannot exceed plan limits
- **Clear Messages:** User knows why operation failed
- **Unlimited Support:** -1 indicates unlimited plans
- **Centralized:** All checks in one service

**Consequences:**
- ✅ Limits enforced
- ✅ Clear error messages
- ✅ Reusable logic
- ⚠️ Additional database query per operation
- ⚠️ Race condition possible (unlikely)

**Alternatives Considered:**
1. **Database Constraints**
   - Pros: Database-enforced
   - Cons: Requires triggers, complex

2. **Post-Creation Validation**
   - Pros: Simpler
   - Cons: Allows over-limit, must delete

3. **Soft Limits (Warnings)**
   - Pros: Flexible
   - Cons: Not enforced, can be abused

**Related:**
- [Database Schema: Plans](../backend/database-schema.md#1-plans)
- [API Reference: Trucks](../backend/api-reference.md#trucks-dictionary)
- [Database Operations: Validation](../backend/database-operations.md#constraints-validation)

---

### DSD-004: Transaction Atomicity for Shift Operations

**Status:** Accepted

**Context:**
- Shift creation involves multiple tables
- Must ensure data consistency
- Cannot have partial updates

**Decision:**
Wrap all multi-table operations in Prisma transactions.

**Problem:**
If shift creation fails after creating shift record but before marking truck busy, data is inconsistent.

**Solution:**
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Create shift
  const shift = await tx.shifts.create({
    data: {
      tenant_id,
      user_id: userId,
      truck_id: truckId,
      site_id: siteId,
      status: 'active',
      start_time: new Date()
    }
  });

  // 2. Mark truck busy
  await tx.dict_trucks.update({
    where: { id: truckId },
    data: { is_busy: true }
  });

  // 3. Update user state
  await tx.users.update({
    where: { id: userId },
    data: { current_state: 'active' }
  });

  // All commit together or rollback together
  return shift;
});
```

**Transaction Use Cases:**
- Starting a shift (create + truck busy + user state)
- Ending a shift (finalize + truck release + user state)
- Creating manual shift (admin action)
- User registration with invite (create user + mark invite used)

**Rationale:**
- **Atomicity:** All or nothing
- **Consistency:** No invalid states
- **Isolation:** No race conditions
- **Durability:** Committed data persists

**Consequences:**
- ✅ Data consistency guaranteed
- ✅ Automatic rollback on failure
- ✅ Clear error handling
- ⚠️ Longer transactions (potential lock time)
- ⚠️ More complex error handling

**Alternatives Considered:**
1. **Separate Operations**
   - Pros: Simpler
   - Cons: Data inconsistency possible

2. **Two-Phase Commit**
   - Pros: Distributed transactions
   - Cons: Overkill for single database

**Related:**
- [Database Operations: Transactions](../backend/database-operations.md#transactions)
- [Design Patterns: Transaction Pattern](../architecture/design-patterns.md)

---

### DSD-005: Audit Logging Strategy

**Status:** Accepted

**Context:**
- Need to track critical actions
- Compliance requirements
- Debugging and accountability

**Decision:**
Log all critical actions to `audit_logs` table with structured details.

**Logged Actions:**
- Shift created/finished
- User created/modified
- Truck/site added/modified
- Settings changed
- Manual shift creation
- Limit exceeded

**Implementation:**
```typescript
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

// Usage
await saveAuditLog(tx, {
  tenant_id: shift.tenant_id,
  user_id: shift.user_id,
  action: 'SHIFT_FINISHED',
  entity: 'shift',
  entity_id: shift.id,
  details: { hours: 4.5, salary: 1800 }
});
```

**Querying Audit Logs:**
```typescript
// Get recent logs for tenant
const logs = await prisma.audit_logs.findMany({
  where: { tenant_id },
  include: { user: true },
  orderBy: { created_at: 'desc' },
  take: 100
});
```

**Rationale:**
- **Compliance:** Audit trail for regulations
- **Debugging:** Track what happened and when
- **Accountability:** Know who performed actions
- **Structured:** Easy to query and analyze

**Consequences:**
- ✅ Complete audit trail
- ✅ Easy debugging
- ✅ Compliance support
- ⚠️ Additional storage
- ⚠️ Performance impact (minimal)

**Alternatives Considered:**
1. **External Log Service (e.g., Loggly, Splunk)**
   - Pros: Powerful querying, alerts
   - Cons: Cost, external dependency

2. **Application Logs Only**
   - Pros: Simple
   - Cons: Hard to query, not structured

**Related:**
- [Database Schema: audit_logs](../backend/database-schema.md#8-audit_logs)
- [Security: Audit Logging](../architecture/security.md#audit-logging)
- [API Reference: Audit](../backend/api-reference.md#audit)

---

## Template for Future Decisions

```markdown
### DSD-XXX: [Title]

**Status:** Proposed | Accepted | Deprecated | Superseded

**Context:**
- [Background]
- [Problem statement]
- [Requirements]

**Decision:**
[Decision statement]

**Problem:**
[Detailed problem description]

**Solution:**
[Implementation details]

**Rationale:**
- [Reason 1]
- [Reason 2]
- [Reason 3]

**Consequences:**
- ✅ [Positive outcome]
- ⚠️ [Concern or limitation]

**Alternatives Considered:**
1. **[Alternative]**
   - Pros: [Benefit]
   - Cons: [Drawback]

**Related:**
- [Link to related documentation]
```

## Related Documentation

- [Architecture Decisions](./architecture-decisions.md) - Main architectural decisions
- [Data Flow](../architecture/data-flow.md) - How data flows through system
- [Database Operations](../backend/database-operations.md) - Database operations
