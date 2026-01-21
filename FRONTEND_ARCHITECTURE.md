# LogiShift Frontend - Architecture Documentation

## Overview

LogiShift Frontend is a Progressive Web App (PWA) built with React 18, Vite, and TailwindCSS. It provides a modern interface for shift management of heavy machinery operators, communicating with the backend API through REST endpoints.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND APP                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    REACT 18 + VITE                        │  │
│  │  - React Router (SPA navigation)                          │  │
│  │  - TailwindCSS (styling)                                  │  │
│  │  - Lucide Icons (UI components)                           │  │
│  └──────────────┬───────────────────────────────────────────┘  │
│                 │                                                   │
│  ┌──────────────▼───────────────────────────────────────────┐  │
│  │              STATE MANAGEMENT                             │  │
│  │  - AuthContext (authentication)                          │  │
│  │  - useState/useEffect (local state)                       │  │
│  │  - localStorage (session persistence)                     │  │
│  └──────────────┬───────────────────────────────────────────┘  │
│                 │                                                   │
│  ┌──────────────▼───────────────────────────────────────────┐  │
│  │                   API SERVICE                             │  │
│  │  - api.ts (centralized HTTP client)                       │  │
│  │  - JWT token management                                  │  │
│  │  - Error handling (401, 403, etc.)                        │  │
│  └──────────────┬───────────────────────────────────────────┘  │
└────────────────┼───────────────────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────────────────┐
│              BACKEND API (HTTPS://pwa.kontrolsmen.ru/api/v1)   │
│  - JWT Authentication                                          │
│  - REST Endpoints (shifts, trucks, sites, users)              │
│  - Multi-tenant isolation                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Technologies & Libraries

### Core Framework
- **React 18** - UI library with hooks
- **Vite 5** - Build tool and dev server
- **TypeScript 5** - Type-safe JavaScript

### Styling
- **TailwindCSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **Animate.css** (via Tailwind animations)

### State Management
- **React Context API** - Authentication state (AuthContext)
- **React Hooks** - useState, useEffect, useCallback, useRef

### HTTP Client
- **Fetch API** - Native browser API (wrapped in api.ts)

### PWA Features
- **Manifest** - PWA installation
- **Service Worker** - Offline support (future)

## Project Structure

```
logishift-frontend/
├── public/
│   └── manifest.json              # PWA manifest
├── src/
│   ├── components/
│   │   ├── Layout.tsx             # Main layout with sidebar
│   │   ├── Dashboard.tsx          # Dashboard (admin + driver)
│   │   ├── Shifts.tsx             # Shifts registry
│   │   ├── Drivers.tsx            # Drivers management
│   │   ├── Fleet.tsx              # Trucks management
│   │   ├── Objects.tsx            # Sites management
│   │   ├── Settings.tsx           # Tenant settings
│   │   ├── AuditLogs.tsx          # Audit log viewer
│   │   ├── AIAssistant.tsx        # AI chat widget
│   │   ├── Login.tsx              # Login component
│   │   ├── ui.tsx                 # Reusable UI components
│   │   └── ErrorBoundary.tsx      # Error handling
│   ├── views/
│   │   ├── LoginView.tsx          # Login page
│   │   ├── DriverView.tsx         # Driver-specific view
│   │   └── AdminView.tsx          # Admin-specific view
│   ├── context/
│   │   └── AuthContext.tsx        # Authentication context
│   ├── services/
│   │   ├── api.ts                 # API client (HTTP)
│   │   └── geminiService.ts       # AI service integration
│   ├── constants.ts               # API endpoints and config
│   ├── types.ts                   # TypeScript interfaces
│   ├── main.tsx                   # App entry point
│   └── App.tsx                    # Root component
├── index.html                     # HTML entry point
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── tailwind.config.js             # Tailwind config
└── vite.config.ts                 # Vite config
```

## Core Components & Modules

### 1. API Service (`src/services/api.ts`)

Centralized HTTP client for backend communication.

**Key Features:**
- JWT token management (localStorage)
- Automatic token injection (Authorization header)
- Error handling (401 redirect, 403 handling)
- Request timeout (30s)

**Methods:**
```typescript
loginUser(login, password)    // Authentication
apiRequest(endpoint, options)  // Generic request wrapper
get(url, params)               // GET requests
post(url, body)                // POST requests
patch(url, body)               // PATCH requests
del(url)                       // DELETE requests
getUserInfo()                  // Get user from localStorage
setUserInfo(user)              // Save user to localStorage
clearAuth()                    // Clear auth data
getAuthToken()                 // Get JWT token
setAuthToken(token)            // Save JWT token
```

### 2. Authentication Context (`src/context/AuthContext.tsx`)

React Context for managing authentication state.

**State:**
```typescript
{
  user: User | null;
  loading: boolean;
  login(token: string, user: User): Promise<void>;
  logout(): void;
}
```

**Features:**
- Session persistence (localStorage)
- Auto-login on app load
- Logout with full state cleanup

### 3. Layout (`src/components/Layout.tsx`)

Main application layout with responsive sidebar.

**Features:**
- Responsive sidebar (mobile toggle)
- Role-based navigation (admin/foreman/driver)
- User info display
- Logout functionality

**Navigation Items:**
- Dashboard - Main statistics
- Shifts - Shift registry
- Drivers - Personnel management (admin/foreman)
- Fleet - Trucks management (admin)
- Objects - Sites management (admin/foreman)
- Audit Logs - System events (admin)
- Settings - Tenant settings (admin)

### 4. Dashboard (`src/components/Dashboard.tsx`)

Main dashboard component with role-based views.

**Admin View:**
- Active shifts counter
- Active drivers counter
- Manual shift creation button
- Usage limits cards (trucks, drivers, sites)
- Active shifts list with details
- Manual shift modal (driver, truck, site selection)

**Driver View:**
- State machine based UI
- Shift start workflow (truck → site selection)
- Active shift display with timer
- Photo upload (odometer, invoice)
- Shift end button

**Driver States:**
- `idle` - Resting, ready to start
- `selecting_truck` - Choosing truck
- `selecting_site` - Choosing site
- `awaiting_odo_start` - Waiting for odometer start photo
- `active` - Shift in progress
- `awaiting_odo_end` - Waiting for odometer end photo
- `awaiting_invoice` - Waiting for invoice photo

### 5. Shifts Registry (`src/components/Shifts.tsx`)

Shift history viewer with photo links.

**Features:**
- Filter by role (admin sees all, driver sees own)
- Status badges (active, pending_invoice, finished)
- Photo links (odometer start/end, invoice)
- Responsive table layout
- Mobile-optimized (hide columns on small screens)

### 6. Drivers Management (`src/components/Drivers.tsx`)

Personnel management for admins/foremen.

**Features:**
- Driver list with status
- Invite link generation
- Driver editing (name, role, hourly rate)
- Activity tracking

### 7. Fleet Management (`src/components/Fleet.tsx`)

Truck management for admins.

**Features:**
- Truck list with status (busy/free)
- Add/Edit/Delete trucks
- Toggle busy status (force free)
- Active/inactive status

### 8. Objects Management (`src/components/Objects.tsx`)

Site management for admins/foremen.

**Features:**
- Site list with requirements
- Add/Edit/Delete sites
- Odometer required toggle
- Invoice required toggle
- Active/inactive status

### 9. Settings (`src/components/Settings.tsx`)

Tenant settings for admins.

**Features:**
- Company name
- Timezone selection
- Save with API call

### 10. Audit Logs (`src/components/AuditLogs.tsx`)

System event viewer for admins.

**Features:**
- Event log with timestamps
- Action badges (SHIFT, DELETE, etc.)
- Performed by user tracking
- CSV export (future)

### 11. AI Assistant (`src/components/AIAssistant.tsx`)

AI-powered chat widget for insights.

**Features:**
- Floating chat button
- Message history
- Loading states
- Gemini AI integration (geminiService.ts)

## API Integration

### Authentication Flow

```typescript
1. User enters credentials → loginUser(email, password)
2. Backend validates → Returns JWT + user data
3. Store token → localStorage.setItem(TOKEN_KEY, token)
4. Store user → localStorage.setItem(USER_KEY, JSON.stringify(user))
5. Update context → setAuthUser(user)
6. All requests → Include Authorization: Bearer <token>
```

### Protected Routes

All API requests include JWT token automatically:

```typescript
headers: {
  "Authorization": `Bearer ${token}`,
  "Content-Type": "application/json"
}
```

### Error Handling

- **401 Unauthorized** → Auto-logout, redirect to login
- **403 Forbidden** → Show error message (limit reached, no access)
- **Network Error** → Show error message
- **Timeout (30s)** → Show timeout message

## State Management

### Local State (useState)

Used for component-specific state:
- Form inputs
- Modal visibility
- Loading states
- Selected items

### Global State (AuthContext)

Used for app-wide authentication:
- Current user
- Authentication status
- Login/logout functions

### Persistence (localStorage)

Used for session persistence:
- JWT token (`logishift_auth_token`)
- User info (`logishift_user_info`)

## Responsive Design

### Breakpoints

- **Mobile**: < 768px (single column, hidden sidebar)
- **Tablet**: 768px - 1024px (two columns)
- **Desktop**: > 1024px (three columns, visible sidebar)

### Mobile UX

- Hamburger menu for sidebar toggle
- Full-width cards
- Hidden table columns
- Touch-friendly buttons

## Type Definitions (`src/types.ts`)

### User

```typescript
interface User {
  id: number;
  full_name: string;
  role: UserRole;
  current_state: DriverState;
  tenant_id: number;
}
```

### Shift

```typescript
interface Shift {
  id: number;
  start_time: string;
  end_time?: string;
  started_at?: string;
  status: string | ShiftStatus;
  driver_name?: string;
  vehicle_plate?: string;
  work_object?: string;
  truck?: { name: string; plate: string };
  site?: { name: string; odometer_required: boolean; invoice_required: boolean };
  tenant?: { invoice_required: boolean };
  odometer_start?: number;
  odometer_finish?: number;
  invoice_url?: string;
  photo_start_url?: string;
  photo_end_url?: string;
  photo_invoice_url?: string;
}
```

### Enums

```typescript
enum UserRole {
  DRIVER = "driver",
  FOREMAN = "foreman",
  ADMIN = "admin",
}

enum DriverState {
  IDLE = "idle",
  PENDING_TRUCK = "pending_truck",
  PENDING_SITE = "pending_site",
  AWAITING_ODO_START = "awaiting_odo_start",
  ACTIVE = "active",
  AWAITING_ODO_END = "awaiting_odo_end",
  AWAITING_INVOICE = "awaiting_invoice",
}

enum ShiftStatus {
  ACTIVE = "active",
  PENDING_INVOICE = "pending_invoice",
  FINISHED = "finished",
}
```

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/onboard` - Self-registration

### Dashboard
- `GET /dashboard/stats` - Dashboard statistics

### Shifts
- `GET /shifts` - Recent shifts list
- `GET /shifts/current` - Current active shift
- `POST /shifts/start` - Start new shift
- `POST /shifts/end` - End shift
- `POST /shifts/photo` - Upload shift photo
- `POST /shifts/manual` - Create manual shift (admin)

### Trucks
- `GET /trucks` - List trucks
- `POST /trucks` - Add truck (admin)
- `PATCH /trucks/:id` - Update truck (admin)
- `DELETE /trucks/:id` - Delete truck (admin)

### Sites
- `GET /sites` - List sites
- `POST /sites` - Add site (admin/foreman)
- `PATCH /sites/:id` - Update site (admin/foreman)
- `DELETE /sites/:id` - Delete site (admin/foreman)

### Users
- `GET /users` - List users (admin)
- `POST /users` - Add user (admin)
- `PATCH /users/:id` - Update user (admin)
- `POST /invites` - Generate invite link (admin)

### Reports
- `GET /reports/excel` - Download Excel report
- `GET /reports/photos` - Get photos archive
- `GET /reports/export` - Export shifts as JSON

### Audit
- `GET /audit` - Get audit logs (admin)

### Tenant Settings
- `GET /tenant/settings` - Get tenant settings
- `PATCH /tenant/settings` - Update tenant settings (admin)

## Security

### Token Storage
- JWT token stored in localStorage
- Auto-injected in all API requests
- Cleared on logout

### Token Validation
- Backend validates token on each request
- 401 error triggers auto-logout
- Token expiration: 12 hours (same as backend)

### Role-Based Access Control (RBAC)

| Role | Dashboard | Shifts | Drivers | Fleet | Objects | Audit | Settings |
|------|-----------|--------|---------|-------|---------|-------|----------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Foreman | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Driver | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Performance Considerations

### Optimizations
- Lazy loading components (future)
- React.memo for expensive components (future)
- Debounced search inputs (future)
- Pagination for large lists (future)

### Best Practices
- Use useCallback for event handlers
- Use useMemo for expensive calculations
- Clean up useEffect (return cleanup function)
- Avoid unnecessary re-renders

## Build & Deployment

### Development
```bash
npm run dev
```
Runs Vite dev server at http://localhost:5173

### Production Build
```bash
npm run build
```
Creates optimized production build in `dist/`

### Preview Production Build
```bash
npm run preview
```
Serves production build locally

### Deployment

The app is a static PWA that can be deployed to:
- Netlify
- Vercel
- GitHub Pages
- Any static file hosting

## Future Enhancements

1. **Offline Support**
   - Service Worker implementation
   - Offline data caching
   - PWA installation

2. **Real-time Updates**
   - WebSocket integration
   - Live shift status updates
   - Real-time notifications

3. **Performance**
   - Component lazy loading
   - React.memo optimization
   - Virtual scrolling for large lists

4. **Features**
   - Map view for trucks
   - Driver GPS tracking
   - Advanced reporting
   - Push notifications
