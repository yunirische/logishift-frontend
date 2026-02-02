# Contributing to Documentation

## Для Backend Agent

Изменил код → обнови документацию:

| Что изменил | Какой файл обновить |
|-------------|---------------------|
| API эндпоинт | `backend/api-reference.md` |
| Таблица БД | `backend/database-schema.md` |
| Middleware/роутинг | `backend/architecture/middleware.md` |
| Gateway для Telegram | `telegram-bot/gateway-api.md` |
| State machine (смены) | `backend/state-machine.md` |

## Для Frontend Agent  

Изменил код → обнови документацию:

| Что изменил | Какой файл обновить |
|-------------|---------------------|
| Новый компонент | `frontend/architecture.md` |
| API вызов | `frontend/api-integration.md` |
| UI элемент | `frontend/design-system.md` |

## Общее правило

✅ Обновляй документацию СРАЗУ после изменения кода  
❌ НЕ создавай временные файлы (типа 02022026.md)  
❌ НЕ дублируй существующие файлы

## Примечание

**Telegram Bot** - это клиент бэкенда (как и PWA).  
Все эндпоинты для бота документируются Backend Agent в `backend/api-reference.md`.  
Gateway специфика бота - в `telegram-bot/gateway-api.md`.
