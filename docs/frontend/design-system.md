---
title: Design System - Industrial UI
domain: frontend
related:
  - ./architecture.md
  - analytics-dashboard.md
last_updated: 2026-02-01
context_priority: high
---

# Design System - Industrial UI

## Overview

LogiShift uses an **Industrial UI** design system optimized for data-dense dashboard interfaces. The design emphasizes readability, professional appearance, and efficient use of screen real estate.

**Design Principles:**
- **Data Density** - Maximum information per screen with reduced spacing
- **Typography-First** - JetBrains Mono for all data displays
- **Industrial Aesthetic** - Deep Navy color scheme for logistics domain
- **Accessibility** - WCAG AA compliant contrast ratios
- **Responsive** - Mobile-first approach

## Color Palette

### Primary Colors - Deep Navy Theme

```css
/* Industrial Navy - Primary */
--industrial-navy: #0a192f;      /* Deep Navy - Primary actions */
--industrial-navy-dark: #152238;  /* Darker Navy - Hover states */
--industrial-slate: #1e293b;      /* Slate - Secondary actions */
--industrial-blue: #334155;       /* Blue Slate - Tertiary */

/* Accent Color */
--brand-blue: #3b82f6;            /* Brand accent - Links, logos */

/* Neutrals */
--text-primary: #1B254B;          /* Headings, primary text */
--text-secondary: #64748b;        /* Secondary text, labels */
--text-muted: #94a3b8;            /* Disabled, hints */
--border-light: #e2e8f0;         /* Subtle borders */
--bg-surface: #ffffff;           /* Card backgrounds */
--bg-page: #F4F7FE;              /* Page background */
```

### Semantic Color Mapping

| Usage | Color | Tailwind | Hex |
|-------|-------|---------|-----|
| Primary buttons | Deep Navy | `bg-[#0a192f]` | #0a192f |
| Hover states | Darker Navy | `hover:bg-[#152238]` | #152238 |
| Active tabs | Deep Navy | `bg-[#0a192f]` | #0a192f |
| Icon backgrounds | Navy tint | `bg-[#0a192f]/10` | #0a192f at 10% |
| Secondary buttons | Slate | `bg-[#1e293b]` | #1e293b |
| Brand accent | Blue | `text-[#3b82f6]` | #3b82f6 |
| Focus rings | Navy | `focus:ring-[#0a192f]` | #0a192f |
| Shadows | Navy tint | `shadow-[#0a192f]/10` | #0a192f at 10% |

### Status Colors (Unchanged)

- **Success:** Emerald (`bg-emerald-500`, `text-emerald-600`)
- **Warning:** Amber (`bg-amber-500`, `text-amber-600`)
- **Error:** Red (`bg-red-500`, `text-red-600`)
- **Info:** Blue (`bg-blue-500`, `text-blue-600`)

## Typography

### Font Families

```css
/* Primary Font - Inter/System */
font-family: system-ui, -apple-system, sans-serif;

/* Monospace Font - JetBrains Mono */
font-family: 'JetBrains Mono', monospace;

/* Google Fonts Import */
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

### Typography Utilities

| Class | Usage | Font | Weight |
|-------|-------|------|--------|
| `.mono-id` | All IDs (#55, #123) | JetBrains Mono | 400 |
| `.mono-number` | Numeric values, metrics | JetBrains Mono | 400 |
| `.mono-date` | Timestamps, date ranges | JetBrains Mono | 400 |
| `.mono-plate` | Truck license plates | JetBrains Mono | 600 |

### Typography Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 Headings | `text-3xl` | 600 (semibold) | 1.2 |
| H2 Headings | `text-2xl` | 600 (semibold) | 1.2 |
| H3 Headings | `text-lg` | 600 (semibold) | 1.3 |
| Body | `text-sm` | 400 (normal) | 1.5 |
| Labels | `text-xs` | 600 (semibold) | 1.4 |
| Captions | `text-[10px]` | 700 (bold) | 1.4 |

## Spacing & Density

### Reduced Spacing for Dashboard Density

| Old | New | Usage |
|-----|-----|-------|
| `p-8` | `p-4` | Card padding |
| `p-6` | `p-4` | Section padding |
| `gap-6` | `gap-4` | Grid gaps |
| `space-y-8` | `space-y-4` | Vertical spacing |
| `mb-6` | `mb-4` | Margin bottom |
| `rounded-3xl` | `rounded-lg` | Border radius |
| `shadow-lg` | `shadow-sm` | Shadow weight |

### Density Examples

```tsx
{/* Before: Mobile app spacing */}
<div className="bg-white rounded-3xl shadow-lg p-6 gap-6">
  <Card className="p-6" />
</div>

{/* After: Dashboard density */}
<div className="bg-white rounded-lg shadow-sm p-4 gap-4">
  <Card className="p-4" />
</div>
```

## Components

### Buttons

```tsx
{/* Primary Button - Deep Navy */}
<button className="bg-[#0a192f] text-white px-4 py-2 rounded-lg hover:bg-[#152238] transition-colors">
  Save
</button>

{/* Secondary Button - Slate */}
<button className="bg-[#1e293b] text-white px-4 py-2 rounded-lg hover:bg-[#334155] transition-colors">
  Cancel
</button>

{/* Ghost Button - Navy tint */}
<button className="bg-[#0a192f]/10 text-[#0a192f] px-4 py-2 rounded-lg hover:bg-[#0a192f]/20 transition-colors">
  Edit
</button>
```

### Input Fields

```tsx
{/* Standard Input */}
<input
  className="w-full px-4 py-3 rounded-lg border border-slate-200
             focus:border-[#0a192f] focus:ring-2 focus:ring-[#0a192f]/20
             outline-none transition-all text-sm"
  placeholder="Enter value"
/>
```

### Data Displays

```tsx
{/* ID with monospace font */}
<span className="mono-id mono-number text-slate-500">#{shift.id}</span>

{/* Number with monospace font */}
<span className="mono-number text-2xl font-bold">{usage.current}</span>

{/* Timestamp with monospace font */}
<span className="mono-date text-sm text-slate-600">
  {new Date(shift.start_time).toLocaleString()}
</span>

{/* Truck plate with monospace font */}
<span className="mono-plate font-semibold">{truck.plate}</span>
```

### Cards

```tsx
{/* Dashboard Card - Reduced density */}
<div className="bg-white rounded-lg shadow-sm p-4">
  <div className="flex items-center gap-3 mb-4">
    <div className="p-2 bg-[#0a192f]/10 rounded-lg">
      <Icon className="w-5 h-5 text-[#0a192f]" />
    </div>
    <h3 className="text-base font-semibold text-slate-800">Title</h3>
  </div>
  {/* Content */}
</div>
```

### Progress Bars

```tsx
{/* Usage Progress Bar */}
<div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
  <div
    className="h-full rounded-full transition-all duration-500"
    style={{
      width: `${utilization_percent}%`,
      backgroundColor: getColor(percent) // emerald/amber/red
    }}
    role="progressbar"
    aria-valuenow={utilization_percent}
    aria-valuemin={0}
    aria-valuemax={100}
  />
</div>
```

## Accessibility

### Focus States

```css
/* Focus-visible - Only keyboard navigation */
*:focus-visible {
  @apply outline-none ring-2 ring-[#0a192f] ring-offset-2 rounded-lg;
}

/* No focus ring on mouse click */
button:focus:not(:focus-visible),
input:focus:not(:focus-visible) {
  @apply outline-none;
}
```

### Touch Targets

- Minimum size: `44px` height for touch targets
- Touch manipulation class for mobile: `touch-manipulation`

### Color Contrast

All text combinations meet WCAG AA standards (4.5:1 contrast ratio):
- Navy on white: **14.5:1** ✅
- White on navy: **14.5:1** ✅
- Slate on white: **7.1:1** ✅

## Responsive Design

### Mobile (< 768px)
```tsx
<div className="grid grid-cols-1 gap-4 p-4">
  {/* Single column layout */}
</div>
```

### Tablet (768px - 1024px)
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
  {/* 2 columns */}
</div>
```

### Desktop (≥ 1024px)
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
  {/* 2-3 columns */}
</div>
```

## Icon System

### Icon Library - Lucide React

```tsx
import { Truck, Users, Building2, Settings } from 'lucide-react';

{/* Standard icon sizing */}
<Truck size={20} className="text-[#0a192f]" />    /* Small */
<Truck size={24} className="text-[#0a192f]" />    /* Medium */
<Truck size={32} className="text-[#0a192f]" />    /* Large */
```

### Icon in Containers

```tsx
{/* Icon with background */}
<div className="p-2 bg-[#0a192f]/10 rounded-lg">
  <Truck className="w-5 h-5 text-[#0a192f]" />
</div>
```

## Examples

### Analytics Card

```tsx
<div className="bg-white rounded-lg shadow-sm p-4">
  <div className="flex items-center gap-3 mb-3">
    <div className="p-2 bg-[#0a192f]/10 rounded-lg">
      <Truck className="w-5 h-5 text-[#0a192f]" />
    </div>
    <h3 className="text-base font-semibold text-slate-800">Грузовики</h3>
  </div>

  <div className="flex items-baseline gap-2">
    <span className="text-2xl font-bold mono-number text-slate-900">
      {current}
    </span>
    <span className="text-slate-400">/</span>
    <span className="text-lg mono-number text-slate-600">
      {limit === -1 ? <span className="text-xl opacity-60">&infin;</span> : limit}
    </span>
  </div>
</div>
```

### Data Table Row

```tsx
<tr className="border-b border-slate-50 hover:bg-slate-50/50">
  <td className="py-3 px-2">
    <span className="mono-id mono-number text-slate-400">#{rank}</span>
  </td>
  <td className="py-3 px-2">
    <span className="text-sm font-medium text-slate-900">{name}</span>
  </td>
  <td className="py-3 px-2 text-right">
    <span className="mono-number text-slate-600">{value}</span>
  </td>
  <td className="py-3 px-2 text-right">
    <span className="mono-date text-sm text-slate-600">{dateString}</span>
  </td>
</tr>
```

### Active Tab Indicator

```tsx
{/* Active state */}
<button className="px-4 py-2 rounded-md text-sm font-medium
                    bg-white text-[#0a192f] shadow-sm">
  Active
</button>

{/* Inactive state */}
<button className="px-4 py-2 rounded-md text-sm font-medium
                    text-slate-600 hover:text-slate-900">
  Inactive
</button>
```

## CSS Variables

Defined in `src/index.css`:

```css
:root {
  /* Industrial Navy Theme */
  --industrial-navy: #0a192f;
  --industrial-navy-dark: #152238;
  --industrial-slate: #1e293b;
  --industrial-blue: #334155;
  --brand-blue: #3b82f6;
}

/* Utility Classes */
@layer components {
  .mono-id {
    @apply font-mono text-xs text-slate-500;
  }

  .mono-number {
    @apply font-mono;
  }

  .mono-date {
    @apply font-mono text-sm;
  }

  .mono-plate {
    @apply font-mono font-semibold;
  }

  .btn-industrial {
    @apply bg-[#0a192f] text-white hover:bg-[#152238] transition-colors;
  }

  .card-industrial {
    @apply bg-white rounded-lg shadow-sm p-4;
  }
}
```

## Migration Notes

### Color Migration

| Old (Indigo) | New (Deep Navy) |
|--------------|----------------|
| `indigo-600` | `#0a192f` |
| `indigo-700` | `#152238` |
| `indigo-50` | `#0a192f/10` |
| `indigo-100` | `#0a192f/10` |
| `indigo-500` | `#0a192f` |
| `indigo-900` | `#0a192f` |
| `text-indigo-400` (brand) | `#3b82f6` |

### Spacing Migration

| Old | New |
|-----|-----|
| `p-6` | `p-4` |
| `p-8` | `p-4` |
| `gap-6` | `gap-4` |
| `space-y-8` | `space-y-4` |
| `space-y-6` | `space-y-4` |
| `mb-6` | `mb-4` |
| `mb-8` | `mb-4` |

## Design Tokens

### Shadows

```css
/* Industrial shadow scale */
shadow-sm:   0 1px 2px 0 rgba(10, 25, 47, 0.05);
shadow:      0 1px 3px 0 rgba(10, 25, 47, 0.1),
             0 1px 2px -1px rgba(10, 25, 47, 0.1);
shadow-md:   0 4px 6px -1px rgba(10, 25, 47, 0.1),
             0 2px 4px -2px rgba(10, 25, 47, 0.1);
shadow-lg:   0 10px 15px -3px rgba(10, 25, 47, 0.1),
             0 4px 6px -4px rgba(10, 25, 47, 0.1);
```

### Border Radius

```css
/* Industrial corner radius */
rounded-lg:   0.5rem;   /* Cards, buttons */
rounded-md:   0.375rem; /* Small cards */
rounded-full: 9999px;   /* Pills, badges */
```

## Implementation Checklist

When adding new components to LogiShift:

- [ ] Use Deep Navy (`#0a192f`) for primary actions
- [ ] Use JetBrains Mono for all IDs, numbers, dates
- [ ] Apply `p-4` padding, not `p-6`
- [ ] Apply `gap-4` spacing, not `gap-6`
- [ ] Use `rounded-lg`, not `rounded-3xl`
- [ ] Use `shadow-sm`, not `shadow-lg`
- [ ] Add `mono-*` classes to data displays
- [ ] Ensure 44px minimum touch targets
- [ ] Test keyboard navigation focus states

---

**Version:** 1.0.0
**Shipped:** 2026-02-01
**Status:** ✅ Production Ready
