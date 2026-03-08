# UX Design: Touch & Gesture Support

**Task:** TRK-107
**Author:** UX Expert
**Date:** 2026-03-08
**Status:** Complete — ready for dev implementation

---

## 0. Scope & Context

Traek is a spatial canvas built for desktop-first usage. This spec extends it to first-class touch support on mobile and tablet, targeting iOS Safari and Android Chrome. It defines gesture semantics, interaction conflicts, keyboard equivalents, and platform-specific requirements.

**What already exists (do not duplicate):**
- Pinch-to-zoom — `CanvasInteraction.svelte.ts` (functional, scale-clamped)
- Single-finger pan on empty canvas — functional
- Long-press detection + context menu — `longPressNodeId` / `longPressViewportPos`, 500ms / 8px threshold, haptic feedback via Vibration API, `NodeToolbar` rendered in `TraekCanvas.svelte`
- Node drag via touch — threshold 4px, with snap-to-grid on release
- Swipe navigation (in FocusMode) — `SwipeNavigator.svelte.ts`, axis-locking, velocity threshold

**What this spec adds:**
1. Double-tap to zoom to node
2. Single-tap to activate/select a node
3. Sibling swipe navigation on the spatial canvas (separate from FocusMode)
4. iOS Safari & Android Chrome platform fixes
5. Keyboard equivalents for all gestures

---

## 1. Gesture Inventory & Semantics

### 1.1 Complete Gesture Map

| Gesture | Touch Count | Context | Action |
|---------|-------------|---------|--------|
| Tap | 1 | Node | Activate node (select, scroll into view) |
| Tap | 1 | Empty canvas | Deselect active node |
| Long-press (500ms) | 1 | Node | Open context menu |
| Drag | 1 | Node header | Move node |
| Drag | 1 | Empty canvas | Pan canvas |
| Swipe left/right | 1 | Empty canvas | Navigate to prev/next sibling |
| Double-tap | 1 | Node | Zoom canvas to center this node |
| Double-tap | 1 | Empty canvas | Zoom to fit all nodes |
| Pinch-to-zoom | 2 | Canvas | Scale canvas around pinch center |
| Two-finger pan | 2 | Canvas | Pan canvas (simultaneous with pinch) |
| Pinch open (fast) | 2 | Canvas | Zoom in step (+0.25 scale) |
| Pinch close (fast) | 2 | Canvas | Zoom out step (-0.25 scale) |

### 1.2 Priority & Conflict Resolution

When gestures could conflict:
1. **2-finger touch detected** → immediately enter pinch mode; cancel any 1-finger gesture in progress
2. **Long-press fires** → cancel pending drag; open context menu; block tap activation
3. **4px movement during pending drag** → promote to drag; cancel long-press timer
4. **Swipe direction locked horizontally** → sibling navigation (not pan)
5. **Swipe direction locked vertically in scrollable node** → native scroll
6. **Swipe direction locked vertically outside scrollable** → (no action — vertical canvas pan uses two-finger only on mobile)

---

## 2. Single-Tap Node Activation

### 2.1 Current Gap

Currently, touching a node header without dragging sets `#pendingDragNodeId` but on `touchend` (without movement) the node is never activated — `engine.activeNodeId` is not set. This is a silent UX failure.

### 2.2 Required Behaviour

On `touchend` with no drag:
- If `#pendingDragNodeId` is set AND movement < `DRAG_THRESHOLD` AND long-press did NOT fire → **activate the node** (`engine.activeNodeId = pendingDragNodeId`)
- If node is already the active node → **focus the input** (same as clicking an active node on desktop)

**Timing guard:** If `touchend` fires within 30ms of `touchstart`, treat it as a legitimate tap (not a misfire from a gesture abort).

### 2.3 Visual Feedback

- Active node gains the standard focus ring and `data-active="true"` attribute (same as keyboard/mouse activation)
- No additional animation needed — the existing active-node style is sufficient

### 2.4 Accessibility

- `aria-selected="true"` when node is activated
- No screen reader announcement on tap activation needed (activation is implicit, user navigates the node content next)

---

## 3. Double-Tap Gesture

### 3.1 Detection

Double-tap = two taps within **300ms** on the same target (within **40px** of the first tap).

Implementation note: track `lastTapTime` and `lastTapTarget` in `CanvasInteraction`. On second `touchend` within threshold: suppress default and fire double-tap action.

### 3.2 Actions

**Double-tap on a node:**
- Call `viewport.centerOnNode(node, engine.nodes)` — the existing smooth-pan animation
- If node is already centered (within 20px of center): zoom in to `Math.min(currentScale * 1.5, scaleMax)` around node center

**Double-tap on empty canvas:**
- Call `viewport.fitAll(engine.nodes)` — fit all nodes into view
- If already in fit-all state (scale matches fitAll result within 0.05): reset to `scale = 1.0` centered on canvas

### 3.3 Conflict with Long-Press

If a long-press timer is running when the second tap begins, cancel it. The double-tap wins.

### 3.4 Keyboard Equivalent

| Gesture | Keyboard |
|---------|----------|
| Double-tap on node | `F` — Focus/center on active node (existing shortcut, verify it calls `centerOnNode`) |
| Double-tap empty canvas | `Shift+F` — Fit all nodes |

---

## 4. Sibling Swipe Navigation (Canvas Mode)

### 4.1 Concept

In the spatial canvas (not FocusMode), a horizontal swipe on **empty canvas** navigates between the **siblings of the currently active node** — moving the active node selection left (previous sibling) or right (next sibling), and panning the canvas to center on it.

This is additive to pan: a deliberate, fast horizontal swipe triggers sibling navigation rather than panning. The distinction is made via velocity threshold.

### 4.2 Trigger Thresholds

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Minimum distance | 120px | Higher than FocusMode (80px) — canvas gestures need to be deliberate |
| Minimum velocity | 0.5 px/ms | Higher than FocusMode (0.3) — prevents accidental navigation during pan |
| Max touch duration | 400ms | Long slow sweeps → pan; short fast flicks → navigate |
| Axis lock | horizontal only | Vertical swipes are not canvas-mode navigation |

### 4.3 Sibling Determination

```
activeNode = engine.getNode(engine.activeNodeId)
parents    = activeNode.parentIds.map(id => engine.getNode(id))
siblings   = union of each parent's children, deduplicated, excluding activeNode
siblings   = sorted by canvas x-position (left to right)
```

- Swipe right → previous sibling (lower x)
- Swipe left → next sibling (higher x)

If no siblings exist: gesture is consumed (no pan fallback) and a subtle haptic `hapticBoundary()` fires.

### 4.4 Navigation Animation

On successful sibling navigation:
1. Set `engine.activeNodeId` to target sibling
2. Call `viewport.centerOnNode(siblingNode, engine.nodes)` — existing smooth animation
3. Fire `hapticTap()` (brief confirmation)

No slide-in transition (that's FocusMode only). The canvas pans to the sibling.

### 4.5 Visual Affordance During Swipe

While the swipe gesture is live (above axis lock threshold, below release):
- Show a translucent directional arrow at the left/right edge of the canvas, indicating the target sibling node title (≤ 32 chars)
- Affordance fades out when gesture is released

```
+------------------------------------------+
|  ← "Budget analysis"   [canvas content]  |
+------------------------------------------+
```

**Component:** `SiblingSwipeAffordance.svelte` (new, in `lib/canvas/`)
- Position: 16px from left/right edge, vertically centered
- Background: `rgba(0,0,0,0.6)`, `border-radius: 8px`, `padding: 8px 12px`
- Text: 13px, `--traek-text-secondary`, sibling node title
- Arrow: `←` or `→` prefix
- Visible only when sibling exists in that direction
- Respects `prefers-reduced-motion`: skip fade transition, show/hide instantly

### 4.6 Conflict: No Active Node

If `engine.activeNodeId` is null, horizontal swipes behave as pan (no sibling navigation). The affordance is not shown.

### 4.7 Keyboard Equivalent

| Gesture | Keyboard |
|---------|----------|
| Swipe left (next sibling) | `]` or `Shift+→` — navigate to next sibling |
| Swipe right (prev sibling) | `[` or `Shift+←` — navigate to previous sibling |

These keyboard shortcuts should be added to `KeyboardNavigator` and documented in `KeyboardHelpOverlay`.

---

## 5. Pinch-to-Zoom Refinements

### 5.1 Current State

Pinch-to-zoom is functional. The following refinements improve feel:

### 5.2 Simultaneous Two-Finger Pan

Currently, pinch-to-zoom tracks scale but does not pan simultaneously with the pinch center movement. The offset calculation already uses the pinch center (`centerInViewportX/Y`) — verify that when the pinch center moves (both fingers translate without changing spread), the offset updates correctly. If not, add a `pinch center delta` tracking:

```
panDelta.x = currentCenter.x - pinchStart.centerClientX
panDelta.y = currentCenter.y - pinchStart.centerClientY
viewport.offset.x = pinchStart.offsetX + scale_adjustment + panDelta.x
viewport.offset.y = pinchStart.offsetY + scale_adjustment + panDelta.y
```

### 5.3 Zoom Snap Points

Optionally (if engineering approves), add subtle magnetic snap at:
- `scale = 0.5` (overview)
- `scale = 1.0` (100%, default)
- `scale = 2.0` (detail)

Snap: if scale is within 0.03 of a snap point and velocity is low (pinch ending), animate to exact snap value over 120ms.

### 5.4 Keyboard Equivalent

| Gesture | Keyboard |
|---------|----------|
| Pinch zoom in | `+` or `=` — zoom in 0.1 step |
| Pinch zoom out | `-` — zoom out 0.1 step |
| Double-tap fit | `Shift+F` or `0` — fit all |
| Double-tap center node | `F` — center on active node |

Verify `KeyboardNavigator` already handles these; add if missing.

---

## 6. Platform-Specific Requirements

### 6.1 iOS Safari

**Viewport meta tag** (in SvelteKit `app.html`):
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```
- `viewport-fit=cover` is required for safe-area-inset support (iPhone notch/home indicator)

**CSS safe-area support** (add to global theme):
```css
.traek-canvas-wrapper {
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}
```

**`touch-action: none`** on the canvas viewport element — prevents iOS Safari from intercepting `touchmove` events during pinch/pan before JS can call `preventDefault()`. Without this, iOS Safari may trigger system pull-to-refresh or back/forward navigation.

```css
.traek-viewport {
  touch-action: none;
  -webkit-overflow-scrolling: auto; /* disable momentum scrolling on canvas */
  user-select: none;
  -webkit-user-select: none;
}
```

**`passive: false` on `touchmove`**: The existing `CanvasInteraction` correctly uses `{ passive: false }` on `touchmove` — verify this is wired through to the actual DOM listener in `TraekCanvas.svelte`.

**300ms tap delay** (legacy iOS): Add `touch-action: manipulation` on interactive elements (nodes, buttons) to eliminate the 300ms delay on older iOS.

**Scroll prevention in nodes**: Scrollable node content must use `-webkit-overflow-scrolling: touch` to enable native momentum scrolling inside nodes on iOS while the canvas does not scroll.

### 6.2 Android Chrome

**`touch-action` on canvas**: `touch-action: none` (same as iOS). Android Chrome also uses this to decide whether JS will handle the event.

**Overscroll behavior**: Prevent Chrome's pull-to-refresh gesture when swiping down on the canvas:
```css
.traek-viewport {
  overscroll-behavior: none;
}
```

**Pointer Events API** (optional enhancement): Android Chrome supports the Pointer Events API which unifies mouse and touch. Consider migrating `CanvasInteraction` mouse handlers to `pointerdown/pointermove/pointerup` for unified handling. This is a dev decision — the UX outcome is identical.

**Vibration API**: Already used (`navigator.vibrate?.(40)` on long-press). Android Chrome supports this; iOS Safari does not (silently ignored — correct current behavior).

### 6.3 Both Platforms

**`user-select: none`** on canvas and node headers to prevent text selection during gestures.

**Context menu suppression**: On long-press, the browser may show a native context menu (e.g. "Copy image"). Prevent with:
```css
.traek-viewport, .traek-node-wrapper {
  -webkit-touch-callout: none;
}
```

**Minimum touch targets**: All interactive elements within long-press context menu and node actions must be ≥ 44×44px (WCAG 2.1 AA, Apple HIG).

---

## 7. Keyboard Equivalents — Full Reference

All touch gestures must have keyboard equivalents, accessible from any keyboard-focusable state. The following table is the canonical reference for `KeyboardNavigator` and `KeyboardHelpOverlay` updates.

| Touch Gesture | Keyboard Shortcut | Category |
|---------------|------------------|----------|
| Single-tap node to activate | `Enter` on focused node | Navigation |
| Long-press → context menu | `Right-click` / `ContextMenu` key / `Shift+F10` | Context |
| Pinch zoom in | `+` / `=` | Viewport |
| Pinch zoom out | `-` | Viewport |
| Fit all (double-tap canvas) | `Shift+F` / `0` | Viewport |
| Center on node (double-tap node) | `F` | Viewport |
| Pan canvas | Arrow keys (`←↑→↓`) | Navigation |
| Swipe left (next sibling) | `]` / `Shift+→` | Navigation |
| Swipe right (prev sibling) | `[` / `Shift+←` | Navigation |
| Node drag | Not applicable (use mouse or arrow+move) | Editing |

**KeyboardHelpOverlay update**: Add a "Touch" section that maps gestures to keyboard equivalents. Section header: "Touch & gesture equivalents". Visible on all device types (educational).

---

## 8. Haptic Feedback Map

The Vibration API (`navigator.vibrate`) is already wired for long-press. Extend to the following gesture responses:

| Event | Haptic Pattern | Notes |
|-------|---------------|-------|
| Long-press confirmed | `40ms` (existing) | Single short pulse |
| Sibling navigation | `20ms` | Lighter than long-press |
| Boundary hit (no sibling) | `[30, 50, 30]` | Double pulse — "wall" feel |
| Double-tap zoom | None | Visual feedback is sufficient |
| Pinch zoom snap | `10ms` | Very subtle, only if snap implemented |

All `navigator.vibrate` calls must be guarded: `if (typeof navigator !== 'undefined') navigator.vibrate?.(...)` (already done for long-press — replicate this pattern).

Vibration is silent on iOS Safari and on devices where the user has disabled haptics — this is acceptable.

---

## 9. Accessibility

| Requirement | Implementation |
|-------------|---------------|
| All gestures have keyboard equivalents | See §7 |
| Long-press menu keyboard accessible | Menu items are `<button>` elements; focus moves to first item on open |
| Context menu close | `Escape` key closes, returns focus to canvas |
| Touch targets ≥ 44×44px | Verify all menu items and zoom controls |
| Screen reader: activated node | `aria-selected="true"` set on node wrapper on tap activation |
| Screen reader: sibling navigation | `aria-live="polite"` region announces "Navigated to [node title]" |
| `prefers-reduced-motion` | Skip all transition animations (swipe affordance fade, zoom animations) |

---

## 10. Component Map

| Component / File | Change Type | Purpose |
|-----------------|-------------|---------|
| `CanvasInteraction.svelte.ts` | Modify | Add double-tap detection, single-tap node activation, sibling swipe |
| `canvas/SiblingSwipeAffordance.svelte` | New | Visual affordance for swipe direction |
| `TraekCanvas.svelte` | Modify | Wire `touch-action: none`, render `SiblingSwipeAffordance` |
| `keyboard/KeyboardNavigator.svelte.ts` | Modify | Add `[`/`]`, `Shift+←`/`→` sibling shortcuts |
| `keyboard/KeyboardHelpOverlay.svelte` | Modify | Add Touch section |
| `app.html` (SvelteKit) | Modify | Add `viewport-fit=cover` to meta viewport |
| Theme CSS (`TraekCanvas.svelte` styles) | Modify | Add `touch-action`, `overscroll-behavior`, safe-area, `user-select` |

---

## 11. Edge Cases & Error States

| Case | Behaviour |
|------|-----------|
| Double-tap on non-node, non-canvas element (toolbar) | No action — don't propagate |
| Long-press while pinching | Cancel long-press timer when second touch detected |
| Swipe with no active node | Pan canvas (no sibling navigation) |
| Swipe when active node has no siblings | Consume gesture, `hapticBoundary()`, no pan |
| Double-tap during active drag | Ignore — drag in progress |
| Pinch with 3+ fingers | Ignore additional fingers, use first 2 |
| `touchcancel` event | Reset all gesture state cleanly (already handled) |
| Single-tap on node content area | No activation — preserve native text selection / link behaviour |
| Rapid repeated taps (> 2) | Treat as double-tap on 2nd; subsequent taps reset the 300ms window |
| iOS safe-area overlap with long-press menu | Menu positioned to avoid safe-area using `env(safe-area-inset-bottom)` |

---

## 12. Test Scenarios for QA

| Scenario | Expected |
|----------|----------|
| Single-tap empty node header | Node activates, canvas pans to it |
| Single-tap already-active node header | Input gets focus |
| Long-press node (no movement) | Context menu appears after 500ms, haptic fires |
| Move finger >8px during long-press wait | Long-press cancels, pan/drag begins |
| Double-tap node | Canvas pans/zooms to center on node |
| Double-tap empty canvas | `viewport.fitAll()` called |
| Pinch open on canvas | Canvas zooms in toward pinch center |
| Pinch close to min scale | Clamped at `scaleMin`, no further zoom |
| Fast horizontal swipe with active node + sibling | Sibling selected, canvas pans to it, haptic fires |
| Fast horizontal swipe with no siblings | Affordance shown briefly, boundary haptic, no pan |
| Fast horizontal swipe with no active node | Canvas pans normally |
| iOS Safari: swipe down on canvas | No pull-to-refresh (overscroll-behavior: none) |
| iOS Safari: back gesture | Not triggered by canvas swipe (touch-action: none) |
| Android Chrome: long-press node | Vibration fires, native context menu suppressed |
| Keyboard `]` with active node + sibling | Same as swipe left (next sibling) |
| Keyboard `F` | Canvas centers on active node |
| Keyboard `Shift+F` | Canvas fits all nodes |
| `prefers-reduced-motion: reduce` | Swipe affordance appears/disappears instantly |

---

## 13. Open Questions for Engineering

1. **Pointer Events migration**: Is it worth migrating canvas mouse handlers to Pointer Events API for Android? Lower priority but unifies handling.
2. **Pinch simultaneous pan**: Does the current `centerClientX/Y` calculation already support simultaneous pan-during-pinch, or does it need the `panDelta` fix described in §5.2?
3. **Swipe sibling on canvas vs FocusMode**: Confirm the canvas-mode swipe (§4) should only trigger on empty canvas, not when starting the swipe on a node. This is cleaner UX but dev should confirm implementation complexity.
4. **Zoom snap points** (§5.3): Optional feature — get eng estimate before committing.
5. **`app.html` location**: Confirm path to SvelteKit's `app.html` for the viewport meta tag change — it may be at `src/app.html` in the demo app but the library itself cannot set it.
