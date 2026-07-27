# Demo Funnel V2 Phase 4 Handoff

## Baseline and scope

- Frontend main baseline:
  `9cd4bd91bc137def1a39d4950c2234aca7d01569`.
- Phase 3 parent head:
  `2882657fc61f9e99d283d9e0e87cf411cec2ce8e`.
- Phase 4 branch:
  `feat/demo-funnel-v2-phase4-registration-handoff`.
- Phase 4 product commit:
  `d46fc07df80e5c87ec795e816f0e5d0d8078f648`.
- Backend remains unchanged at
  `eea675e214c6a3d77fe3a1e84758882352579b7f`.

Phase 4 adds the completed-guide conversion action and a browser-local,
allowlisted attribution handoff to company registration. It does not change
the backend, API contract, schema, migrations, dependencies, landing page,
real-tenant flows, or Phase 1–3 demo-session contracts.

## Backend and registration audit

`POST /api/v1/auth/register-tenant` already accepts `body.attribution`.
Backend normalization retains only `yclid`, `utm_source`, `utm_medium`,
`utm_campaign`, `utm_content`, and `utm_term`. Company registration creates
the tenant and admin in the existing transaction and records the existing
`tenant_registered` event. Driver invite registration remains a separate
contract and a valid invite stays authoritative.

The current free-plan source confirms limits of two machines, two sites, and
two drivers. No unsupported claim such as “без банковской карты” is shown.
No backend change was required.

## Attribution handoff contract

- Storage key: `logishift_demo_registration_handoff_v1`.
- Payload version: `1`.
- TTL: four hours.
- Payload fields: `version`, `expiresAt`, and the existing normalized
  `Attribution` object only.
- Capture occurs at explicit demo entry before the existing demo-success call
  and before URL attribution cleanup.
- An explicit entry with attribution replaces the previous handoff.
- An explicit entry without valid attribution clears stale handoff state.
- A partially valid entry retains only valid allowlisted values.
- A normal reload or in-app navigation preserves a valid unexpired handoff.
- Corrupt, incompatible, empty, or expired state is removed safely.
- A failed demo login may retain the handoff for a retry within the TTL.

The shared URL builder always targets
`https://app.kontrolsmen.ru/register`, adds
`registration_source=demo`, and appends only the six allowlisted attribution
fields. It never includes `enterDemo`, auth/session values, synthetic shift
identifiers, comments, photos, driver/truck/site data, or arbitrary query
parameters.

## Product UX

- The completed guide now shows the primary action
  `Создать свою компанию`.
- Supporting copy says `Перейдите к работе со своими данными.` and uses only
  the confirmed free limits.
- `Посмотреть завершённую смену` remains available as a secondary registry
  action.
- A collapsed completed guide retains a visible registration action without
  forcing expansion or moving focus.
- `DemoBanner` uses the same absolute URL builder before scenario completion.
- Demo-sourced company registration shows a compact
  `Продолжите со своими данными` context block.
- A valid driver invite remains in driver mode even if the demo marker is
  present.
- Registration captures URL attribution once and submits it through the
  existing admin registration payload. The marker is not attribution.
- Existing password, honeypot, consent, success, redirect, and email-prefill
  behavior remains intact.

Synthetic demo data is not transferred. Only allowlisted UTM/yclid values are
transferred. No new funnel event exists.

## Changed files

- `src/lib/demoRegistrationHandoff.ts` — strict storage lifecycle and shared
  absolute registration URL builder.
- `src/lib/__tests__/demoRegistrationHandoff.test.ts` — storage, allowlist,
  expiry, corruption, replacement, clearing, and URL tests.
- `src/components/Login.tsx` — capture before existing demo-success and URL
  cleanup.
- `src/components/__tests__/Login.test.tsx` — capture ordering, stale clearing,
  and retry behavior.
- `src/components/DemoScenarioGuide.tsx` — completed, collapsed, and secondary
  CTA behavior.
- `src/components/__tests__/DemoScenarioGuide.test.tsx` — completed CTA and
  accessibility regression coverage.
- `src/components/DemoBanner.tsx` — shared absolute registration link.
- `src/components/__tests__/DemoBanner.test.tsx` — host and attribution
  coverage.
- `src/utils/registerInvite.ts` — non-invite demo-source context detection.
- `src/views/RegisterView.tsx` — one-time attribution capture and demo context.
- `src/views/__tests__/RegisterView.test.tsx` — context, invite authority, and
  exact redacted payload assertions.

## Verification

- Phase 4 focused and routing regression: 7 files, 65 tests passed.
- Phase 3 and Package A focused regression: 8 files, 74 tests passed.
- Isolated DriverView regression: 1 file, 21 tests passed.
- Full frontend suite: 30 files, 189 tests passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.
- Dependency scan: no changes.
- Forbidden-scope scan: no unexpected paths.
- Package C event scan: no new events.
- Added write-call scan: no new demo write calls.
- Secret-pattern scan: no credential, token, or production secret findings;
  test-only fake password literals are not secrets and are excluded from
  browser artifacts.

## Automated local browser smoke

Final exact-product-commit evidence:

`C:\logishift\smoke-tools\demo-package-b\artifacts\20260727-222612`

Result: `PHASE4_PASS`.

- The full guided scenario and Package A workflow passed.
- Demo URL attribution was cleared after the existing demo-success flow.
- Handoff state retained all six deterministic test fields and no forbidden
  fields.
- Reload preserved guide completion and the unexpired CTA attribution.
- CTA navigation reached the locally mapped app registration route with the
  marker and exact allowlisted parameters only.
- Tailored company-registration context, legal consents, password validation,
  honeypot, success flow, and login email prefill passed.
- Registration was intercepted locally and its saved assertion file is
  redacted; no production tenant was created.
- A separate ephemeral context proved that explicit entry without attribution
  clears stale handoff state.
- Network result: 121 GET responses, two forwarded demo-auth calls, two
  locally stubbed demo-success calls, one locally intercepted registration,
  zero production-bound registrations, zero synthetic writes, and zero
  relay-blocked calls.
- Responsive checks passed at `375 × 812`, `768 × 1024`, and `1440 × 900`.
- Keyboard collapse/expand, visible focus, collapsed CTA, native navigation,
  and polite live-region behavior passed.

## Package C exclusions and limitations

- No CTA-view, CTA-click, registration-started, guide-step, completion, or
  other new funnel event was added.
- Browser-local attribution has no cross-device continuity and expires after
  four hours.
- Synthetic shifts, comments, and photo metadata remain browser-local and are
  never copied to registration or a new tenant.
- Package B is not deployed.

**PACKAGE B IS READY FOR INDEPENDENT REVIEW AND MERGE/DEPLOY PREPARATION.**
