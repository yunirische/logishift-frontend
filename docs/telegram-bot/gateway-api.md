---
title: Gateway API Specification
domain: telegram-bot
related:
  - state-machine.md
  - integration.md
  - scenarios.md
last_updated: 2026-01-27
context_priority: high
---

# Gateway API Specification

## Overview

The Gateway API is the single endpoint through which the n8n integration communicates with the LogiShift backend for Telegram Bot operations.

## Endpoint

### POST `/api/v1/gateway`

Telegram Bot webhook endpoint (via n8n gateway).

## Request Format

### Request Body

```typescript
{
  user_id: string;        // Telegram user ID (string format)
  type: "text" | "callback" | "photo";
  payload: {
    // For callback:
    callback_query_id?: string;
    data?: string;        // Callback data (e.g., "START_SHIFT")

    // For text:
    text?: string;        // Message text

    // For photo:
    file_id?: string;     // Telegram file ID
  };
  tg_name?: string;       // Telegram username
}
```

### Request Examples

**Callback Query (Button Click):**
```json
{
  "user_id": "123456789",
  "type": "callback",
  "payload": {
    "callback_query_id": "1234567890",
    "data": "START_SHIFT"
  },
  "tg_name": "ivan_driver"
}
```

**Text Message:**
```json
{
  "user_id": "123456789",
  "type": "text",
  "payload": {
    "text": "МАЗ-533"
  },
  "tg_name": "ivan_driver"
}
```

**Photo Upload:**
```json
{
  "user_id": "123456789",
  "type": "photo",
  "payload": {
    "file_id": "AgACAgIAAxkBAAI..."
  },
  "tg_name": "ivan_driver"
}
```

## Response Format

### Response Body

```typescript
{
  ui: {
    method: "sendMessage" | "editMessage";
    text: string;         // Message text (HTML formatted)
    buttons: Array<Array<{
      text: string;
      callback_data: string;
    }>>;
    delete_original: boolean;  // Whether to delete previous menu
  };
  state: {
    current_step: string;      // User current state
    active_shift_id: number | null;
    user_internal_id: number;
    last_menu_message_id: string | null;
  };
  callback_query_id?: string;  // For callback responses
}
```

### Response Examples

**Send New Message:**
```json
{
  "ui": {
    "method": "sendMessage",
    "text": "🚙 <b>МЕНЮ ВОДИТЕЛЯ</b>\n🕒 15:30\n────────────────────\n\nСтатус: 💤 <b>ОТДЫХ</b>\n\nУ вас нет активной смены.",
    "buttons": [
      [
        {
          "text": "✅ Начать смену",
          "callback_data": "START_SHIFT"
        }
      ],
      [
        {
          "text": "⚙️ Панель управления",
          "callback_data": "ADMIN_MAIN"
        }
      ]
    ],
    "delete_original": false
  },
  "state": {
    "current_step": "idle",
    "active_shift_id": null,
    "user_internal_id": 5,
    "last_menu_message_id": "12345"
  }
}
```

**Edit Existing Message:**
```json
{
  "ui": {
    "method": "editMessage",
    "text": "Выберите машину:",
    "buttons": [
      [
        {
          "text": "МАЗ-533",
          "callback_data": "TRK_1"
        },
        {
          "text": "КАМАЗ-55111",
          "callback_data": "TRK_2"
        }
      ],
      [
        {
          "text": "❌ Отмена",
          "callback_data": "CANCEL"
        }
      ]
    ],
    "delete_original": false
  },
  "state": {
    "current_step": "pending_truck",
    "active_shift_id": 50,
    "user_internal_id": 5,
    "last_menu_message_id": "12345"
  },
  "callback_query_id": "1234567890"
}
```

## Callback Data Commands

### Driver Commands

| Command | Description |
|---------|-------------|
| `START_SHIFT` | Start new shift |
| `END_SHIFT` | End current shift |
| `CANCEL` | Cancel shift draft |
| `REQUEST_COMMENT` | Add comment to shift |

### Admin Commands

| Command | Description |
|---------|-------------|
| `ADMIN_MAIN` | Admin main menu |
| `ADMIN_SETTINGS` | Settings menu |
| `DRIVER_MENU` | Switch to driver menu |
| `VIEW_ACTIVE` | View active shifts |
| `VIEW_USERS` | View users list |
| `EDIT_TRUCKS` | Edit trucks |
| `EDIT_SITES` | Edit sites |
| `ADD_TRUCK` | Add truck (enter text next) |
| `ADD_SITE` | Add site (enter text next) |
| `GEN_INVITE` | Generate invite link |
| `DOWNLOAD_EXCEL` | Get Excel download link |

### Interactive Commands

| Command | Description |
|---------|-------------|
| `TRK_<truck_id>` | Select truck |
| `STE_<site_id>` | Select site |
| `MS_DRV_<driver_id>` | Manual shift: select driver |
| `MS_TRK_<driver_id>_<truck_id>` | Manual shift: select truck |
| `MS_FIN_<driver_id>_<truck_id>_<site_id>` | Manual shift: finalize |
| `VIEW_TRK_<truck_id>` | View truck details |
| `VIEW_STE_<site_id>` | View site details |
| `DELETE_STE_<site_id>` | Delete site |
| `FORCE_FREE_TRK_<truck_id>` | Force free truck |
| `TOGGLE_STE_ODO_<site_id>` | Toggle odometer requirement |
| `TOGGLE_STE_INV_<site_id>` | Toggle invoice requirement |
| `SET_TZ_LIST` | Show timezone list |
| `SAVE_TZ_<timezone>` | Save timezone |

## Message Flow

### 1. User Lookup/Onboarding

```
Request → Check if user exists
         ↓
    If not found → Auto-onboard
         ↓
    Create tenant, user, plan
         ↓
    Return credentials
```

### 2. State Machine Processing

```
Request → Get user state
         ↓
    Route to handler based on type:
    - callback → processCallback()
    - text → processText()
    - photo → processPhoto()
         ↓
    Execute business logic
         ↓
    Update state
         ↓
    Format response
```

### 3. Response Formatting

```
Business Logic Result → Format UI
                        ↓
                    Generate buttons
                        ↓
                    Add state info
                        ↓
                    Return to n8n
                        ↓
                    n8n → Telegram API
```

## Error Handling

### Error Response Format

```json
{
  "ui": {
    "method": "sendMessage",
    "text": "❌ Ошибка: Машина уже занята",
    "buttons": [
      [
        {
          "text": "🔄 В меню",
          "callback_data": "DRIVER_MENU"
        }
      ]
    ],
    "delete_original": false
  },
  "state": {
    "current_step": "idle",
    "active_shift_id": null,
    "user_internal_id": 5,
    "last_menu_message_id": null
  }
}
```

### Common Errors

| Error | Description |
|-------|-------------|
| User not found | Auto-onboard triggered |
| Truck busy | Show error, offer alternative |
| Active shift exists | Prevent duplicate shifts |
| Invalid state | Redirect to menu |
| Plan limit reached | Show upgrade message |

## Integration with n8n

### n8n Workflow

1. **Telegram Trigger** - Receives update from Telegram
2. **Transform Data** - Format to Gateway API request
3. **HTTP Request** - POST to `/api/v1/gateway`
4. **Process Response** - Extract UI and state
5. **Telegram API** - Send/edit message, answer callback

### Webhook Setup

**n8n Webhook URL:**
```
https://your-n8n-instance.com/webhook/telegram
```

**Backend Gateway Endpoint:**
```
https://pwa.kontrolsmen.ru/api/v1/gateway
```

### Authentication

**API Key Header:**
```
X-API-Key: <tenant_api_key>
```

Retrieved from `tenants.api_key` in database.

## Related Documentation

- [State Machine](./state-machine.md) - User workflow and states
- [Integration](./integration.md) - n8n gateway architecture
- [Architecture: Data Flow](../architecture/data-flow.md) - Complete data flow
