---
title: Deployment Architecture
domain: architecture
related:
  - tech-stack.md
  - scalability.md
last_updated: 2026-01-27
context_priority: medium
---

# Deployment Architecture

## Overview

LogiShift backend is deployed using Docker containers with persistent storage for file uploads, integrated with n8n for Telegram Bot gateway functionality.

## Docker Environment

### Container Configuration

**Container Details:**
- **Name:** `logishift_api`
- **Image:** Built from Dockerfile in project root
- **Port Mapping:** `3000:3000`
- **Network:** `smenabot-net` (external network shared with n8n)
- **Restart Policy:** Configured in docker-compose.yml

### Docker Compose Configuration

**File:** `docker-compose.yml`
```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: logishift_api
    ports:
      - "3000:3000"
    volumes:
      - /opt/docker-data/static_files:/app/uploads
    networks:
      - smenabot-net
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - UPLOAD_DIR=/app/uploads

networks:
  smenabot-net:
    external: true

volumes:
  static_files:
    driver: local
```

### Dockerfile

**File:** `Dockerfile`
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3000

CMD ["npm", "start"]
```

## Persistent Storage

### File Upload Volume

**Volume Mapping:**
```
/opt/docker-data/static_files:/app/uploads
```

**Directory Structure:**
```
/opt/docker-data/static_files/
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

**Benefits:**
- Persistent across container restarts
- Shared between containers (if scaling)
- Easy backup
- Separate from application code

## Network Configuration

### External Network: smenabot-net

**Purpose:**
- Connect backend API with n8n gateway
- Enable webhook communication
- Shared infrastructure

**Network Members:**
- `logishift_api` (this service)
- `n8n` (Telegram Bot gateway)

**Communication:**
```
Telegram → n8n (smenabot-net) → logishift_api (smenabot-net)
```

### Port Exposure

**Internal Port:** 3000
**External Port:** 3000

**Access URLs:**
- Local: `http://localhost:3000`
- Production: `https://pwa.kontrolsmen.ru` (behind reverse proxy)

## Environment Variables

### Required Variables

**Create `.env` file:**
```bash
# Server
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT
JWT_SECRET=your-secret-key-min-32-characters-long

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# File Storage
UPLOAD_DIR=/app/uploads
```

### Variable Descriptions

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server listening port |
| `NODE_ENV` | No | development | Environment mode |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `JWT_SECRET` | Yes | - | JWT signing secret (min 32 chars) |
| `TELEGRAM_BOT_TOKEN` | Yes | - | Telegram Bot API token |
| `UPLOAD_DIR` | No | ./uploads | File upload directory |

### Security Notes

**⚠️ Important:**
- Never commit `.env` to version control
- Add `.env` to `.gitignore`
- Use different secrets for each environment
- Rotate secrets periodically
- Use strong JWT secrets (min 32 characters)

## Database Deployment

### PostgreSQL

**External Service:** Separate PostgreSQL instance

**Connection String Format:**
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE
```

**Example:**
```
postgresql://logishift:secure_password@db.example.com:5432/logishift_prod
```

**Migration Deployment:**
```bash
# Apply migrations in production
docker exec logishift_api npx prisma migrate deploy

# Generate Prisma Client (if needed)
docker exec logishift_api npx prisma generate
```

## Reverse Proxy (Recommended)

### Nginx Configuration

**Recommended Setup:**
```nginx
server {
    listen 443 ssl http2;
    server_name pwa.kontrolsmen.ru;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api/v1 {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # PWA static files
    location / {
        root /var/www/pwa;
        try_files $uri $uri/ /index.html;
    }
}
```

**Benefits:**
- SSL/TLS termination
- HTTP/2 support
- Gzip compression
- Static file serving
- Load balancing (future)

## Deployment Steps

### Initial Deployment

1. **Prepare Server:**
```bash
# Install Docker and Docker Compose
# Create external network
docker network create smenabot-net
```

2. **Setup Environment:**
```bash
# Create .env file
cp .env.example .env
nano .env  # Edit with production values
```

3. **Build and Start:**
```bash
# Build Docker image
docker-compose build

# Start container
docker-compose up -d

# Apply database migrations
docker-compose exec api npx prisma migrate deploy
```

4. **Verify Deployment:**
```bash
# Check logs
docker-compose logs -f api

# Health check
curl https://pwa.kontrolsmen.ru/api/v1/health
```

### Updating Deployment

1. **Pull Latest Code:**
```bash
git pull origin main
```

2. **Rebuild and Restart:**
```bash
docker-compose build
docker-compose up -d
```

3. **Apply Migrations (if any):**
```bash
docker-compose exec api npx prisma migrate deploy
```

### Rolling Updates

**For zero-downtime updates:**
```bash
# Start new container
docker-compose up -d --scale api=2 --no-recreate

# Stop old container
docker-compose stop api
docker-compose up -d --scale api=1 --no-recreate
```

## Monitoring

### Health Check Endpoint

**GET** `/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "modules": "refactored"
}
```

### Logging

**View Logs:**
```bash
# Follow logs
docker-compose logs -f api

# Last 100 lines
docker-compose logs --tail=100 api
```

**Structured Logging:**
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
```

### Monitoring Tools (Recommended)

**Future Enhancements:**
- [ ] Application performance monitoring (APM)
- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring
- [ ] Database performance monitoring
- [ ] Container resource monitoring

## Backup Strategy

### Database Backup

**Automated Backups:**
```bash
# Cron job example
0 2 * * * pg_dump -U user -h host dbname > /backups/db_$(date +\%Y\%m\%d).sql
```

### File Storage Backup

**Backup Uploads Directory:**
```bash
# Sync to backup location
rsync -av /opt/docker-data/static_files/ /backups/files/
```

### Disaster Recovery

**Restore Steps:**
1. Restore PostgreSQL database
2. Restore file storage volume
3. Restart containers
4. Verify health endpoint
5. Test application functionality

## Related Documentation

- [Overview](./overview.md) - System architecture
- [Security](./security.md) - Security configuration
- [Tech Stack](./tech-stack.md) - Technology details
- [Database Schema](../backend/database-schema.md) - Database backup/recovery
