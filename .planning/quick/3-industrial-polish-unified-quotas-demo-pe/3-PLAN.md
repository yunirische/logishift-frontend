---
phase: quick
plan: 003
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/Layout.tsx
  - src/components/System.tsx
  - src/App.tsx
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Demo persona switcher uses consistent styling with amber-500 for active state"
    - "Quota display uses unified navy-900 (#0a192f) theme across all components"
    - "Header cards use from-[#0a192f] to-[#1e293b] gradient consistently"
    - "Loading states use text-[#0a192f] or border-[#0a192f] consistently"
    - "All focus rings use focus:ring-[#0a192f]/20 pattern"
  artifacts:
    - path: "src/components/Layout.tsx"
      provides: "Demo persona switcher with consistent styling"
      contains: "bg-amber-500 text-slate-900"
    - path: "src/components/System.tsx"
      provides: "Quota display with navy-900 theme"
      contains: "from-[#0a192f] to-[#1e293b]"
    - path: "src/App.tsx"
      provides: "Selection styling with navy-900 theme"
      contains: "selection:bg-[#0a192f]/10"
  key_links:
    - from: "src/components/Layout.tsx"
      to: "src/App.tsx"
      via: "demoPersona state sharing"
      pattern: "demoPersona.*setDemoPersona"
    - from: "src/components/System.tsx"
      to: "api.ts"
      via: "getAnalyticsUsage API call"
      pattern: "getAnalyticsUsage"
---

<objective>
Industrial polish: unified navy-900 (#0a192f) theme consistency, demo persona switcher refinement, and quota display standardization.

Purpose: Ensure consistent visual branding across the application with navy-900 as the primary color, amber-500 for demo-specific elements, and unified header/card styling.

Output: Polished UI with consistent theme colors, refined demo persona switcher, and standardized quota display.
</objective>

<execution_context>
@C:/Users/1/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/1/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/Layout.tsx
@src/components/System.tsx
@src/App.tsx
@src/services/api.ts
@src/types.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Unify Navy-900 theme colors across System component</name>
  <files>src/components/System.tsx</files>
  <action>
    Review and standardize all navy-900 (#0a192f) theme colors in System.tsx:

    1. Header gradients: Ensure all use `from-[#0a192f] to-[#1e293b]`
    2. Primary buttons: Use `bg-[#0a192f] hover:bg-[#152238]`
    3. Focus rings: Use `focus:ring-[#0a192f]/20`
    4. Text accents: Use `text-[#0a192f]` for emphasis
    5. Shadows: Use `shadow-[#0a192f]/20` or `shadow-[#0a192f]/30`

    Specific changes:
    - Line 187: Loader2 spin color should be `text-[#0a192f]`
    - Lines 195, 208, 269, 391: Headers use `from-[#0a192f] to-[#1e293b]`
    - Lines 259, 351, 465: Primary buttons use `bg-[#0a192f] hover:bg-[#152238]`
    - Lines 369, 414, 430: Focus rings use `focus:ring-[#0a192f]/20`

    Do NOT change the Telegram gradient (from-[#0088cc] to-[#0077b5]) as it uses brand colors.
  </action>
  <verify>grep -n "#0a192f\|#152238\|#1e293b" src/components/System.tsx | wc -l shows consistent usage</verify>
  <done>All navy-900 theme colors follow consistent pattern: #0a192f (primary), #152238 (hover), #1e293b (gradient end)</done>
</task>

<task type="auto">
  <name>Task 2: Refine demo persona switcher styling in Layout.tsx</name>
  <files>src/components/Layout.tsx</files>
  <action>
    Polish the demo persona switcher section (lines 206-247):

    1. Active state: `bg-amber-500 text-slate-900 font-semibold`
    2. Inactive state: `text-slate-400 hover:text-white hover:bg-slate-800`
    3. Section label: Keep amber-500 for visibility (line 209)
    4. Ensure transitions use `duration-200` for smooth switching

    The implementation already exists - verify and ensure:
    - Active persona button uses amber-500 background
    - Icons (UserCog, Truck) have consistent `w-5 h-5` sizing
    - Secondary text uses uppercase tracking-wider styling
    - No inconsistent colors or hover states

    Keep existing implementation if it matches these patterns.
  </action>
  <verify>grep -A 30 "Demo Persona Switcher" src/components/Layout.tsx shows consistent amber-500 and slate-800 usage</verify>
  <done>Demo persona switcher has consistent amber-500 active state with proper transitions</done>
</task>

<task type="auto">
  <name>Task 3: Standardize loading and selection states in App.tsx</name>
  <files>src/App.tsx</files>
  <action>
    Ensure consistent navy-900 theme for loading and selection states:

    1. Selection styling (lines 159, 172): Keep `selection:bg-[#0a192f]/10 selection:text-[#0a192f]`
    2. Loading spinners (lines 84, 146): Keep `border-[#0a192f] border-t-transparent`
    3. Placeholder badge (line 75): Keep `bg-[#0a192f]/10 text-[#0a192f]`

    Verify these patterns are consistent across the file.
    No changes needed if already consistent - this is a verification task.
  </action>
  <verify>grep -n "#0a192f" src/App.tsx shows consistent usage for loading spinners and selection</verify>
  <done>Loading spinners and selection states use navy-900 consistently</done>
</task>

</tasks>

<verification>
1. All navy-900 (#0a192f) theme colors follow consistent naming
2. Hover states use #152238 (darker navy)
3. Gradient ends use #1e293b (slate-800)
4. Demo persona switcher uses amber-500 consistently
5. Loading states use text-[#0a192f] or border-[#0a192f]
</verification>

<success_criteria>
- Navy-900 theme is consistent across all components
- Demo persona switcher has polished, consistent styling
- Quota display uses unified header gradients
- All focus rings follow the focus:ring-[#0a192f]/20 pattern
- No inconsistent color variations remain
</success_criteria>

<output>
After completion, create `.planning/quick/3-industrial-polish-unified-quotas-demo-pe/3-SUMMARY.md`
</output>
