# Phase 9: Shift Modal Data Integrity - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

EditShiftModal displays complete and accurate shift data across History tab (audit trail), Comments tab, and conditional photo upload zones. All data loads asynchronously with appropriate loading states.
</domain>

<decisions>
## Implementation Decisions

### History Tab Presentation
- **Layout style:** Timeline list - single column with timestamp left-aligned, descriptions right-aligned
- **Metadata format:** Short format - "14 Feb 12:30 • User Name • Action"
- **Organization:** No grouping - all entries in one chronological list
- **Action type distinction:** Visual icons for different action types (edit, delete, status change, etc.)

### Comments Formatting & Display
- **Structure:** Flat chronological list - all comments shown chronologically with @mentions for replies
- **Header format:** Technical Header - [Name] • [Role Tag] • [DD.MM HH:mm (Mono)]
- **Content formatting:** Plain text with line breaks preserved (no markdown)
- **Code rendering:** JetBrains Mono font for code snippets, plain background, no syntax highlighting

### Loading Skeleton Design
- **Loading scope:** Tab-specific loading - skeleton only in active tab being loaded
- **Timing:** Show skeleton after 200ms delay to avoid flicker for fast loads
- **Animation style:** Shimmer pulse with gradient effect
- **Skeleton structure:** Content-aware - mimics actual content structure (timeline lines for history, comment blocks for comments)

### Conditional Photo Zones Behavior
- **Visibility transition:** Layout collapse - zones hidden and reserved space collapses (no animation)
- **Status indicators:** Technical Tags in JetBrains Mono - [ОБЯЗАТЕЛЬНО] (Required) or [ОПЦИОНАЛЬНО] (Optional)
- **Empty state:** Industrial Dropzone with Dashed Border + Icon + Technical Label
- **Persistence logic:** Smart Hybrid - Show if Required OR if Data Exists (zones stay visible if they have uploaded data even if settings change)

### Claude's Discretion
- Exact spacing and typography values within specified patterns
- Error state handling if API calls fail for history or comments
- Specific icon choices for action types (edit, delete, status change, etc.)

</decisions>

<specifics>
## Specific Ideas

- History timeline should feel like audit trail - professional, data-dense but readable
- Comments header format emphasizes technical precision with JetBrains Mono timestamps
- Photo zone tags use Russian language ([ОБЯЗАТЕЛЬНО]/[ОПЦИОНАЛЬНО]) matching LogiShift's primary language
- Industrial aesthetic for dropzones - dashed borders, technical labels, clean presentation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-shift-modal-data-integrity*
*Context gathered: 2026-02-12*
