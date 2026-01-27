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
