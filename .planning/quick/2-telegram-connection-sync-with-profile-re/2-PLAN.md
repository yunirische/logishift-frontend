---
phase: quick
plan: 002
type: execute
wave: 1
depends_on: []
files_modified:
  - src/services/api.ts
  - src/context/AuthContext.tsx
  - src/components/Settings.tsx
  - src/components/System.tsx
autonomous: true

must_haves:
  truths:
    - "User profile refreshes after Telegram link/unlink operations"
    - "Telegram connection status syncs across all components via AuthContext"
    - "User profile refreshes when returning to app from Telegram bot window"
    - "UI shows correct Telegram connection state after linking/unlinking"
  artifacts:
    - path: "src/services/api.ts"
      provides: "refreshUser function to fetch updated user profile"
      exports: ["refreshUser"]
    - path: "src/context/AuthContext.tsx"
      provides: "refreshUser method in AuthContext"
      exports: ["refreshUser"]
    - path: "src/components/Settings.tsx"
      provides: "Telegram connection handling with profile refresh"
      contains: "refreshUser call after link/unlink"
    - path: "src/components/System.tsx"
      provides: "Telegram connection handling with profile refresh"
      contains: "refreshUser call after link/unlink"
  key_links:
    - from: "src/components/Settings.tsx"
      to: "src/context/AuthContext.tsx"
      via: "useAuth hook"
      pattern: "refreshUser"
    - from: "src/components/System.tsx"
      to: "src/context/AuthContext.tsx"
      via: "useAuth hook"
      pattern: "refreshUser"
    - from: "src/context/AuthContext.tsx"
      to: "src/services/api.ts"
      via: "refreshUser import"
      pattern: "refreshUser"
    - from: "src/services/api.ts"
      to: "API_ENDPOINTS.USERS_ME"
      via: "API endpoint call"
      pattern: "get.*USERS_ME|users/me"
---

<objective>
Add Telegram connection state synchronization with profile refresh

This plan fixes the issue where Telegram connection status (tg_user_id) is not
synchronized across components after linking/unlinking Telegram. Currently,
each component independently reads user info from localStorage on mount, and
Telegram operations only update the local component state.

The solution adds a centralized profile refresh mechanism via AuthContext,
ensuring all components stay in sync after Telegram operations and when
the user returns from the Telegram bot window.

Purpose: Ensure consistent Telegram connection state across the entire app
Output: Working Telegram sync with automatic profile refresh
</objective>

<execution_context>
@C:/Users/1/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/1/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/services/api.ts
@src/context/AuthContext.tsx
@src/components/Settings.tsx
@src/components/System.tsx
@src/types.ts
@src/constants.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add profile refresh API and AuthContext integration</name>
  <files>src/services/api.ts, src/context/AuthContext.tsx, src/constants.ts</files>
  <action>
    1. In src/constants.ts, add USERS_ME endpoint: `USERS_ME: \`\${API_BASE_URL}/users/me\``

    2. In src/services/api.ts, add refreshUser function that:
       - Calls GET /users/me endpoint
       - Returns User object
       - Updates localStorage via setUserInfo
       - Handle 401/403 errors appropriately

    3. In src/context/AuthContext.tsx:
       - Import refreshUser from api
       - Add refreshUser method to AuthContextType interface
       - Implement refreshUser callback that:
         - Calls API and gets updated user
         - Updates state via setUser
         - Updates localStorage
         - Returns the updated user
       - Export refreshUser in the context value

    Do NOT modify any existing functionality - only add the new refreshUser capability.
  </action>
  <verify>
    - Check that refreshUser is exported from api.ts
    - Check that AuthContext exposes refreshUser in its value
    - Check that AuthContextType interface includes refreshUser
  </verify>
  <done>
    - refreshUser function exists in api.ts and fetches from /users/me
    - AuthContext exposes refreshUser method that updates state and localStorage
    - AuthContextType includes refreshUser: () => Promise<User>
  </done>
</task>

<task type="auto">
  <name>Task 2: Add profile refresh after Telegram operations in Settings and System</name>
  <files>src/components/Settings.tsx, src/components/System.tsx</files>
  <action>
    For BOTH Settings.tsx and System.tsx components:

    1. Import useAuth from AuthContext (already imported in Settings, add to System)

    2. Remove local user state management:
       - Remove `const [user, setUser] = useState<User | null>(null)`
       - Remove the useEffect that loads user from localStorage
       - Use `const { user, refreshUser } = useAuth()` instead

    3. Update handleDisconnect function:
       - After unlinkTelegram() succeeds, call `await refreshUser()`
       - Remove the manual localStorage update logic

    4. Add window focus listener for Telegram bot completion:
       - Add useEffect that listens for window 'focus' event
       - When tgLinkCode exists (user has generated link code), call refreshUser
       - This catches when user returns from Telegram bot window after linking

    5. Clean up: Remove the now-unused localStorage direct manipulation code

    Key pattern: useAuth().user becomes the single source of truth for tg_user_id.
  </action>
  <verify>
    - Components use useAuth() for user state instead of local state
    - refreshUser is called after unlinkTelegram succeeds
    - Window focus listener exists and calls refreshUser when tgLinkCode is set
  </verify>
  <done>
    - Both Settings and System use AuthContext user state
    - Telegram unlink triggers profile refresh via refreshUser
    - Window focus refreshes profile when user returns from Telegram bot
    - No direct localStorage manipulation for user state in these components
  </done>
</task>

</tasks>

<verification>
After completing all tasks, verify:

1. **API Integration**: refreshUser function exists and calls /users/me endpoint
2. **AuthContext**: Exposes refreshUser method that updates both state and localStorage
3. **Settings Component**: Uses AuthContext user, calls refreshUser after unlink, has focus listener
4. **System Component**: Uses AuthContext user, calls refreshUser after unlink, has focus listener
5. **No Duplication**: Local user state removed from both Settings and System

Test flow:
1. Generate Telegram link code
2. Open Telegram bot (opens new window)
3. Return to app (window focus) - profile should refresh
4. Verify tg_user_id appears in UI
5. Test unlink - UI should update to show not connected
</verification>

<success_criteria>
- Telegram connection state syncs across Settings and System pages
- Profile refreshes when user returns from Telegram bot window
- Unlinking Telegram updates UI immediately on both pages
- No manual page reload needed to see Telegram connection status
- Single source of truth (AuthContext) for user profile data
</success_criteria>

<output>
After completion, create `.planning/quick/2-telegram-connection-sync-with-profile-re/2-SUMMARY.md`
</output>
