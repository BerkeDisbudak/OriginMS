# STACK_SPEC.md — System Architecture & Library Manifest

**Project:** Origin FGL HRMS/CRM · **Owner:** Berke Dışbudak · **Version:** 1.0
**Companion set:** `CODEX_BRIEF.md` (product) · `UX_DOCTRINE.md` (visual law — wins all UX conflicts) · `MOTION_SPEC.md` (motion implementation).
**This document owns:** wiring, dependencies, layer boundaries, tooling. Versions below are the current majors; install latest within the major and pin via lockfile.

---

## 1 · Architecture Thesis — Two Worlds, One Contract

The UI world and the HRMS world never touch directly. **The OpenAPI contract is the only seam.**

```
┌─ HRMS WORLD (FastAPI) ─────────────────────┐      ┌─ UI WORLD (Next.js) ──────────────────┐
│ routers (thin, HTTP only)                  │      │ app/       routes, zero logic         │
│   └─ services (use-cases, transactions)    │      │ features/  screen compositions        │
│       └─ domain (Pydantic v2 entities,     │ Open │   ├─ ui/      design system (doctrine)│
│            approval state machine, RBAC,   │ API  │   ├─ api/     generated client + hooks│
│            audit rules)                    │──────│   └─ domain/  pure-TS HRMS logic      │
│           └─ repositories (Postgres/       │ json │ lib/       cross-cutting utils        │
│                Supabase)                   │      │                                       │
│ agents/ (LangGraph) — isolated module,     │      │ Acknowledged-state (doctrine §5.2):   │
│   governance endpoints, SSE progress       │      │  mutation → isPending UI → server     │
└────────────────────────────────────────────┘      │  confirm → invalidate → settle        │
                                                    └───────────────────────────────────────┘
```

**Type flow (single source of truth):** Pydantic models → FastAPI's `openapi.json` → codegen (`@hey-api/openapi-ts`) → typed client + TanStack Query hooks. Nobody hand-writes a request type. CI regenerates the client and **fails on drift** — the contract cannot silently diverge.

**Long-running agent operations:** endpoint returns `202 + task_id`; frontend subscribes to `GET /tasks/{id}/events` (SSE) and drives the pending UI from events. No polling loops, no optimistic lies.

---

## 2 · Frontend Layering — the UI / Logic Separation

```
src/
  app/        Next.js App Router. Routing shell only. Imports: features.
  features/   Screen compositions (Dashboard, EmployeeProfile, ApprovalInbox…).
              The ONLY layer allowed to import ui + api + domain together.
  ui/         The design system. Doctrine-owned primitives, tokens, ui/motion/*.
              Imports: NOTHING from domain or api. Knows no HRMS concept.
  domain/     Pure TypeScript HRMS logic: approval lifecycle state machine,
              permission predicates, leave-balance math, formatters.
              Imports: generated types only. NO React, NO fetch.
  api/        Generated client + query/mutation hooks. Imports: domain types.
  lib/        Generic utils (cn, dates, keyboard). No React state.
```

**Dependency rules (one-way, machine-enforced):**

| From ↓ may import → | app | features | ui | api | domain | lib |
|---|---|---|---|---|---|---|
| **app** | — | ✓ | ✓ | ✗ | ✗ | ✓ |
| **features** | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **ui** | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ |
| **api** | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| **domain** | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |

Why this shape: `ui/` isolation is what makes the doctrine enforceable — a Button physically cannot grow HRMS logic; `domain/` purity is what makes approval rules unit-testable without a DOM; and a code agent (Codex/Claude Code) inherits the boundaries because the build breaks when it violates them, not a reviewer's memory.

---

## 3 · Library Manifest

| Package | Role | Doctrine / spec hook |
|---|---|---|
| `next` (15+, App Router) | Shell, RSC for L0 reads | Vercel deploy continuity |
| `react` 19 · `typescript` (strict) | Base | — |
| `tailwindcss` v4 | Token engine via `@theme` | Doctrine §3, single source |
| `shadcn/ui` + Radix primitives | Behavior layer, re-themed only through tokens | A11y floor; no color literals |
| `motion` | Three movers + `layoutId` **only** | MOTION_SPEC §1 |
| `@phosphor-icons/react` | Icons, per-icon import, weight prop | §3.5 (duotone = expression zones) |
| `@tanstack/react-query` v5 | Server state; `isPending` drives acknowledged UI | §5.2 |
| `@tanstack/react-table` v8 | Headless workhorse table | §7 — full visual control |
| `@tanstack/react-virtual` | Lists >50 rows | MOTION_SPEC §10.3 |
| `react-hook-form` + `zod` (v4) | Forms; `mode:'onBlur'`, `reValidateMode:'onChange'` | §5.3 exactly |
| `@hey-api/openapi-ts` (+ TanStack plugin) | FastAPI contract → typed hooks (alt: `orval`) | §1 type flow |
| `cmdk` | ⌘K palette core | §7 |
| `sonner` | Toast queue, bottom-left, max 1 visible | §7 |
| `nuqs` | Type-safe URL state (`?panel=emp_123`) | §6.2 addressable panel |
| `zustand` | UI-only client state (density, selection, sidebar) | Small, no ceremony |
| `date-fns` v4 + `react-day-picker` | Dates + picker base | §7 range behavior |
| `recharts` (via shadcn charts) | On-demand, draw-once charts | §9 dashboard rule |
| `next/font` — Inter Variable + JetBrains Mono | Self-hosted, zero CLS | §3.2 |

```bash
pnpm add motion @phosphor-icons/react @tanstack/react-query @tanstack/react-table \
  @tanstack/react-virtual react-hook-form zod cmdk sonner nuqs zustand date-fns \
  react-day-picker recharts
pnpm add -D @hey-api/openapi-ts dependency-cruiser @biomejs/biome vitest \
  @testing-library/react playwright @playwright/test storybook
```

---

## 4 · Tooling & Quality Gates

- **Biome** — lint + format, one tool, one config. Replaces the ESLint/Prettier pair.
- **dependency-cruiser** — enforces §2's matrix *and* MOTION_SPEC's engine allocation (`motion` importable only from `src/ui/motion`). Runs in CI; violation = red build. This choice deliberately avoids reintroducing ESLint just for boundary plugins.
- **Vitest + Testing Library** — `domain/` at high coverage (pure functions, state machine transitions); component tests for `ui/` behavior.
- **Playwright** — the doctrine's automated ship gate: full keyboard paths (§5.1), reduced-motion run, panel interrupt-spam test, 6× CPU-throttle smoke (MOTION_SPEC §10.5), and `toHaveScreenshot` diffs against last merged screens (§11.12) — no visual-diff SaaS needed.
- **Storybook** — `ui/` workshop with a11y addon; each mover carries default / interrupt-spam / reduced-motion stories (MOTION_SPEC §11).
- **CI order:** typecheck → Biome → depcruise → unit → contract regen (fail on drift) → Playwright.

Ship-gate mapping: doctrine §11 items 4, 6, 7, 9, 10, 11, 12 are automated by the above; items 1–3, 5, 8 remain human review.

---

## 5 · Visual Enhancement Toolchain

- **Token pipeline:** CSS `@theme` is the single source; no Figma dependency. If design files become necessary later, export tokens outward (Tokens Studio) — never inward.
- **`linear()` generator** — for regenerating the spring curve in MOTION_SPEC §2 when retuned.
- **React Scan / React DevTools Profiler** — re-render hunting before any perf tuning; most "janky animation" reports are render storms, not animation bugs.
- **Playwright screenshots on Storybook stories** — the §11.12 visual-consistency check, free and local.
- **Avatar initials** — a 10-line util (hash name → neutral bg + initials), not a library.
- **Org chart** — deferred; when needed, a d3-based renderer behind its own `features/org-chart` boundary. Do not pre-install.

---

## 6 · Anti-Manifest — deliberately NOT installed

- **No second component kit** (MUI, Ant, Mantine, Chakra) — theme systems fight the token architecture.
- **No `framer-motion` legacy package** — the library is `motion` now; mixed imports cause duplicate runtimes.
- **No GSAP / Lottie / AutoAnimate / tsparticles** — engine allocation is closed (MOTION_SPEC §1); decorative animation has no doctrine zone.
- **No Redux / MobX** — Query + Zustand + nuqs cover every state class this app has.
- **No runtime CSS-in-JS** (styled-components, Emotion) — tokens are CSS-first; runtime styling breaks RSC and streaming.
- **No moment.js, no lodash** — `date-fns` and native/`es-toolkit` if ever needed.
- **No chart mega-suites** (ECharts, Highcharts) — dashboard charts are on-demand and draw-once; Recharts is sufficient and shadcn-themed.

Every addition to `package.json` beyond §3 requires a one-line justification in this file's changelog.

---

## 7 · Backend Notes (seam-relevant only)

Owned by `CODEX_BRIEF.md`; restated here only where the seam depends on it:

- FastAPI routers stay thin; domain rules (approval lifecycle, RBAC predicates, audit triggers) live in `domain/`, mirrored conceptually by the frontend's `domain/` — same vocabulary, two runtimes, one contract.
- Persistence: Postgres (Supabase) behind a repository layer; RBAC middleware + append-only audit log as previously ratified.
- `agents/` (LangGraph) exposes only governance endpoints + SSE task streams; the UI never talks to an agent directly.
- OpenAPI descriptions are written for codegen quality — every field documented, every enum closed. The generated client's readability is a backend deliverable.

---

**Changelog**
- v1.0 — Initial architecture: two-world contract, five-layer frontend with machine-enforced boundaries, library manifest + anti-manifest, CI gate mapping to doctrine §11.
