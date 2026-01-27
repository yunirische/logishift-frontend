---
title: Architecture Decisions
domain: decisions
related:
  - data-sync-decisions.md
  - ../architecture/overview.md
last_updated: 2026-01-27
context_priority: low
---

# Architecture Decisions

## Overview

This document records significant architectural decisions made during the development of LogiShift, explaining the rationale behind each choice.

## Decision Records

### ADR-001: n8n Gateway Pattern for Telegram Integration

**Status:** Accepted

**Context:**
- Need to integrate Telegram Bot with backend
- Multiple integration approaches available
- Require flexibility and maintainability

**Decision:**
Use n8n as a gateway between Telegram Bot API and backend server.

**Rationale:**
- **Decoupling:** Backend doesn't directly depend on Telegram API
- **Centralized Logic:** Single entry point for bot interactions
- **Flexibility:** Easy to add new bot features via n8n workflows
- **Testing:** Can test bot integration independently
- **Security:** Backend API key not exposed to Telegram
- **Maintenance:** n8n handles webhook management

**Consequences:**
- ✅ Clean separation of concerns
- ✅ Easy to modify bot behavior
- ✅ Can integrate other services via n8n
- ⚠️ Additional dependency (n8n)
- ⚠️ Network latency through n8n

**Alternatives Considered:**
1. **Direct Telegram Integration**
   - Pros: Simpler, fewer dependencies
   - Cons: Tight coupling, harder to test, less flexible

2. **Custom Gateway Service**
   - Pros: Full control
   - Cons: More infrastructure, maintenance overhead

**Related:**
- [Bot Integration](../telegram-bot/integration.md)
- [Gateway API](../telegram-bot/gateway-api.md)

---

### ADR-002: State Machine Pattern for User Workflow

**Status:** Accepted

**Context:**
- Complex multi-step shift creation process
- Need to track user progress
- Must handle cancellations and errors

**Decision:**
Implement state machine pattern to manage user workflow through shift operations.

**Rationale:**
- **Clear Workflow:** Explicit states make flow obvious
- **Error Prevention:** Invalid transitions are blocked
- **Recovery:** Can detect and recover from stuck states
- **Testing:** Each state can be tested independently
- **Scalability:** Easy to add new states or transitions

**Consequences:**
- ✅ Controlled user journey
- ✅ Easy to debug issues
- ✅ Clear state visualization
- ⚠️ More complex than simple boolean flags
- ⚠️ Requires careful state management

**State Machine:**
```
idle → pending_truck → pending_site → awaiting_odo_start → active
  ↑                                                         │
  └────────── awaiting_odo_end → awaiting_invoice ────────┘
                                    ↓
                                 finished
```

**Alternatives Considered:**
1. **Boolean Flags**
   - Pros: Simpler
   - Cons: Doesn't capture complexity, ambiguous states

2. **Event Sourcing**
   - Pros: Complete audit trail
   - Cons: Overkill for this use case, complex

**Related:**
- [State Machine](../telegram-bot/state-machine.md)
- [Design Patterns](../architecture/design-patterns.md)

---

### ADR-003: Prisma ORM

**Status:** Accepted

**Context:**
- Need database access layer
- Type safety required
- Migration management needed

**Decision:**
Use Prisma ORM for database operations.

**Rationale:**
- **Type Safety:** Auto-generated TypeScript types
- **Migrations:** Built-in migration system
- **Query Builder:** Type-safe query construction
- **Productivity:** Less boilerplate code
- **Community:** Active community and good documentation

**Consequences:**
- ✅ Type-safe database operations
- ✅ Easy schema changes
- ✅ Great developer experience
- ⚠️ Learning curve for team
- ⚠️ Additional build step (generate client)

**Example:**
```typescript
const shifts = await prisma.shifts.findMany({
  where: {
    tenant_id: user.tenant_id,
    status: 'active'
  },
  include: {
    user: true,
    truck: true,
    site: true
  }
});
```

**Alternatives Considered:**
1. **Raw SQL (pg)**
   - Pros: Full control, no dependencies
   - Cons: No type safety, manual queries, error-prone

2. **TypeORM**
   - Pros: Similar benefits
   - Cons: More complex, heavier

3. **Sequelize**
   - Pros: Mature, widely used
   - Cons: Less type-safe, more verbose

**Related:**
- [Tech Stack](../architecture/tech-stack.md)
- [Database Schema](../backend/database-schema.md)

---

### ADR-004: JWT with 12-Hour Expiration

**Status:** Accepted

**Context:**
- Need authentication for PWA
- Balance security vs. user experience
- Mobile app usage patterns

**Decision:**
Use JWT tokens with 12-hour expiration for authentication.

**Rationale:**
- **User Experience:** 12 hours covers typical workday
- **Security:** Limited token lifespan reduces risk
- **Simplicity:** No refresh token complexity
- **Mobile-Friendly:** App runs during work shift
- **Stateless:** No server-side session storage

**Consequences:**
- ✅ Good balance of security and UX
- ✅ Simple implementation
- ✅ No session management overhead
- ⚠️ Users must re-login after 12 hours
- ⚠️ Token revocation not trivial

**Token Payload:**
```typescript
{
  id: number;
  role: string;
  tenant_id: number;
  iat: number;
  exp: number;  // +12 hours
}
```

**Alternatives Considered:**
1. **Long-lived Tokens (30 days)**
   - Pros: Better UX
   - Cons: Security risk, hard to revoke

2. **Refresh Tokens**
   - Pros: Better security
   - Cons: More complex, additional storage

3. **Session-Based Auth**
   - Pros: Easy revocation
   - Cons: Server state, not scalable

**Related:**
- [Security](../architecture/security.md)
- [API Reference](../backend/api-reference.md)

---

### ADR-005: Local Filesystem Storage

**Status:** Accepted (with migration plan)

**Context:**
- Need to store shift photos
- Considerations: cost, performance, scalability

**Decision:**
Use local filesystem for file storage (with plan to migrate to S3).

**Rationale:**
- **Simplicity:** No external dependencies
- **Cost:** Free for initial deployment
- **Performance:** Fast local access
- **Privacy:** Data stays on our servers

**Consequences:**
- ✅ Simple implementation
- ✅ No external costs
- ✅ Fast access
- ⚠️ Doesn't scale horizontally
- ⚠️ Manual backup required
- ⚠️ Disk space management

**File Organization:**
```
uploads/
├── {tenant_id}/
│   └── {year}/
│       └── {month}/
│           └── {timestamp}-{description}.{ext}
```

**Migration Path:**
1. Add S3 integration alongside local storage
2. Migrate existing files to S3
3. Update all file references
4. Remove local storage dependency

**Alternatives Considered:**
1. **S3 from Start**
   - Pros: Scalable, CDN support
   - Cons: Cost, complexity, overkill for MVP

2. **Azure Blob Storage**
   - Pros: Good Azure integration
   - Cons: Vendor lock-in

3. **Google Cloud Storage**
   - Pros: Good GCP integration
   - Cons: Vendor lock-in

**Related:**
- [Deployment](../architecture/deployment.md)
- [Scalability](../architecture/scalability.md)

---

### ADR-006: No Caching Headers

**Status:** Accepted (with future enhancement)

**Context:**
- Real-time data requirements
- Shift status changes frequently
- Dashboard statistics

**Decision:**
Disable caching headers for API responses (real-time data delivery).

**Rationale:**
- **Real-time:** Always show current data
- **Simplicity:** No cache invalidation logic
- **Accuracy:** No stale data concerns
- **Immediate:** Changes reflected instantly

**Consequences:**
- ✅ Always accurate data
- ✅ No cache invalidation needed
- ✅ Simple implementation
- ⚠️ Increased server load
- ⚠️ Slower response times
- ⚠️ Higher bandwidth usage

**Headers:**
```typescript
res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
res.set('Pragma', 'no-cache');
res.set('Expires', '0');
```

**Future Enhancement:**
- Implement Redis caching
- Cache dictionary data (5 min)
- Cache dashboard stats (1 min)
- Use ETag for conditional requests

**Alternatives Considered:**
1. **Aggressive Caching**
   - Pros: Better performance
   - Cons: Stale data, complex invalidation

2. **Short-Term Caching (1-2 min)**
   - Pros: Balance performance and freshness
   - Cons: Cache invalidation complexity

**Related:**
- [API Reference](../backend/api-reference.md)
- [Scalability](../architecture/scalability.md)

---

### ADR-007: Multi-Tenant via tenant_id

**Status:** Accepted

**Context:**
- SaaS platform serving multiple companies
- Need data isolation between tenants
- Shared infrastructure for cost efficiency

**Decision:**
Implement multi-tenancy using `tenant_id` column in all tables.

**Rationale:**
- **Isolation:** Complete data separation
- **Simplicity:** Easy to understand and implement
- **Scalability:** Shared infrastructure reduces costs
- **Security:** Automatic filtering by tenant
- **Performance:** Single database, efficient queries

**Consequences:**
- ✅ Clear data isolation
- ✅ Cost-effective
- ✅ Simple implementation
- ⚠️ Tenant-specific queries required
- ⚠️ Index bloat (tenant_id in all tables)

**Implementation:**
```typescript
// Automatic filtering
const trucks = await prisma.dict_trucks.findMany({
  where: {
    tenant_id: user.tenant_id  // Always filter
  }
});
```

**Alternatives Considered:**
1. **Separate Database per Tenant**
   - Pros: Complete isolation
   - Cons: Complex, expensive, hard to manage

2. **Schema per Tenant**
   - Pros: Good isolation
   - Cons: Complex migrations, harder to manage

3. **Row-Level Security (PostgreSQL)**
   - Pros: Database-enforced isolation
   - Cons: Harder to implement, less transparent

**Related:**
- [Database Schema](../backend/database-schema.md)
- [Security](../architecture/security.md)

---

### ADR-008: Service Layer Pattern

**Status:** Accepted

**Context:**
- Business logic separation from controllers
- Reusable logic across multiple endpoints
- Testing requirements

**Decision:**
Implement service layer to encapsulate business logic.

**Rationale:**
- **Separation of Concerns:** Controllers handle HTTP, services handle logic
- **Reusability:** Services used by multiple controllers
- **Testability:** Services can be tested independently
- **Maintainability:** Easier to locate and modify business logic

**Consequences:**
- ✅ Clean architecture
- ✅ Reusable code
- ✅ Easy to test
- ⚠️ More files to maintain
- ⚠️ Indirection can be confusing

**Structure:**
```
Controller → Service → Prisma
     ↓           ↓
   HTTP    Business Logic
```

**Example:**
```typescript
// Controller
router.post('/shifts/start', authenticateJWT, async (req, res) => {
  const result = await shiftService.startShiftPWA(req.user.id, req.body);
  res.json(result);
});

// Service
async startShiftPWA(userId: number, data: StartShiftData) {
  // Business logic here
  return await prisma.$transaction(async (tx) => {
    // ...
  });
}
```

**Alternatives Considered:**
1. **Fat Controllers**
   - Pros: Simpler for small apps
   - Cons: Hard to maintain, no reusability

2. **Repository Pattern**
   - Pros: Additional abstraction
   - Cons: Overkill with Prisma

**Related:**
- [Design Patterns](../architecture/design-patterns.md)
- [Overview](../architecture/overview.md)

---

## Template for Future ADRs

```markdown
### ADR-XXX: [Title]

**Status:** Proposed | Accepted | Deprecated | Superseded

**Context:**
- [Background]
- [Problem statement]
- [Requirements]

**Decision:**
[Decision statement]

**Rationale:**
- [Reason 1]
- [Reason 2]
- [Reason 3]

**Consequences:**
- ✅ [Positive outcome 1]
- ✅ [Positive outcome 2]
- ⚠️ [Negative outcome 1]
- ⚠️ [Negative outcome 2]

**Alternatives Considered:**
1. **[Alternative 1]**
   - Pros: [Benefit]
   - Cons: [Drawback]

2. **[Alternative 2]**
   - Pros: [Benefit]
   - Cons: [Drawback]

**Related:**
- [Link to related documentation]
```

## Related Documentation

- [Overview](../architecture/overview.md) - System architecture
- [Design Patterns](../architecture/design-patterns.md) - Patterns used
- [Data Sync Decisions](./data-sync-decisions.md) - Synchronization decisions
