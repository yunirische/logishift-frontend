# Changelog

All notable changes to LogiShift backend documentation.

## [1.1.2] - 2026-02-01

### Bug Fixes
- **GET /shifts/:id 401 error**: Added missing endpoint to fetch single shift by ID
- **Comment-only updates on finished shifts**: `PATCH /shifts/:id` now allows adding comments to finished shifts
- **Modal edit save button**: Comment-only updates no longer require time validation

### API Changes
- **New Endpoint**: `GET /shifts/:id` - Fetch single shift details by ID
- **Enhanced Authorization**: `PATCH /shifts/:id` now supports:
  - Drivers can add comments to their own shifts (any status)
  - Admins can add comments to any shift (any status)
  - Only admins can modify times or force-close shifts

### Service Layer Changes
- **WebApiController.getShiftById**: New method to fetch single shift with normalized photo URLs
- **ShiftService.forceCloseShift**: Removed `status !== "finished"` check for comment-only updates
- **WebApiController.forceCloseShift**: Updated authorization logic to allow drivers to comment on own shifts

### Frontend Integration Notes
- Use `GET /shifts/:id` to load shift data in edit modal
- Use `PATCH /shifts/:id` with only `{ comment: "text" }` for comment-only updates
- Time changes require `{ start_time, end_time }` and admin role

---

## [1.1.1] - 2026-02-01

### Bug Fixes
- **Manual shift creation**: Admin-created shifts now bypass pending states and go directly to 'ACTIVE' status
- **Analytics null safety**: `costPerShift` in analytics now returns `0` instead of `null` to prevent frontend crashes
- **Partial updates**: `PATCH /shifts/:id` now supports comment-only updates without time validation

### Service Layer Changes
- **ShiftService.createManualShift**: Modified to always create shifts with `status: "active"` for admin-created shifts
- **ShiftService.forceCloseShift**: Enhanced to detect and handle comment-only updates (when only `comment` is provided)
- **UsageAnalyticsService.getPlanOptimizationInsights**: Fixed `costPerShift` to default to `0` instead of `null`

---

## [1.1.0] - 2026-01-31

### Added
- UsageAnalyticsService documentation in Architecture Overview
- Admin Proxy Upload endpoint (`POST /shifts/:id/proxy-photo`) in API Reference
- Analytics endpoints (8 endpoints) in API Reference
- Excel report timezone formatting documentation
- CSV export timezone formatting documentation

### Updated
- API Reference with latest endpoints (Admin Proxy Upload, Analytics)
- Architecture Overview with UsageAnalyticsService details
- README.md with new analytics endpoints section
- All documentation dates updated to 2026-01-31

### Service Layer Additions
- **UsageAnalyticsService** (v2.5 Phase 4)
  - Resource usage tracking vs plan limits
  - Time-series usage trends
  - Top drivers ranking
  - Plan optimization insights
  - Shift analytics with statistics
  - Site utilization metrics
  - CSV/JSON export functionality

### API Enhancements
- **Admin Proxy Upload** - Admins can upload photos on behalf of drivers
- **Analytics Module** - 8 new endpoints for usage analytics
- **Excel Improvements** - Tenant timezone support, "Ручная правка" column
- **CSV Improvements** - Tenant timezone, 2 decimal places formatting

### Bug Fixes
- Comment updates now create audit log entries (COMMENT_ADDED)
- Excel report uses tenant-specific timezone for all date fields
- CSV export respects tenant timezone settings

---

## [1.0.0] - 2025-01-27

### Initial Release
- Complete API documentation
- Architecture overview with design patterns
- Database schema documentation
- Workflow documentation (Telegram Bot, PWA, Shift Lifecycle)
- Gateway API specification
