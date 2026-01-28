# Technology Stack

**Analysis Date:** 2026-01-28

## Languages

**Primary:**
- TypeScript 5.2.2 - Main language for all source code (src/)
- JavaScript (ES2020) - Transpiled target, supported in all browsers

**Secondary:**
- JSX/TSX - Used for React component syntax
- CSS - Tailwind CSS classes and custom styles

## Runtime

**Environment:**
- Browser-based (Client-side only)
- No Node.js runtime dependency

**Package Manager:**
- npm (Node Package Manager)
- Lockfile: Not present (dependencies installed via package.json)

## Frameworks

**Core:**
- React 18.2.0 - UI framework for building components
- React DOM 18.2.0 - DOM rendering for React
- Vite 5.0.8 - Build tool and development server

**Testing:**
- No testing framework detected (no Jest, Vitest, etc.)

**Build/Dev:**
- @vitejs/plugin-react 4.2.1 - React plugin for Vite
- TypeScript 5.2.2 - TypeScript compiler
- Tailwind CSS 3.4.0 - Utility-first CSS framework
- PostCSS 8.4.32 - CSS transformation tool
- Autoprefixer 10.4.16 - CSS vendor prefixing

## Key Dependencies

**Critical:**
- axios 1.6.2 - HTTP client for API requests (used in src/services/api.ts)
- dayjs 1.11.19 - Date manipulation library
- lucide-react 0.294.0 - Icon library for UI components

**Infrastructure:**
- vite-plugin-pwa 0.17.4 - Progressive Web App plugin
- recharts 2.10.3 - Charting library for data visualization
- @google/genai 1.34.0 - Google Gemini AI integration

## Configuration

**Environment:**
- No environment files detected (.env, .env.local, etc.)
- API endpoints hardcoded in src/constants.ts
- Gemini API key configuration in geminiService.ts (process.env.API_KEY)

**Build:**
- vite.config.ts - Vite configuration with PWA settings
- tsconfig.json - TypeScript compiler configuration
- tailwind.config.js - Tailwind CSS configuration
- tsconfig.node.json - TypeScript configuration for Node.js build tools

## Platform Requirements

**Development:**
- Node.js (v18+ required for Vite)
- npm
- Modern web browser

**Production:**
- Modern web browser (ES2020 support)
- HTTPS required for PWA service worker
- No server-side requirements (static hosting)

## PWA Configuration

- Manifest: "LogiShift Driver" with standalone display mode
- Service worker with NetworkFirst caching for API calls
- Network-only caching for /uploads/ endpoints
- Portrait orientation preference
- Custom icons and theme colors configured

---

*Stack analysis: 2026-01-28*
*Note: Testing framework and environment configuration files not detected*
*Authentication handled via JWT tokens stored in localStorage*
*Backend API integration at https://pwa.kontrolsmen.ru/api/v1*