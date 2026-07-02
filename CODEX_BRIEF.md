# CODEX_BRIEF.md — Product & Backend Contract

**Project:** Origin FGL HRMS · **Owner:** Berke Dışbudak · **Version:** 2.0 (reconstructed & consolidated)
**Companions:** `AGENTS.md` (router) · `STACK_SPEC.md` (wiring) · `UX_DOCTRINE.md` (visual law — wins all UX conflicts) · `MOTION_SPEC.md` (motion).
**This document owns:** what the product does, the domain model, RBAC/audit requirements, backend rules, and the Phase 2 vertical-slice definition.

---

## 1 · Product Identity & Scope

Internal HRMS for Origin FGL (İstanbul). Single-tenant, Turkish-market employer, ~50–300 employees. UI copy is Turkish (tr-TR); code, identifiers, and API surface are English. Timezone `Europe/Istanbul`; date display `dd.MM.yyyy`.

| Tier | Modules |
|---|---|
| **v1 (build now)** | Core HR (directory + employee profile) · Leave & Approvals · Dashboard |
| **v1.x** | Documents · Time tracking · Half-day leave |
| **Deferred** | Payroll-prep export · Performance · Recruitment · CRM module (v2 — same shell, `Account/Contact` will follow the single-entity pattern) |

**Product principles**
1. **Single-entity core:** the Employee is one canonical object; every module is a view/event-stream over it (UX_DOCTRINE §2.1). Zero data re-entry anywhere.
2. **Every action attributable:** no anonymous writes; user, agent, and system actors all audited (§8).
3. **Turkish labor defaults, configurable:** statutory rules ship as defaults, HR can override upward, never downward.
4. **i18n posture:** v1 is single-locale; all UI strings live in `frontend/src/ui/copy.ts` (no i18n library yet — adding one requires a STACK_SPEC changelog line).

---

## 2 · Users & RBAC

| Role | Scope |
|---|---|
| `employee` | Self-service: own profile, own requests, own balance/documents |
| `manager` | `employee` + read team profiles, approve/reject **direct reports'** requests |
| `hr_admin` | Full employee CRUD, all requests, balances, holiday calendar, seeds/overrides |
| `executive` | Org-wide **read-only** + dashboards (CEO visibility) |
| `admin` | System: users/roles, integrations, audit read |

Rules: permissions are **predicates in `domain/`** (both runtimes), not route decorations — routes call predicates. Manager scope is direct reports only in v1 (org-chart traversal is v1.x). **Nobody approves their own request** — a manager's request routes to their manager, else `hr_admin`. RBAC middleware resolves `actor` once per request and injects it into services.

---

## 3 · Domain Model

**ID convention:** prefixed ULIDs — `emp_`, `dep_`, `lvr_`, `bal_`, `hol_`, `aud_`, `tsk_`. Sortable, log-greppable, matches `?panel=emp_…` addressing (UX_DOCTRINE §6.2).

| Entity | Key fields |
|---|---|
| `Employee` | id, employee_no, first_name, last_name, email (unique), department_id, title, manager_id?, employment_type (full_time/part_time/contractor), hire_date, birth_date, status (active/on_leave/terminated), termination_date? |
| `Department` | id, name, manager_id? |
| `LeaveRequest` | id, employee_id, type, start_date, end_date, business_days (stored), note?, status, decided_by?, decided_at?, decision_reason?, created_at, cancelled_at? |
| `LeaveBalance` | employee_id, year, entitled_days, carried_over, used_days, pending_days → remaining (computed) |
| `PublicHoliday` | id, date, name (TR calendar seeded per year) |
| `AuditEvent` | id, ts, actor_type (user/agent/system), actor_id, action, entity_type, entity_id, before (JSONB), after (JSONB), request_id, ip |

**Leave types (closed enum, v1):** `ANNUAL · SICK · UNPAID · EXCUSE · MARRIAGE · BEREAVEMENT`.

**Statutory defaults (İş Kanunu m.53), overridable upward per employee:** annual entitlement by seniority — 1–5 yrs → 14 days · >5–15 yrs → 20 · >15 yrs → 26; employees under 18 or 50+ → minimum 20. `business_days` = Mon–Fri minus `PublicHoliday` rows; whole days only in v1.

**Date guards:** `end_date ≥ start_date`. `ANNUAL` cannot start in the past; `SICK` may be past-dated (report arrives late). Overlapping non-cancelled requests for the same employee are rejected with a field error.

---

## 4 · Approval Lifecycle — the state machine

States: `pending → approved | rejected | cancelled`. (No draft state in v1 — submit is create.)

| From | To | Actor | Guard | Side effects |
|---|---|---|---|---|
| — | pending | requester (`employee`) | date guards, no overlap, balance check for ANNUAL (`remaining ≥ business_days`) | `pending_days += n` · audit · notification stub |
| pending | approved | employee's manager or `hr_admin` | not self | `pending_days −= n`, `used_days += n` · audit |
| pending | rejected | same as approve | not self · `decision_reason` required (≥5 chars) | release pending days · audit |
| pending | cancelled | requester | — | release pending days · audit |
| approved | cancelled | `hr_admin` | `start_date > today` | `used_days −= n` · audit |

Any other transition → `409 problem+json`. **No undo in v1** (doctrine §5.2.4: approve is non-destructive so no confirm dialog; reject is deliberate via required reason). The machine lives in `backend domain/` as a pure, table-driven function — mirrored as types + predicates in `frontend/src/domain/` for UI gating. Tests enumerate **every** cell of this table, including forbidden ones.

---

## 5 · Backend Architecture Rules

- **Layering (STACK_SPEC §1):** routers (HTTP only, thin) → services (use-cases, own transactions) → domain (pure Pydantic v2 entities + state machine + predicates) → repositories (SQLAlchemy 2.0 async). ORM models never cross above repositories; services speak domain types.
- **Stack:** Python 3.12+, `uv`, FastAPI, Pydantic v2, SQLAlchemy 2.0 (async) + Alembic migrations, Postgres (Supabase).
- **Quality:** `ruff` (lint+format) · `pyright` strict · `pytest` + httpx client; domain layer at high coverage (state machine is table-driven-tested).
- **No hard deletes anywhere** — status transitions and archival only (§8).

---

## 6 · API Conventions

- Base path `/api/v1`. Auth: FastAPI-issued JWT — access 15 min (Bearer) + refresh 7 d (httpOnly cookie); `POST /auth/login`, `POST /auth/refresh`, `GET /me`.
- **Errors:** RFC 9457 `application/problem+json` with `errors[]` of `{field, code, message}` — field errors map 1:1 to inline form errors (UX_DOCTRINE §5.3).
- **Pagination:** cursor-based (`?cursor&limit`, default 25) — stable under concurrent writes (inbox requirement).
- Timestamps ISO-8601 UTC; leave dates are date-only interpreted in `Europe/Istanbul`.
- `operation_id` = snake_case verb phrase (AGENTS §3.10); every field and enum documented — **generated-client readability is a backend deliverable.**

---

## 7 · State & Long-Operation Contract (ratifies UX_DOCTRINE §5.2)

- **Confirmed-state only.** Mutations return the full updated resource; the frontend never writes the cache optimistically. Pending UI is driven by `mutation.isPending`.
- Long-running/agentic operations: `202 { task_id }` + SSE `GET /api/v1/tasks/{id}/events` (`queued → running → progress* → done|failed`). No polling loops.

---

## 8 · Audit & Compliance (KVKK-aware)

- `audit_events` is **append-only** (no UPDATE/DELETE grants). Audited: every state transition, employee CRUD, auth events (login/refresh/failure), role changes, any export.
- PII minimization: only fields listed in §3 are stored; `birth_date` exists solely for the statutory leave rule. Audit `before/after` snapshots exclude non-changed fields.
- Access to another employee's record is itself an audited read for `hr_admin/executive/admin` actors.

---

## 9 · `agents/` (LangGraph) Position

Isolated module; **not part of Phase 2** beyond the task-stream plumbing in §7. Agents act only through the service layer as `actor_type=agent` — fully audited, never bypass RBAC, no direct DB access. Governance endpoints (enable/disable, run history) arrive with the first real agent (candidate: leave-policy Q&A over the balance/holiday domain).

---

## 10 · Phase 2 — Vertical Slice: Approval Inbox

**Goal:** one flow end-to-end proving the whole pipeline: backend → OpenAPI → generated hooks → doctrine-true screen. Inbox layout is the **split view** (list 400px + detail pane, UX_DOCTRINE §9) — no overlay panel, no shared-element morph (that's Phase 3).

**Endpoints (2a):**

| Method | Path | operation_id | RBAC |
|---|---|---|---|
| POST | /auth/login | login | public |
| GET | /me | get_current_user | any |
| GET | /employees/{id} | get_employee | self / manager-of / hr+ |
| GET | /employees/{id}/leave-balance | get_leave_balance | same as above |
| POST | /leave-requests | create_leave_request | employee (self) |
| GET | /leave-requests | list_leave_requests | scope auto-narrowed by role; `?status&cursor` |
| GET | /leave-requests/{id} | get_leave_request | requester / approver / hr+ |
| POST | /leave-requests/{id}/approve | approve_leave_request | manager / hr_admin (not self) |
| POST | /leave-requests/{id}/reject | reject_leave_request | same; body `{reason}` |
| POST | /leave-requests/{id}/cancel | cancel_leave_request | requester |

**Seed (`scripts/seed.py`):** 3 departments, 30 employees with manager wiring, TR public holidays (current year), 12 pending + 8 decided requests, demo logins (`hr@ / manager@ / employee@ origin-fgl.local`, passwords from env).

**Exit criteria:**
1. State-machine tests cover every table cell in §4, incl. forbidden transitions → 409.
2. One audit row asserted per transition; balance math asserted on approve/reject/cancel.
3. Invalid input (end<start, past ANNUAL, overlap, insufficient balance) returns field-level `problem+json`; frontend shows them inline per §5.3.
4. `pnpm gen:api` produces zero diff in CI; hook names match `operation_id`s.
5. Inbox: full keyboard map (`j/k · Enter · a · r · Esc · /`), acknowledged-state visible under throttled network, cursor "load more".
6. Playwright: approve happy path · reject-with-reason · mid-flight Esc interrupt · keyboard-only run · reduced-motion run · failure path (intercepted 500 → inline error, state restored).
7. `ruff`, `pyright`, `biome`, depcruise all green; manual Three-Question + feel ritual passed.

**Out of scope for Phase 2 (do not build):** batch approve (`x` multi-select — stretch after core is green), notifications beyond stubs, Documents, half-days, org-chart scoping, any agent feature.

---

**Changelog**
- v2.0 — Reconstructed as a file; carries forward prior ratified decisions (confirmed-state contract, thin routers, RBAC + append-only audit) and adds: role matrix, prefixed-ULID convention, leave domain with İş Kanunu m.53 defaults, full approval state machine, API conventions, KVKK notes, Phase 2 slice definition.
- v1.0 — Original decision set (conversation-only, never persisted).
