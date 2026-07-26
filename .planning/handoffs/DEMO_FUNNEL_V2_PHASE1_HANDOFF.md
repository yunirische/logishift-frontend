# Demo Funnel V2 Phase 1 Handoff

## Scope

- Branch: `feat/demo-funnel-v2-phase1-shared-state`
- Frontend baseline: `04dc906ef8125a70a3f5465a78fc084bc3bef6ef`
- Commit message: `feat(demo): share synthetic shifts across roles`
- Architecture: frontend-only isolated `DemoSessionStore`
- Backend, schema, migrations, API contracts, registration, attribution,
  funnel events, guided flow, CTA, photos, and comments are unchanged.

## Changed files

- `src/lib/demoSession.ts`: typed state, validation, persistence, TTL, and
  synthetic shift helpers.
- `src/context/DemoSessionContext.tsx`: React context/reducer and lifecycle
  actions.
- `src/App.tsx`: provider placement inside `AuthProvider`.
- `src/context/AuthContext.tsx`: explicit demo logout cleanup.
- `src/views/DriverView.tsx`: demo start/finish and synthetic driver history.
- `src/components/Dashboard.tsx`: non-mutating active-shift projection.
- `src/components/Shifts.tsx`: active/finished registry projections and
  disabled synthetic write actions.
- Focused tests under the corresponding `src/**/__tests__` directories.
- This handoff.

## Store contract

- Storage key: `logishift_demo_session_v1`
- Payload version: `1`
- TTL: four hours
- State: one active synthetic shift plus finished synthetic shifts.
- Synthetic ID: `demo-shift:<uuid>` (timestamp/random fallback where
  `crypto.randomUUID` is unavailable). It cannot be confused with a numeric
  backend shift ID.
- Storage is read and written in `src/lib/demoSession.ts` only.
- Invalid JSON, malformed payloads, expired payloads, and version mismatches
  are removed safely.
- Initialization removes only obsolete keys matching
  `logishift_active_shift_demo*`; persona and unrelated storage keys remain.

## Lifecycle

- Reload restores the same browser-local scenario within the TTL.
- Ordinary admin/driver role switching does not reset the store.
- `?enterDemo=1` on the demo host resets the previous scenario.
- Explicit demo logout clears the store.
- Tab changes and background/foreground transitions do not clear it.
- Real-tenant session storage and auth semantics are not changed.
- Cross-device continuity is intentionally unsupported.

## Projections

### DriverView

Demo start creates a typed synthetic shift from the selected seeded
driver/truck/site. Demo finish moves it from active state to finished
synthetic history. Real-tenant start/end and history APIs are unchanged.

### Dashboard

The active synthetic shift is prepended to seeded demo active-shift details
without mutating the server response. Active shift/driver counts increase only
when the same driver/truck/site tuple is not already present. Billing, usage,
onboarding, and `totalShifts` remain server-derived.

### Shifts registry

Active and finished synthetic shifts are projected ahead of seeded server
rows, honor existing filters, and are marked `Демонстрационная смена`.
Synthetic edit actions are unavailable. Server pagination remains the source
of truth, and export remains server-only, so synthetic rows are not exported.

## Verification

- Focused tests: PASS — 6 files, 34 tests.
- Full frontend tests: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS before final commit.
- Final secret and forbidden-scope scans are required immediately before
  commit.

## Known limitations

- Photos and comments are not shared or simulated.
- Site proof/photo requirements are not expanded or worked around.
- There is no cross-device continuity.
- There are no funnel analytics.
- CTA, registration, attribution handoff, and auto-login are unchanged.
- TTL is browser-local; backend cleanup does not exist because no backend
  session or record is created.

## Phase 2 dependency

Phase 2 must establish a no-write, browser-local photo/comment simulation
contract, cover preview and cleanup, and prove that tenant `999` never reaches
upload/comment writes. It must not introduce backend demo sessions or shared
tenant data.

**PHASE 1 MUST NOT BE DEPLOYED WITHOUT PHASE 2.**

No merge to frontend `main` and no deployment are part of this handoff.
