# LogiShift Frontend - AI Directives

**Purpose:** Project-level AI directive document for LogiShift frontend development
**Last Updated:** 2026-02-11

---

## Section 1: Context Management Rules

Based on Context7 principles for just-in-time documentation retrieval and context isolation.

### Task Isolation

Prevent context bleeding between unrelated work.

**Signs of Context Bleeding:**
- AI references unrelated concepts from previous tasks
- Responses drift away from current domain
- Repetition of concepts covered in earlier tasks
- Token count grows without new relevant content

**Prevention:**
- Clear context between tasks (state "Task complete, starting new task")
- Load only task-relevant documentation
- Use `/clear` when switching domains
- Maintain reference lists, not loaded content

### Just-in-Time Loading

Load documentation when needed, not upfront.

**Load Order (Progressive Disclosure):**
1. Overview → 2. Specific → 3. Deep

**Pattern:**
```
# Bad: Pre-load everything
"Load all docs: README, ARCHITECTURE, CLAUDE, all source files"
# Token cost: 20,000+, stale quickly

# Good: JIT references
"Project: LogiShift PWA
Key files: CLAUDE.md, PROJECT.md
Use Read tool to explore as needed"
# Token cost: 50 tokens, always fresh
```

**Tool Usage:**
- Use Read tool for targeted file access
- Use Grep tool to find specific sections
- Use @-references for file pointers
- Load full files only when implementing specific features

### Lightweight References

Store IDs, not full content.

**Reference Types:**
| Type | Example | Usage |
|------|----------|-------|
| File Path | `src/components/DriverView.tsx` | Internal code navigation |
| Section Reference | `PROJECT.md#Requirements` | Long document navigation |
| URL | `https://react.dev/reference/react` | External documentation |

**Example:**
```markdown
## Task: Update authentication flow

### References (Load on Demand)
- Code: src/context/AuthContext.tsx (auth state)
- Code: src/components/LoginView.tsx (login UI)
- Docs: CLAUDE.md#Authentication (patterns)

### Load Sequence
1. Read AuthContext.tsx → understand current state
2. Grep for "login" → find related components
3. Read specific sections as needed
```

---

## Section 2: MDP (Minimalist Dense Prompting)

Based on Chain of Draft (CoD) research: 92.4% token reduction with 91% accuracy.

### Principle

Use Chain of Draft (CoD), not Chain of Thought (CoT).

**Target:** 50-70% token reduction on standard tasks

**Techniques:**
- Remove redundant explanations ("please", "could you")
- Use imperative mood
- Trust model reasoning with heuristics
- Use XML structure for clarity without verbosity

### When to Use Dense

Use for standard tasks:
- CRUD operations
- Refactoring
- Documentation updates
- Debugging

**Examples:**

```
# Verbose (80 tokens)
"Please analyze this code carefully. Look for any potential bugs or issues that might cause problems. Consider edge cases like null values, empty arrays, or unexpected input types."

# Dense (22 tokens)
"Analyze for bugs: null checks, edge cases, error handling. Report issues found."
```

### When to Use Verbose

Use verbose for:
- Novel architecture decisions
- Security-critical logic
- Educational content

**Decision Matrix:**

| Context | Use Dense | Use Verbose |
|----------|-----------|-------------|
| Familiar tech stack | Yes | No |
| Standard CRUD | Yes | No |
| Novel architecture | No | Yes |
| Security-critical | No | Yes |
| Quick iteration | Yes | No |

### XML Structure

Use GSD XML format for clarity without verbosity.

```xml
<task type="auto">
  <name>Short descriptive name</name>
  <files>file1.ts, file2.ts</files>
  <action>
    Imperative instructions here.
    Key points only.
  </action>
  <verify>
    - Check 1
    - Check 2
  </verify>
  <done>
    Clear definition of done.
  </done>
</task>
```

---

## Section 3: GSD Configuration

Configuration for Get Shit Done framework execution.

### Atomic Task Planning

- 2-3 tasks per plan maximum
- XML structure with `<action>`, `<verify>`, `<done>`
- Each task commits immediately after completion
- Clear definition of "done" built into every task

### Verification-First

- Every task has `<verify>` section
- Verification runs before marking complete
- Failed verification triggers fix plans

### Context Budgeting

- Target 50% utilization (not 100%)
- Leave room for tool outputs and discoveries
- Use sub-agents for work exceeding budget

### Automated Summaries

- Each plan creates SUMMARY.md with frontmatter
- Documents deviations, decisions, metrics
- Self-check validates all claims

---

## Section 4: LogiShift-Specific Directives

### Tech Stack

- **Framework:** React 18 with TypeScript
- **Build:** Vite
- **Styling:** TailwindCSS
- **Charts:** Recharts (time-series analytics)
- **Icons:** Lucide React
- **State:** React Context (AuthContext for user state)
- **API:** Custom `api.get()` wrapper (not axios directly)

### Naming Conventions

- **Files:** kebab-case (`DriverView.tsx`, `auth-context.ts`)
- **Variables:** camelCase (`userId`, `tenantId`)
- **Classes:** PascalCase (`AuthService`, `ShiftService`)
- **Constants:** UPPER_SNAKE_CASE (`API_BASE_URL`)

### API Patterns

- Use `api.get()`, `api.post()`, `api.put()`, `api.delete()`
- Returns data directly (not axios-style `.data` wrapper)
- All endpoints prefixed with `/api/v1`
- JWT authentication via `Authorization: Bearer ${token}` header

### State Management

- **User State:** AuthContext (single source of truth)
- **Component State:** useState for UI state
- **Form State:** Controlled components with onChange handlers
- **Demo State:** isDemoDriverMode flag + localStorage

### Theme

- **Primary:** Navy-900 (#0a192f)
- **Hover:** #152238
- **Gradient End:** #1e293b
- **Demo Accent:** Amber-500 (#f59e0b) for demo-specific UI
- **Focus Rings:** focus:ring-[#0a192f]/20 pattern

### Component Patterns

- **State Machine:** Driver shift workflow (idle → active → finished)
- **Role-Based Access:** ADMIN, FOREMAN, DRIVER roles
- **Error Handling:** AlertBoundary + toast notifications
- **Loading States:** Skeleton components, not spinners

---

## Section 5: Verification Checklist

Compliance verification for AI directive adherence.

- [ ] **Context isolation:** No cross-task document bleeding
- [ ] **JIT loading:** Documentation loaded on-demand via @-references
- [ ] **Dense prompts:** Instructions use imperative mood, minimal tokens
- [ ] **GSD structure:** Tasks use XML format with verification sections
- [ ] **Token budget:** Target 50% utilization, not 100%
- [ ] **Version awareness:** Library docs match actual package versions

---

## Metadata

**Document Version:** 1.0
**Last Updated:** 2026-02-11
**Valid Until:** 2026-03-11 (30 days - fast-evolving domain)

**Traceability:**
- Plan: quick-008
- Source: Context7 principles, MDP research, GSD best practices
- Related: PROJECT.md, CONVENTIONS.md, .planning/STATE.md
