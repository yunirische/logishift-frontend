---
title: Telegram Bot Flow
domain: workflows
related:
  - ../telegram-bot/state-machine.md
  - ../telegram-bot/scenarios.md
last_updated: 2026-01-27
context_priority: medium
---

# Telegram Bot Flow

## Overview

This document describes the complete workflow for a driver interacting with the LogiShift system via Telegram Bot.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     TELEGRAM BOT                           │
│                                                             │
│  User → /start or message                                  │
│    ↓                                                        │
│  n8n Gateway → Backend /gateway                            │
│    ↓                                                        │
│  User Lookup (by tg_user_id)                               │
│    ↓                                                        │
│  ┌──────────────┐                                          │
│  │ User Exists? │                                          │
│  └──────┬───────┘                                          │
│         │                                                  │
│    No   │   Yes                                            │
│    ┌────┴────┐                                             │
│    ↓         ↓                                             │
│  Onboard   Show Menu                                       │
│    │         │                                             │
│    └────┬────┘                                             │
│         ↓                                                  │
│  Driver Menu Displayed                                     │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Steps

### 1. User Onboarding

**Trigger:** First interaction with bot

**Flow:**
```
User sends message
  ↓
n8n receives webhook
  ↓
Backend checks user by tg_user_id
  ↓
User not found → Auto-onboard
  ↓
Create tenant (free plan)
  ↓
Create admin user
  ↓
Return credentials
  ↓
n8n sends welcome message
```

**Response:**
```
🎉 Добро пожаловать в LogiShift!

Ваш аккаунт создан:
📧 Email: admin_123456789@logishift.ru
🔑 Пароль: password123

Войдите в веб-панель для настройки.
```

### 2. Main Menu

**State:** `idle`

**Display:**
```
🚙 МЕНЮ ВОДИТЕЛЯ
🕒 15:30
────────────────────

Статус: 💤 ОТДЫХ

У вас нет активной смены.

[✅ Начать смену]
[⚙️ Панель управления]
```

**Options:**
- `START_SHIFT` - Start new shift
- `ADMIN_MAIN` - Admin panel (if admin role)

### 3. Start Shift Flow

**State Transition:** `idle` → `pending_truck` → `pending_site` → `awaiting_odo_start` / `active`

#### Step 1: Truck Selection

**User Action:** Click "✅ Начать смену"

**Backend Processing:**
```typescript
// Check for active shift
const existingShift = await prisma.shifts.findFirst({
  where: {
    user_id: userId,
    status: { not: 'finished' }
  }
});

if (existingShift) {
  throw new Error('У вас уже есть активная смена');
}

// Create draft shift
const shift = await prisma.shifts.create({
  data: {
    tenant_id,
    user_id: userId,
    status: 'pending_truck'
  }
});

// Update user state
await prisma.users.update({
  where: { id: userId },
  data: { current_state: 'pending_truck' }
});
```

**Response:**
```
🚛 Выберите машину:

[МАЗ-533]     [КАМАЗ-55111]
[ГАЗ-53]      [ЗИЛ-130]

[❌ Отмена]
```

#### Step 2: Site Selection

**User Action:** Click truck button (e.g., `TRK_1`)

**Backend Processing:**
```typescript
// Update shift with truck
await prisma.shifts.update({
  where: { id: shiftId },
  data: { truck_id: selectedTruckId }
});

// Check truck availability
if (truck.is_busy) {
  throw new Error('Машина уже занята');
}

// Update user state
await prisma.users.update({
  where: { id: userId },
  data: { current_state: 'pending_site' }
});
```

**Response:**
```
🏗️ Выберите объект:

[Стройплощадка №1]  [Склад №3]
[Стройплощадка №5]  [Склад №7]

[❌ Отмена]
```

#### Step 3: Photo Requirements Check

**User Action:** Click site button (e.g., `STE_1`)

**Backend Processing:**
```typescript
// Update shift with site
await prisma.shifts.update({
  where: { id: shiftId },
  data: { site_id: selectedSiteId }
});

// Check site requirements
const site = await prisma.dict_sites.findUnique({
  where: { id: selectedSiteId }
});

// Determine next state
let nextState;
if (site.odometer_required) {
  nextState = 'awaiting_odo_start';
} else {
  nextState = 'active';
  // Start shift immediately
  await startShiftNow(shiftId);
}

// Update user state
await prisma.users.update({
  where: { id: userId },
  data: { current_state: nextState }
});
```

**Response (if odometer required):**
```
📸 Пришлите фото одометра (СТАРТ):

Отправьте фото счетчика пробега.
```

**Response (if no odometer):**
```
✅ Смена началась!

🚛 МАЗ-533
🏗️ Стройплощадка №1
⏰ Время: 15:35

[🏁 Завершить смену]
```

### 4. Odometer Photo Upload

**State:** `awaiting_odo_start`

**User Action:** Send photo

**Backend Processing:**
```typescript
// Download from Telegram
const fileUrl = await getTelegramFile(fileId);
const photoBuffer = await downloadFile(fileUrl);

// Save to storage
const photoPath = await mediaService.downloadAndSave(
  tenantId,
  photoBuffer,
  'odo-start'
);

// Update shift
await prisma.shifts.update({
  where: { id: shiftId },
  data: {
    photo_start_url: photoPath,
    start_time: new Date(),
    status: 'active'
  }
});

// Update user state
await prisma.users.update({
  where: { id: userId },
  data: { current_state: 'active' }
});

// Mark truck busy
await prisma.dict_trucks.update({
  where: { id: truckId },
  data: { is_busy: true }
});
```

**Response:**
```
✅ Смена началась!

🚛 МАЗ-533
🏗️ Стройплощадка №1
⏰ Время: 15:35

[🏁 Завершить смену]
```

### 5. Active Shift

**State:** `active`

**Display:**
```
✅ СМЕНА АКТИВНА
⏰ 15:35 - 17:45 (2ч 10мин)

🚛 МАЗ-533
🏗️ Стройплощадка №1

💬 Комментарий

[🏁 Завершить смену]
[💬 Добавить комментарий]
```

### 6. End Shift Flow

**State Transition:** `active` → `awaiting_odo_end` / `awaiting_invoice` / `finished`

**User Action:** Click "🏁 Завершить смену"

**Backend Processing:**
```typescript
const shift = await getCurrentShift(userId);
const site = await prisma.dict_sites.findUnique({
  where: { id: shift.site_id }
});

let nextState;
if (site.odometer_required) {
  nextState = 'awaiting_odo_end';
} else if (site.invoice_required || tenant.invoice_required) {
  nextState = 'awaiting_invoice';
} else {
  nextState = 'finished';
  await finalizeShift(shift.id);
}

await prisma.users.update({
  where: { id: userId },
  data: { current_state: nextState }
});
```

**Response (if odometer required):**
```
📸 Пришлите фото одометра (ФИНИШ):

Отправьте фото счетчика пробега.
```

**Response (if invoice required):**
```
📸 Пришлите фото НАКЛАДНОЙ:

Отправьте фото накладной.
```

**Response (if finished):**
```
🏁 Смена завершена!

Отработано: 2ч 10мин
Начало: 15:35
Конец: 17:45

🚛 МАЗ-533
🏗️ Стройплощадка №1
💰 Начислено: 866.67 руб

[OK]
```

### 7. Finalization

**State:** `finished` → `idle`

**Backend Processing:**
```typescript
await prisma.$transaction(async (tx) => {
  // Calculate hours and salary
  const hoursWorked = calculateHours(shift.start_time, new Date());
  const user = await tx.users.findUnique({ where: { id: userId } });
  const salary = hoursWorked * parseFloat(user.hourly_rate.toString());

  // Update shift
  await tx.shifts.update({
    where: { id: shiftId },
    data: {
      status: 'finished',
      end_time: new Date(),
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
    where: { id: userId },
    data: { current_state: 'idle' }
  });

  // Log to audit
  await saveAuditLog(tx, {
    tenant_id: shift.tenant_id,
    user_id: userId,
    action: 'SHIFT_FINISHED',
    entity: 'shift',
    entity_id: shiftId,
    details: { hours: hoursWorked, salary }
  });
});

// Notify admins
await notifyAdmin(tenantId, `Смена завершена: ${user.full_name}`);
```

## Error Handling

### Truck Already Busy

```
❌ Ошибка: Машина уже занята

Выберите другую машину:

[КАМАЗ-55111]  [ГАЗ-53]
[ЗИЛ-130]

[❌ Отмена]
```

### Active Shift Exists

```
❌ У вас уже есть активная смена

Завершите текущую смену перед началом новой.

[🔄 Вернуться в меню]
```

### Plan Limit Reached

```
❌ Достигнут лимит машин (3 шт.)

Тарифный план: Бесплатный

Обновите план для добавления большего количества машин.

[🔄 Вернуться в меню]
```

## Related Documentation

- [PWA Flow](./pwa-flow.md) - Web application flow
- [Shift Lifecycle](./shift-lifecycle.md) - Detailed shift process
- [State Machine](../telegram-bot/state-machine.md) - State transitions
