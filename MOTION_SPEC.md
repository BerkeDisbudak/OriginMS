# MOTION_SPEC.md — Implementation-Grade Motion Specification

**Project:** Origin FGL HRMS/CRM · **Owner:** Berke Dışbudak · **Version:** 1.0
**Companions:** `UX_DOCTRINE.md` (§4 laws govern *what is allowed*; this spec defines *how it is built*) · `STACK_SPEC.md` (wiring) · `CODEX_BRIEF.md` (product).
**Scope:** React 19 + TypeScript · Tailwind v4 · `motion` (motion.dev) · Radix/shadcn behavior layer.

---

## 1 · Engine Allocation — who animates what

| Surface | Engine | Reason |
|---|---|---|
| Buttons, inputs, hovers, row states, focus | **CSS transitions** | Interruptible for free; zero JS cost |
| Dropdown / Select / Menu / Tooltip / Dialog | **CSS** (`data-state` transitions in, 100–120ms keyframe out) | Radix unmount waits on `animationend`, not `transitionend` — exits must be keyframes |
| Side Panel · Command Palette · Toast | **`motion`** | The three orchestrated movers (doctrine §12) |
| Shared elements (row→panel morph, tab indicator) | **`motion` `layoutId`** | FLIP with velocity preservation |
| Hero numeral ticker | **Vanilla rAF** (~12 lines) | No library justified |

**Enforcement:** `motion/react` may only be imported inside `ui/motion/*` (Panel, Palette, Toast, SharedElement, TabIndicator). Anywhere else = build failure (see STACK_SPEC §4, dependency-cruiser rule).

---

## 2 · Tokens → Code

```css
@theme {
  --duration-fast: 120ms;
  --duration-base: 180ms;
  --duration-panel: 280ms;
  --ease-out: cubic-bezier(0.2, 0, 0, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  /* Spring encoded as pure CSS — regenerate with a linear() generator if retuned.
     Approx. stiffness 260 / damping 24, slight overshoot. Use ONLY where doctrine permits springs. */
  --ease-spring-soft: linear(0, 0.009, 0.035 2.1%, 0.141 4.4%, 0.723 12.9%,
    0.938 16.7%, 1.017 20.8%, 1.077 26.9%, 1.086 30.9%, 1.038 41.9%,
    1.001 48.9%, 0.995 55.3%, 1 100%);
}
```

Motion-side presets (single source, `ui/motion/presets.ts`):

```ts
export const springs = {
  panel:       { type: "spring", visualDuration: 0.28, bounce: 0 },     // movers
  layout:      { type: "spring", visualDuration: 0.22, bounce: 0.1 },   // layoutId morphs
  celebratory: { type: "spring", stiffness: 260, damping: 24 },         // rare moments only (§4.2 L3)
} as const;
```

---

## 3 · Interruptibility Contract

The single non-negotiable of this spec. Every interactive animation must reverse from its **current position** the instant intent changes.

1. **CSS surfaces:** state changes are expressed as class / `data-*` toggles on `transition` properties — never one-shot `@keyframes` on interactive state (keyframes do not reverse; transitions do).
2. **Motion surfaces:** springs only — springs are velocity-preserving and retarget mid-flight. Duration-based tweens on interactive elements are forbidden.
3. **Never gate input on animation completion.** No `await animation.finished` before accepting the next click; no `pointer-events: none` while animating (except scrims).
4. **WAAPI is forbidden for interactive toggles** — it queues (the exact failure demoed in review).
5. `AnimatePresence` uses `mode="popLayout"` so exiting elements never block entering ones.

---

## 4 · Component Behavior Table

| Component | Enter | Exit | Interrupt | Notes |
|---|---|---|---|---|
| **Side Panel** | `x: 100% → 0`, `springs.panel` | `x: → 100%`, 200ms | Reverses from current x; Esc anytime | Content staggers *after* settle (§5); drag-dismiss §6 |
| **Command Palette** | Backdrop fade 120ms; panel `scale .98→1, y -8→0` 180ms | 120ms fade | Yes | Results reorder **without motion** (content-sacred); item enter/exit 80ms fade; focus trap |
| **Toast** | `y: 8→0` + fade 180ms | Fade 120ms | Swipe-to-dismiss | Max 1 visible, FIFO queue (sonner config) |
| **Tab indicator** | `layoutId` slide, `springs.layout` | — | Retargets mid-flight | Content lazy-mounts, crossfade 120ms |
| **Table row** | Hover bg 120ms; actions opacity 120ms | — | — | Never `transform` on rows (scroll perf) |
| **Approve → row collapse** | Hold 150ms → `grid-template-rows: 1fr→0fr` 180ms | — | Undo cancels the timer | Focus moves to next row |
| **Dropdown / Menu / Select** | `data-state=open`: opacity + `scale .98→1`, 120ms, `transform-origin` from trigger side | 100ms keyframe | Class-driven | — |
| **Dialog (destructive only)** | `scale .98→1` + fade 160ms; backdrop 120ms | 120ms | — | — |
| **Tooltip** | Fade 80ms after 300ms intent delay | 60ms | — | No scale |
| **Skeleton** | Appears only after **200ms gate** | Crossfade to content 120ms | — | Shimmer 1.6s linear infinite |
| **Accordion / summary block** | `grid-template-rows: 0fr→1fr` 180ms | Reverse | Yes (transition) | Inner wrapper `overflow: hidden; min-height: 0` |
| **Hero ticker** | 600ms count, ease-out cubic | — | Replay resets | Once per session (`sessionStorage` flag) |

Global rhythm rule: **exit is always faster than enter** (leaving never waits).

---

## 5 · Shared Element — Row → Panel Morph

The continuity move (§4.2 Law 2, strongest form). The identity block in the list row *becomes* the panel header.

```tsx
// In the table row
<motion.div layoutId={`emp-${id}`} transition={springs.layout}
  className="flex items-center gap-3">
  <Avatar employee={emp} size={28} />
  <span className="text-[13px] font-medium">{emp.name}</span>
</motion.div>

// In the panel header (mounted inside the same <AnimatePresence mode="popLayout">)
<motion.div layoutId={`emp-${id}`} transition={springs.layout}
  className="flex items-center gap-3">
  <Avatar employee={emp} size={40} />
  <motion.span layout="position" className="text-[16px] font-semibold">{emp.name}</motion.span>
</motion.div>
```

Constraints:
- Both nodes must live under the **same React tree** and one `AnimatePresence`.
- Text scales are crossfaded via `layout="position"` (prevents font-size squish).
- **Graceful degrade:** if the source row is virtualized out of the viewport, skip the morph — plain panel slide. Never scroll-hunt for the origin.
- Panel body blocks fade in (3 × 30ms stagger, +4px rise) only after the morph settles — One Mover preserved as a *sequence*.

---

## 6 · Drag-to-Dismiss with Velocity Projection

The panel can be flicked away; the flick's speed decides, not just distance.

```tsx
const PROJECTION_MS = 0.2;            // 200ms lookahead
function onDragEnd(_: unknown, info: PanInfo) {
  const projected = info.offset.x + info.velocity.x * PROJECTION_MS;
  const shouldClose = projected > PANEL_WIDTH * 0.5 || info.velocity.x > 500;
  shouldClose ? close() : controls.start({ x: 0, ...springs.panel });
}

<motion.aside drag="x" dragElastic={{ left: 0.02, right: 0.6 }}
  dragConstraints={{ left: 0 }} onDragEnd={onDragEnd} … />
```

Spring-back on cancel inherits drag velocity automatically (Motion springs are velocity-aware). This is the only gesture surface in v1.

---

## 7 · Pure-CSS Modern Layer

For non-mover surfaces, 2026 CSS removes the old excuses for JS:

```css
/* Enter animation without JS — native popover/dialog or any mounted element */
.menu[data-state="open"] {
  opacity: 1; transform: scale(1);
  transition: opacity var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out),
              display var(--duration-fast) allow-discrete;
  @starting-style { opacity: 0; transform: scale(0.98); }
}
/* Exit for Radix-managed unmounts must be a keyframe (Radix waits on animationend) */
.menu[data-state="closed"] { animation: menu-out 100ms var(--ease-out) forwards; }
@keyframes menu-out { to { opacity: 0; transform: scale(0.98); } }
```

`--ease-spring-soft` (`linear()` curve, §2) is available where a spring *feel* is wanted without Motion — currently unused by doctrine; keep in the toolbox.

---

## 8 · View Transitions API — position

Route-level only, feature-detected, optional. In-page continuity belongs to `layoutId` (finer control, velocity-aware). React's `<ViewTransition>` component remains experimental — **do not adopt**; revisit on stable release.

```ts
export function navigateWithTransition(fn: () => void) {
  if (!document.startViewTransition) return fn();
  document.startViewTransition(fn);
}
```

---

## 9 · Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 80ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- Motion side: wrap the app in `<MotionConfig reducedMotion="user">` — springs collapse to fades.
- Ticker: renders the final value instantly. Shimmer: static block.
- This is a ship-gate item (doctrine §11.11), verified in Playwright with `reducedMotion: 'reduce'`.

---

## 10 · Performance Protocol

1. **Animatable properties whitelist:** `transform`, `opacity` (compositor). `background-color`/`border-color` allowed at ≤120ms. Height changes only via the `grid-template-rows` trick. Never `width/top/left/box-shadow` (focus ring excepted).
2. **`will-change` just-in-time:** set on open-intent (pointerdown / keydown), remove on settle. Never left resident.
3. **Virtualization boundary:** lists >50 rows use TanStack Virtual; no layout animations inside a virtualized viewport.
4. `content-visibility: auto` on inactive tab panels.
5. **Test matrix (6× CPU throttle, must hold 60fps):** panel open over a 500-row mounted table · palette filtering 1,000 employees · approve burst ×10 in inbox.
6. DevTools budget: no main-thread task >8ms during any transition; Layers panel confirms movers are composited.

---

## 11 · Enforcement & Stories

- dependency-cruiser: `motion` importable only from `ui/motion/**` (rule in STACK_SPEC §4).
- Stylelint-style review rule: `transition-property` outside the whitelist is a change-request.
- Storybook: every mover ships three mandatory stories — **default**, **interrupt-spam** (rapid toggle), **reduced-motion**.
- Playwright: keyboard-path e2e includes mid-flight Esc on the panel (§3 verified in CI, not by hand).

---

**Changelog**
- v1.0 — Initial spec. Engine allocation, interruptibility contract, per-component behavior table, shared-element and velocity-projection recipes, modern CSS layer, perf protocol.
