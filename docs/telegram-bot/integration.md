---
title: Bot Integration Architecture
domain: telegram-bot
related:
  - gateway-api.md
  - ../architecture/decisions/architecture-decisions.md#adr-001-n8n-gateway-pattern-for-telegram-integration
last_updated: 2026-01-27
context_priority: medium
---

# Bot Integration Architecture

## Overview

LogiShift uses n8n as a gateway between Telegram Bot API and the backend server. This architecture provides a unified interface for bot interactions and simplifies bot management.

## Architecture

```
┌──────────────┐
│ Telegram Bot │
└──────┬───────┘
       │ Webhook
       ↓
┌──────────────┐
│     n8n      │  (Gateway)
└──────┬───────┘
       │ POST /api/v1/gateway
       ↓
┌──────────────┐
│ LogiShift    │
│   Backend    │
└──────────────┘
```

## Why n8n Gateway Pattern?

### Benefits

1. **Decoupling**
   - Backend doesn't directly integrate with Telegram API
   - Bot logic separated from business logic
   - Easy to swap bot platforms

2. **Centralized Bot Logic**
   - Single integration point
   - Consistent request/response format
   - Easier testing and debugging

3. **Flexibility**
   - Easy to add new bot features via n8n workflows
   - Can integrate with other services (notifications, alerts)
   - Workflow orchestration capabilities

4. **Security**
   - Backend API key not exposed to Telegram
   - n8n handles authentication
   - Tenant-specific API keys

5. **Scalability**
   - n8n can handle webhook processing
   - Async workflow execution
   - Load balancing support

### Alternative Approaches Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| Direct Telegram integration | Simpler architecture | Tight coupling, harder to test | ❌ Rejected |
| Custom gateway service | Full control | More infrastructure, maintenance | ❌ Rejected |
| **n8n gateway** | Flexible, managed, scalable | Additional dependency | ✅ **Chosen** |

## n8n Workflow

### Workflow Structure

```
1. Telegram Trigger (Webhook)
   ↓
2. Data Transformation
   - Extract user_id, type, payload
   - Format to Gateway API request
   ↓
3. HTTP Request (Backend)
   - POST to /api/v1/gateway
   - Include tenant API key
   ↓
4. Response Processing
   - Extract UI instructions
   - Extract state updates
   ↓
5. Telegram API Call
   - Send/edit message
   - Answer callback query
```

### Workflow Configuration

**Trigger Node:**
```json
{
  "type": "n8n-nodes-base.telegramTrigger",
  "name": "Telegram Trigger",
  "webhookId": "logishift-bot",
  "updates": ["message", "callback_query"]
}
```

**Transform Node:**
```javascript
// Extract data from Telegram update
const update = $input.item.json;

let type, payload, userId;

if (update.callback_query) {
  type = 'callback';
  payload = {
    callback_query_id: update.callback_query.id,
    data: update.callback_query.data
  };
  userId = update.callback_query.from.id;
} else if (update.message?.text) {
  type = 'text';
  payload = { text: update.message.text };
  userId = update.message.from.id;
} else if (update.message?.photo) {
  type = 'photo';
  payload = {
    file_id: update.message.photo[0].file_id
  };
  userId = update.message.from.id;
}

return {
  json: {
    user_id: String(userId),
    type,
    payload,
    tg_name: update.message?.from?.username
  }
};
```

**HTTP Request Node:**
```json
{
  "type": "n8n-nodes-base.httpRequest",
  "name": "Backend Gateway",
  "method": "POST",
  "url": "https://pwa.kontrolsmen.ru/api/v1/gateway",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "options": {}
}
```

**Response Processing:**
```javascript
// Extract UI instructions
const response = $input.item.json;

if (response.ui.method === 'sendMessage') {
  // Send new message
  return {
    json: {
      chat_id: response.state.user_internal_id,
      text: response.ui.text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: response.ui.buttons
      }
    }
  };
} else if (response.ui.method === 'editMessage') {
  // Edit existing message
  return {
    json: {
      chat_id: response.state.user_internal_id,
      message_id: response.state.last_menu_message_id,
      text: response.ui.text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: response.ui.buttons
      }
    }
  };
}
```

## Backend Integration

### API Key Authentication

Each tenant has a unique API key stored in `tenants.api_key`.

**n8n Request Headers:**
```
X-API-Key: sk_test_12345
Content-Type: application/json
```

**Backend Verification:**
```typescript
// src/routes/gateway.ts
async function verifyApiKey(req: Request) {
  const apiKey = req.headers['x-api-key'];

  const tenant = await prisma.tenants.findUnique({
    where: { api_key: apiKey }
  });

  if (!tenant) {
    throw new Error('Invalid API key');
  }

  return tenant;
}
```

### Tenant Identification

**Flow:**
1. n8n receives Telegram update
2. Extracts `user_id` from Telegram
3. Calls backend with tenant API key
4. Backend looks up user by `tg_user_id`
5. Extracts `tenant_id` from user record
6. All operations filtered by `tenant_id`

## Telegram API Integration

### Bot Configuration

**Bot Token:**
```bash
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

### Notification Sending

```typescript
// src/core/bot.ts
export async function notifyAdmin(tenantId: number, message: string) {
  const admins = await prisma.users.findMany({
    where: {
      tenant_id: tenantId,
      role: 'admin',
      tg_user_id: { not: null }
    }
  });

  for (const admin of admins) {
    await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: admin.tg_user_id.toString(),
        text: message,
        parse_mode: 'HTML'
      }
    );
  }
}
```

### Callback Query Answer

```typescript
export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await axios.post(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
    {
      callback_query_id: callbackQueryId,
      text: text,
      show_alert: false
    }
  );
}
```

## Testing the Integration

### Manual Testing with n8n

1. **Create Test Workflow:**
   - Add Manual Trigger node
   - Add HTTP Request node to backend
   - Test with sample payload

2. **Test Payload:**
```json
{
  "user_id": "123456789",
  "type": "callback",
  "payload": {
    "callback_query_id": "test",
    "data": "START_SHIFT"
  }
}
```

3. **Verify Response:**
   - Check state transitions
   - Verify UI formatting
   - Test error handling

### Debugging

**Enable Logging:**
```typescript
// src/utils/helpers.ts
export function L(level: string, message: string, meta?: any) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  }));
}

// Usage in gateway
L('info', 'Gateway request', { userId, type, payload });
```

**Common Issues:**

| Issue | Cause | Solution |
|-------|-------|----------|
| User not found | New Telegram user | Auto-onboard triggers |
| Invalid state | State mismatch | Check current_state |
| API key rejected | Wrong tenant | Verify tenants.api_key |
| No response | Backend error | Check logs |

## Deployment

### n8n Setup

1. **Install n8n:**
```bash
npm install -g n8n
```

2. **Configure Webhook:**
```
Webhook URL: https://your-n8n.com/webhook/logishift
```

3. **Set Telegram Webhook:**
```bash
curl -X POST https://api.telegram.org/bot<token>/setWebhook \
  -d "url=https://your-n8n.com/webhook/logishift"
```

### Docker Deployment

**docker-compose.yml:**
```yaml
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=password
      - WEBHOOK_TUNNEL_URL=https://your-n8n.com
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - smenabot-net

networks:
  smenabot-net:
    external: true
```

## Security Considerations

### API Key Management

- Generate unique API key per tenant
- Rotate keys periodically
- Store securely in database
- Never log API keys

### Webhook Security

- Verify Telegram webhook secret
- Validate request source
- Rate limit webhook endpoint
- Monitor for abuse

### Data Privacy

- No sensitive data in bot messages
- Tenant data isolation enforced
- Audit logging for all actions
- GDPR compliance

## Related Documentation

- [Gateway API](./gateway-api.md) - API specification
- [State Machine](./state-machine.md) - User workflow
- [Architecture: Data Flow](../architecture/data-flow.md) - Complete flow
- [Decisions: Architecture Decisions](../decisions/architecture-decisions.md) - Why this pattern
