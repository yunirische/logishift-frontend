---
title: User State Machine
domain: telegram-bot
related:
  - gateway-api.md
  - ../workflows/telegram-bot-flow.md
last_updated: 2026-01-27
context_priority: high
---

# User State Machine

## Overview

The Telegram Bot implements a state machine pattern to manage user workflow through shift operations. Each user has a `current_state` field that tracks their position in the workflow.

## User States

### Driver States

| State | Description | Next States |
|-------|-------------|-------------|
| `idle` | No active shift | `pending_truck` |
| `pending_truck` | Selecting truck | `pending_site`, `idle` (cancel) |
| `pending_site` | Selecting site | `awaiting_odo_start`, `active`, `idle` (cancel) |
| `awaiting_odo_start` | Waiting for odometer start photo | `active` |
| `active` | Shift in progress | `awaiting_odo_end`, `awaiting_invoice`, `finished` |
| `awaiting_odo_end` | Waiting for odometer end photo | `awaiting_invoice`, `finished` |
| `awaiting_invoice` | Waiting for invoice photo | `finished` |
| `finished` | Shift completed (transition state) | `idle` |

### Admin States

| State | Description | Next States |
|-------|-------------|-------------|
| `admin_adding_site` | Adding new site (text input mode) | `idle` |
| `admin_adding_truck` | Adding new truck (text input mode) | `idle` |

## State Transition Diagram

```
Driver Flow:

idle → pending_truck → pending_site → awaiting_odo_start → active
  ↑                                                         │
  └────────── awaiting_odo_end → awaiting_invoice ────────┘
                                    ↓
                                 finished
                                    ↓
                                  idle (completed)

Admin Flow:

idle → admin_adding_truck → idle
idle → admin_adding_site → idle
```

## State Transitions

### Starting a Shift

```
1. idle
   User clicks: "✅ Начать смену"
   ↓
2. pending_truck
   Display truck selection menu
   ↓
3. User selects truck (callback: TRK_<id>)
   ↓
4. pending_site
   Display site selection menu
   ↓
5. User selects site (callback: STE_<id>)
   ↓
6. Check site requirements:
   - If odometer_required: awaiting_odo_start
   - Else: active
```

### Awaiting Odometer Start

```
awaiting_odo_start
  ↓
User sends photo (type: "photo")
  ↓
Process photo, save URL
  ↓
active
```

### Ending a Shift

```
active
  ↓
User clicks: "🏁 Завершить смену"
  ↓
Check requirements:
  - If odometer_required: awaiting_odo_end
  - If invoice_required: awaiting_invoice
  - If neither: finished → idle
```

### Awaiting Odometer End

```
awaiting_odo_end
  ↓
User sends photo (type: "photo")
  ↓
Process photo, save URL
  ↓
Check invoice requirement:
  - If required: awaiting_invoice
  - Else: finished → idle
```

### Awaiting Invoice

```
awaiting_invoice
  ↓
User sends photo (type: "photo")
  ↓
Process photo, save URL
  ↓
finished → idle
```

### Canceling Operations

```
pending_truck + CANCEL → idle
pending_site + CANCEL → idle
```

## State Implementation

### State Checking

```typescript
// src/routes/gateway.ts
async processCallback(userId: string, data: string) {
  const user = await prisma.users.findUnique({
    where: { tg_user_id: BigInt(userId) }
  });

  const currentState = user.current_state;

  // Route based on state
  switch (currentState) {
    case 'idle':
      return handleIdleState(data, user);
    case 'pending_truck':
      return handleTruckSelection(data, user);
    case 'pending_site':
      return handleSiteSelection(data, user);
    // ... etc
  }
}
```

### State Updates

```typescript
// Transition to next state
async function transitionState(userId: number, newState: string) {
  await prisma.users.update({
    where: { id: userId },
    data: { current_state: newState }
  });
}

// Example: Start shift
await prisma.$transaction(async (tx) => {
  // Create shift
  await tx.shifts.create({ /* ... */ });

  // Update state
  await tx.users.update({
    where: { id: userId },
    data: { current_state: 'pending_truck' }
  });
});
```

## State-Specific Handlers

### idle State

**Valid Actions:**
- `START_SHIFT` → Create draft shift, transition to `pending_truck`
- `ADMIN_MAIN` → Show admin menu (if admin role)

**Response:**
```json
{
  "ui": {
    "method": "sendMessage",
    "text": "🚙 <b>МЕНЮ ВОДИТЕЛЯ</b>\n\nСтатус: 💤 ОТДЫХ",
    "buttons": [
      [{"text": "✅ Начать смену", "callback_data": "START_SHIFT"}],
      [{"text": "⚙️ Панель управления", "callback_data": "ADMIN_MAIN"}]
    ]
  }
}
```

### pending_truck State

**Valid Actions:**
- `TRK_<id>` → Select truck, transition to `pending_site`
- `CANCEL` → Delete draft, transition to `idle`

**Response:**
```json
{
  "ui": {
    "method": "editMessage",
    "text": "🚛 Выберите машину:",
    "buttons": [
      [
        {"text": "МАЗ-533", "callback_data": "TRK_1"},
        {"text": "КАМАЗ-55111", "callback_data": "TRK_2"}
      ],
      [{"text": "❌ Отмена", "callback_data": "CANCEL"}]
    ]
  }
}
```

### pending_site State

**Valid Actions:**
- `STE_<id>` → Select site, transition based on requirements
- `CANCEL` → Delete draft, transition to `idle`

**Response:**
```json
{
  "ui": {
    "method": "editMessage",
    "text": "🏗️ Выберите объект:",
    "buttons": [
      [
        {"text": "Стройплощадка №1", "callback_data": "STE_1"},
        {"text": "Склад №3", "callback_data": "STE_2"}
      ],
      [{"text": "❌ Отмена", "callback_data": "CANCEL"}]
    ]
  }
}
```

### awaiting_odo_start State

**Valid Actions:**
- `type: "photo"` → Process photo, transition to `active`

**Response:**
```json
{
  "ui": {
    "method": "sendMessage",
    "text": "📸 Пришлите фото одометра (СТАРТ):",
    "buttons": []
  }
}
```

### active State

**Valid Actions:**
- `END_SHIFT` → Check requirements, transition accordingly
- `REQUEST_COMMENT` → Add comment to shift

**Response:**
```json
{
  "ui": {
    "method": "editMessage",
    "text": "✅ <b>Смена активна</b>\n\n🚛 МАЗ-533\n🏗️ Стройплощадка №1\n⏰ Начало: 08:00",
    "buttons": [
      [{"text": "🏁 Завершить смену", "callback_data": "END_SHIFT"}],
      [{"text": "💬 Комментарий", "callback_data": "REQUEST_COMMENT"}]
    ]
  }
}
```

## Error Handling by State

### Invalid State Transitions

```typescript
function isValidTransition(from: string, to: string): boolean {
  const validTransitions = {
    'idle': ['pending_truck'],
    'pending_truck': ['pending_site', 'idle'],
    'pending_site': ['awaiting_odo_start', 'active', 'idle'],
    'awaiting_odo_start': ['active'],
    'active': ['awaiting_odo_end', 'awaiting_invoice', 'finished'],
    'awaiting_odo_end': ['awaiting_invoice', 'finished'],
    'awaiting_invoice': ['finished']
  };

  return validTransitions[from]?.includes(to) || false;
}
```

### State Recovery

If user gets stuck in a state:
- Cancel button returns to `idle`
- Admin can manually reset state via PWA
- Automatic cleanup after timeout (future)

## Related Documentation

- [Gateway API](./gateway-api.md) - Request/response format
- [Integration](./integration.md) - n8n integration
- [Workflows: Telegram Bot Flow](../workflows/telegram-bot-flow.md) - Complete workflow
