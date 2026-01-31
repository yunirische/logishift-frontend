# LogiShift Frontend - Agent Guide

> **Note**: Synced to [logishift-docs](https://github.com/yunirische/logishift-docs).
> After editing, run: `C:\logishift-docs\scripts\sync-from-repos.ps1`


## 🏗 Роль и Миссия

Ты — Архитектор LogiShift. Твоя задача — строить быстрый и чистый React PWA, который идеально общается с Backend API.

## 🛠 Техстек

- React 18, Vite, TailwindCSS, Lucide Icons.
- Состояние: AuthContext для авторизации, useState/useEffect для данных.
- API: Сервис `api.ts` с базовым URL из констант.

## 📜 Золотые Правила

1. **ARCHITECTURE.md** — твой единственный источник истины по API и БД. Ты берешь структуру запросов ТОЛЬКО оттуда.
2. **Компоненты**: Используй существующие UI-блоки. Не плоди дубликаты.
3. **Обработка ошибок**: Всегда показывай loading-state и обрабатывай ошибки API (401, 403).
4. **Запрет**: Никакого Python. Только React/TypeScript.

## 🌐 Backend API Context (v2.5)

### Phase 1: Billing & Subscription (Биллинг и подписка)

**Subscription Middleware:**
- `checkSubscription` — проверяет срок действия подписки для write-операций
- GET запросы разрешены даже при истекшей подписке (read-only доступ)
- POST/PUT/PATCH/DELETE блокируются при истекшей подписке (403 Forbidden)
- tenant.subscription_expires_at проверяется на каждом запросе

**Audit Trail Endpoints:**
- `GET /api/v1/audit` — получение истории действий (только для ADMIN)
- Audit actions: SHIFT_STARTED, SHIFT_FINISHED, COMMENT_ADDED, ADMIN_PHOTO_UPLOAD и др.
- Все действия записываются с timestamp и details JSON

**Database Changes (Phase 1):**
- Таблица `tenants`: добавлено поле `subscription_expires_at`
- Таблица `audit_logs`: новые action types для подписки и биллинга

### Phase 4: Usage Analytics (Аналитика использования)

**Analytics Endpoints (все требуют JWT auth):**

1. `GET /api/v1/analytics/usage` — Текущее использование ресурсов vs лимиты плана
   ```json
   {
     "trucks": { "current": 8, "limit": 10, "utilization_percent": 80 },
     "drivers": { "current": 12, "limit": -1, "utilization_percent": null },
     "sites": { "current": 5, "limit": 10, "utilization_percent": 50 }
   }
   ```

2. `GET /api/v1/analytics/trends` — Временные ряды (дневная агрегация)
   - Query params: `days` (1-365, default: 30)
   - Возвращает: date, shifts_count, hours_worked, salary_paid

3. `GET /api/v1/analytics/drivers` — Рейтинг водителей по отработанным часам
   - Query params: `limit` (1-100, default: 10), `days` (1-365, default: 30)
   - Возвращает: driver_id, driver_name, shifts_count, hours_worked, salary_paid

4. `GET /api/v1/analytics/summary` — Сводка ресурсов (active/in-work/available)
   - Для trucks, drivers, sites: total, active, in_work, available

5. `GET /api/v1/analytics/insights` — Рекомендации по оптимизации плана
   - Query params: `days` (1-365, default: 30)
   - Возвращает: underutilizedResources, nearLimitResources, costPerShift, recommendedActions

6. `GET /api/v1/analytics/shifts` — Статистика по сменам
   - Query params: `days` (1-365, default: 30)
   - Возвращает: total_shifts, finished_shifts, completion_rate, duration_stats (avg/min/max/median)

7. `GET /api/v1/analytics/sites` — Метрики использования объектов
   - Query params: `days` (1-365, default: 30)
   - Возвращает: site_id, site_name, shifts_count, unique_drivers, hours_worked

8. `GET /api/v1/analytics/export` — Экспорт в JSON или CSV
   - Query params: `days` (1-365, default: 30), `format` (json/csv, default: json)
   - CSV с UTF-8 BOM для Excel, русские заголовки (Дата; Смен; Часов; Выплачено)

**Admin Features:**
- `POST /api/v1/shifts/:id/proxy-photo` — Администратор загружает фото от имени водителя
- Поддерживает photoType: odo_start, odo_end, invoice
- Автоматические переходы состояний при загрузке

**Frontend Integration Notes:**
- Все analytics endpoints фильтруются по tenant_id из JWT
- Параметры валидируются на уровне контроллера (days: 1-365, limit: 1-100)
- При 403 "Срок действия подписки истек" — показать пользователю уведомление
- Analytics endpoints можно использовать для планирования ресурсов и оптимизации тарифа
