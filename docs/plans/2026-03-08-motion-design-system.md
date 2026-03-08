# Motion Design System: Micro-Animations & Transition Library

**Task:** TRK-105
**Date:** 2026-03-08
**Author:** UI & Brand Designer

---

## 1. Problem Statement

Traek's animation system is currently scattered across ~15 components with hardcoded
`cubic-bezier()` values, arbitrary durations, and no shared vocabulary. The existing
token system has only 3 duration values (fast/normal/slow) and no easing or delay tokens.
This creates:

- Inconsistent motion feel across the UI
- No way for consumers to customise animation behaviour via CSS variables
- No `prefers-reduced-motion` enforcement at the token level
- No Storybook showcase for motion patterns

---

## 2. Chosen Approach: Centralized `motion.ts` + CSS Token Expansion

**Why Option C over alternatives:**

| | A: CSS-only | B: Motion One | C (chosen): motion.ts + tokens |
|---|---|---|---|
| Bundle impact | <0.5KB | ~8KB (over budget) | ~800B |
| Svelte integration | Awkward | External | Native |
| Token-driven | Yes | Partial | Yes |
| Orchestration | No | Yes | Light |
| `prefers-reduced-motion` | Manual per-component | Needs setup | Centralised |

---

## 3. Animation Token Additions

### 3.1 Easing Curves — `--traek-ease-*`

| Token | Value | Use case |
|---|---|---|
| `--traek-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default UI transitions |
| `--traek-ease-decelerate` | `cubic-bezier(0, 0, 0.2, 1)` | Entering elements (nodes appearing) |
| `--traek-ease-accelerate` | `cubic-bezier(0.4, 0, 1, 1)` | Exiting elements |
| `--traek-ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Springy emphasis (pulse, bounce) |
| `--traek-ease-linear` | `linear` | Infinite loops (spinners) |

These follow the Material Design 3 / Human Interface Guidelines motion vocabulary,
adapted for the spatial/developer context of Traek.

### 3.2 Delay Tokens — `--traek-delay-*`

| Token | Value | Use case |
|---|---|---|
| `--traek-delay-none` | `0ms` | Immediate |
| `--traek-delay-short` | `50ms` | Stagger children (first item) |
| `--traek-delay-medium` | `100ms` | Stagger children (second item) |
| `--traek-delay-long` | `200ms` | Deferred secondary content |

### 3.3 Duration Additions (extend existing 3)

The existing `fast` (120ms), `normal` (220ms), `slow` (380ms) are kept. One addition:

| Token | Value | Use case |
|---|---|---|
| `--traek-duration-instant` | `80ms` | Micro hover feedback (colour/border) |

---

## 4. Architecture

### 4.1 Files to Create

```
packages/svelte/src/lib/
├── motion.ts                          # NEW — central transition factory + utils
└── stories/
    └── MotionSystem.stories.svelte    # NEW — Storybook showcase
```

### 4.2 Files to Modify

```
packages/svelte/src/lib/theme/
├── tokens.json                        # Add easing, delay, duration.instant
├── tokens.ts                          # Add Zod schemas for easing + delay
├── themes.ts                          # Add easing/delay to TraekTheme objects
└── ThemeProvider.svelte               # Set CSS vars for easing + delay

packages/svelte/src/lib/
├── transitions.ts                     # Update to use token CSS vars
└── TraekNodeWrapper.svelte            # Consume new tokens, remove hardcoded values
```

### 4.3 `motion.ts` API Design

```typescript
// Svelte transition factory: node appearing (scale + fade)
export function nodeAppear(node, params?): TransitionConfig

// Svelte transition factory: connection line draw (SVG stroke-dashoffset)
export function connectionDraw(node, params?): TransitionConfig

// Svelte transition factory: panel expand/collapse (height + opacity)
export function panelSlide(node, params?): TransitionConfig

// CSS class helper: returns reduced-motion-aware class string
export function motionClass(name: string): string

// Reactive boolean: true if prefers-reduced-motion is active
export const reducedMotion: boolean  // $state rune in Svelte context
```

All factories read from CSS custom properties where possible, with JS fallbacks.
All respect `prefers-reduced-motion` automatically.

---

## 5. Micro-Animation Specifications

### 5.1 Node Appear (entering)
- **Trigger:** Node added to DOM
- **Animation:** `opacity 0→1`, `scale 0.95→1`, `translateY 4px→0`
- **Duration:** `--traek-duration-normal` (220ms)
- **Easing:** `--traek-ease-decelerate`
- **Reduced motion:** opacity only, 50ms

### 5.2 Node Expand/Collapse (thought panel)
- **Trigger:** Toggle thought panel visibility
- **Animation:** Height via Svelte `slide` + opacity fade
- **Duration:** `--traek-duration-fast` (120ms) for collapse, `--traek-duration-normal` (220ms) for expand
- **Easing:** `--traek-ease-standard`
- **Reduced motion:** instant (1ms)

### 5.3 Connection Draw (new connection rendered)
- **Trigger:** New child node added, SVG path renders
- **Animation:** SVG `stroke-dashoffset` from path length → 0
- **Duration:** `--traek-duration-slow` (380ms)
- **Easing:** `--traek-ease-decelerate`
- **Reduced motion:** skip (show immediately)

### 5.4 Hover States (nodes, buttons, toolbar)
- **Trigger:** `mouseover`
- **Animation:** `border-color`, `box-shadow`, `background-color` transition
- **Duration:** `--traek-duration-instant` (80ms)
- **Easing:** `--traek-ease-standard`
- **Implementation:** Pure CSS `transition:` property using CSS vars

### 5.5 Stream-Complete Pulse (node finishes streaming)
- **Trigger:** Node status changes from `streaming` → `done`
- **Animation:** `box-shadow` scale pulse (existing `showCompletePulse` state)
- **Duration:** 600ms (as-is, already good)
- **Easing:** Change to `--traek-ease-spring`
- **Reduced motion:** suppress pulse entirely

### 5.6 Pan/Zoom Transitions (canvas viewport)
- **Trigger:** `focusOnNode()` call or keyboard navigation
- **Animation:** CSS `transform` (already GPU-accelerated via existing implementation)
- **No change needed** — ViewportManager already handles this smoothly

---

## 6. Storybook Showcase Structure

`MotionSystem.stories.svelte` will contain:

1. **Duration scale** — visual timeline showing all 4 durations side-by-side
2. **Easing curve gallery** — animated dots showing each easing curve path
3. **Node Appear** — button to trigger `nodeAppear` transition live
4. **Connection Draw** — SVG demo with draw-on animation
5. **Thought Panel Expand** — interactive expand/collapse demo
6. **Hover States** — card grid with all hover transitions visible
7. **Stream Pulse** — button triggers pulse animation
8. **Reduced Motion Mode** — toggle switch to simulate `prefers-reduced-motion`

---

## 7. Bundle Size Estimate

| Addition | Est. size (minified+gzip) |
|---|---|
| `motion.ts` | ~700B |
| Token additions (CSS, no JS) | 0B (CSS vars) |
| `MotionSystem.stories.svelte` | Not in library bundle |
| **Total new JS** | **~700B** |

Well within the 5KB budget.

---

## 8. Accessibility

- All transitions respect `prefers-reduced-motion: reduce` via the centralised `prefersReducedMotion()` helper in `motion.ts`
- Reduced motion mode: durations ≤ 50ms, no scale/translate transforms, no spring effects
- Animation tokens will be documented with accessibility notes in Storybook

---

## 9. Implementation Order

1. Extend `tokens.json` with easing, delay, duration.instant tokens
2. Update `tokens.ts` Zod schemas + `themes.ts` + `ThemeProvider.svelte`
3. Create `motion.ts` with all transition factories
4. Update `transitions.ts` to use CSS var fallbacks
5. Refactor `TraekNodeWrapper.svelte` to consume new tokens (remove hardcoded values)
6. Add connection draw animation to `ConnectionLayer.svelte`
7. Create `MotionSystem.stories.svelte` Storybook showcase
8. Run `pnpm run lint && pnpm run check && pnpm run test`

---

## 10. Success Criteria

- [ ] All `--traek-ease-*`, `--traek-delay-*`, `--traek-duration-instant` CSS vars defined
- [ ] `motion.ts` under 1KB (minified+gzip)
- [ ] Node appear, panel expand/collapse, connection draw, hover states all animated
- [ ] `prefers-reduced-motion` suppresses all animations correctly
- [ ] Storybook story renders all animation categories
- [ ] Zero new lint/type errors
- [ ] Total animation-related bundle delta < 5KB
