---
phase: quick-005
plan: 005
type: execute
wave: 1
depends_on: []
files_modified:
  - src/services/api.ts
  - src/components/Settings.tsx
autonomous: true
must_haves:
  truths:
    - AuthContext refreshUser calls correct endpoint /users/me without 404 error
    - Settings.tsx displays quota usage data synced with Analytics page
    - Both pages use getAnalyticsUsage() API for consistent data display
  artifacts:
    - path: src/services/api.ts
      provides: refreshUser function with correct API endpoint
      contains: "refreshUser.*API_ENDPOINTS.USERS_ME"
    - path: src/components/Settings.tsx
      provides: Quota display synced with Analytics
      contains: "getAnalyticsUsage"
  key_links:
    - from: src/context/AuthContext.tsx
      to: src/services/api.ts
      via: refreshUser import
      pattern: "import.*refreshUser.*from.*api"
    - from: src/components/Settings.tsx
      to: src/services/api.ts
      via: getAnalyticsUsage import
      pattern: "getAnalyticsUsage"
---

# Quick Task 005: Auth Fix & Quota Sync

## Objective

Fix 404 error on `/users/me` endpoint in AuthContext and sync Settings.tsx quota display with Analytics page using `api.getAnalyticsUsage()`.

Purpose: Eliminate console errors and ensure consistent quota data display across application.
Output: Working AuthContext refresh and unified quota display pattern.

## Context

@.planning/STATE.md
@src/context/AuthContext.tsx
@src/services/api.ts
@src/components/Settings.tsx
@src/components/System.tsx
@src/components/Analytics.tsx

## Issues Identified

1. **AuthContext 404 Error**: Line 79 in AuthContext.tsx calls `apiRefreshUser()` which maps to `get(API_ENDPOINTS.USERS_ME)` where `USERS_ME = '/api/v1/users/me'`. This endpoint may not exist or is incorrectly configured.

2. **Settings.tsx Missing Quota Display**: Settings.tsx doesn't display quota/usage information at all, while System.tsx (tab: "Система") does display it using `getAnalyticsUsage()`. The two pages should show consistent data.

## Tasks

### Task 1: Verify API endpoint and fix refreshUser in AuthContext

<files>src/services/api.ts</files>

<action>
1. Check if `API_ENDPOINTS.USERS_ME` value is correct (should be `${API_BASE_URL}/users/me` which expands to `https://pwa.kontrolsmen.ru/api/v1/users/me`)

2. The endpoint is already defined correctly in constants.ts line 51:
   `USERS_ME: `${API_BASE_URL}/users/me``

3. Verify the `refreshUser` function in api.ts (lines 465-470) is correctly calling this endpoint. The function looks correct.

4. The issue may be that the backend doesn't have this endpoint. Add error handling to `refreshUser` function to gracefully handle 404 by falling back to stored user data:

```typescript
export const refreshUser = async (): Promise<User> => {
  try {
    const data = await get(API_ENDPOINTS.USERS_ME);
    // Update localStorage with fresh user data
    setUserInfo(data);
    return data;
  } catch (err) {
    const error = err as ApiError;
    // If endpoint doesn't exist (404), return cached user data
    if (error.status === 404) {
      const cachedUser = getUserInfo();
      if (cachedUser) {
        return cachedUser;
      }
    }
    // Re-throw other errors
    throw err;
  }
};
```

This prevents 404 errors from breaking the app when `/users/me` endpoint doesn't exist.
</action>

<verify>
- Check console for 404 errors on AuthContext initialization
- Verify AuthContext still initializes correctly with cached user data
- Test that refreshUser() doesn't throw unhandled 404 errors
</verify>

<done>
AuthContext refreshUser function handles missing /users/me endpoint gracefully by falling back to cached user data, eliminating 404 console errors during app initialization and profile refresh operations.
</done>

### Task 2: Add quota display to Settings.tsx synced with Analytics

<files>src/components/Settings.tsx</files>

<action>
1. Import `getAnalyticsUsage` and `AnalyticsUsage` type from api.ts (already imported)

2. Add state for usage data after line 24:
```typescript
const [usage, setUsage] = useState<AnalyticsUsage | null>(null);
```

3. Modify `fetchSettings` function (after line 27) to also fetch analytics usage:
```typescript
const fetchSettings = async () => {
  try {
    setLoading(true);
    const [data, usageData] = await Promise.all([
      api.get(API_ENDPOINTS.TENANT_SETTINGS),
      getAnalyticsUsage().catch(() => null), // Gracefully handle analytics errors
    ]);

    // Add null/undefined check
    if (!data || typeof data !== 'object') {
      throw new Error("Invalid data received from server");
    }

    setSettings({
      name: data.name || "",
      timezone: data.timezone || "Europe/Moscow",
      invoice_required: data.invoice_required || false,
    });

    // Set usage data
    if (usageData) {
      setUsage(usageData);
    }
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    setMessage({ type: "error", text: "Не удалось загрузить настройки" });
  } finally {
    setLoading(false);
  }
};
```

4. Add quota display section after the Telegram Linking Card (after line 276, before the Message section):

```tsx
          {/* Quota Usage Card */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
              Использование ресурсов
            </label>
            <div className="bg-[#F4F7FE] rounded-lg p-6 border border-slate-100 space-y-4">
              {usage ? (
                <>
                  {renderUsageBar(usage.trucks.current, usage.trucks.limit, usage.trucks.utilization_percent, "Грузовики")}
                  {renderUsageBar(usage.drivers.current, usage.drivers.limit, usage.drivers.utilization_percent, "Водители")}
                  {renderUsageBar(usage.sites.current, usage.sites.limit, usage.sites.utilization_percent, "Объекты")}
                </>
              ) : (
                <p className="text-sm text-slate-500 text-center">Данные недоступны</p>
              )}
            </div>
          </div>
```

5. Add helper functions (after line 77, before handleKeyDown):

```typescript
  const getUsageBarColor = (percent: number | null): string => {
    if (percent === null) return "bg-slate-200";
    if (percent >= 100) return "bg-red-500";
    if (percent >= 80) return "bg-amber-500";
    return "bg-[#0a192f]";
  };

  const renderUsageBar = (current: number, limit: number, percent: number | null, label: string) => {
    const displayPercent = percent ?? 0;
    const isUnlimited = limit === -1;

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-slate-700">{label}</span>
          <span className={`text-sm font-mono font-semibold ${displayPercent >= 100 ? 'text-red-600' : displayPercent >= 80 ? 'text-amber-600' : 'text-[#0a192f]'}`}>
            {isUnlimited ? "∞" : `${current} / ${limit}`}
          </span>
        </div>
        {!isUnlimited && (
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getUsageBarColor(percent)} transition-all duration-500`}
              style={{ width: `${Math.min(displayPercent, 100)}%` }}
            />
          </div>
        )}
      </div>
    );
  };
```

This matches the pattern used in Analytics.tsx and System.tsx, ensuring consistent UI and data source.
</action>

<verify>
- Open Settings page (tenant settings, not System tab)
- Verify quota display section appears below Telegram card
- Check that quota numbers match Analytics page values
- Confirm no console errors when loading Settings
- Test that progress bars show correct colors (red >100%, amber >80%, navy <80%)
- Verify unlimited resources (limit=-1) show ∞ symbol without progress bar
</verify>

<done>
Settings.tsx displays quota usage data synced with Analytics page using getAnalyticsUsage() API. Quota section shows trucks, drivers, and sites utilization with progress bars matching System.tsx and Analytics.tsx styling.
</done>

## Verification

1. No 404 errors in browser console when AuthContext initializes
2. Settings page displays quota usage section with current/limit values
3. Quota values match between Settings and Analytics pages (test by creating resources and checking both pages)
4. Progress bars show correct colors based on utilization percentage
5. Unlimited resources display ∞ symbol without progress bar

## Success Criteria

- AuthContext refreshUser handles missing /users/me endpoint without throwing unhandled 404 errors
- Settings.tsx displays quota information synced with Analytics using getAnalyticsUsage()
- Both pages show identical quota values when viewed simultaneously
- Console is free of 404 errors related to /users/me endpoint
- Quota display matches existing UI patterns (System.tsx, Analytics.tsx)

## Output

After completion, create `.planning/quick/5-auth-fix-quota-sync-fix-404-on-users-me-/005-SUMMARY.md`
