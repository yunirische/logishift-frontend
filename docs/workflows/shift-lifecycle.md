---
title: Shift Lifecycle Flow
domain: workflows
related:
  - telegram-bot-flow.md
  - pwa-flow.md
  - ../telegram-bot/state-machine.md
last_updated: 2026-01-27
context_priority: high
---

# Shift Lifecycle Flow

## Overview

This document describes the complete lifecycle of a shift from creation to completion, including all states, transitions, and business logic.

## Shift States

```
pending_truck → pending_site → awaiting_odo_start → active → awaiting_odo_end → awaiting_invoice → finished
```

## State Descriptions

| State | Description | Duration | Requirements |
|-------|-------------|----------|--------------|
| `pending_truck` | Initial draft state | < 1 min | None |
| `pending_site` | Truck selected | < 1 min | Truck must be available |
| `awaiting_odo_start` | Site selected, waiting for photo | Variable | Site requires odometer |
| `active` | Shift is in progress | Until end | None |
| `awaiting_odo_end` | Shift ending, waiting for photo | Variable | Site requires odometer |
| `awaiting_invoice` | Odometer received, waiting for invoice | Variable | Site requires invoice |
| `finished` | Shift completed | Permanent | All requirements met |

## Lifecycle Diagram

```
                      START SHIFT
                         │
                         ↓
                  ┌──────────────┐
                  │ pending_truck│  (Draft shift created)
                  └───────┬──────┘
                          │
                    Select Truck
                          │
                          ↓
                  ┌──────────────┐
                  │ pending_site │  (Truck assigned)
                  └───────┬──────┘
                          │
                    Select Site
                          │
                          ↓
                  ┌──────────────────┐
                  │ Check Requirements│
                  └────────┬──────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
         Odometer Req?              No Odometer
              │                         │
              ↓                         ↓
    ┌──────────────────┐      ┌──────────┐
    │awaiting_odo_start│      │  active  │  (Shift starts immediately)
    └─────────┬────────┘      └────┬─────┘
              │                    │
        Upload Photo               │
              │                    │
              ↓                    │
         ┌─────────┐               │
         │  active  │───────────────┘
         └────┬────┘
              │
         Work in Progress
              │
              ↓
         END SHIFT
              │
              ↓
    ┌──────────────────┐
    │ Check Requirements│
    └────────┬──────────┘
             │
    ┌────────┴────────┐
    │                 │
Odometer Req?    Invoice Req?
    │                 │
    ↓                 ↓
┌───────────────┐ ┌──────────────┐
│awaiting_odo_end│ │awaiting_invoice│
└───────┬───────┘ └──────┬───────┘
        │                │
   Upload Photo    Upload Photo
        │                │
        └────────┬───────┘
                 ↓
           ┌─────────┐
           │ finished │  (Shift completed)
           └────┬────┘
                │
           Calculate Salary
                │
           Release Truck
                │
           Update User State
                │
           Notify Admins
```

## Detailed Phase Breakdown

### Phase 1: Shift Creation

**Trigger:** User initiates shift start

**Process:**
```typescript
// Create draft shift
const shift = await prisma.shifts.create({
  data: {
    tenant_id: user.tenant_id,
    user_id: user.id,
    status: 'pending_truck',
    created_at: new Date()
  }
});

// Update user state
await prisma.users.update({
  where: { id: user.id },
  data: { current_state: 'pending_truck' }
});
```

**Database State:**
```json
{
  "id": 50,
  "status": "pending_truck",
  "truck_id": null,
  "site_id": null,
  "start_time": null,
  "end_time": null
}
```

### Phase 2: Truck Selection

**Trigger:** User selects truck

**Validation:**
```typescript
// Check truck availability
const truck = await prisma.dict_trucks.findUnique({
  where: { id: truckId }
});

if (truck.is_busy) {
  throw new Error('Машина уже занята');
}

// Check for existing active shifts
const existingShift = await prisma.shifts.findFirst({
  where: {
    truck_id: truckId,
    status: { not: 'finished' }
  }
});

if (existingShift) {
  throw new Error('Машина уже используется');
}
```

**Update:**
```typescript
await prisma.shifts.update({
  where: { id: shiftId },
  data: {
    truck_id: truckId,
    status: 'pending_site'
  }
});

await prisma.users.update({
  where: { id: userId },
  data: { current_state: 'pending_site' }
});
```

### Phase 3: Site Selection & Requirements Check

**Trigger:** User selects site

**Process:**
```typescript
// Get site requirements
const site = await prisma.dict_sites.findUnique({
  where: { id: siteId },
  include: { tenant: true }
});

// Update shift with site
await prisma.shifts.update({
  where: { id: shiftId },
  data: { site_id: siteId }
});

// Determine next state
let nextState;
if (site.odometer_required) {
  nextState = 'awaiting_odo_start';
} else {
  // Start shift immediately
  nextState = 'active';
  await startShiftNow(shiftId);
}

// Update user state
await prisma.users.update({
  where: { id: userId },
  data: { current_state: nextState }
});
```

**Database State (if odometer required):**
```json
{
  "id": 50,
  "status": "awaiting_odo_start",
  "truck_id": 3,
  "site_id": 7,
  "start_time": null
}
```

### Phase 4: Odometer Start Photo

**Trigger:** User uploads odometer photo

**Process:**
```typescript
// Download and save photo
const photoPath = await mediaService.downloadAndSave(
  tenantId,
  fileId,
  'odo-start'
);

// Start shift in transaction
await prisma.$transaction(async (tx) => {
  // Update shift
  await tx.shifts.update({
    where: { id: shiftId },
    data: {
      photo_start_url: photoPath,
      start_time: new Date(),
      status: 'active'
    }
  });

  // Mark truck busy
  await tx.dict_trucks.update({
    where: { id: truckId },
    data: { is_busy: true }
  });

  // Update user state
  await tx.users.update({
    where: { id: userId },
    data: { current_state: 'active' }
  });
});
```

**Database State:**
```json
{
  "id": 50,
  "status": "active",
  "start_time": "2024-01-15T08:00:00.000Z",
  "photo_start_url": "10/2024/01/1705315200000-odo-start.jpg"
}
```

### Phase 5: Active Shift

**Characteristics:**
- Shift is in progress
- Truck is marked busy
- User state is `active`
- Time is accumulating

**Monitoring:**
```typescript
// Get active shift duration
const shift = await prisma.shifts.findUnique({
  where: { id: shiftId }
});

const duration = new Date().getTime() - new Date(shift.start_time).getTime();
const hours = duration / (1000 * 60 * 60);
```

**Possible Actions:**
- Add comment
- View details
- End shift

### Phase 6: End Shift Request

**Trigger:** User clicks "End Shift"

**Process:**
```typescript
const shift = await prisma.shifts.findUnique({
  where: { id: shiftId },
  include: { site: true, tenant: true }
});

// Check requirements
let nextState;
if (shift.site.odometer_required) {
  nextState = 'awaiting_odo_end';
} else if (shift.site.invoice_required || shift.tenant.invoice_required) {
  nextState = 'awaiting_invoice';
} else {
  // Finalize immediately
  nextState = 'finished';
  await finalizeShiftInternal(shiftId);
}

// Update user state
await prisma.users.update({
  where: { id: userId },
  data: { current_state: nextState }
});
```

### Phase 7: Odometer End Photo

**Trigger:** User uploads odometer end photo

**Process:**
```typescript
// Download and save photo
const photoPath = await mediaService.downloadAndSave(
  tenantId,
  fileId,
  'odo-end'
);

// Update shift
await prisma.shifts.update({
  where: { id: shiftId },
  data: {
    photo_end_url: photoPath
  }
});

// Check invoice requirement
const shift = await prisma.shifts.findUnique({
  where: { id: shiftId },
  include: { site: true, tenant: true }
});

if (shift.site.invoice_required || shift.tenant.invoice_required) {
  await prisma.users.update({
    where: { id: userId },
    data: { current_state: 'awaiting_invoice' }
  });
} else {
  await finalizeShiftInternal(shiftId);
}
```

### Phase 8: Invoice Photo

**Trigger:** User uploads invoice photo

**Process:**
```typescript
// Download and save photo
const photoPath = await mediaService.downloadAndSave(
  tenantId,
  fileId,
  'invoice'
);

// Update shift and finalize
await prisma.shifts.update({
  where: { id: shiftId },
  data: {
    photo_invoice_url: photoPath
  }
});

await finalizeShiftInternal(shiftId);
```

### Phase 9: Shift Finalization

**Trigger:** All requirements met

**Process:**
```typescript
async function finalizeShiftInternal(shiftId: number) {
  return await prisma.$transaction(async (tx) => {
    const shift = await tx.shifts.findUnique({
      where: { id: shiftId },
      include: { user: true }
    });

    // Calculate hours worked
    const startTime = new Date(shift.start_time);
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const hoursWorked = durationMs / (1000 * 60 * 60);

    // Calculate salary
    const hourlyRate = parseFloat(shift.user.hourly_rate.toString());
    const salary = hoursWorked * hourlyRate;

    // Update shift
    const updated = await tx.shifts.update({
      where: { id: shiftId },
      data: {
        status: 'finished',
        end_time: endTime,
        hours_worked: hoursWorked,
        salary: salary
      }
    });

    // Release truck
    await tx.dict_trucks.update({
      where: { id: shift.truck_id },
      data: { is_busy: false }
    });

    // Update user state
    await tx.users.update({
      where: { id: shift.user_id },
      data: { current_state: 'idle' }
    });

    // Log to audit
    await saveAuditLog(tx, {
      tenant_id: shift.tenant_id,
      user_id: shift.user_id,
      action: 'SHIFT_FINISHED',
      entity: 'shift',
      entity_id: shiftId,
      details: {
        hours: hoursWorked,
        salary: salary,
        truck_id: shift.truck_id,
        site_id: shift.site_id
      }
    });

    return updated;
  });
}

// Notify admins
await notifyAdmin(tenantId, `Смена завершена: ${user.full_name}`);
```

**Database State:**
```json
{
  "id": 50,
  "status": "finished",
  "start_time": "2024-01-15T08:00:00.000Z",
  "end_time": "2024-01-15T12:30:00.000Z",
  "hours_worked": "4.50",
  "salary": "1800.00",
  "photo_start_url": "10/2024/01/1705315200000-odo-start.jpg",
  "photo_end_url": "10/2024/01/1705336800000-odo-end.jpg",
  "photo_invoice_url": "10/2024/01/1705336800000-invoice.jpg"
}
```

## Manual Shift Creation (Admin)

**Trigger:** Admin creates shift for driver

**Process:**
```typescript
async function createManualShift(adminId: number, driverId: number, truckId: number, siteId: number) {
  return await prisma.$transaction(async (tx) => {
    // Get driver and truck
    const driver = await tx.users.findUnique({ where: { id: driverId } });
    const truck = await tx.dict_trucks.findUnique({ where: { id: truckId } });

    // Validate
    if (driver.current_state !== 'idle') {
      throw new Error('Водитель уже в смене');
    }

    if (truck.is_busy) {
      throw new Error('Машина уже занята');
    }

    // Create shift
    const shift = await tx.shifts.create({
      data: {
        tenant_id: driver.tenant_id,
        user_id: driverId,
        truck_id: truckId,
        site_id: siteId,
        status: 'active',
        start_time: new Date()
      }
    });

    // Mark truck busy
    await tx.dict_trucks.update({
      where: { id: truckId },
      data: { is_busy: true }
    });

    // Update driver state
    await tx.users.update({
      where: { id: driverId },
      data: { current_state: 'active' }
    });

    // Log audit
    await saveAuditLog(tx, {
      tenant_id: driver.tenant_id,
      user_id: adminId,
      action: 'MANUAL_SHIFT_CREATED',
      entity: 'shift',
      entity_id: shift.id,
      details: { driver_id: driverId, truck_id: truckId, site_id: siteId }
    });

    return shift;
  });
}
```

## Error Recovery

### Stuck Shift

**Detection:**
```typescript
// Find shifts active too long (>24 hours)
const stuckShifts = await prisma.shifts.findMany({
  where: {
    status: 'active',
    start_time: {
      lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }
  }
});
```

**Recovery:**
```typescript
// Admin force-finalize
await finalizeShiftInternal(shiftId);
```

### Orphaned Busy Flag

**Detection:**
```typescript
// Truck marked busy but no active shift
const stuckTrucks = await prisma.dict_trucks.findMany({
  where: { is_busy: true },
  include: {
    shifts: {
      where: { status: { not: 'finished' } }
    }
  }
});

stuckTrucks.forEach(truck => {
  if (truck.shifts.length === 0) {
    // Flag is stuck
    console.log(`Truck ${truck.id} has stuck busy flag`);
  }
});
```

**Recovery:**
```typescript
// Force reset
await prisma.dict_trucks.update({
  where: { id: truckId },
  data: { is_busy: false }
});
```

## Related Documentation

- [Telegram Bot Flow](./telegram-bot-flow.md) - Bot workflow
- [PWA Flow](./pwa-flow.md) - Web workflow
- [State Machine](../telegram-bot/state-machine.md) - User states
