# External Integrations

**Analysis Date:** 2026-01-28

## APIs & External Services

**Backend API:**
- API Endpoint: `https://pwa.kontrolsmen.ru/api/v1`
- Communication: REST API via fetch with axios
- Authentication: Bearer tokens stored in localStorage
- Timeout: 30-second timeout on all requests

**Categories:**
- **Authentication:**
  - Login: `/auth/login`
  - Onboard: `/auth/onboard`

- **Shift Management:**
  - Current shift: `/shifts/current`
  - Start shift: `/shifts/start`
  - End shift: `/shifts/end`
  - Manual shift: `/shifts/manual`
  - Update shift: `/shifts/{id}`

- **Fleet Management:**
  - Trucks: `/trucks`
  - Add truck: `/trucks`
  - Update truck: `/trucks/{id}`
  - Delete truck: `/trucks/{id}`

- **Sites Management:**
  - Sites: `/sites`
  - Add site: `/sites`
  - Update site: `/sites/{id}`
  - Delete site: `/sites/{id}`

- **User Management:**
  - Users: `/users` (note: not `/drivers`)
  - Update user: `/users/{id}`
  - Set menu ID: `/users/set-menu-id`

- **Admin Functions:**
  - Dashboard stats: `/dashboard/stats`
  - Admin stats: `/admin/stats`
  - Audit logs: `/audit`
  - Invites: `/invites`

- **Reports:**
  - Excel export: `/reports/excel`
  - Photos: `/reports/photos`
  - Export: `/reports/export`

- **Maintenance:**
  - Health check: `/health`
  - Cleanup: `/maintenance/cleanup`
  - Stuck shifts: `/shifts/stuck`
  - Reminders: `/shifts/reminder`

## Data Storage

**Databases:**
- Remote PostgreSQL database (backend)
- No direct database access from frontend
- User sessions stored in localStorage (temporal)

**File Storage:**
- Remote storage: `https://pwa.kontrolsmen.ru/uploads/`
- Frontend handles photo uploads via POST to `/shifts/photo`
- Network-only caching configured for /uploads/ endpoints

**Caching:**
- Service worker with NetworkFirst strategy for API calls
- Cache name: `api-cache`
- Max entries: 10
- Max age: 0 (disabled for fresh data)
- No server-side caching detected

## Authentication & Identity

**Auth Provider:**
- Custom JWT authentication
- Implementation: Manual login via `/auth/login`
- Token storage: localStorage (`logishift_auth_token`)
- User info storage: localStorage (`logishift_user_info`)

**User Roles:**
- DRIVER, FOREMAN, ADMIN (defined in src/types.ts)
- Role-based UI rendering in src/components/Dashboard.tsx
- Auto-logout on 401 responses

## Monitoring & Observability

**Error Tracking:**
- Custom error boundary at src/components/ErrorBoundary.tsx
- Console error logging
- No external error tracking service detected

**Logs:**
- Console logging for errors and debug information
- No centralized logging system

## CI/CD & Deployment

**Hosting:**
- Static files can be hosted on any CDN or static hosting
- No build-time dependencies beyond npm

**CI Pipeline:**
- No CI configuration detected
- Manual build with `npm run build`
- Preview with `npm run preview`

## Environment Configuration

**Required env vars:**
- No environment files detected
- Gemini API key expected via `process.env.API_KEY` (used in src/services/geminiService.ts)

**Secrets location:**
- Backend API endpoints hardcoded
- API key for Gemini AI configured in service
- No other secrets required in frontend

## Webhooks & Callbacks

**Incoming:**
- No webhook endpoints detected (client-only application)
- No server-side routes for incoming webhooks

**Outgoing:**
- No outgoing webhook functionality
- API calls only to backend endpoints

## AI Integration

**Google Gemini AI:**
- SDK: @google/genai 1.34.0
- Service: `gemini-3-flash-preview` model
- Purpose: Logistics insights and analytics
- Configuration: Process.env.API_KEY expected
- Usage: Via src/services/geminiService.ts

## Media & Assets

**Icons:**
- Lucide React icons used throughout UI
- Custom icons defined in design system

**Photos:**
- Uploads handled via FormData to `/shifts/photo`
- Photo paths normalized from Windows backslashes to URLs
- Direct access to static base URL for uploaded content

---

*Integration audit: 2026-01-28*
*Note: No database integration at frontend level*
*No external payment or third-party service integrations*
*AI integration limited to Gemini for analytics*