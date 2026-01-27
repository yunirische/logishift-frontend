---
title: Performance & Scalability
domain: architecture
related:
  - deployment.md
  - ../backend/database-operations.md#performance-considerations
last_updated: 2026-01-27
context_priority: low
---

# Performance & Scalability

## Overview

This document covers performance considerations and scalability options for the LogiShift backend as the application grows.

## Current Performance Characteristics

### Database Performance

**Prisma Connection Pooling:**
- Managed by Prisma ORM
- Configurable in DATABASE_URL
- Default pool size: 10 connections

**Indexed Fields:**
- Primary keys (all tables)
- `user_id` (in shifts, audit_logs)
- `tenant_id` (all tenant-isolated tables)
- `created_at` (in audit_logs, shifts)
- `tg_user_id` (in users - unique)
- `email` (in users - unique)
- `code` (in plans, invites - unique)
- `api_key` (in tenants - unique)

**Transaction Usage:**
- All multi-table operations use Prisma transactions
- ACID guarantees
- Automatic rollback on failure

**Query Optimization:**
```typescript
// ✅ Good - Single query with includes
const shifts = await prisma.shifts.findMany({
  where: { tenant_id, status: 'active' },
  include: { user: true, truck: true, site: true }
});

// ❌ Bad - N+1 queries
const shifts = await prisma.shifts.findMany({
  where: { tenant_id, status: 'active' }
});
for (const shift of shifts) {
  const user = await prisma.users.findUnique({ where: { id: shift.user_id } });
}
```

### Caching Strategy

**Current Policy:** No caching
- Cache headers disabled
- Real-time data delivery
- Consider implementing Redis for future scaling

**Cache Headers:**
```typescript
// src/index.ts
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
```

**Future Caching Opportunities:**
- Dictionary data (trucks, sites) - 5 minutes
- Dashboard stats - 1 minute
- User permissions - 15 minutes
- Tenant settings - 30 minutes

### File Storage

**Current Implementation:**
- Local filesystem storage
- Organized by tenant/date
- Served directly by Express

**Path Structure:**
```
uploads/
├── {tenant_id}/
│   └── {year}/
│       └── {month}/
│           └── {timestamp}-{description}.{ext}
```

**Performance Considerations:**
- Fast for small deployments
- Simple backup strategy
- Limits horizontal scaling
- Disk space management required

## Scalability Path

### 1. Horizontal Scaling

**Current State:**
- Single container deployment
- Stateless application (except file storage)
- Can scale with load balancer

**Scaling Steps:**

**a) Add Load Balancer:**
```yaml
# docker-compose.yml (with nginx)
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    networks:
      - app-network

  api:
    build: .
    deploy:
      replicas: 3  # Run 3 instances
    networks:
      - app-network
    environment:
      - DATABASE_URL=${DATABASE_URL}
```

**b) Nginx Load Balancer Configuration:**
```nginx
upstream api_backend {
    least_conn;
    server api_1:3000;
    server api_2:3000;
    server api_3:3000;
}

server {
    listen 80;
    location /api/v1 {
        proxy_pass http://api_backend;
    }
}
```

**Requirements for Horizontal Scaling:**
- ✓ Stateless application logic
- ✓ Shared PostgreSQL database
- ✗ Shared file storage (need solution)
- ✓ JWT stateless authentication
- ✓ External session management

### 2. Caching Layer

**Redis Implementation:**

**Installation:**
```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  api:
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379
```

**Usage Example:**
```typescript
// Install: npm install ioredis
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache trucks for 5 minutes
async function getTrucks(tenantId: number) {
  const cacheKey = `trucks:${tenantId}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Cache miss - fetch from DB
  const trucks = await prisma.dict_trucks.findMany({
    where: { tenant_id: tenantId }
  });

  // Set cache with 5-minute expiry
  await redis.setex(cacheKey, 300, JSON.stringify(trucks));

  return trucks;
}

// Invalidate cache on update
async function updateTruck(id: number, data: any) {
  const truck = await prisma.dict_trucks.update({
    where: { id },
    data
  });

  // Clear cache
  await redis.del(`trucks:${truck.tenant_id}`);

  return truck;
}
```

**Cache Strategy:**
| Data Type | TTL | Invalidation |
|-----------|-----|--------------|
| Trucks | 5 min | On update |
| Sites | 5 min | On update |
| Dashboard stats | 1 min | Event-driven |
| User permissions | 15 min | On role change |
| Tenant settings | 30 min | On update |

### 3. Message Queue

**Background Job Processing:**

**Use Cases:**
- Email notifications
- Excel report generation
- Telegram notifications
- Audit log processing
- Data analytics

**Implementation with BullMQ:**
```bash
npm install bullmq ioredis
```

```typescript
// queues.ts
import { Queue, Worker } from 'bullmq';

const notificationQueue = new Queue('notifications', {
  connection: { host: 'redis', port: 6379 }
});

// Add job
await notificationQueue.add('send-telegram', {
  chat_id: 12345,
  message: 'Shift completed'
});

// Worker (separate process)
const worker = new Worker('notifications', async (job) => {
  if (job.name === 'send-telegram') {
    await sendTelegramNotification(job.data);
  }
}, {
  connection: { host: 'redis', port: 6379 }
});
```

**docker-compose.yml:**
```yaml
services:
  api:
    # Main application
    build: .

  worker:
    # Background job processor
    build: .
    command: npm run worker
    depends_on:
      - redis
```

### 4. File Storage Migration

**From Local to S3/Object Storage:**

**Benefits:**
- Horizontal scaling support
- CDN integration
- Better performance
- Automatic backups
- Unlimited storage

**Implementation with AWS S3:**
```bash
npm install @aws-sdk/client-s3
```

```typescript
// s3.service.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function uploadFile(tenantId: number, file: Buffer, filename: string) {
  const key = `${tenantId}/${new Date().getFullYear()}/${filename}`;

  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: file
  }));

  return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
}

async function getFileUrl(key: string) {
  return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
}
```

**Migration Steps:**
1. Set up S3 bucket
2. Update file upload logic
3. Migrate existing files
4. Update database URLs
5. Enable CloudFront CDN

### 5. Database Scaling

**PostgreSQL Optimizations:**

**Connection Pooling:**
```bash
# DATABASE_URL with connection pool
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=20
```

**Read Replicas:**
```
Primary (Write) → Replica 1 (Read)
                → Replica 2 (Read)
                → Replica 3 (Read)
```

**Implementation:**
```typescript
// prisma.ts
const prismaWrite = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL_WRITE }
  }
});

const prismaRead = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL_READ }
  }
});

// Use for reads
const shifts = await prismaRead.shifts.findMany();

// Use for writes
await prismaWrite.shifts.create({ /* ... */ });
```

**Database Partitioning (Future):**
- Partition shifts by year/month
- Partition audit_logs by date
- Improved query performance
- Easier archival

## Performance Monitoring

### Key Metrics to Track

**Application Metrics:**
- Request response time
- Request throughput (req/sec)
- Error rate
- Database query time
- File upload/download time

**Database Metrics:**
- Connection pool usage
- Query performance
- Table/index sizes
- Lock contention
- Replication lag

**Infrastructure Metrics:**
- CPU usage
- Memory usage
- Disk I/O
- Network I/O
- Container health

### Monitoring Tools

**Recommended Stack:**
- **Prometheus** - Metrics collection
- **Grafana** - Visualization
- **AlertManager** - Alerting

**Application Metrics:**
```typescript
import promClient from 'prom-client';

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route, res.statusCode)
      .observe(duration);
  });
  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

## Bottleneck Analysis

### Current Limitations

**Single Container:**
- Max concurrent requests limited by Node.js single thread
- CPU-bound operations block event loop
- File I/O blocks requests

**Database:**
- Single PostgreSQL instance
- No read replicas
- Connection pool limits

**File Storage:**
- Local filesystem doesn't scale horizontally
- No CDN for photo delivery
- Manual backup required

### Scaling Priorities

**Phase 1: Immediate (0-100 users)**
- Optimize database queries
- Add database indexes
- Implement connection pooling
- Add caching for dictionary data

**Phase 2: Growth (100-1000 users)**
- Add Redis caching
- Implement message queue
- Move file storage to S3
- Add load balancer

**Phase 3: Scale (1000+ users)**
- Horizontal scaling with multiple instances
- Database read replicas
- CDN for static content
- Advanced monitoring

## Related Documentation

- [Overview](./overview.md) - System architecture
- [Data Flow](./data-flow.md) - How data flows through system
- [Tech Stack](./tech-stack.md) - Technology choices
- [Deployment](./deployment.md) - Current deployment setup
