# Demo Funnel V2 Phase 2 Handoff

## Scope and baselines

- Main/frontend baseline:
  `04dc906ef8125a70a3f5465a78fc084bc3bef6ef`
- Phase 1 base:
  `b1f8a2fb2045a3f70a473a393b99341c1956d028`
- Phase 2 branch:
  `feat/demo-funnel-v2-phase2-local-media-comments`
- Phase 2 commit: the commit carrying this handoff, with message
  `feat(demo): simulate shift media and comments locally`
- Backend, schema, migrations, API contracts, registration, attribution,
  analytics, landing, billing, entitlements, Docker, Caddy, and environment
  configuration are unchanged.

## Combined Package A diff from main

Package A is the complete frontend gap from the main baseline through the
Phase 2 commit. It contains:

- `.planning/handoffs/DEMO_FUNNEL_V2_PHASE1_HANDOFF.md`
- `.planning/handoffs/DEMO_FUNNEL_V2_PHASE2_HANDOFF.md`
- `src/App.tsx`
- `src/__tests__/App.test.tsx`
- `src/components/Dashboard.tsx`
- `src/components/DriverShiftHistoryCard.tsx`
- `src/components/FinishedShiftPhotos.tsx`
- `src/components/DemoPhotoPreviewDialog.tsx`
- `src/components/Shifts.tsx`
- `src/components/__tests__/Dashboard.test.tsx`
- `src/components/__tests__/Shifts.test.tsx`
- `src/context/AuthContext.tsx`
- `src/context/DemoSessionContext.tsx`
- `src/context/__tests__/AuthContext.test.tsx`
- `src/context/__tests__/DemoSessionContext.test.tsx`
- `src/lib/demoSession.ts`
- `src/lib/__tests__/demoSession.test.ts`
- `src/views/DriverView.tsx`
- `src/views/__tests__/DriverView.test.tsx`

No dependency or package-lock change is included.

## Phase 1 Dashboard correction

Phase 1 compared a synthetic shift with seeded server rows by displayed
driver, truck, and site names. Phase 2 removes that name-based suppression.
Each server response remains unchanged and exactly one store-owned row with a
`demo-shift:*` identity is projected over it. Counts increase once per
synthetic active shift, including when a seeded row has identical visible
names. Rerenders and polling project again from the unmodified server
snapshot, so they do not accumulate duplicates.

## Store schema v2

- Storage key: `logishift_demo_session_v2`
- Payload version: `2`
- TTL: four hours
- The Phase 1 key `logishift_demo_session_v1` and obsolete per-driver active
  keys are removed without migrating their undeployed data.
- Workflow statuses: `active`, `awaiting_odo_start`,
  `awaiting_odo_end`, `awaiting_invoice`, `finished`.
- Persisted site requirements: `odometerRequired` and `invoiceRequired`.
- Persisted photo data is limited to type, filename, MIME type, byte size, and
  timestamp.
- Comments are trimmed and bounded by the existing 1000-character limit.
- Invalid status, requirement, comment, photo, version, or TTL data resets the
  payload safely.

The store rejects unknown synthetic IDs and invalid workflow transitions. A
finished shift can receive an explicitly requested local comment or required
history photo; other arbitrary partial mutations are not exposed.

## Workflow state machine

```text
start without odometer -> active
start with odometer -> awaiting_odo_start -> start photo -> active

finish without requirements -> finished
active + odometer -> awaiting_odo_end
awaiting_odo_end + end photo + no invoice -> finished
awaiting_odo_end + end photo + invoice -> awaiting_invoice
active + invoice only -> awaiting_invoice
awaiting_invoice + invoice photo -> finished
```

Invoice-before-end-photo and finish-before-required-proof transitions are
rejected.

## Comment simulation

- Active and finished `demo-shift:*` comments update only DemoSessionStore.
- The existing trim and maximum-length checks remain.
- Seeded tenant-999 rows never call the comment endpoint; the UI explains
  that seeded test data cannot be changed.
- Real-tenant `ADD_SHIFT_COMMENT` behavior is unchanged.
- String synthetic IDs are handled explicitly before the numeric real API
  branch.

## Photo metadata and ephemeral previews

- Existing `validatePhotoFile` runs before either demo or real behavior.
- For synthetic shifts, the validated `File` is passed only to the provider.
- `URL.createObjectURL` previews and `File` objects remain page-memory only.
- Replacing a preview revokes the old URL.
- Reset, explicit logout, new-entry reload/unmount, and provider unmount
  revoke all remaining URLs.
- No File, Blob, base64 value, object URL, or image byte is serialized.
- After reload, metadata remains within TTL and the UI shows:
  `Демонстрационное фото добавлено, локальный предпросмотр завершён после перезагрузки.`
- The shared preview dialog has keyboard focus, Escape support, an accessible
  close button, and explicit local/demo copy.

Synthetic finished-shift backfill reuses the existing validation form and
stores metadata locally. Seeded demo rows are read-only.

## No-write proof

Focused tests assert that tenant-999 synthetic actions do not invoke:

- `fetch(API_ENDPOINTS.UPLOAD_PHOTO, ...)`
- `api.post(API_ENDPOINTS.ADD_SHIFT_COMMENT(...))`
- `api.postFormData(...)`
- `openShiftFilePreview(...)`

Demo branches occur before FormData or write-request construction. Registry
and DriverView synthetic previews read only the memory registry. Existing
tenant-999 seeded photo controls remain non-writing. Real-tenant comment,
photo upload, and finished-photo backfill regression tests retain their
existing endpoints.

## Cross-role result

- DriverView owns the guided-by-status start/photo/comment/finish interaction.
- Dashboard projects the same active synthetic identity and correct count.
- Shifts shows active/finished synthetic rows and local photo indicators while
  preserving seeded rows and server pagination.
- Finished driver history shows the same comments and proof metadata.
- Synthetic rows remain excluded from server Excel/ZIP exports and editing.

## Verification

- Focused Phase 1 + Phase 2 tests: PASS — 6 files, 46 tests.
- Full frontend tests: PASS — 27 files, 152 tests.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS before handoff.
- Final secret, forbidden-scope, write-call, and combined-gap scans are
  required immediately before commit.

## Local smoke

Status: **NOT PERFORMED**.

The local Vite server was configured with an unreachable localhost API origin,
so no production endpoint could be reached. The available in-app browser
failed during browser-runtime initialization before a page could be opened.
No product scenario or server data was created. Automated component/store
tests cover both requested scenarios and the zero-write boundary, but this is
not reported as a browser smoke PASS.

Manual checklist required for owner review:

1. Start the frontend against a stub/local read-only API and open demo.
2. Scenario A: choose a site without proof requirements, start, comment,
   switch to admin Dashboard and registry, return to driver, finish, and
   confirm finished history.
3. Scenario B: choose an odometer+invoice site, add start photo, request
   finish, add end photo, add invoice photo, then verify finished status,
   registry indicators, and history.
4. Open one current-page preview and close it by button and Escape.
5. Reload and verify metadata-only copy without a broken image.
6. In DevTools Network, verify zero photo/comment write requests and zero
   synthetic preview API requests.
7. Verify the same actions for a real tenant still use the existing API only
   in an isolated non-production environment.

## Corrective role-switch smoke — 2026-07-27

- The initial automated Package A smoke reproduced `FAIL_ROLE_SWITCH` on
  `1743a18d7c743c69b644f9ff7f9120a1a7945e30`: `DemoBanner` changed only the
  demo persona, leaving `activeTab` as `my-shifts`. That tab is valid for an
  admin, so the allowed-tab guard deliberately did not redirect it and
  `DriverView` remained rendered.
- Corrective commit `50dd51a2842c2601b4503bec79d54ed0189f2cd3`
  (`fix(demo): restore admin dashboard after role switch`) routes a genuine
  demo persona transition explicitly: admin → driver opens `my-shifts`, and
  driver → admin opens `dashboard`. Re-clicking the current persona is a
  no-op, so an admin on another admin tab is not redirected. The handler does
  not reset DemoSessionStore.
- App-level regression tests cover both directions, a repeated active-persona
  click, preservation of the persisted demo session value, and a persisted
  driver persona returning to Dashboard through the UI. The focused Package A
  tests, full frontend suite, TypeScript check, and production build passed.
- Repeated automated smoke evidence:
  `C:\logishift\smoke-tools\demo-package-a\artifacts\20260727-134804`.
  Stage 1 passed: initial admin Dashboard, admin → driver, and driver → admin
  all rendered correctly. Stage 2 reached the finished workflow but stopped
  when DriverView did not visibly render the persisted synthetic comment after
  finish. No forbidden write attempt or relay-blocked call was observed. This
  is recorded as `FAIL_SHIFT_WORKFLOW`; it was not changed by this narrowly
  scoped role-switch correction.

## Limitations and Phase 3 boundary

- Browser state has no cross-device continuity.
- Original local photo preview ends after reload.
- There is no guided scenario, CTA, registration/attribution change, funnel
  analytics, or landing change.
- A real visitor-eye manual smoke remains required before production
  readiness can be decided.
- Phase 3 may add lightweight guidance only after owner review; it must not
  add a guided-tour dependency or change this no-write contract.

**PHASE 1 AND PHASE 2 MUST BE MERGED AND DEPLOYED TOGETHER.**

No merge to frontend `main`, deployment, or Phase 3 work is part of this
handoff.
