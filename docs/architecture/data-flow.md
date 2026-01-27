---
title: Data Flow
domain: architecture
related:
  - overview.md
  - design-patterns.md
  - ../workflows/
last_updated: 2026-01-27
context_priority: high
---

# Data Flow

## Overview

This document describes how data flows through the LogiShift system for different user interactions and workflows.

## 1. Telegram Bot Flow

```
Telegram User → n8n Gateway → Backend /gateway
                              ↓
                    GatewayController.handleWebhook()
                              ↓
                    ┌─────────────────────┐
                    │  User Lookup/Onboard│
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ State Machine Check │
                    └──────────┬──────────┘
                               ↓
              ┌────────────────┼────────────────┐
              ↓                ↓                ↓
         processCallback()  processText()  processPhoto()
              │                │                │
              ↓                ↓                ↓
         ShiftService    State Updates   MediaService
              │                │                │
              └────────────────┼────────────────┘
                               ↓
                    formatResponse() → Telegram UI
```

### Detailed Steps

1. **User Action** - User interacts with Telegram Bot
2. **n8n Gateway** - Forwards webhook to backend
3. **User Lookup** - Find or create user by Telegram ID
4. **State Check** - Verify current user state
5. **Process Input** - Route to appropriate handler:
   - `processCallback()` - Button clicks
   - `processText()` - Text input
   - `processPhoto()` - Photo uploads
6. **Business Logic** - Execute service operations
7. **Format Response** - Create Telegram UI with buttons
8. **Return** - Send response to n8n → Telegram

### Example: Start Shift Flow

```
User clicks "✅ Начать смену"
  ↓
n8n sends: { user_id: "123", type: "callback", payload: { data: "START_SHIFT" } }
  ↓
Backend: processCallback("START_SHIFT")
  ↓
Check state: current_state = "idle" ✓
  ↓
ShiftService.startShiftDraft()
  ↓
Update state: "idle" → "pending_truck"
  ↓
Format response: Truck selection menu
  ↓
Return UI with truck buttons
```

## 2. Web PWA Flow

```
PWA App → JWT Auth Token → Protected API Endpoint
                              ↓
                    authenticateJWT Middleware
                              ↓
                    Controller Method
                              ↓
                    Service Layer
                              ↓
                    Prisma Transaction
                              ↓
                    Response → PWA App
```

### Detailed Steps

1. **User Action** - User interacts with PWA interface
2. **JWT Token** - Request includes `Authorization: Bearer <token>`
3. **Auth Middleware** - Verify token, extract user info
4. **Controller** - Route to appropriate controller method
5. **Service Layer** - Execute business logic
6. **Transaction** - Atomic database operations
7. **Response** - Return JSON response to PWA
8. **Update UI** - PWA renders updated state

### Example: Start Shift Flow

```
User selects truck and site, clicks "Start Shift"
  ↓
POST /api/v1/shifts/start
Headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIs..." }
Body: { truck_id: 3, site_id: 7 }
  ↓
authenticateJWT middleware
  ↓
Decode token: { id: 5, role: "driver", tenant_id: 10 }
  ↓
WebApiController.startShift()
  ↓
ShiftService.startShiftPWA(5, { truck_id: 3, site_id: 7 })
  ↓
Prisma Transaction:
  - Check truck availability
  - Create shift record
  - Mark truck busy
  - Update user state
  ↓
Return: { id: 50, status: "awaiting_odo_start", ... }
  ↓
PWA updates UI: Shows "Upload odometer photo" prompt
```

## 3. Shift Lifecycle Flow

### START SHIFT

```
User → /shifts/start → shiftService.startShiftPWA()
                              ↓
                    Prisma Transaction:
                    - Check truck availability
                    - Create shift record
                    - Mark truck busy
                    - Update user state
                              ↓
                    Return shift object
```

**Transaction Details:**
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Check truck availability
  const truck = await tx.dict_trucks.findUnique({ where: { id: truckId } });
  if (truck?.is_busy) throw new Error('Машина уже занята');

  // 2. Create shift
  const shift = await tx.shifts.create({
    data: {
      tenant_id,
      user_id: userId,
      truck_id: truckId,
      site_id: siteId,
      status: site.odometer_required ? 'awaiting_odo_start' : 'active'
    }
  });

  // 3. Mark truck busy
  await tx.dict_trucks.update({
    where: { id: truckId },
    data: { is_busy: true }
  });

  // 4. Update user state
  await tx.users.update({
    where: { id: userId },
    data: { current_state: shift.status }
  });

  return shift;
});
```

### PHOTO UPLOAD

```
User → POST /shifts/photo → mediaService.saveRawFile()
                              ↓
                    shiftService.handlePWAPhotoUpload()
                              ↓
                    Prisma Transaction:
                    - Update shift with photo URL
                    - Transition user state
                    - Finalize if complete
                              ↓
                    Return updated shift
```

**State Transitions:**
- `awaiting_odo_start` + photo → `active`
- `active` → `awaiting_odo_end` (when user clicks end shift)
- `awaiting_odo_end` + photo → `awaiting_invoice` (if required) or `finished`
- `awaiting_invoice` + photo → `finished`

### END SHIFT

```
User → /shifts/end → shiftService.endShiftPWA()
                              ↓
                    Prisma Transaction:
                    - Check requirements
                    - Update state or finalize
                    - Calculate hours/salary
                    - Release truck
                    - Notify admins
                              ↓
                    Return result
```

**Finalization Logic:**
```typescript
async finalizeShiftInternal(shiftId: number) {
  return await prisma.$transaction(async (tx) => {
    const shift = await tx.shifts.findUnique({ where: { id: shiftId } });

    // 1. Calculate hours worked
    const hoursWorked = calculateHours(shift.start_time, shift.end_time);

    // 2. Calculate salary
    const user = await tx.users.findUnique({ where: { id: shift.user_id } });
    const salary = hoursWorked * parseFloat(user.hourly_rate.toString());

    // 3. Update shift
    const updated = await tx.shifts.update({
      where: { id: shiftId },
      data: {
        status: 'finished',
        hours_worked: hoursWorked,
        salary: salary
      }
    });

    // 4. Release truck
    await tx.dict_trucks.update({
      where: { id: shift.truck_id },
      data: { is_busy: false }
    });

    // 5. Update user state
    await tx.users.update({
      where: { id: shift.user_id },
      data: { current_state: 'idle' }
    });

    // 6. Log to audit
    await saveAuditLog(tx, {
      tenant_id: shift.tenant_id,
      user_id: shift.user_id,
      action: 'SHIFT_FINISHED',
      entity: 'shift',
      entity_id: shiftId,
      details: { hours: hoursWorked, salary }
    });

    // 7. Notify admins
    await notifyAdmin(shift.tenant_id, `Смена завершена: ${user.full_name}`);

    return updated;
  });
}
```

## 4. Data Synchronization Flow

### Busy Flag Synchronization

To prevent `is_busy` flag from getting stuck:

```
GET /trucks endpoint
  ↓
Left join shifts where status != 'finished'
  ↓
Include active shifts with driver info
  ↓
Frontend detects stuck state:
  - is_busy === true BUT shifts.length === 0
  - Show warning + "Force free" button
  ↓
PATCH /trucks/:id with { is_busy: false }
  ↓
Force reset busy flag
```

### Real-time Usage Counters

```
Dashboard stats calculation
  ↓
activeShifts = count(shifts where status != 'finished')
  ↓
activeDrivers = count(users where state = 'active' AND role = 'driver')
  ↓
trucksInWork = count(DISTINCT truck_id in active shifts)
  ↓
usage.trucks.current = count(all trucks in dictionary)
  ↓
Compare with plan limits (usage.trucks.limit)
```

## Related Documentation

- [Overview](./overview.md) - System architecture
- [Design Patterns](./design-patterns.md) - Patterns used in data flow
- [Workflows](../workflows/) - Detailed workflow documentation
- [API Reference](../backend/api-reference.md) - Complete API documentation
