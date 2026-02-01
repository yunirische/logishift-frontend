---
phase: quick
plan: 001
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/Drivers.tsx
  - src/views/RegisterView.tsx
autonomous: true

must_haves:
  truths:
    - "Admin can copy smart invite link from Drivers component modal"
    - "Invite link contains full URL with code parameter"
    - "Register page pre-fills invite code from URL parameter"
    - "Password input displays exact backend validation rules"
    - "Frontend validates password BEFORE API call (prevents 400 errors)"
  artifacts:
    - path: "src/components/Drivers.tsx"
      provides: "Smart copy button generating full registration URL"
      contains: "window.location.origin/register?code="
    - path: "src/views/RegisterView.tsx"
      provides: "Password requirements display + real-time validation"
      contains: "password validation helper"
  key_links:
    - from: "Drivers.tsx copy button"
      to: "RegisterView"
      via: "URL parameter ?code=..."
      pattern: "code=.*"
---

<objective>
Implement smart invite links with auto-fill and password UX improvements

Purpose: Streamline driver onboarding with shareable invite links and prevent password-related registration failures
Output: Copy-to-clipboard invite URLs, auto-filled registration form, clear password requirements with validation
</objective>

<execution_context>
@C:\Users\1\.claude\get-shit-done\workflows\execute-plan.md
@C:\Users\1\.claude\get-shit-done\templates\summary.md
</execution_context>

<context>
@C:\logishift-frontend\.planning\STATE.md
@C:\logishift-frontend\src\components\Drivers.tsx
@C:\logishift-frontend\src\views\RegisterView.tsx

**Current state:**
- Drivers.tsx has invite modal with copy button, but uses `alert()` for feedback
- RegisterView already extracts `?code=...` from URL on mount (lines 27-33)
- Password validation only checks length >= 6 (line 62-65)
- No password requirements helper text shown to user

**Backend password requirements (to match):**
- Минимум 8 символов (not 6!)
- Заглавная буква (A-Z)
- Цифра (0-9)
- Спецсимвол (!@#$%^&* etc.)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Smart Copy Button with Toast Feedback</name>
  <files>src/components/Drivers.tsx</files>
  <action>
    1. Modify `copyToClipboard()` function to generate full URL:
       - Extract invite code from `inviteLink` (format may be `/invite/CODE` or just `CODE`)
       - Build: `${window.location.origin}/register?code=${inviteCode}`
       - Copy full URL to clipboard

    2. Replace `alert("Ссылка скопирована в буфер")` with custom toast:
       - Create simple inline toast state: `const [toast, setToast] = useState<{show: boolean, message: string}>({show: false, message: ''})`
       - On copy: `setToast({show: true, message: 'Ссылка скопирована!'})`
       - Auto-hide after 2 seconds with `setTimeout`
       - Render toast as fixed position div (bottom-20 or top-4) with fade-in animation

    3. Update button aria-label to reflect "Копировать ссылку"
  </action>
  <verify>
    1. Click invite button in Drivers component
    2. Click copy button
    3. Verify: Full URL copied (contains domain + /register?code=...)
    4. Verify: Toast appears with "Ссылка скопирована!" message
  </verify>
  <done>
    - Copy button generates full registration URL with domain
    - Toast notification replaces native alert()
    - Toast auto-hides after 2 seconds
  </done>
</task>

<task type="auto">
  <name>Task 2: Password UX with Requirements Display</name>
  <files>src/views/RegisterView.tsx</files>
  <action>
    1. Add password requirements helper text:
       - Under password input, add `<ul>` with 4 requirements:
         * "Мин. 8 символов"
         * "Заглавная буква (A-Z)"
         * "Цифра (0-9)"
         * "Спецсимвол (!@#...)"
       - Style: text-xs text-slate-400, flex-wrap layout

    2. Add real-time validation state:
       - Track which requirements are met with state: `const [passwordChecks, setPasswordChecks] = useState<{length: bool, upper: bool, number: bool, special: bool}>(...)`
       - Update checks in `onChange` handler for password field

    3. Visual feedback:
       - Met requirements: green-600 color with checkmark
       - Unmet: slate-400 color
       - Use `text-green-600` class for satisfied items

    4. Update `validateForm()` to match backend rules:
       - Length: >= 8 (change from 6)
       - Uppercase: `/[A-Z]/.test(password)`
       - Number: `/[0-9]/.test(password)`
       - Special: `/[^A-Za-z0-9]/.test(password)`
       - Return specific error for failed requirement

    5. Add visual indicator when code is pre-filled:
       - If `code` from URL has length > 0, show green checkmark icon next to input
       - Optional: add `border-green-500` ring to show valid pre-fill
  </action>
  <verify>
    1. Visit /register?code=TEST123
    2. Verify: Code input pre-filled with "TEST123"
    3. Verify: Green checkmark or border indicates valid pre-fill
    4. Type password: "Abc123!"
    5. Verify: All 4 requirements show green with checkmarks
    6. Type password: "abc" (too short, no uppercase, no number, no special)
    7. Verify: Requirements show grey/unsatisfied state
    8. Try submit with weak password
    9. Verify: Form blocks submit with specific error message
  </verify>
  <done>
    - Password input displays 4 validation rules
    - Rules show green/checkmark when satisfied, grey when not
    - validateForm() checks all 4 backend requirements
    - Pre-filled code shows visual indicator
  </done>
</task>

</tasks>

<verification>
**Manual verification steps:**
1. Generate invite link from Drivers page
2. Copy link and verify format: `https://domain.com/register?code=XXXXX`
3. Open copied link in new tab/private window
4. Verify code is pre-filled with visual indicator
5. Test password validation with various inputs (weak/strong)
6. Verify toast appears and auto-hides on copy
</verification>

<success_criteria>
- Admin can share clickable registration links
- New drivers see pre-filled invite code
- Password rules are clear before submission
- No 400 errors from password validation (frontend catches first)
- No native alert() calls for copy feedback
</success_criteria>

<output>
After completion, create `.planning/quick/001-smart-invite-links/001-SUMMARY.md`
</output>
