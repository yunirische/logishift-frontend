---
phase: 09-shift-modal-data-integrity
plan: 02
type: execute
wave: 2
depends_on: [09-01]
subsystem: "EditShiftModal Comments Formatting"
tags: ["comments", "technical-header", "lazy-loading", "loading-skeleton"]

dependency_graph:
  requires:
    - phase: 09-shift-modal-data-integrity
      plan: 01
      reason: "Tabbed interface structure must exist before adding comment formatting"
  provides:
    - phase: 09-shift-modal-data-integrity
      plan: 03
      reason: "Comments formatting completes data display layer before photo zones"
  affects:
    - component: "EditShiftModal"
      reason: "Added comment loading states, formatting helpers, and updated Comments tab UI"

tech_stack:
  added: []
  patterns:
    - "Technical Header format: [Name] • [Role Tag] • [DD.MM HH:mm]"
    - "Role tag mapping with Russian labels (АДМИН/ВОДИТЕЛЬ/ПРОРАБ)"
    - "Loading skeleton with 200ms delay to avoid flicker"
    - "Tab-specific lazy loading for comments (fetches on tab activation)"
    - "API response normalization to Comment interface"
    - "Flat chronological list with @mention highlighting"
    - "Plain text rendering with whitespace-pre-wrap (line breaks preserved)"
    - "JetBrains Mono for timestamps (font-mono class)"

key_files:
  created: []
  modified:
    - path: "src/components/EditShiftModal.tsx"
      changes: "Extended Comment interface, added loading states, formatCommentHeader helper, formatCommentText helper, updated loadComments with normalization, lazy loading useEffects, redesigned Comments tab UI"

decisions:
  - "Role tag labels use Russian: АДМИН/ВОДИТЕЛЬ/ПРОРАБ per CONTEXT.md decision"
  - "Comments load lazily when Comments tab activates (not modal open) for better performance"
  - "Loading skeleton shows after 200ms delay to prevent flicker on fast API responses"
  - "API response normalizes various field names (author/user/user_name, role/user_role/author_role) to Comment interface"
  - "Technical Header format: [Name] • [Role Tag] • [DD.MM HH:mm (Mono)]"
  - "JetBrains Mono equivalent via font-mono Tailwind class for timestamps"
  - "Plain text content (no markdown) with whitespace-pre-wrap to preserve line breaks"
  - "@mentions detected via regex and highlighted in navy color (#0a192f)"

metrics:
  duration: "5 minutes"
  completed_date: "2026-02-13T00:03:00Z"
  tasks_completed: 4
  files_modified: 1
  commits: 2
  deviations: 0

---

# Phase 09 Plan 02: Comments Formatting & Display - Summary

**One-liner:** Implemented Comments tab with Technical Header formatting, 200ms loading skeleton delay, tab-specific lazy loading, and @mention highlighting.

## Objective

Add proper comment formatting to EditShiftModal Comments tab per user decisions. Previously, comments displayed with basic timestamp format and no role information. This plan implements Technical Header format ([Name] • [Role Tag] • [DD.MM HH:mm (Mono)]), role tags with Russian labels, loading skeleton with 200ms delay, flat chronological list, and @mention highlighting.

## What Was Built

### 1. Extended Comment Interface

Added support for role information and @mentions:

```typescript
interface Comment {
  id: number;
  text: string;
  author: string;
  author_role?: string; // Role tag (admin/driver/foreman)
  created_at: string;
  reply_to?: number; // For @mentions
  mentions?: string[]; // Array of mentioned usernames
}
```

**Key Features:**
- `author_role` enables role tag display in headers
- `reply_to` and `mentions` support future @mention functionality
- Optional fields allow graceful degradation if backend doesn't provide them

### 2. Loading States with 200ms Skeleton Delay

Added three new states for comments:

```typescript
const [loadingComments, setLoadingComments] = useState(false);
const [showCommentsSkeleton, setShowCommentsSkeleton] = useState(false);
const [commentsError, setCommentsError] = useState<string | null>(null);
```

**200ms Delay Logic:**
```typescript
const skeletonTimer = setTimeout(() => {
  if (loadingComments) {
    setShowCommentsSkeleton(true);
  }
}, 200);
```

**Benefits:**
- Prevents flicker for fast API responses (<200ms)
- Shows skeleton for slower responses
- Clear visual feedback during loading

**Skeleton UI:**
- 3 shimmer blocks with `animate-pulse`
- Mimics actual comment structure (header bar + content block)
- `bg-slate-200 rounded` for realistic placeholder appearance

### 3. Tab-Specific Lazy Loading

**Removed from modal open effect:**
```typescript
// OLD: Always loaded on modal open
loadComments();
```

**Added tab-specific useEffect:**
```typescript
useEffect(() => {
  if (activeTab === 'comments' && comments.length === 0 && !loadingComments) {
    loadComments();
  }
}, [activeTab]);
```

**Benefits:**
- Comments fetch only when Comments tab is clicked
- Reduces initial modal load time
- Avoids unnecessary API calls if user never views Comments tab
- Only loads once (comments.length === 0 check)

### 4. API Response Normalization

Updated `loadComments` to normalize various API response formats:

```typescript
normalizedComments = data.comments.map((c: any) => ({
  id: c.id,
  text: c.text || c.comment || '',
  author: c.author || c.user || c.user_name || 'Неизвестно',
  author_role: c.author_role || c.user_role || c.role || undefined,
  created_at: c.created_at || c.timestamp || new Date().toISOString(),
  reply_to: c.reply_to || c.in_reply_to || undefined,
  mentions: c.mentions || undefined,
}));
```

**Handles Multiple Field Names:**
- Author: `author`, `user`, `user_name`
- Role: `author_role`, `user_role`, `role`
- Text: `text`, `comment`
- Reply: `reply_to`, `in_reply_to`

**Graceful Fallback:**
- Defaults to 'Неизвестно' if author missing
- Uses `undefined` for optional fields
- Prevents crashes on missing data

### 5. formatCommentHeader Helper

Implements Technical Header format per CONTEXT.md decision:

```typescript
const formatCommentHeader = (comment: Comment) => {
  // Format: [Name] • [Role Tag] • [DD.MM HH:mm]
  const date = new Date(comment.created_at);
  const dayMonth = date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit'
  }); // "14.02"
  const time = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  }); // "12:30"

  // Role tag mapping (Russian labels)
  const roleLabels: Record<string, string> = {
    'admin': 'АДМИН',
    'driver': 'ВОДИТЕЛЬ',
    'foreman': 'ПРОРАБ'
  };
  const roleTag = comment.author_role
    ? roleLabels[comment.author_role] || comment.author_role.toUpperCase()
    : null;

  return {
    name: comment.author,
    roleTag,
    timestamp: `${dayMonth} ${time}`
  };
};
```

**Output Example:**
- With role: `{ name: "Иван", roleTag: "ВОДИТЕЛЬ", timestamp: "14.02 12:30" }`
- Without role: `{ name: "Мария", roleTag: null, timestamp: "14.02 12:30" }`

### 6. formatCommentText Helper

Detects and highlights @mentions:

```typescript
const formatCommentText = (text: string) => {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return <span key={index} className="text-[#0a192f] font-semibold">{part}</span>;
    }
    return part;
  });
};
```

**Features:**
- Regex: `/(@\w+)/g` detects @mentions
- Wraps in navy-colored span: `text-[#0a192f] font-semibold`
- Preserves plain text for non-mentions
- No markdown rendering (as per CONTEXT.md decision)

### 7. Updated Comments Tab UI

**Structure:**
1. **Header:** "Комментарии" with MessageSquare icon
2. **Loading Skeleton:** 3 shimmer blocks (200ms delay)
3. **Comments List:** Chronological with max-h-64 overflow
4. **Empty State:** "Комментарии отсутствуют"
5. **Error State:** Red text + "Повторить попытку" button
6. **New Comment:** Always-visible textarea

**Comment Block Layout:**
```tsx
<div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
  {/* Technical Header */}
  <div className="flex items-center gap-2 mb-2 flex-wrap">
    <span className="text-sm font-semibold text-slate-700">{header.name}</span>
    {header.roleTag && (
      <>
        <span className="text-slate-400">•</span>
        <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded">
          {header.roleTag}
        </span>
      </>
    )}
    <span className="text-slate-400">•</span>
    <span className="text-xs text-slate-400 font-mono">{header.timestamp}</span>
  </div>
  {/* Comment Content */}
  <p className="text-sm text-slate-600 whitespace-pre-wrap">
    {formatCommentText(comment.text)}
  </p>
</div>
```

**Styling Details:**
- Technical tags: `px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded`
- Timestamp: `text-xs text-slate-400 font-mono` (JetBrains Mono equivalent)
- Content: `whitespace-pre-wrap` preserves line breaks
- Separator: `text-slate-400` bullets (•)
- Space-y-4 for comment separation

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

### Auth Gates

None encountered.

## Commits

| Hash | Type | Message |
| ------ | ---- | ------- |
| 5695339 | feat | add Comment type with role information for technical header formatting |
| c23bdc9 | feat | implement Comments tab with Technical Header formatting and loading states |

## Verification Results

### 1. Comment Interface Verification
- ✅ Comment interface includes author_role field
- ✅ reply_to and mentions fields are defined
- ✅ loadComments normalizes role field from API response

### 2. formatCommentHeader Helper Verification
- ✅ formatCommentHeader function exists
- ✅ Returns object with name, roleTag, timestamp
- ✅ Timestamp format matches "DD.MM HH:mm" pattern (14.02 12:30)
- ✅ @mention handling exists for reply_to and mentions
- ✅ Role tag mapping includes Russian labels (АДМИН/ВОДИТЕЛЬ/ПРОРАБ)

### 3. Loading States Verification
- ✅ loadingComments, showCommentsSkeleton, commentsError states exist
- ✅ 200ms delay logic exists before showing skeleton
- ✅ Comments tab renders with correct structure
- ✅ Header format matches "[Name] • [Role Tag] • [DD.MM HH:mm]"
- ✅ Timestamp uses font-mono (JetBrains Mono equivalent)
- ✅ Skeleton mimics comment structure with shimmer animation

### 4. Tab-Specific Loading Verification
- ✅ loadComments uses API_ENDPOINTS.GET_SHIFT
- ✅ useEffect exists for Comments tab activation
- ✅ Initial modal open no longer calls loadComments
- ✅ @mention rendering highlights mentioned names
- ✅ Empty state: "Комментарии отсутствуют"
- ✅ Error state includes Retry button
- ✅ Line breaks preserved via whitespace-pre-wrap
- ✅ No markdown rendering (plain text only)

## Success Criteria Achieved

- [x] Comments tab displays shift comments with proper JetBrains Mono formatting
- [x] Technical Header format: [Name] • [Role Tag] • [DD.MM HH:mm (Mono)]
- [x] Comments display as flat chronological list with @mentions highlighted
- [x] Comment content uses plain text with line breaks preserved (no markdown)
- [x] Loading skeleton shows after 200ms delay with shimmer animation
- [x] Tab-specific loading: comments fetch when Comments tab activates
- [x] Empty and error states handled appropriately
- [x] Role tags display Russian labels (АДМИН/ВОДИТЕЛЬ/ПРОРАБ)

## Next Steps

Plan 09-03a (Conditional Photo Zones - Part 1) will build on this tabbed interface by implementing technical tags ([ОБЯЗАТЕЛЬНО]/[ОПЦИОНАЛЬНО]) and Industrial Dropzone styling per CONTEXT.md decisions.
