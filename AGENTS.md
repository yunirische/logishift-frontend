# LogiShift Frontend - Руководство для разработчиков

## 🏗 Архитектура проекта

LogiShift Frontend представляет собой Progressive Web App (PWA) для управления рабочими сменами водителей. Приложение построено по принципу Single Page Application с клиентской маршрутизацией.

### 🔧 Технологический стек

**Основные технологии:**
- React 18+ с TypeScript
- Vite 5.0+ для сборки и development сервера
- TailwindCSS 3.4+ для стилизации
- PWA функциональность через vite-plugin-pwa

**UI библиотеки:**
- Lucide React - иконки
- Recharts - графики и диаграммы (потенциально)

**Стейт менеджмент:**
- React Context + useState для глобального состояния
- Локальный state через useState/useEffect

## 📁 Структура компонентов

### Иерархия компонентов:
```
src/
├── components/           # Переиспользуемые UI компоненты
│   ├── ui.tsx           # Базовые компоненты (Button, Card, Input)
│   ├── Dashboard.tsx    # Главная панель управления
│   ├── Layout.tsx       # Основной лейаут приложения
│   ├── Login.tsx        # Компонент авторизации
│   ├── Shifts.tsx       # Список смен
│   ├── Drivers.tsx      # Управление водителями
│   ├── AuditLogs.tsx    # Журнал аудита
│   └── AIAssistant.tsx  # ИИ помощник (в разработке)
├── views/               # Страницы приложения
│   ├── LoginView.tsx    # Страница входа
│   ├── DriverView.tsx   # Интерфейс водителя
│   └── AdminView.tsx    # Админ панель
├── context/             # Контексты состояния
│   └── AuthContext.tsx  # Контекст аутентификации
├── services/            # Сервисы API
│   ├── api.ts          # Основной клиент API
│   └── geminiService.ts # Сервис Gemini AI
├── types.ts            # TypeScript типы
└── constants.ts        # Константы приложения
```

### Типы компонентов:

**View компоненты** - представляют целые страницы:
- Содержат бизнес-логику
- Используют множество хуков состояния
- Интегрируются с API
- Импортируют UI компоненты

**UI компоненты** - переиспользуемые элементы:
- Статистические или минимальное состояние
- Принимают props для кастомизации
- Не содержат бизнес-логику

## 🔌 Взаимодействие с API бэкенда

### Структура API клиента:

**Базовые настройки:**
- Base URL: `https://pwa.kontrolsmen.ru/api/v1`
- Аутентификация: JWT tokens в localStorage
- Content-Type: application/json

**Основные endpoint'ы:**
```typescript
// Аутентификация
POST /auth/login

// Управление сменами
GET  /shifts/current     // Текущая смена
POST /shifts/start       // Начать смену
POST /shifts/end         // Завершить смену
POST /shifts/photo       // Загрузить фото

// Справочники
GET /trucks              // Список машин
GET /sites               // Список объектов

// Администрирование
GET /dashboard/stats     // Статистика
GET /shifts              // Все смены
GET /users               // Пользователи
GET /audit               // Аудит логи
```

### Паттерны вызовов API:

**Автоматическая аутентификация:**
```typescript
// Автоматическое добавление токена в заголовки
const response = await fetch(endpoint, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

**Обработка 401 ошибок:**
```typescript
if (response.status === 401) {
  clearAuth();           // Очистка localStorage
  window.location.reload(); // Перезагрузка приложения
}
```

## 🧩 Паттерны управления состоянием

### Глобальное состояние (AuthContext):

**Контекст аутентификации:**
- `user` - данные текущего пользователя
- `token` - JWT токен
- `login()` - функция входа
- `logout()` - функция выхода
- `isAuthenticated` - флаг авторизации

**Использование в компонентах:**
```typescript
const { user, token, login, logout } = useAuth();
```

### Локальное состояние компонентов:

**Паттерн загрузки данных:**
```typescript
const [data, setData] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  loadData();
}, []);

const loadData = async () => {
  try {
    setLoading(true);
    const result = await api.get('/endpoint');
    setData(result.data);
  } catch (err) {
    setError('Ошибка загрузки');
  } finally {
    setLoading(false);
  }
};
```

**Состояние форм:**
```typescript
const [form, setForm] = useState({
  username: '',
  password: ''
});

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setForm(prev => ({
    ...prev,
    [e.target.name]: e.target.value
  }));
};
```

## 📝 Стандарты именования компонентов

### Файлы и директории:
- **Компоненты**: PascalCase (Dashboard.tsx, UserProfile.tsx)
- **Сервисы**: camelCase (api.ts, geminiService.ts)
- **Хуки**: usePascalCase (useAuth.ts, useApi.ts)
- **Типы**: PascalCase (User.ts, Shift.ts)

### Компоненты и функции:
- **Компоненты**: PascalCase (UserList, ShiftCard)
- **Обработчики**: handleAction (handleSubmit, handleChange)
- **Состояние**: описательные имена (userData, isLoading, errorMessage)
- **Пропсы**: camelCase, интерфейсы PascalCase + Props

### CSS классы (Tailwind):
- Использование утилитарных классов Tailwind
- Кастомные классы через `className` прops
- Семантические имена для кастомных стилей

## ⚠️ Правила обработки ошибок API

### Уровни обработки ошибок:

**1. Уровень сервиса (api.ts):**
```typescript
try {
  const response = await fetch(endpoint, options);
  
  if (response.status === 401) {
    clearAuth();
    window.location.reload();
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Error ${response.status}`);
  }
  
  return response.json();
} catch (error) {
  throw error; // Пробрасываем выше
}
```

**2. Уровень компонента:**
```typescript
try {
  await api.post('/endpoint', data);
  // Успех - обновляем UI
} catch (err: any) {
  // Показываем пользователю
  alert(err.response?.data?.error || 'Ошибка операции');
  // Сбрасываем состояние загрузки
  setLoading(false);
}
```

**3. Паттерн универсального обработчика:**
```typescript
const performAction = async (action: () => Promise<any>) => {
  try {
    setIsActionLoading(true);
    await action();
    // Успех - возможно обновить данные
  } catch (err: any) {
    alert(err.response?.data?.error || 'Ошибка');
  } finally {
    setIsActionLoading(false);
  }
};

// Использование
performAction(() => api.post('/shifts/end'));
```

### Типы ошибок:
- **Сетевые ошибки** - нет соединения
- **HTTP ошибки** - 4xx, 5xx статусы
- **Бизнес ошибки** - валидация, ограничения
- **Ошибки парсинга** - невалидный JSON

## 🎨 Стилизация и UI паттерны

### TailwindCSS подход:
- Утилитарные классы вместо кастомных CSS
- Консистентная цветовая палитра
- Адаптивный дизайн
- Состояния (hover, focus, disabled)

### Компонентный подход:
- Базовые компоненты в ui.tsx
- Композиция сложных компонентов
- Переиспользование стилей через props

### Состояния загрузки:
- Индикаторы загрузки для всех async операций
- Состояние disabled во время загрузки
- Визуальная feedback для пользователя

## 🔧 Рекомендации по разработке

### Перед началом работы:
1. Изучите существующие компоненты и паттерны
2. Проверьте TypeScript типы в types.ts
3. Ознакомьтесь с API endpoints в constants.ts

### При создании компонентов:
1. Используйте существующие UI компоненты
2. Добавляйте TypeScript типы для props
3. Реализуйте состояния загрузки и ошибок
4. Тестируйте различные сценарии (успех/ошибка)

### Интеграция с API:
1. Используйте готовые методы из api.ts
2. Обрабатывайте ошибки на уровне компонента
3. Обновляйте состояние после успешных операций
4. Используйте паттерн loading/error состояния

---

*Этот файл поддерживается командой разработки LogiShift. Последнее обновление: Январь 2025*