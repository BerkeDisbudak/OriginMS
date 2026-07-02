# AGENTS.md — Operating Instructions for Code Agents

**Repo:** Origin FGL HRMS/CRM · **Owner:** Berke Dışbudak · **Version:** 1.0
This file is the router. Read it fully at the start of every session. It tells you which specification owns which decision. (Running Claude Code instead of Codex? This file is duplicated as `CLAUDE.md` — identical content.)

---

## 1 · Document precedence — read in this order

1. `CODEX_BRIEF.md` — product scope, backend rules, RBAC/audit requirements.
2. `STACK_SPEC.md` — architecture, layer boundaries, allowed dependencies.
3. `UX_DOCTRINE.md` — visual law. **Wins every UX conflict, no exceptions.**
4. `MOTION_SPEC.md` — motion implementation. Governs anything that moves.

Conflict resolution: UX question → doctrine. Wiring/dependency question → stack spec. Product behavior → brief. **Never resolve a conflict silently** — implement per precedence and flag the conflict in the PR description.

---

## 2 · Repo shape

Monorepo, pnpm workspaces:

```
/backend    FastAPI + LangGraph (Python 3.12+, uv)
/frontend   Next.js App Router (Node LTS, pnpm)
/scripts    gen:api (openapi.json → typed client), CI helpers
```

Rationale: the contract-drift gate (STACK_SPEC §1) regenerates the frontend client from the backend's `openapi.json` in the same pipeline — one repo makes drift impossible to merge.

---

## 3 · Non-negotiables (hard failures, not preferences)

1. **No hex colors outside `frontend/src/ui/tokens.css`.** Every color via tokens (doctrine §3). A hex literal in a component is a defect.
2. **Tailwind v4 is CSS-first.** Tokens live in `@theme`. **Do not generate `tailwind.config.js/ts`** — that is the v3 format and will be rejected.
3. `motion` may only be imported inside `src/ui/motion/**` (MOTION_SPEC §1; dependency-cruiser enforces).
4. **No manual `fetch`/axios anywhere.** All IO goes through generated hooks in `src/api`. Backend endpoint change ⇒ run `pnpm gen:api` in the same PR. Never hand-edit generated files.
5. **No new dependencies** beyond STACK_SPEC §3 without a one-line justification appended to STACK_SPEC's changelog. The anti-manifest (§6) is closed.
6. The layer matrix (STACK_SPEC §2) is law. If dependency-cruiser fails, fix the design — never the rule file.
7. Spacing and type sizes only from doctrine scales (§3.2–3.3). Tailwind arbitrary values must resolve to scale numbers; `w-[437px]` is a defect.
8. Every shadcn/ui component added gets an immediate **re-theme pass**: strip default shadows/rings/colors, map everything to tokens (doctrine §3.4). Stock shadcn styling shipping to a screen is a defect.
9. **Acknowledged-state only** (doctrine §5.2). No optimistic cache writes, ever — the backend is an async agent pipeline.
10. Backend: OpenAPI `operation_id`s are snake_case verb phrases (`approve_leave_request`) — generated hook names derive from them; treat naming as API surface.
11. No `@ts-ignore`. `@ts-expect-error` only with a reason comment.
12. **Specification files are read-only for agents.** `AGENTS.md`, `UX_DOCTRINE.md`, `MOTION_SPEC.md`, `STACK_SPEC.md`, `CODEX_BRIEF.md`, the dependency-cruiser config, and `tokens.css` (after Phase 0 creates it) may not be modified by an agent. Propose changes in the PR description; the owner applies them.

---

## 4 · Build phases — do not skip ahead

**Phase 0 — Skeleton.** Folder structure, `tokens.css` (`@theme` from doctrine §3), dependency-cruiser rules, CI chain (typecheck → biome → depcruise → unit → contract-drift → playwright). Exit criterion: boundary rules **fail correctly** on a deliberate violation while the repo is still empty.

**Phase 1 — `ui/` primitives.** Button, Input, Select, StatusPill, Table shell, Toast, Panel, Palette — each with Storybook stories; movers get default / interrupt-spam / reduced-motion stories (MOTION_SPEC §11). Exit: doctrine §11 items pass on the workshop, not on a screen.

**Phase 2 — Vertical slice: Approval Inbox.** One flow end-to-end: backend endpoint → contract → generated hook → feature screen, with keyboard map (§5.1) and acknowledged-state. This proves the entire pipeline before breadth.

**Phase 3 — Employee Profile** (shared-element morph, MOTION_SPEC §5) → **Dashboard** (Deco numerals, doctrine §8.3) → remaining modules.

Never begin a screen whose `ui/` primitives haven't passed Phase 1.

---

## 5 · Definition of done — every PR

- States which doctrine §11 ship-gate items apply, with evidence (test name, story, or screenshot).
- Any new interactive surface ships with its Playwright keyboard path.
- Zero console errors/warnings in dev run.
- Generated client is current (`pnpm gen:api` produces no diff).

---

## 6 · Known failure modes — pre-learned constraints

- Generating Tailwind v3 config → forbidden; v4 `@theme` only (see §3.2 above).
- Installing `framer-motion` by its legacy name → the package is `motion`; mixed imports duplicate the runtime.
- Radix exit animations via CSS transitions → exits must be **keyframes**; Radix unmount waits on `animationend` (MOTION_SPEC §1).
- WAAPI for interactive toggles → forbidden; it queues instead of reversing (MOTION_SPEC §3).
- Spinner as a loading state → skeleton with the 200ms gate (MOTION_SPEC §4).
- Fetching in `useEffect` → use the generated Query hooks; pending UI comes from `isPending`.
- Putting business logic in `ui/` or React in `domain/` → depcruise will fail the build; restructure, don't suppress.
- Long agent operations: expect `202 + task_id`, subscribe to `GET /tasks/{id}/events` (SSE) — no polling loops.

---

**Changelog**
- v1.1 — Added rule 12: specification files are agent-read-only.
- v1.0 — Initial handoff: precedence router, monorepo shape, 11 hard rules, 4-phase build order, DoD, failure-mode list.
