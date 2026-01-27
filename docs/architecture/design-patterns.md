---
title: Design Patterns
domain: architecture
related:
  - overview.md
  - data-flow.md
last_updated: 2026-01-27
context_priority: medium
---

# Design Patterns

## Overview

LogiShift backend implements several design patterns to maintain code organization, reusability, and scalability.

## Design Patterns

### 1. Service Layer Pattern

Business logic separated from controllers:
- Controllers handle HTTP request/response
- Services contain reusable business logic
- Services can be called by multiple controllers

**Example:**
```typescript
// Controller (src/web-api.controller.ts)
async startShift(req: Request, res: Response) {
  const result = await shiftService.startShiftPWA(req.user.id, req.body);
  res.json(result);
}

// Service (src/services/shift.service.ts)
async startShiftPWA(userId: number, data: StartShiftData) {
  // Business logic here
  return await prisma.$transaction(async (tx) => {
    // Atomic operations
  });
}
```

**Benefits:**
- Separation of concerns
- Reusable business logic
- Easier testing
- Single responsibility

### 2. Repository Pattern (via Prisma)

All database access through Prisma Client:
- Type-safe database operations
- Automatic migrations
- Transaction support

**Example:**
```typescript
// Prisma Client acts as repository
const user = await prisma.users.findUnique({
  where: { id: userId },
  include: { tenant: true }
});

const trucks = await prisma.dict_trucks.findMany({
  where: { tenant_id, is_active: true }
});
```

**Benefits:**
- Type safety
- Query building
- Relation loading
- Migration management

### 3. State Machine Pattern (User Workflow)

User state transitions for shift management:

```
idle → pending_truck → pending_site → awaiting_odo_start → active
  ↑                                                         │
  └────────── awaiting_odo_end → awaiting_invoice ────────┘
                                    ↓
                                 finished
```

**Admin States:**
- `admin_adding_site` - Adding new site
- `admin_adding_truck` - Adding new truck

**Implementation:**
```typescript
// State transitions in ShiftService
async selectTruck(userId: number, truckId: number) {
  const user = await prisma.users.findUnique({ where: { id: userId } });

  if (user.current_state !== 'pending_truck') {
    throw new Error('Invalid state for truck selection');
  }

  // Update state to pending_site
  await prisma.users.update({
    where: { id: userId },
    data: { current_state: 'pending_site' }
  });
}
```

**Benefits:**
- Controlled workflow
- Prevents invalid states
- Clear user journey
- Easy to debug

### 4. Transaction Pattern

All critical operations in Prisma transactions:
- Prevents data inconsistency
- Atomic multi-table operations
- Automatic rollback on failure

**Example:**
```typescript
await prisma.$transaction(async (tx) => {
  // Create shift
  const shift = await tx.shifts.create({
    data: {
      tenant_id,
      user_id: userId,
      truck_id: truckId,
      site_id: siteId,
      status: 'awaiting_odo_start'
    }
  });

  // Mark truck as busy
  await tx.dict_trucks.update({
    where: { id: truckId },
    data: { is_busy: true }
  });

  // Update user state
  await tx.users.update({
    where: { id: userId },
    data: { current_state: 'awaiting_odo_start' }
  });

  // All changes commit together or rollback together
});
```

**Transaction Use Cases:**
- Starting a shift (create shift + mark truck busy + update user state)
- Ending a shift (calculate salary + release truck + update user state)
- Creating manual shift (admin action)
- User registration with invite (create user + mark invite used)

**Benefits:**
- Data consistency
- Atomicity
- Rollback on failure
- ACID guarantees

### 5. Gateway Pattern (Telegram Integration)

n8n acts as gateway between Telegram Bot API and backend:
- Single endpoint: `/api/v1/gateway`
- Standardized request/response format
- Centralized bot interaction logic

**Request Format:**
```typescript
{
  user_id: string;        // Telegram user ID
  type: "text" | "callback" | "photo";
  payload: {
    callback_query_id?: string;
    data?: string;
    text?: string;
    file_id?: string;
  };
}
```

**Response Format:**
```typescript
{
  ui: {
    method: "sendMessage" | "editMessage",
    text: string;
    buttons: Array<Array<{ text, callback_data }>>;
    delete_original: boolean;
  };
  state: {
    current_step: string;
    active_shift_id: number | null;
    user_internal_id: number;
  };
}
```

**Benefits:**
- Decoupling bot logic from backend
- Single integration point
- Consistent interface
- Easy to test

### 6. Singleton Pattern

- **Prisma Client** - Single instance
- **Services** - Single exported instance (e.g., `shiftService`)

**Example:**
```typescript
// src/core/prisma.ts
const prisma = new PrismaClient();
export default prisma;

// src/services/shift.service.ts
export const shiftService = new ShiftService();
```

**Benefits:**
- Resource efficiency
- Shared state
- Consistent behavior
- Easy to import

## Pattern Combinations

### Service Layer + Transaction Pattern
```typescript
async startShiftPWA(userId: number, data: StartShiftData) {
  return await prisma.$transaction(async (tx) => {
    // Business logic in transaction
    const shift = await tx.shifts.create({ /* ... */ });
    await tx.dict_trucks.update({ /* ... */ });
    await tx.users.update({ /* ... */ });
    return shift;
  });
}
```

### State Machine + Gateway Pattern
```typescript
// Gateway receives callback
async processCallback(userId: string, data: string) {
  // Check current state
  const user = await getUserByTelegramId(userId);

  // Process based on state
  switch (user.current_state) {
    case 'idle':
      return handleIdleState(data);
    case 'pending_truck':
      return handleTruckSelection(data);
    // ...
  }

  // Return formatted UI response
  return formatResponse(newState, menu);
}
```

### Repository + Singleton Pattern
```typescript
// Prisma Client (singleton) acts as repository
import prisma from './core/prisma';

// Use throughout application
const trucks = await prisma.dict_trucks.findMany({ /* ... */ });
```

## Related Documentation

- [Overview](./overview.md) - High-level architecture
- [Data Flow](./data-flow.md) - How data flows through the system
- [Tech Stack](./tech-stack.md) - Technologies and libraries
- [Decisions](../decisions/architecture-decisions.md) - Why these patterns were chosen
