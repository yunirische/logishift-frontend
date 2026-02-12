# Requirements: LogiShift Frontend

**Defined:** 2026-02-12
**Core Value:** Drivers can start, track, and complete shifts with photo documentation, while admins/foremen have real-time visibility into fleet operations, resource utilization, and business insights.

## v2.5 Requirements

Requirements for Stabilization & Audit milestone. System-wide regression fixes across driver UI, state machine, modal history, and exports.

### State Machine & Driver UI

- [ ] **STATE-01**: DriverView component is unified across all user roles (ADMIN, FOREMAN, DRIVER) - single source of truth for driver interface
- [ ] **STATE-02**: Driver UI updates immediately when shift state changes (Start Shift shows Timer/Finish button without page reload)
- [ ] **STATE-03**: Demo Driver mode (Tenant 999) uses production DriverView UI with safety guards instead of separate mock interface
- [ ] **STATE-04**: Drivers can view their shift history in the driver interface

### Shift Modal Logic

- [ ] **MODAL-01**: History tab in EditShiftModal loads and displays audit trail data from GET /api/v1/audit/shift/:id
- [ ] **MODAL-02**: Comments tab in EditShiftModal displays shift comments with proper JetBrains Mono formatting
- [ ] **MODAL-03**: EditShiftModal shows loading skeletons while fetching async data (history, comments)
- [ ] **MODAL-04**: Photo upload zones in modal display only those required by site settings (odometer before/after, invoice - conditionally shown)

### Dashboard Analytics & Quotas

- [ ] **DASH-01**: Dashboard active shifts count matches actual backend data (fix discrepancy showing "0" when shifts exist)
- [ ] **DASH-02**: Dashboard.tsx data mapping is audited against current Backend API response structure
- [ ] **DASH-03**: Dashboard includes manual refresh mechanism to update stats on demand
- [ ] **DASH-04**: Limit data (Trucks, Drivers, Sites) is synchronized between Dashboard and System section using single source from Usage Analytics API

### Export System

- [ ] **EXP-01**: Exported shift files use correct Excel/CSV format without corruption
- [ ] **EXP-02**: api.ts implements proper Blob handling and headers for file downloads
- [ ] **EXP-03**: Export files include UTF-8 BOM for Excel compatibility
- [ ] **EXP-04**: Downloaded files have clear naming convention including report type and company name

## v3 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Future Enhancements

- **[FUTURE]-01**: Real-time WebSocket updates for shift state changes
- **[FUTURE]-02**: Advanced analytics features (custom date ranges, period comparison)
- **[FUTURE]-03**: Performance optimizations and technical debt cleanup
- **[FUTURE]-04**: Production deployment and monitoring setup

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Payment processing integration | Subscription payments handled outside PWA (Telegram bot/external) |
| Real-time analytics updates | Adds complexity, manual refresh sufficient for v2.5 |
| Custom report builder | Fixed audit/analytics views cover core use cases |
| Mobile native app | Web PWA focus, mobile app deferred to future milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| STATE-01 | Phase 8 | Pending |
| STATE-02 | Phase 8 | Pending |
| STATE-03 | Phase 8 | Pending |
| STATE-04 | Phase 8 | Pending |
| MODAL-01 | Phase 9 | Pending |
| MODAL-02 | Phase 9 | Pending |
| MODAL-03 | Phase 9 | Pending |
| MODAL-04 | Phase 9 | Pending |
| DASH-01 | Phase 10 | Pending |
| DASH-02 | Phase 10 | Pending |
| DASH-03 | Phase 10 | Pending |
| DASH-04 | Phase 10 | Pending |
| EXP-01 | Phase 11 | Pending |
| EXP-02 | Phase 11 | Pending |
| EXP-03 | Phase 11 | Pending |
| EXP-04 | Phase 11 | Pending |

**Coverage:**
- v2.5 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-12*
*Last updated: 2026-02-12 after initial definition*
