# UX_DOCTRINE.md — HRMS Design System

**Project:** Origin FGL HRMS/CRM · **Owner:** Berke Dışbudak · **Version:** 1.0 (living document)
**Companion:** `CODEX_BRIEF.md` (product + backend contract). On any UX conflict, **this document wins**.
**Stack contract:** React + TypeScript · Shadcn/ui (as base, overridden by these tokens) · Tailwind CSS · Phosphor Icons · FastAPI + LangGraph async agent backend · Codex as implementer.

---

## 0 · Purpose & How to Read This

This document encodes design as **decisions, not suggestions**. Every rule is written to be enforceable in code review. When implementing any screen or component, the agent (Codex/Claude) must be able to answer: *which section of the doctrine permits this?* If no section permits it, it does not ship.

Lineage, for the record:
- **Architecture logic** → Rippling: one employee entity, many module views.
- **Interaction patterns** → Personio: validation timing, disclosure model, inbox-centric workflow. Patterns are borrowed; **visual identity is not**.
- **Execution discipline** → Linear: hierarchy through weight/opacity, density, frequency-gated motion.
- **Identity** → Bauhaus/Deco: expression through proportion and precision, never ornament.

---

## 1 · The Triad — Expressive · Intuitive · Balanced

These three goals are in tension. The doctrine resolves the tension with three laws:

1. **Expression lives in structure and moments, never in chrome or repetition.**
   Anything a user sees or does 20+ times a day must be visually silent. Anything seen rarely (empty state, onboarding, milestone) may carry personality.
2. **Intuition = consistency + orientation.**
   Every element behaves the same way everywhere. Every transition answers "where did this come from / where did it go." A user should never ask *where am I?*
3. **Balance = budgets.**
   Motion budget: one mover per interaction. Attention budget: one accent-colored element per viewport region. Expression budget: defined zones only (§8).

**The Three-Question Test** — every shipped screen must answer, without the user reading body text:
- Where am I? *(nav state, breadcrumb, page title)*
- What changed? *(pending/confirmed state, toast, badge delta)*
- What's next? *(one visually primary action, maximum)*

---

## 2 · Architecture Model

### 2.1 Single-Entity Core (Rippling logic)
The **Employee** is one canonical object. Modules (Time, Documents, Payroll-prep, Performance, Recruitment→hire) are *views and event streams over that object*, never separate silos. UI consequence: the employee profile is the hub; every module screen can deep-link back to it in one click; no data is ever re-entered.

### 2.2 Progressive Disclosure — L0 / L1 / L2
| Level | Surface | Content | Load |
|---|---|---|---|
| **L0** | Dashboard / list rows | Identity + status + 1–2 metrics | Eager |
| **L1** | Side panel (§6.2) | Summary blocks, quick actions | On open |
| **L2** | Full record tabs | Complete data, history, edit | Lazy per tab |

Default view is always the summary; detail arrives on demand (Personio 2024 redesign lesson: home focused on the person and their team, widgets expand into detail). A 40-field form on first click is a doctrine violation.

---

## 3 · Foundations (Design Tokens)

Dark-first (primary theme). Light theme tokens defined in parallel; both ship.

### 3.1 Color

**Neutrals — dark (primary):**
| Token | Value | Use |
|---|---|---|
| `--bg` | `#0F0F11` | App canvas (near-black, never pure) |
| `--surface` | `#18181B` | Cards, panels, sidebar |
| `--surface-raised` | `#1F1F24` | Menus, palette, hover surfaces |
| `--border` | `rgba(255,255,255,0.08)` | Default 1px borders |
| `--border-strong` | `rgba(255,255,255,0.14)` | Inputs, focused containers |
| `--text-primary` | `#F4F4F5` | Headings, values |
| `--text-secondary` | `#A1A1AA` | Labels, meta |
| `--text-tertiary` | `#71717A` | Placeholders, disabled |

**Neutrals — light:** canvas `#FAFAF9`, surface `#FFFFFF`, border `#E7E5E4`, text `#1C1917 / #57534E / #A8A29E`.

**Accent (single, interactive only):**
- Current ratified value: `--accent: #6366F1` (indigo — per CODEX_BRIEF). Tint: `--accent-subtle: rgba(99,102,241,0.10)`.
- *Pending ratification:* petrol variant `#0D9488` (light) / `#2DD4BF` (dark) — increases distance from Linear's visual field if originality is prioritized. Swap is one token; nothing else changes. **Decide once, then frozen.**

**Semantic (status only — dots, pills, inline text; never large fills):**
`--success: #22C55E` · `--warning: #F59E0B` · `--danger: #EF4444` · `--info:` accent. Tinted backgrounds at 10% alpha maximum.

**Hierarchy rule (Linear discipline):** rank information with **weight and opacity, not color**. Color carries exactly two meanings in this system: *interactive* (accent) and *status* (semantic). Everything else is neutral.

### 3.2 Typography
| Role | Face | Notes |
|---|---|---|
| UI / body | `Inter Variable` | `-0.011em` tracking at 14px+ |
| Data / IDs | `JetBrains Mono` or `Geist Mono` | Employee IDs, dates in tables, BL-style codes — **always `tabular-nums`** |
| Display (expression zone only) | Inter at display sizes, or optional `--font-display` slot | Hero metrics only (§8.3) |

**Scale:** 11 (micro labels, uppercase `+0.08em`) · 12 (meta) · 13 (dense UI, table cells) · **14 (base)** · 16 (section titles) · 20 (page titles) · 32–44 (hero metrics only).
**Weights:** 400 / 500 / 600. Never more than three weights per screen. Line-height 1.5 body, 1.2 headings.

### 3.3 Spacing & Grid
Base unit **4px**; rhythm on **8px**. Scale: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`. Any spacing value outside this scale is a bug.
Page gutter 24px · section gap 24px · card gap 16px · card padding 20px.

### 3.4 Radius · Borders · Elevation
Radius: `6` inputs/buttons · `8` cards · `12` panels/modals · `full` pills/avatars.
**Borders-first philosophy:** cards and containers separate by 1px low-alpha border, **not shadow**. Only two shadows exist:
- `--shadow-overlay:` side panels, menus — `0 4px 24px rgba(0,0,0,0.32)`
- `--shadow-pop:` command palette — `0 16px 48px rgba(0,0,0,0.44)`

### 3.5 Iconography — Phosphor
- Weight `regular`, 16px inline / 20px nav. Active nav item may use `fill`.
- `duotone` is **reserved for expression zones** (empty states, onboarding) — this makes the expressive register instantly recognizable.
- Icon-only buttons require tooltips (300ms delay). No decorative icons in table cells.

---

## 4 · Motion System

Core requirement (ratified): **"animated but invisible."** Motion orients; it never performs. (Kowalski principle: animation as orientation, not decoration.)

### 4.1 Tokens
| Token | Value | Use |
|---|---|---|
| `--motion-instant` | 0ms | Color/state changes on high-frequency actions |
| `--motion-fast` | 120ms | Hover, press, fades |
| `--motion-base` | 180ms | Most reveals, panel content |
| `--motion-panel` | 280ms | Side panel slide, palette |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | Default (enter) |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Reversible moves |

### 4.2 The Six Laws
1. **One Mover.** One animated element per interaction. Sequential, never simultaneous.
2. **Orientation.** Every motion encodes origin/destination: panels slide from the edge they belong to; palette scales from top-center 0.98→1; toasts rise from bottom-left. Nothing fades in from nowhere.
3. **Frequency Gate.** Actions performed 100+ times/day (approve, row open, nav) get ≤120ms transitions or none. Springs are forbidden on repeated paths; one spring (`stiffness 260 / damping 24`) is permitted only for rare, celebratory moments (onboarding complete).
4. **Content is sacred.** Never animate layout of data the user is currently reading. New rows appear; existing rows do not shuffle.
5. **Stagger cap:** ≤3 items × 30ms. Lists beyond that appear at once.
6. **`prefers-reduced-motion`:** everything collapses to 80ms opacity fades. Non-negotiable.

### 4.3 Loading
- **Skeletons, never spinners**, mirroring final layout. Shimmer 1.6s linear.
- Skeletons appear only if wait exceeds **200ms** (no flash on fast responses).
- In-button pending state is the one exception where a 12px inline indicator is allowed (§5.2).

---

## 5 · Interaction Model

### 5.1 Keyboard-First
| Key | Action |
|---|---|
| `⌘K / Ctrl+K` | Command palette (global: navigate, search employees, run actions) |
| `g d · g e · g i` | Go to Dashboard / Employees / Inbox |
| `j / k`, `↑ ↓` | List navigation |
| `Enter` / `Esc` | Open row → panel / close panel |
| `x` | Select row (batch) |
| `a` / `r` | Approve / Reject (reject opens reason field) |
| `/` | Focus list search |
| `?` | Shortcut overlay |

Every keyboard path has a pointer equivalent; the reverse is also mandatory.

### 5.2 State Pattern — **Acknowledged, not Optimistic** *(correction)*
This doctrine **supersedes** the earlier optimistic-UI recommendation from design discussions. The backend is an async agent pipeline (LangGraph); silent rollbacks of optimistic writes would lie to the user. Ratified pattern (per CODEX_BRIEF): **confirmed-state fetching with instant acknowledgment**:

1. **≤100ms:** control enters pending — button label swaps (`Approve → Approving…`), row dims to 60% opacity with a left accent hairline. The click is *acknowledged* immediately even though data is not yet true.
2. **On confirm:** state swaps, single toast (`Approved`), row settles.
3. **On failure:** pending clears, inline error at the point of action (never only a toast), original state restored.
4. **Undo** exists only where the backend exposes a compensating action; otherwise destructive actions get a confirm dialog *before*, never an apology after.

### 5.3 Forms (Personio-derived timing)
- Validate on **blur**; after first error, revalidate on change. Never on keystroke while pristine.
- Labels above fields, 12px/500, secondary color. Help text 12px tertiary. Errors inline, danger color + icon, field border → danger.
- **Autosave** drafts (800ms debounce) with a "Saved" whisper in the header — fades in/out at 120ms, no toast.
- Multi-select: chips collapse to `+N` beyond 3 (Personio pattern). Date ranges: two-click range with hover preview.

---

## 6 · Layout System

### 6.1 App Shell
```
┌──────────────┬──────────────────────────────┬─────────────┐
│ Sidebar 240  │ Header 48 (breadcrumb+actions│ Context     │
│ (collapse 64)│──────────────────────────────│ Panel 420   │
│ nav 36px rows│ Content · max-w 1200 · p-24  │ (on demand) │
│ role-based   │ tables full-bleed, 24 gutters│             │
└──────────────┴──────────────────────────────┴─────────────┘
```
Nav group labels: 11px / 600 / uppercase / `+0.08em` / tertiary. Active item: `--accent-subtle` background + accent text — the only colored nav element.

### 6.2 Panel-over-Modal Doctrine
Record detail, edits, approvals → **side panel** (slides from right, 280ms, scrim 40% below 1440px, pushes content at ≥1440px). URL-addressable (`?panel=emp_123`).
**Modals only for:** destructive confirmations (2 buttons max) and the command palette. Modal-over-modal is forbidden.

### 6.3 Density
Two modes, persisted per user: **Comfortable** (44px table rows — ratified) / **Compact** (36px, paddings ×0.75). Linear's 28–32px extremes are deliberately not adopted; HR staff are not developers.

---

## 7 · Component Specifications

- **Button.** Heights 32/36. Primary = accent fill; Secondary = surface + border; Ghost = text only; Danger = outline until hover. One primary per view region. No gradients, ever.
- **Input.** Height 36, radius 6, `--border-strong`, focus = 2px accent ring (`focus-visible` only). Prefix icons 16px tertiary.
- **Select / Combobox.** Menu on `--surface-raised` + `--shadow-overlay`, 120ms fade-scale 0.98→1, keyboard-complete, virtualized past 50 items.
- **Table.** The workhorse. Sticky header (12px/500/uppercase labels), row 44/36, hover = surface-raised + actions reveal at 120ms, mono+tabular for numeric/ID columns, sort inline, empty state per §8.
- **Status Pill.** Dot (6px semantic) + 12px label, tinted bg ≤10% alpha, radius full. Status is the *only* place semantic color appears at rest.
- **Toast.** Bottom-left, one visible (queue behind), 4s auto-dismiss, action slot (Undo). Enters +8px rise, 180ms.
- **Command Palette.** ⌘K, top-center, `--shadow-pop`, sections: Navigate / Employees / Actions. Recents first. Fuzzy match with mono highlighting.
- **Side Panel.** Header (title, status pill, ⋯ menu, Esc/× close) · summary blocks · footer actions. Content fades in 180ms *after* slide completes (One Mover).
- **Tabs.** Underline style, 2px accent indicator slides 180ms between tabs (allowed: it's orientation). Lazy-mount content.
- **Empty State.** Expression zone: Phosphor `duotone` 48px accent-tinted, one line ≤8 words, one primary action. Errors: state what happened + how to fix; never apologize, never vague.

---

## 8 · Expression Budget

Where the "Expressive" third of the triad lives — and nowhere else.

### 8.1 Allowed zones
Empty states · onboarding/first-run · milestone moments (rare, one spring permitted) · login screen · the dashboard hero metrics (§8.3).

### 8.2 Forbidden zones
Tables · forms · navigation · any flow executed daily. These are tools; tools are silent.

### 8.3 The Signature — Deco Numerals
One memorable element, executed with precision (Bauhaus rule: proportion, not ornament):
Dashboard hero metrics render at **40–44px / 600 / `tabular-nums`**, each capped by a **letterspaced 11px uppercase overline label** and a **1px hairline rule** above. Change deltas sit 13px mono to the right in semantic color. No icons, no gradients, no cards — just type, rule, number. This device appears *only* on L0 hero metrics; scarcity is what makes it a signature.

---

## 9 · Screen Blueprints

**Dashboard (L0).** Greeting + date (13px secondary) → hero metric strip (§8.3: headcount, pending approvals, on-leave-today, open positions) → "Needs attention" (top-5 inbox items, keyboard-ready) → team status strip. No charts by default; charts render on demand and draw **once** (400ms), then hold static.

**Employee Profile (L1→L2).** Header card: avatar, name (16/600), role + department (13 secondary), status pill, quick actions (⋯). Tab rail: Overview (default) · Employment · Time · Documents · Performance — lazy per tab. Overview = summary blocks, each with a quiet "View all →" into its tab. All module data joins back to this single entity (§2.1).

**Approval Inbox.** Split view: list 400px (requester, type, age — j/k navigable) + detail right. `a` approve / `r` reject-with-reason, batch via `x`. Acknowledged-state pattern (§5.2) throughout; zero celebratory motion (frequency gate).

---

## 10 · Anti-Patterns (hard NOs)

Gradient or glow on interactive elements · float-on-hover cards · neon borders · scale >1.02 on hover · more than one accent element per region · charts animating on revisit · hover-only critical actions · modal stacks · >1 concurrent toast · spinner as page loading · parallax or scroll-triggered decoration · skeleton flash under 200ms · animated route transitions on content · 3+ typefaces on one screen · pure black `#000` or pure white surfaces in dark mode · semantic color used decoratively.

---

## 11 · Fatigue Audit — Ship Gate

Every screen passes all twelve before merge:

1. Three-Question Test passes without reading body text (§1).
2. ≤1 mover per interaction; ≤1 accent element per region.
3. Primary action reachable in ≤2 interactions from screen entry.
4. All spacing values on the 4/8 scale; all type on the scale in §3.2.
5. Numeric/ID columns are mono + `tabular-nums`.
6. High-frequency actions (§4.2 Law 3): ≤120ms or no motion.
7. Pending → confirmed → failure states all designed (no "loading forever" path).
8. Empty, error, and zero-permission states exist and follow §7/§8.
9. Full keyboard path exists; `focus-visible` ring on everything focusable.
10. Contrast AA minimum (body 4.5:1); hit targets ≥32px pointer / 44px touch.
11. `prefers-reduced-motion` verified.
12. Screenshot compared against the last merged screen — hierarchy language identical.

---

## 12 · Implementation Notes

**Tailwind (v4 `@theme`) — tokens are the single source:**
```css
@theme {
  --color-bg: #0F0F11;
  --color-surface: #18181B;
  --color-surface-raised: #1F1F24;
  --color-accent: #6366F1;            /* swap point — see §3.1 */
  --color-accent-subtle: rgb(99 102 241 / 0.10);
  --radius-card: 8px;
  --ease-out: cubic-bezier(0.2, 0, 0, 1);
  --duration-fast: 120ms; --duration-base: 180ms; --duration-panel: 280ms;
}
```
- **Shadcn/ui** components are retained but re-themed exclusively through these variables; no per-component color literals. Delete default shadows in favor of §3.4.
- **Motion:** CSS transitions first. `framer-motion` only for Side Panel, Command Palette, Toast (the three orchestrated movers). Anything else using framer is a review flag.
- **Icons:** import Phosphor per-icon; `regular` default, `duotone` gated to expression zones by a lint rule if possible.
- **Data fetching:** TanStack Query with confirmed-state invalidation; pending UI driven by mutation state, not local guesses (§5.2).
- **A11y floor:** ARIA on palette/panel/tabs, labelled icon buttons, focus trap in panel, Esc always closes topmost surface.

---

*End of doctrine. Amendments require a version bump and a one-line changelog entry below.*

**Changelog**
- v1.0 — Initial doctrine. Consolidates CODEX_BRIEF UX decisions + Rippling entity model + Personio interaction patterns + expression-budget system. Supersedes prior optimistic-UI guidance with acknowledged-state pattern.
