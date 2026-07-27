# Demo Funnel V2 Phase 3 Handoff

## Baseline and scope

- Frontend baseline: `9cd4bd91bc137def1a39d4950c2234aca7d01569`
- Phase 3 branch:
  `feat/demo-funnel-v2-phase3-guided-scenario`
- Product commit: `e75b95c7a82997a258295a798c2806ac714a4974`
- Backend remains unchanged at
  `eea675e214c6a3d77fe3a1e84758882352579b7f`.
- Package A remains the source of truth for the browser-local synthetic shift,
  comments, photo metadata and previews, cross-role projections, and reload
  persistence.

Phase 3 adds only lightweight guidance for the existing public demo
workflow. It does not change DemoSessionStore, backend/API behavior,
registration, attribution, analytics, the landing page, dependencies, or
real-tenant workflow.

## Product contract

`DemoScenarioGuide` is rendered directly below the existing `DemoBanner`
inside the shared demo layout. It is available only for demo tenant `999`;
real tenants do not render it.

The compact card shows one current step, `Шаг N из 5`, one primary action, and
an optional collapse control:

1. Admin opens driver mode through the existing persona transition handler.
2. Driver selects `КамАЗ 65115` and `ЖК Северный`; the guide only links to the
   existing selection block and never starts a shift.
3. The guide reflects `awaiting_odo_start`, active-without-comment, and
   active-with-comment states, then offers the existing admin transition.
4. Admin sees a short driver/truck/site/status summary and returns through the
   existing driver transition.
5. Driver finishes the existing proof workflow; a finished synthetic shift
   offers the admin result, where the guide reports completion and can open
   the registry.

The guide does not use export and does not imply that a synthetic shift,
comment, or photo is persisted on the server.

## State derivation

Progress is derived from:

- current demo persona and active tab;
- `DemoSessionContext.activeShift`;
- valid `demo-shift:*` entries in `finishedShifts`;
- workflow status;
- comment presence;
- existing photo metadata.

The latest finished synthetic shift is selected by `finishedAt`, falling back
to `startedAt`. Seeded server history cannot complete the guide.

No progress number, shift copy, comment, photo, token, or credential is stored
by the guide. Collapse state is component-local only. One component-local
active-shift identifier records that the current page lifecycle has displayed
the active shift to the admin; it is not persisted and cannot replace
DemoSessionState. After reload, the guide derives the safe current step again
from store state and persona.

An explicit `?enterDemo=1` continues to reset DemoSessionStore through the
existing Package A lifecycle. Role switching, tab changes, collapse, and
reload do not reset the scenario.

## Navigation and accessibility

- All persona changes use the existing typed App transition contract.
- Tab changes use the existing `setActiveTab` contract.
- In-page actions use native anchors to three stable DriverView sections;
  they do not invoke DOM clicks, force navigation, reload, or write state.
- Current-step text uses `aria-live="polite"` and `aria-atomic`.
- Collapse exposes `aria-expanded` and `aria-controls`.
- Buttons and links retain visible keyboard focus, and the guide does not
  move focus on state updates.

## Changed files

- `src/components/DemoScenarioGuide.tsx` — state derivation, copy, summary,
  progress, and narrow navigation actions.
- `src/components/Layout.tsx` — demo-only guide placement.
- `src/views/DriverView.tsx` — native in-page targets for existing selection,
  workflow, and action sections.
- `src/components/__tests__/DemoScenarioGuide.test.tsx` — focused state,
  navigation, reload, real-tenant, and accessibility coverage.
- `src/components/__tests__/Layout.test.tsx` — demo-only placement coverage.
- `src/__tests__/App.test.tsx` — App persona transition integration coverage.

No dependency, package-lock, environment, config, backend, schema, migration,
or API-contract file changed.

## Verification

- Phase 3 focused tests: 3 files, 31 tests passed.
- Package A focused regression: 7 files, 60 tests passed.
- Full frontend suite: 28 files, 172 tests passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.
- Secret-pattern scan: zero findings.
- Forbidden-scope scan: zero unexpected paths.
- Added write-call scan: zero added write calls. Existing real-tenant
  DriverView API branches remain unchanged.

## Local browser smoke

Final exact-product-commit evidence:

`C:\logishift\smoke-tools\demo-package-b\artifacts\20260727-211558`

The smoke used a new ephemeral Edge context, standard `enterDemo=1`, the
test-only demo hostname adapter, and the unchanged read-only relay safety
contract.

Result: `PHASE3_PASS`.

- Step 1 opened driver mode.
- Step 2 retained manual truck/site selection.
- Steps 3–5 tracked start proof, comment, admin projection, return to driver,
  end proof, invoice proof, completion, registry, and reload.
- Package A data remained available in finished driver history after reload.
- Responsive screenshots passed at `375 × 812`, `768 × 1024`, and
  `1440 × 900`; the guide stayed within the viewport and did not obscure the
  driver action bar.
- Keyboard collapse/expand and polite live-region checks passed.
- Network evidence: 111 GET responses, one standard demo-auth POST, zero
  synthetic write attempts, zero relay-blocked calls, zero relevant console
  errors, and zero page errors.

## Known limitations

- Browser-local state has no cross-device continuity.
- Original local photo previews still end after reload; Package A retains
  metadata and shows the existing honest explanation.
- The current-page admin-review marker is intentionally not persisted; after
  reload an active commented shift can conservatively offer the admin check
  again.
- The guide does not automate entity selection or shift actions.

## Phase 4 boundary

Phase 3 contains no registration CTA, registration handoff, attribution
handoff, funnel events, analytics changes, lead gate, Telegram path, landing
change, or export promise. Those decisions remain in Phase 4 scope and were
not implemented or started here.

**PHASE 3 IS READY FOR PHASE 4 REVIEW. PACKAGE B IS NOT READY FOR MERGE OR
DEPLOY UNTIL PHASE 4 IS IMPLEMENTED AND VERIFIED.**
