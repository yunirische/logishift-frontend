---
title: Technology Stack
domain: architecture
related:
  - overview.md
  - deployment.md
last_updated: 2026-01-27
context_priority: medium
---

# Technology Stack

## Overview

LogiShift backend is built with modern Node.js technologies, prioritizing type safety, developer experience, and production reliability.

## Backend Framework

### Node.js & TypeScript
- **Node.js 20+** - Runtime environment
- **Express.js 4.18** - HTTP server framework
- **TypeScript 5.0** - Type-safe JavaScript

**Why TypeScript:**
- Catch errors at compile time
- Better IDE support
- Self-documenting code
- Easier refactoring

### Application Structure
```
src/
├── index.ts                    # Entry point
├── web-api.controller.ts       # PWA controller
├── routes/                     # Route definitions
│   ├── api.ts                  # Web API routes
│   └── gateway.ts              # Telegram gateway
├── services/                   # Business logic
│   ├── shift.service.ts
│   ├── media.service.ts
│   ├── onboarding.service.ts
│   └── excel.service.ts
├── middleware/                 # Express middleware
│   └── auth.ts
├── core/                       # Core utilities
│   ├── prisma.ts
│   └── bot.ts
└── utils/                      # Helpers
    └── helpers.ts
```

## Database & ORM

### PostgreSQL
- **Primary Database** - Relational data storage
- **Multi-tenant** - tenant_id isolation
- **ACID compliant** - Transaction support
- **JSON support** - For flexible data (geo coordinates, settings)

### Prisma 5.7
- **ORM** - Object-Relational Mapping
- **Migrations** - Schema version control
- **Type Safety** - Generated types
- **Query Builder** - Type-safe queries

**Binary Targets:**
- `native` - Local development
- `linux-musl-openssl-3.0.x` - Docker Alpine images

**Schema Location:** `prisma/schema.prisma`

**Migration Commands:**
```bash
npx prisma generate              # Generate client
npx prisma migrate dev           # Create migration
npx prisma migrate deploy        # Apply to production
npx prisma migrate reset         # Reset database (dev only)
```

## Authentication & Security

### JSON Web Tokens
- **Library:** jsonwebtoken 9.0
- **Algorithm:** HS256
- **Expiration:** 12 hours
- **Payload:** `{ id, role, tenant_id, iat, exp }`

**Token Generation:**
```typescript
const token = jwt.sign(
  { id: user.id, role: user.role, tenant_id: user.tenant_id },
  process.env.JWT_SECRET,
  { expiresIn: '12h' }
);
```

### Password Hashing
- **Library:** bcrypt 5.1
- **Rounds:** 10
- **Never store plain text passwords**

**Hashing:**
```typescript
const hash = await bcrypt.hash(password, 10);
```

### CORS
- **Library:** cors 2.8
- **Configuration:** All origins allowed (consider restricting in production)

```typescript
app.use(cors()); // Currently allows all origins
```

## External Integrations

### Telegram API
- **Library:** axios 1.6
- **Purpose:** Send notifications, answer callbacks
- **Bot Token:** `process.env.TELEGRAM_BOT_TOKEN`

**Example:**
```typescript
await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
  chat_id: chatId,
  text: message,
  parse_mode: 'HTML'
});
```

### n8n Gateway
- **Integration:** Telegram Bot webhook proxy
- **Endpoint:** `/api/v1/gateway`
- **Purpose:** Standardized bot interaction

## File Processing

### Multer
- **Library:** multer 1.4
- **Purpose:** Handle multipart/form-data file uploads
- **Storage:** Memory storage (moved to custom location)

**Configuration:**
```typescript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});
```

### Excel Generation
- **Library:** ExcelJS 4.4
- **Purpose:** Generate shift reports
- **Format:** .xlsx

**Usage:**
```typescript
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Shifts');
// Add data...
await workbook.xlsx.writeBuffer();
```

### File System
- **Libraries:** fs, fs-extra
- **Storage:** Local filesystem (`./uploads`)
- **Organization:** `tenant_id/year/month/`

**Path Pattern:**
```
uploads/
├── 10/                    # tenant_id
│   └── 2024/
│       └── 01/
│           ├── 1705315200000-photo.jpg
│           └── 1705336800000-invoice.jpg
└── 15/                    # Another tenant
    └── 2024/
        └── 01/
            └── ...
```

## Configuration

### dotenv
- **Library:** dotenv 16.3
- **Purpose:** Environment variable management
- **File:** `.env` (not in repository)

**Required Variables:**
```bash
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
TELEGRAM_BOT_TOKEN=your-bot-token
UPLOAD_DIR=./uploads
```

## Deployment

### Docker & Docker Compose
- **Containerization:** Docker
- **Orchestration:** Docker Compose
- **Network:** smenabot-net (external, shared with n8n)
- **Volume:** Persistent file storage

**docker-compose.yml:**
```yaml
services:
  api:
    build: .
    container_name: logishift_api
    ports:
      - "3000:3000"
    volumes:
      - /opt/docker-data/static_files:/app/uploads
    networks:
      - smenabot-net
    environment:
      - NODE_ENV=production

networks:
  smenabot-net:
    external: true
```

### Build Process
```bash
# Compile TypeScript
npm run build

# Production start
npm start

# Development with watch
npm run dev
```

## Development Tools

### TypeScript Configuration
**File:** `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Package Scripts
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  }
}
```

## Related Documentation

- [Overview](./overview.md) - System architecture
- [Security](./security.md) - Security architecture
- [Deployment](./deployment.md) - Docker configuration
- [Database Schema](../backend/database-schema.md) - Database structure
