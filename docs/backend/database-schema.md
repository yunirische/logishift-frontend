---
title: Database Schema
domain: backend
related:
  - database-operations.md
  - api-reference.md
last_updated: 2026-01-27
context_priority: high
---

# Database Schema

## Overview

- **Database:** PostgreSQL
- **ORM:** Prisma
- **Multi-tenant:** All data isolated by `tenant_id`
- **Binary Targets:** native, linux-musl-openssl-3.0.x (Docker support)

---

## Tables & Models

### 1. `plans`

Subscription plans for tenants.

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| id | `Int` | autoincrement | NO | Primary key |
| code | `String(50)` | - | NO | Plan code (e.g., "free", "pro") |
| name | `String(100)` | - | NO | Display name |
| price_monthly | `Decimal(10,2)` | 0.00 | NO | Monthly price |
| limit_machines | `Int` | 0 | NO | Max trucks allowed |
| limit_drivers | `Int` | 0 | NO | Max drivers allowed (0 = unlimited?) |
| limit_sites | `Int` | -1 | NO | Max sites allowed (-1 = unlimited) |
| is_active | `Boolean` | true | NO | Plan availability |

**Unique Index:** `code`

**Relations:**
- One-to-many: `plans` → `tenants`

**Example Data:**
```sql
INSERT INTO plans (code, name, price_monthly, limit_machines, limit_drivers, limit_sites, is_active)
VALUES
  ('free', 'Бесплатный', 0.00, 3, 5, -1, true),
  ('pro', 'Профессиональный', 999.00, 10, 20, 50, true),
  ('enterprise', 'Корпоративный', 4999.00, -1, -1, -1, true);
```

---

### 2. `tenants`

Multi-tenant isolation - companies/organizations.

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| id | `Int` | autoincrement | NO | Primary key |
| name | `String` | - | NO | Company name |
| plan_id | `Int` | - | NO | Foreign key to `plans.id` |
| api_key | `String?` | - | YES | API key for n8n integration |
| timezone | `String` | "Europe/Moscow" | NO | Default timezone for tenant |
| invoice_required | `Boolean` | false | NO | Require invoice photo globally |

**Unique Index:** `api_key`

**Foreign Keys:**
- `plan_id` → `plans(id)`

**Relations:**
- Many-to-one: `tenants.plan` → `plans`
- One-to-many: `tenants` → `users`
- One-to-many: `tenants` → `dict_trucks`
- One-to-many: `tenants` → `dict_sites`
- One-to-many: `tenants` → `shifts`
- One-to-many: `tenants` → `invites`
- One-to-many: `tenants` → `audit_logs`

**Example Data:**
```sql
INSERT INTO tenants (name, plan_id, api_key, timezone, invoice_required)
VALUES
  ('СтройМастер ООО', 1, 'sk_test_12345', 'Europe/Moscow', false);
```

---

### 3. `users`

System users (admins, drivers, foremen).

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| id | `Int` | autoincrement | NO | Primary key |
| tenant_id | `Int` | - | NO | Foreign key to `tenants.id` (isolation) |
| role | `String` | - | NO | User role: "admin", "driver", "foreman" |
| full_name | `String?` | - | YES | User full name |
| tg_user_id | `BigInt?` | - | YES | Telegram user ID (for bot integration) |
| email | `String?` | - | YES | Email for PWA login (unique) |
| password_hash | `String?` | - | YES | Bcrypt hashed password |
| current_state | `String` | "idle" | NO | User state machine (see States section) |
| hourly_rate | `Decimal(12,2)` | 0.00 | NO | Hourly wage rate (for salary calculation) |
| last_menu_message_id | `BigInt?` | - | YES | Last Telegram menu message ID |
| settings | `Json?` | - | YES | User settings (language, theme, etc.) |

**Unique Indexes:** `tg_user_id`, `email`

**Foreign Keys:**
- `tenant_id` → `tenants(id)`

**Relations:**
- Many-to-one: `users.tenant` → `tenants`
- One-to-many: `users` → `shifts`
- One-to-many: `users` → `audit_logs`

**User States (State Machine):**
```
idle                    # No active shift
pending_truck           # Selecting truck
pending_site            # Selecting site
awaiting_odo_start      # Waiting for odometer start photo
active                  # Shift in progress
awaiting_odo_end        # Waiting for odometer end photo
awaiting_invoice        # Waiting for invoice photo

Admin States:
admin_adding_site       # Adding new site (text input mode)
admin_adding_truck      # Adding new truck (text input mode)
```

**Example Data:**
```sql
INSERT INTO users (tenant_id, role, full_name, email, password_hash, current_state, hourly_rate)
VALUES
  (10, 'admin', 'Алексей Петров', 'admin@example.com', '$2b$10$...', 'idle', 500.00),
  (10, 'driver', 'Иван Иванов', 'ivan@example.com', '$2b$10$...', 'idle', 400.00);
```

---

### 4. `dict_trucks`

Vehicle/truck catalog (dictionary).

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| id | `Int` | autoincrement | NO | Primary key |
| tenant_id | `Int` | - | NO | Foreign key to `tenants.id` (isolation) |
| name | `String` | - | NO | Truck display name |
| plate | `String?` | - | YES | License plate number |
| code | `String?` | - | YES | Internal code |
| is_active | `Boolean` | true | NO | Truck availability status |
| is_busy | `Boolean` | false | NO | Truck current usage status |

**Foreign Keys:**
- `tenant_id` → `tenants(id)`

**Relations:**
- Many-to-one: `dict_trucks.tenant` → `tenants`
- One-to-many: `dict_trucks` → `shifts`

**Example Data:**
```sql
INSERT INTO dict_trucks (tenant_id, name, plate, code, is_active, is_busy)
VALUES
  (10, 'МАЗ-533', 'А123БВ777', 'M1', true, false),
  (10, 'КАМАЗ-55111', 'В456ДЕ777', 'K1', true, false);
```

---

### 5. `dict_sites`

Work sites/locations catalog (dictionary).

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| id | `Int` | autoincrement | NO | Primary key |
| tenant_id | `Int` | - | NO | Foreign key to `tenants.id` (isolation) |
| name | `String` | - | NO | Site display name |
| address | `String?` | - | YES | Physical address |
| code | `String?` | - | YES | Internal code |
| odometer_required | `Boolean` | false | NO | Require odometer photos |
| invoice_required | `Boolean` | false | NO | Require invoice photo |
| is_active | `Boolean` | true | NO | Site availability status |

**Foreign Keys:**
- `tenant_id` → `tenants(id)`

**Relations:**
- Many-to-one: `dict_sites.tenant` → `tenants`
- One-to-many: `dict_sites` → `shifts`

**Example Data:**
```sql
INSERT INTO dict_sites (tenant_id, name, address, code, odometer_required, invoice_required, is_active)
VALUES
  (10, 'Стройплощадка №1', 'ул. Строителей, 10', 'SP1', true, false, true),
  (10, 'Склад №3', 'ул. Складская, 5', 'SK3', false, true, true);
```

---

### 6. `shifts`

Work shifts - core business entity.

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| id | `Int` | autoincrement | NO | Primary key |
| tenant_id | `Int` | - | NO | Foreign key to `tenants.id` (isolation) |
| user_id | `Int` | - | NO | Foreign key to `users.id` |
| truck_id | `Int?` | - | YES | Foreign key to `dict_trucks.id` |
| site_id | `Int?` | - | YES | Foreign key to `dict_sites.id` |
| status | `String` | - | NO | Shift status |
| start_time | `DateTime?` | - | YES | Shift start timestamp |
| end_time | `DateTime?` | - | YES | Shift end timestamp |
| hours_worked | `Decimal(12,2)` | 0.00 | NO | Calculated hours worked |
| salary | `Decimal(12,2)` | 0.00 | NO | Calculated salary (hours × rate) |
| photo_start_url | `String?` | - | YES | Odometer start photo path |
| photo_end_url | `String?` | - | YES | Odometer end photo path |
| photo_invoice_url | `String?` | - | YES | Invoice photo path |
| geo_start | `Json?` | - | YES | Start location {lat, lon} |
| geo_end | `Json?` | - | YES | End location {lat, lon} |
| mileage_start | `Int?` | - | YES | Odometer reading at start |
| mileage_end | `Int?` | - | YES | Odometer reading at end |
| comment | `String?` | - | YES | Shift comment |
| updated_at | `DateTime` | auto | NO | Last update timestamp |
| created_at | `DateTime` | now() | NO | Creation timestamp |

**Foreign Keys:**
- `tenant_id` → `tenants(id)`
- `user_id` → `users(id)`
- `truck_id` → `dict_trucks(id)`
- `site_id` → `dict_sites(id)`

**Relations:**
- Many-to-one: `shifts.tenant` → `tenants`
- Many-to-one: `shifts.user` → `users`
- Many-to-one: `shifts.truck` → `dict_trucks`
- Many-to-one: `shifts.site` → `dict_sites`

**Shift Statuses:**
```
pending_truck           # Truck selection in progress
pending_site            # Site selection in progress
awaiting_odo_start      # Waiting for odometer start photo
active                  # Shift in progress
awaiting_odo_end        # Waiting for odometer end photo
awaiting_invoice        # Waiting for invoice photo
finished                # Shift completed
```

**Example Data:**
```sql
INSERT INTO shifts (tenant_id, user_id, truck_id, site_id, status, start_time, end_time, hours_worked, salary)
VALUES
  (10, 5, 3, 7, 'finished', '2024-01-15 08:00:00', '2024-01-15 12:30:00', 4.50, 1800.00);
```

---

### 7. `invites`

Invitation codes for new driver registration.

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| id | `Int` | autoincrement | NO | Primary key |
| tenant_id | `Int` | - | NO | Foreign key to `tenants.id` |
| code | `String` | - | NO | Invitation code (unique) |
| expires_at | `DateTime` | - | NO | Expiration timestamp |
| status | `String` | "pending" | NO | Invitation status |

**Unique Index:** `code`

**Foreign Keys:**
- `tenant_id` → `tenants(id)`

**Relations:**
- Many-to-one: `invites.tenant` → `tenants`

**Status Values:**
- `pending` - Not yet used
- `used` - Already used

**Example Data:**
```sql
INSERT INTO invites (tenant_id, code, expires_at, status)
VALUES
  (10, 'ABC123XYZ', '2024-01-22 00:00:00', 'pending');
```

---

### 8. `audit_logs`

Audit trail for system actions.

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| id | `Int` | autoincrement | NO | Primary key |
| tenant_id | `Int` | - | NO | Foreign key to `tenants.id` (isolation) |
| user_id | `Int?` | - | YES | Foreign key to `users.id` (null for system actions) |
| action | `String` | - | NO | Action type (e.g., "SHIFT_FINISHED") |
| entity | `String?` | - | YES | Entity type (e.g., "shift") |
| entity_id | `Int?` | - | YES | Entity ID |
| details | `Json?` | - | YES | Additional action details |
| created_at | `DateTime` | now() | NO | Timestamp of action |

**Foreign Keys:**
- `tenant_id` → `tenants(id)`
- `user_id` → `users(id)`

**Relations:**
- Many-to-one: `audit_logs.tenant` → `tenants`
- Many-to-one: `audit_logs.user` → `users`

**Indexes:**
- `idx_audit_logs_user_id` on `user_id`
- `idx_audit_logs_tenant_id` on `tenant_id`
- `idx_audit_logs_created_at` on `created_at`

**Example Data:**
```sql
INSERT INTO audit_logs (tenant_id, user_id, action, entity, entity_id, details, created_at)
VALUES
  (10, 5, 'SHIFT_FINISHED', 'shift', 45, '{"shift_id":45,"hours":4.5}', '2024-01-15 12:30:00');
```

---

## Relationships (ER Diagram)

```
plans (1) ──────< (N) tenants
  │
  └─ limit_machines, limit_drivers, limit_sites

tenants (1) ──────< (N) users
                 │
                 ├─ (N) dict_trucks
                 ├─ (N) dict_sites
                 ├─ (N) shifts
                 ├─ (N) invites
                 └─ (N) audit_logs

users (1) ──────< (N) shifts
                 └─ (N) audit_logs

dict_trucks (1) ──< (N) shifts

dict_sites (1) ───< (N) shifts
```

---

## Indexes

### User-defined indexes:
- `audit_logs` table:
  - `idx_audit_logs_user_id` on `user_id`
  - `idx_audit_logs_tenant_id` on `tenant_id`
  - `idx_audit_logs_created_at` on `created_at`

### Unique indexes:
- `plans.code`
- `tenants.api_key`
- `users.tg_user_id`
- `users.email`
- `invites.code`

### Foreign key indexes (created automatically):
- `tenants.plan_id`
- `users.tenant_id`
- `dict_trucks.tenant_id`
- `dict_sites.tenant_id`
- `shifts.tenant_id`, `shifts.user_id`, `shifts.truck_id`, `shifts.site_id`
- `invites.tenant_id`
- `audit_logs.tenant_id`, `audit_logs.user_id`

---

## Related Documentation

- [Database Operations](./database-operations.md) - Migrations, CRUD, transactions
- [API Reference](./api-reference.md) - How the database is used via API
- [Architecture: Tech Stack](../architecture/tech-stack.md) - Prisma ORM details
