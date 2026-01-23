# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LogiShift is a PWA (Progressive Web App) for logistics/driver shift management. It's a React + TypeScript + Vite application that connects to a backend API at `https://pwa.kontrolsmen.ru/api/v1`.

The application has two distinct interfaces:
- **Admin/Foreman View**: Dashboard with statistics, fleet management, site management, driver management, and shift history
- **Driver View**: State-machine based interface for starting shifts, uploading photos (odometer/invoice), and ending shifts

## Commands

```bash
# Development
npm run dev          # Start dev server on port 5173

# Production build
npm run build        # Build for production
npm run preview      # Preview production build locally
```

## Architecture

### Authentication & Authorization

- JWT-based auth via `src/context/AuthContext.tsx`
- Token and user info stored in localStorage (`logishift_auth_token`, `logishift_user_info`)
- User roles: `DRIVER`, `FOREMAN`, `ADMIN` (defined in `src/types.ts`)
- Auth state syncs with backend and auto-logs out on 401 responses

### API Layer (`src/services/api.ts`)

- `apiRequest()` - Centralized fetch wrapper with 30s timeout, auth headers, error handling
- Helper methods: `get()`, `post()`, `patch()`, `del()`
- Auto-clears auth and reloads on 401
- `getPhotoUrl()` - Converts photo paths from backend to full URLs

### State Machine (Driver Flow)

The driver experience is driven by a state machine defined in `src/types.ts`:
- `idle` → Driver selects truck & site
- `awaiting_odo_start` → Upload odometer photo (before work)
- `active` → Shift in progress with elapsed timer
- `awaiting_odo_end` → Upload odometer photo (after work)
- `awaiting_invoice` → Upload invoice photo

State transitions are managed via API endpoints:
- `POST /shifts/start` - Starts a shift (truck_id, site_id)
- `POST /shifts/photo` - Uploads photo (FormData)
- `POST /shifts/end` - Ends the shift

### Components Structure

- `src/App.tsx` - Main app with tab navigation (dashboard, shifts, drivers, fleet, objects, settings, audit)
- `src/views/DriverView.tsx` - Simplified driver-only view (mobile-first)
- `src/views/AdminView.tsx` - Admin-only view with stats
- `src/components/Dashboard.tsx` - Role-based UI: admin stats OR driver state machine
- `src/components/Layout.tsx` - Navigation shell (sidebar/tabs)

### Key Constants

API endpoints defined in `src/constants.ts`:
- `/shifts/current` - Get active shift for current user
- `/shifts/start` - Start shift
- `/shifts/end` - End shift
- `/shifts/photo` - Upload photo
- `/shifts/manual` - Admin: manually create shift
- `/trucks` - Fleet management
- `/sites` - Work sites management
- `/users` - Driver management (note: not `/drivers`)
- `/dashboard/stats` - Admin statistics

### PWA Configuration

Configured in `vite.config.ts` with `vite-plugin-pwa`:
- Manifest: "LogiShift Driver"
- NetworkFirst caching for API calls
- Standalone display mode, portrait orientation

### Styling

- Tailwind CSS + custom styles in `src/index.css`
- Design system: indigo/slate color palette, rounded-3xl cards
- Mobile-first responsive design

## Development Notes

- The app uses `window.location.reload()` after state-changing actions to ensure clean state sync
- Photo paths from backend use Windows backslashes (`\`) - `getPhotoUrl()` normalizes these
- Empty API responses return text, non-JSON responses handled gracefully
- Driver state can get out of sync - `refreshStatus()` in Dashboard syncs state with DB
- Admin can create manual shifts via modal (filters for idle drivers, free trucks, active sites)
