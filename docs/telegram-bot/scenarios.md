---
title: Telegram Bot Scenarios
domain: telegram-bot
related:
  - gateway-api.md
  - state-machine.md
  - ../workflows/telegram-bot-flow.md
last_updated: 2026-01-27
context_priority: medium
---

# Telegram Bot Scenarios

## Table of Contents
- [User Scenarios](#user-scenarios)
  - [First-Time User Onboarding](#first-time-user-onboarding)
  - [Starting a Shift](#starting-a-shift)
  - [Ending a Shift](#ending-a-shift)
  - [Admin: Managing Trucks](#admin-managing-trucks)
  - [Admin: Managing Sites](#admin-managing-sites)
- [State Management](#state-management)
  - [User States](#user-states)
  - [State Transitions](#state-transitions)
  - [State Recovery](#state-recovery)
- [Error Handling](#error-handling)
  - [Common Errors](#common-errors)
  - [Error Recovery Flows](#error-recovery-flows)
  - [User-Friendly Messages](#user-friendly-messages)

## User Scenarios

### First-Time User Onboarding

**Trigger:** User sends first message to bot

**Flow:**
```
1. User sends any message to bot
   ↓
2. n8n forwards to backend /gateway endpoint
   ↓
3. Backend checks for existing user by tg_user_id
   ↓
4. User not found → Auto-onboarding triggered
   ↓
5. Create new tenant (free plan)
   - Company name: "New Organization"
   - Plan: free (3 machines, 5 drivers, unlimited sites)
   ↓
6. Create admin user
   - Email: admin_{tg_user_id}@logishift.ru
   - Password: password123
   - Role: admin
   - Telegram ID linked
   ↓
7. Return credentials to user
   ↓
8. n8n sends welcome message with credentials
   ↓
9. User prompted to login to web panel
```

**Example Response:**
```json
{
  "ui": {
    "method": "sendMessage",
    "text": "🎉 Добро пожаловать в LogiShift!\n\nВаш аккаунт создан:\n📧 Email: admin_123456789@logishift.ru\n🔑 Пароль: password123\n\nВойдите в веб-панель для настройки.",
    "buttons": [
      [{"text": "🌐 Открыть панель", "url": "https://pwa.kontrolsmen.ru"}]
    ]
  },
  "state": {
    "current_step": "idle",
    "user_internal_id": 15,
    "active_shift_id": null
  }
}
```

**Post-Onboarding:**
- User can start using bot immediately
- Admin can configure organization settings in web panel
- Can add more drivers, trucks, and sites
- Can upgrade plan anytime

---

### Starting a Shift

**Preconditions:**
- User exists in system
- User is in `idle` state
- No active shift exists
- At least one truck available
- At least one site configured

**Flow:**
```
1. User opens bot
   ↓
2. Bot shows main menu (state: idle)
   - Active shift status
   - Quick actions
   ↓
3. User clicks "✅ Начать смену"
   ↓
4. Backend creates draft shift (status: pending_truck)
   ↓
5. Bot shows truck selection menu
   - Available trucks only
   - Cancel option
   ↓
6. User selects truck
   ↓
7. Backend updates shift with truck
   ↓
8. Bot shows site selection menu
   - All active sites
   - Cancel option
   ↓
9. User selects site
   ↓
10. Backend checks site requirements
    - If odometer_required: awaiting_odo_start
    - Else: active (shift starts immediately)
    ↓
11. Bot shows appropriate prompt
    - Odometer required: "📸 Пришлите фото одометра"
    - No odometer: "✅ Смена началась!"
```

**Example - Truck Selection:**
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
      [
        {"text": "ГАЗ-53", "callback_data": "TRK_3"},
        {"text": "ЗИЛ-130", "callback_data": "TRK_4"}
      ],
      [
        {"text": "❌ Отмена", "callback_data": "CANCEL"}
      ]
    ]
  },
  "state": {
    "current_step": "pending_truck",
    "active_shift_id": 50,
    "user_internal_id": 5
  }
}
```

**Example - Shift Active:**
```json
{
  "ui": {
    "method": "editMessage",
    "text": "✅ Смена началась!\n\n🚛 МАЗ-533\n🏗️ Стройплощадка №1\n⏰ Время: 15:35\n\nСмена активна. Работайте безопасно!",
    "buttons": [
      [{"text": "🏁 Завершить смену", "callback_data": "END_SHIFT"}]
    ]
  },
  "state": {
    "current_step": "active",
    "active_shift_id": 50,
    "user_internal_id": 5
  }
}
```

---

### Ending a Shift

**Preconditions:**
- User has active shift
- Shift is in `active` state

**Flow:**
```
1. User clicks "🏁 Завершить смену"
   ↓
2. Backend checks shift requirements
   ↓
3. Determine next action based on requirements:
   ↓
   Branch A: Odometer required
   ├─→ Transition to awaiting_odo_end
   ├─→ Prompt: "📸 Пришлите фото одометра (ФИНИШ)"
   └─→ Wait for photo upload
   ↓
   Branch B: Invoice required (no odometer)
   ├─→ Transition to awaiting_invoice
   ├─→ Prompt: "📸 Пришлите фото НАКЛАДНОЙ"
   └─→ Wait for photo upload
   ↓
   Branch C: No requirements
   ├─→ Finalize shift immediately
   ├─→ Calculate hours and salary
   ├─→ Release truck
   ├─→ Notify admins
   └─→ Show summary
   ↓
4. User uploads required photos (if any)
   ↓
5. Shift finalized
   ↓
6. Bot shows summary:
   - Hours worked
   - Salary earned
   - Shift details
   ↓
7. User returns to idle state
```

**Example - Finalization:**
```json
{
  "ui": {
    "method": "editMessage",
    "text": "🏁 Смена завершена!\n\n📊 Отработано: 4 ч. 30 мин\n⏰ Начало: 08:00\n⏰ Конец: 12:30\n\n🚛 МАЗ-533\n🏗️ Стройплощадка №1\n💰 Начислено: 1 800.00 руб\n\nСпасибо за работу!",
    "buttons": [
      [{"text": "OK", "callback_data": "CONFIRM_FINISH"}]
    ]
  },
  "state": {
    "current_step": "finished",
    "active_shift_id": null,
    "user_internal_id": 5
  }
}
```

---

### Admin: Managing Trucks

**Preconditions:**
- User has admin role
- User in admin menu

**Flow:**
```
1. Admin clicks "⚙️ Панель управления"
   ↓
2. Bot shows admin menu
   ↓
3. Admin clicks "🚛 Машины"
   ↓
4. Backend fetches all trucks for tenant
   ↓
5. Bot shows trucks list with actions:
   - List of trucks with status
   - ➕ Add truck button
   - Each truck has: View, Edit, Force Free buttons
   ↓
6a. Admin clicks "➕ Добавить машину"
    ├─→ State changes to admin_adding_truck
    ├─→ Prompt: "Введите название машины:"
    └─→ Wait for text input
    ↓
    Admin sends truck name
    ├─→ Create truck with provided name
    ├─→ Return to admin menu
    └─→ Show success message

6b. Admin clicks "VIEW_TRK_<id>"
    ├─→ Show truck details
    ├─→ Current status
    ├── Active shifts using this truck
    └─→ Action buttons

6c. Admin clicks "FORCE_FREE_TRK_<id>"
    ├─→ Force reset is_busy flag to false
    ├─→ Log to audit
    └─→ Show confirmation
```

**Example - Truck List:**
```json
{
  "ui": {
    "method": "editMessage",
    "text": "🚛 Машины (8/10)\n\n1. МАЗ-533 - ✅ Свободен\n2. КАМАЗ-55111 - ⚠️ Занят (Иван Иванов)\n3. ГАЗ-53 - ✅ Свободен",
    "buttons": [
      [{"text": "➕ Добавить", "callback_data": "ADD_TRUCK"}],
      [
        {"text": "МАЗ-533", "callback_data": "VIEW_TRK_1"},
        {"text": "КАМАЗ-55111", "callback_data": "VIEW_TRK_2"}
      ],
      [
        {"text": "← Назад", "callback_data": "ADMIN_MAIN"}
      ]
    ]
  },
  "state": {
    "current_step": "admin_viewing_trucks",
    "user_internal_id": 1
  }
}
```

---

### Admin: Managing Sites

**Preconditions:**
- User has admin role
- User in admin menu

**Flow:**
```
1. Admin clicks "⚙️ Панель управления"
   ↓
2. Bot shows admin menu
   ↓
3. Admin clicks "🏗️ Объекты"
   ↓
4. Backend fetches all sites for tenant
   ↓
5. Bot shows sites list with actions:
   - List of sites with requirements
   - ➕ Add site button
   - Each site has: View, Edit, Delete, Toggle buttons
   ↓
6a. Admin clicks "➕ Добавить объект"
    ├─→ State changes to admin_adding_site
    ├─→ Prompt: "Введите название объекта:"
    └─→ Wait for text input
    ↓
    Admin sends site name
    ├─→ Create site with provided name
    ├─→ Prompt: "Требуется фото одометра? (Да/Нет)"
    └─→ Wait for response
    ↓
    Admin responds
    ├─→ Update site with odometer requirement
    ├─→ Prompt: "Требуется накладная? (Да/Нет)"
    └─→ Wait for response
    ↓
    Admin responds
    ├─→ Update site with invoice requirement
    ├─→ Return to admin menu
    └─→ Show success message

6b. Admin clicks "TOGGLE_STE_ODO_<id>"
    ├─→ Toggle odometer requirement
    ├─→ Log to audit
    └─→ Show updated status

6c. Admin clicks "DELETE_STE_<id>"
    ├─→ Confirm deletion
    ├─→ Delete site if confirmed
    ├─→ Log to audit
    └─→ Return to list
```

---

## State Management

### User States

**Driver States:**
- `idle` - No active shift, can start new shift
- `pending_truck` - Selecting truck for new shift
- `pending_site` - Selecting site for new shift
- `awaiting_odo_start` - Waiting for odometer start photo
- `active` - Shift in progress
- `awaiting_odo_end` - Waiting for odometer end photo
- `awaiting_invoice` - Waiting for invoice photo
- `finished` - Shift completed (transient, returns to idle)

**Admin States:**
- `idle` - Normal operation
- `admin_adding_site` - Adding new site (text input mode)
- `admin_adding_truck` - Adding new truck (text input mode)
- `admin_viewing_trucks` - Viewing truck list
- `admin_viewing_sites` - Viewing site list

### State Transitions

**Allowed Transitions:**
```
idle → pending_truck (START_SHIFT)
idle → admin_adding_truck (ADD_TRUCK)
idle → admin_adding_site (ADD_SITE)

pending_truck → pending_site (TRK_<id>)
pending_truck → idle (CANCEL)

pending_site → awaiting_odo_start (STE_<id> with odometer)
pending_site → active (STE_<id> without odometer)
pending_site → idle (CANCEL)

awaiting_odo_start → active (photo upload)
active → awaiting_odo_end (END_SHIFT with odometer)
active → awaiting_invoice (END_SHIFT with invoice only)
active → finished (END_SHIFT with no requirements)

awaiting_odo_end → awaiting_invoice (photo upload, if invoice required)
awaiting_odo_end → finished (photo upload, if no invoice)
awaiting_invoice → finished (photo upload)

finished → idle (automatic)
admin_* → idle (completion or cancellation)
```

**Invalid Transitions (Blocked):**
- Any state → pending_truck (if active shift exists)
- Any state → active (without completing pending steps)
- Skipping states (e.g., pending_truck → active)

### State Recovery

**Automatic Recovery:**
```typescript
// Check for stuck states on every interaction
async function validateState(userId: number, currentState: string) {
  const shift = await getCurrentShift(userId);

  // If user in pending state but no draft shift exists
  if (!shift && currentState.startsWith('pending_')) {
    // Reset to idle
    await prisma.users.update({
      where: { id: userId },
      data: { current_state: 'idle' }
    });
    return 'idle';
  }

  // If user in active state but shift is finished
  if (shift && shift.status === 'finished' && currentState === 'active') {
    // Reset to idle
    await prisma.users.update({
      where: { id: userId },
      data: { current_state: 'idle' }
    });
    return 'idle';
  }

  return currentState;
}
```

**Manual Recovery (Admin):**
- Admin can view user state in PWA
- Admin can manually reset user to idle
- Audit trail tracks manual interventions

---

## Error Handling

### Common Errors

**1. Truck Already Busy**
```
Error: "Машина уже занята"
Cause: Selected truck is_busy = true
State: Remains in pending_truck
Action: Show error, keep truck selection menu
User Message: "❌ Эта машина уже занята. Выберите другую:"
```

**2. Active Shift Exists**
```
Error: "У вас уже есть активная смена"
Cause: User tries to start shift while one is active
State: Remains in idle
Action: Show error with current shift info
User Message: "❌ У вас уже есть активная смена. Завершите её перед началом новой."
```

**3. Plan Limit Reached**
```
Error: "Достигнут лимит машин (3 шт.)"
Cause: Tenant trying to exceed plan limits
State: Operation blocked
Action: Show error with upgrade prompt
User Message: "❌ Достигнут лимит машин (3 шт.)\n\nТарифный план: Бесплатный\n\nОбновите план для добавления большего количества машин."
```

**4. User Not Found (Auto-Onboard)**
```
Error: None (informational)
Cause: New Telegram user
Action: Trigger auto-onboarding
User Message: "🎉 Добро пожаловать в LogiShift! Создаем ваш аккаунт..."
```

**5. Invalid State Transition**
```
Error: "Неверная команда"
Cause: User action not valid for current state
State: Remains in current state
Action: Show error, display valid actions
User Message: "❌ Эта команда недоступна сейчас. Вернитесь в меню:"
```

### Error Recovery Flows

**Recovery Pattern:**
```
1. Error detected
   ↓
2. Log error with context
   - User ID
   - Current state
   - Action attempted
   - Error details
   ↓
3. Return user to safe state
   - Usually current state or previous state
   - Sometimes reset to idle
   ↓
4. Show user-friendly error message
   - Explain what went wrong
   - Suggest next actions
   - Provide "back to menu" option
   ↓
5. Offer recovery options
   - Retry action
   - Cancel operation
   - Contact support
```

**Example - Truck Busy Recovery:**
```json
{
  "ui": {
    "method": "sendMessage",
    "text": "❌ МАЗ-533 уже занята Иваном Ивановым\n\nВыберите другую машину:",
    "buttons": [
      [
        {"text": "КАМАЗ-55111", "callback_data": "TRK_2"},
        {"text": "ГАЗ-53", "callback_data": "TRK_3"}
      ],
      [
        {"text": "❌ Отмена", "callback_data": "CANCEL"}
      ]
    ]
  },
  "state": {
    "current_step": "pending_truck",
    "user_internal_id": 5
  }
}
```

### User-Friendly Messages

**Message Guidelines:**
- Use emoji for visual context
- Keep messages concise (≤ 200 characters when possible)
- Use bold text for important info
- Provide clear next steps
- Include cancel/back option when appropriate

**Message Templates:**
```
Success: ✅ [Action completed]
Info: ℹ️ [Informational message]
Warning: ⚠️ [Warning message]
Error: ❌ [Error message with recovery]
Prompt: 📸 [Request for input]
Confirmation: 🤔 [Confirm action]
```

**Best Practices:**
1. Always acknowledge user action
2. Explain what happens next
3. Provide progress indicators for long operations
4. Use consistent terminology
5. Localize to Russian (primary user language)
6. Avoid technical jargon
7. Show empathy in error messages

---

## See Also

- [Gateway API](./gateway-api.md) - Complete API specification
- [State Machine](./state-machine.md) - Detailed state transitions
- [Integration](./integration.md) - n8n gateway setup
- [Bot Flow](../workflows/telegram-bot-flow.md) - Complete workflow
- [Error Handling](../backend/api-reference.md#error-handling) - API errors
