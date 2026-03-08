# UX Spec: Drag-and-Drop Node Reparenting & Spatial Organization

**Version:** 1.0
**Author:** UX Expert Agent
**Date:** 2026-03-08
**Task:** TRK-120

---

## 1. Overview & Goals

Drag-and-drop node reparenting lets users spatially reorganize their conversation tree by dragging a node onto another node to establish a new parent–child relationship. This is a high-power, potentially destructive operation that must be:

- **Discoverable** — users should understand that nodes can be moved without reading docs
- **Forgiving** — every reparent is undoable; invalid drops are rejected visually before release
- **Precise** — snapping and drop-zone targeting must be clear enough that users land where they intend
- **Accessible** — full keyboard alternative, ARIA announcements, reduced-motion support

### Current state (as of 2026-03-08)

`CanvasInteraction.svelte.ts` already implements the mechanical layer:
- 4px drag threshold before a move begins
- `dropTargetNodeId` / `isDropTargetValid` state tracked during drag
- `engine.reparentNode()` called on drop
- `snapToGrid` applied on mouse-up
- Multi-select batch move (but **not** multi-select reparent — out of scope for this spec)

What is **missing** from the current implementation:
- No drag handle affordance (any node header click starts drag — ambiguous with click-to-activate)
- No ghost/overlay showing the dragged node during flight
- No visual highlight on valid vs. invalid drop zones
- No drop preview showing where the node will land in the tree hierarchy
- No auto-scroll when dragging near viewport edges
- No keyboard-driven reparenting
- No ARIA announcements for the drag lifecycle
- No multi-select reparent

This spec defines all of these.

---

## 2. Interaction Model

### 2.1 Drag Initiation

**Mouse / trackpad**

Users initiate a drag by pressing down on the **drag handle** — a 6-row dot-grid icon (`⋮⋮`) displayed in the top-left corner of the node header. The handle appears on hover after a 120ms delay (prevents flash during fast traversals).

```
+--------------------------------------------------+
| [::] Node title / role tag          [actions...] |
|                                                  |
|   Message content here...                        |
+--------------------------------------------------+
  ^
  Drag handle: 24x24px hit area, 16x16px icon
  Appears: on node hover, with 120ms delay
  Cursor: grab -> grabbing on mousedown
```

**Rationale for explicit drag handle (vs. dragging anywhere on header):**
- Current code allows dragging from any non-content area of a node. This conflicts with click-to-activate semantics — users cannot tell if clicking will select or start a drag. An explicit handle removes this ambiguity (Fitts's Law: make the affordance's purpose visually obvious).
- Aligns with Figma, Notion, Linear — all use explicit drag handles.
- Protects text selection in the node header (the current code already carves out `.message-node-content` but header text still has this conflict).

**Touch**

Long-press anywhere on the node header (500ms — already implemented) initiates a touch drag. On long-press fire, the node lifts (scale 1.02, shadow deepens) and follows the finger. The existing haptic vibration (40ms) signals the lift.

**Keyboard**

Space bar while a node is keyboard-focused enters "move mode." See Section 6.

### 2.2 Drag in Flight

While dragging:

1. **The dragged node** renders at reduced opacity (0.6) and with a dashed border to signal it is "floating." It follows the cursor with no lag (direct DOM position, not CSS transition during flight).
2. **A drag ghost** — a lightweight copy of the node header (role tag + first 40 chars of content, truncated) — is absolutely positioned at the cursor. This ghost is what the user sees "moving," while the original stays faintly in place to remind them of the source position.
3. **Drop zones** appear on all other nodes in the canvas that could be a valid parent (cycle-check already implemented in `wouldCreateCycle`).
4. **Auto-scroll** activates when the cursor is within 80px of any viewport edge.

### 2.3 Drop Zone Visual States

Each node in the canvas shows one of three states during a drag:

| State | Visual | Description |
|-------|--------|-------------|
| **Neutral** | Normal node appearance | Node is a potential drop target (valid) |
| **Valid hover** | `2px solid var(--traek-accent, #00d8ff)` border + `rgba(0,216,255,0.08)` background tint | Cursor is directly over this node and drop is valid |
| **Invalid hover** | `2px solid var(--traek-error, #ff4d4d)` border + `rgba(255,77,77,0.08)` background tint | Drop here would create a cycle or is already a direct parent |
| **Dragging node itself** | 0.6 opacity, dashed border | This is the node being dragged |

**Drop zone detection radius:** the hit zone is the full bounding box of the target node, not just the header. This is intentional — nodes are small at low zoom levels and require a generous hit target.

### 2.4 Reparenting Preview

When hovering over a valid drop target for 400ms (hover dwell), a **preview connection line** appears: a dashed animated curve from the drop target's output port to the dragged node's input port. This previews the new edge before the user commits.

```
  [Target node]
       |
       | - - - - (dashed animated preview)
       |
  [Dragged node] (ghost)
```

The preview line uses the existing SVG connection layer but rendered with `stroke-dasharray: 4 4` and a subtle opacity animation (0.4–0.8 pulse, 1s period).

**Reduced motion:** dwell preview still appears, but the dash animation is disabled (`animation: none`). The line renders static at 0.6 opacity.

### 2.5 Drop Commit

On mouse-up over a valid target:

1. `engine.reparentNode()` is called (already implemented).
2. `engine.snapNodeToGrid()` is applied if snap is enabled.
3. A **success toast** appears: "Node moved. [Undo]" — 4 second auto-dismiss. The undo button calls `engine.undo()`.
4. The canvas auto-pans to keep the reparented node visible.
5. A subtle **connection flash** — the new edge briefly highlights in accent color (400ms fade) — draws the user's eye to the new relationship.

On mouse-up over an invalid target or empty canvas:

1. The node springs back to its start position with a 200ms ease-out animation.
2. No state change, no toast.
3. The drag ghost disappears.

### 2.6 Escape / Cancel

Pressing `Escape` during a drag:

1. Cancels the drag (node returns to start, no reparent).
2. No undo entry is created (the engine already calls `captureForUndo()` on drag start — the cancel must roll back that snapshot by calling `engine.undo()` silently).
3. Focus returns to the dragged node.

---

## 3. Drag Handle Affordance

### 3.1 Visual specification

```
Drag handle icon: 2×3 grid of 2px dots, 8px spacing
Color: var(--traek-text-tertiary, #555555) at rest
       var(--traek-text-secondary, #888888) on hover
Size: 16×16px icon inside 24×24px touch target
Position: 8px from top-left corner of node header, vertically centered with role tag
```

### 3.2 Visibility rules

| Condition | Drag handle visibility |
|-----------|----------------------|
| Node at rest, not hovered | Hidden (opacity: 0, pointer-events: none) |
| Node hovered (120ms delay) | Visible (opacity: 1, transition 150ms ease) |
| Node keyboard-focused | Visible (always — keyboard users need it visible) |
| Node being dragged | Visible (cursor shows "grabbing") |
| Canvas zoom < 0.4 | Hidden (nodes too small; drag is impractical at this zoom) |

**Rationale for 120ms hover delay:** prevents the handle from flickering as the user moves their cursor across the canvas. The delay is short enough to not feel sluggish when intentionally hovering.

### 3.3 Touch affordance

On touch devices, the drag handle is always visible (opacity: 0.5 at rest, 1 on long-press initiation). Touch users have no hover state, so the affordance must be persistently discoverable. The reduced base opacity prevents it from cluttering the reading experience.

---

## 4. Drop Zone Highlighting

### 4.1 During drag: all nodes update

When a drag is in flight, the canvas enters "reparent mode." All nodes render their drop zone state (Section 2.3). Nodes that would be invalid targets (cycle, already parent) use the invalid state immediately — they do not wait for the cursor to hover over them. This pre-computation happens once at drag start using `wouldCreateCycle()` and can be cached for the duration of the drag.

### 4.2 Highlight implementation

Drop zone styling is applied via a CSS class on the `[data-node-id]` element:

- `.drop-target-valid` — accent border + tint
- `.drop-target-invalid` — error border + tint
- `.drop-target-hover-valid` — accent border + tint + subtle scale(1.01)
- `.drop-target-hover-invalid` — error border + tint + scale(1.0) (no scale encouragement)

Classes applied by `NodeRenderer` based on `dropTargetNodeId` and `isDropTargetValid` props (already passed from `CanvasInteraction`).

### 4.3 Zoom-level adaptation

At zoom < 0.6, individual node borders become hard to distinguish. At this zoom level, the valid/invalid state is additionally communicated by a **halo glow** (box-shadow: 0 0 0 4px color) that is more visible at small sizes.

---

## 5. Auto-Scroll During Drag

### 5.1 Trigger zone

When the drag cursor enters within 80px of any viewport edge, auto-scroll activates:

```
+--[80px zone]--[center]--[80px zone]--+
|  <-- scroll left    scroll right -->  |
|                                       |
|  ^ scroll up                          |
|                                       |
|  v scroll down                        |
+---------------------------------------+
```

### 5.2 Scroll speed

Speed scales linearly with proximity to the edge:
- At 80px from edge: 1px/frame (≈60px/s at 60fps)
- At 0px from edge: 8px/frame (≈480px/s)

Formula: `speed = 8 * (1 - distance/80)` px per animation frame, applied to `viewport.offset`.

### 5.3 Auto-scroll stops when:

- Cursor moves back into the center zone
- Mouse is released
- `Escape` is pressed

### 5.4 Touch auto-scroll

Same zones, same speed curve. Applied in `handleTouchMove` when a node drag is in flight.

---

## 6. Keyboard Reparenting

Keyboard reparenting uses a two-step "pick and place" flow:

### 6.1 Entering move mode

With a node keyboard-focused (highlighted with `.keyboard-focused` class):

- Press `Space` → enter move mode
- ARIA live region announces: "Moving [node role] node. Use arrow keys to navigate to a new parent. Press Enter to confirm, Escape to cancel."
- The node gains a `.keyboard-move-mode` class (pulsing accent border, 1s animation)
- The drag handle icon changes to a cross/move cursor icon

### 6.2 Navigating to a target

Arrow keys navigate the keyboard focus through other nodes on the canvas:

- `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight` — move focus to the nearest node in that direction (using the existing `KeyboardNavigator` spatial navigation)
- Each new focus target previews the reparent: a dashed preview connection appears from the target to the moving node
- ARIA live region updates: "Would become child of [target role] node. [Valid/Not valid — would create cycle]"

### 6.3 Confirming or cancelling

- `Enter` — confirms reparent (if valid). ARIA announces: "Node reparented to [target]."
- `Escape` — cancels, returns focus to original node. ARIA announces: "Move cancelled."
- Any other key — cancels move mode (safe fallback)

### 6.4 Keyboard-only multi-select move

When multiple nodes are selected via `Shift+click` or `Shift+Arrow` (future feature), the keyboard move applies to the entire selection. This is noted as a dependency for multi-select reparenting.

---

## 7. Multi-Select Drag

### 7.1 Current state

The codebase already moves multiple selected nodes simultaneously during a drag (batch position update). However, reparenting is only triggered for the primary dragged node, not for the selection.

### 7.2 Multi-select reparent behavior (this spec)

When a user drags a node that is part of a multi-selection onto a valid drop target:

- **Only the dragged node is reparented.** The other selected nodes move in position (existing behavior) but keep their current parent relationships.
- **Rationale:** Reparenting all selected nodes at once is a high-risk operation. It would be very difficult to show clearly what would happen (multiple connection changes) and undo cleanly. Single-node reparenting is the 95% case; a future "batch reparent" feature can be designed separately.

The drag handle on each selected node shows a multi-select indicator (small "N+" badge over the handle icon when N nodes are selected).

### 7.3 Drop zone validation for multi-select

When a multi-node drag hovers over a potential parent:

- The drop zone shows valid/invalid state based only on the **primary dragged node** (the one the user grabbed)
- The ARIA announcement clarifies: "Drop here to move this node. 3 other nodes will move in position only."

---

## 8. Snap-to-Grid Behavior

### 8.1 Current state

`snapToGrid` is a boolean state on `CanvasInteraction`, defaulting to `true`. On drag end, `engine.snapNodeToGrid()` is called. The snap grid uses `config.gridStep` (default: 20px).

### 8.2 Snap during flight (new)

Currently, snapping only happens on mouse-up. This spec adds **live snap preview**: as the node is dragged, its ghost shows the snapped position, while the actual dragged node follows the cursor exactly. On mouse-up, the snap is applied.

This dual behavior gives the user precise drag control while communicating where the node will land.

### 8.3 Snap override

Hold `Alt` (or `Option` on Mac) during drag to temporarily disable snap. The ghost moves with the cursor exactly. When `Alt` is released, the ghost snaps back to the nearest grid position. This allows fine-grained positioning without permanently disabling grid snap.

**UI indicator:** while `Alt` is held, a small "no-grid" icon badge appears near the drag ghost. Keyboard shortcut hint: "Hold Alt to disable snap."

### 8.4 Snap indicator

When snap is active and the node would snap, display a faint cross-hair at the snap target position:

```
    · · · · · · ·
    ·   +--+    ·    ← snap target cross-hair (2px lines, 16px extent)
    · · +  + · ·
    ·   +--+    ·
    · · · · · · ·
```

Cross-hair color: `var(--traek-accent, #00d8ff)` at 40% opacity.

---

## 9. Ghost Node Rendering

### 9.1 Drag ghost component

A new `DragGhost.svelte` component renders during drag. It is a lightweight overlay (not the full node) positioned at the cursor:

```
+---------------------------+
| [::] user · "First 40 ch… |
+---------------------------+
```

Properties:
- Width: 200px (fixed, narrow — just for identification)
- Background: `var(--traek-node-bg)` at 90% opacity
- Border: `1px solid var(--traek-accent)` (always accent — ghost is always "active")
- Border-radius: 8px
- Box-shadow: `0 8px 24px rgba(0,0,0,0.4)` (elevated feel)
- Font-size: 12px
- Cursor offset: 12px right, 12px down from hotspot (so cursor tip is visible)
- `pointer-events: none` (does not intercept drop detection)
- `z-index: 1000` (above all canvas content)
- `will-change: transform` for GPU compositing during flight

### 9.2 Ghost content

- Role tag (user / assistant / system) — same styling as node header
- Truncated content: first 40 characters of the node's text content, followed by "…" if truncated
- If node has no text content (image/code node): show node type icon + type label

### 9.3 Multi-select ghost

When dragging multiple selected nodes, the ghost shows:
- Primary node content (as above)
- A "+N" badge in the top-right corner (e.g., "+3" for 4 total selected)

### 9.4 Ghost during keyboard move

During keyboard reparenting, no cursor ghost is shown. Instead, the node itself gets the pulsing `.keyboard-move-mode` treatment (Section 6.1).

---

## 10. Undo Support

### 10.1 Undo entry

`engine.captureForUndo()` is already called when drag starts (line 232 in `CanvasInteraction.svelte.ts`). This captures the full state snapshot before the move.

A reparent operation results in a single undo step (the position move + parent relationship change are a single atomic snapshot).

### 10.2 Undo toast

After a successful reparent, the toast reads:
- "Node moved to [parent role] node. [Undo]"
- Undo button: calls `engine.undo()`, dismisses toast
- Auto-dismiss: 5 seconds (longer than the default 4s delete toast — reparenting is harder to notice)

### 10.3 Undo keyboard shortcut

`Cmd/Ctrl+Z` — already wired globally in `TraekCanvas.svelte`. No new work needed.

### 10.4 Drag cancel undo cleanup

If the user presses `Escape` to cancel a drag, the snapshot captured at drag start must be removed to avoid polluting the undo stack with a no-op. Implementation: `engine.discardLastUndoSnapshot()` (new engine method needed).

---

## 11. Accessibility

### 11.1 Drag handle ARIA

```html
<button
  class="drag-handle"
  aria-label="Move node — press Space to enter keyboard move mode"
  aria-roledescription="sortable drag handle"
  tabindex="-1"  <!-- keyboard move entered via Space on the node itself, not here -->
/>
```

The handle button is `tabindex="-1"` because keyboard users access move mode from the parent node element directly (Space key), not by tabbing to the handle. This keeps the tab order clean.

### 11.2 ARIA live region announcements

| Event | Announcement | Politeness |
|-------|-------------|------------|
| Drag start (keyboard) | "Moving [role] node. Arrow keys to navigate, Enter to confirm, Escape to cancel." | `assertive` |
| Hover valid target (keyboard) | "Would become child of [target role] node." | `polite` |
| Hover invalid target (keyboard) | "Cannot move here — would create a cycle." | `polite` |
| Hover invalid target — already parent | "Cannot move here — already a direct parent." | `polite` |
| Confirm reparent | "Node moved. New parent: [target role] node." | `assertive` |
| Cancel | "Move cancelled. Node returned to original position." | `polite` |
| Drop on valid (mouse) | "Node moved. Undo available." | `polite` |

All announcements go through the existing `LiveRegion` component (`LiveRegion.svelte`) already wired in `TraekCanvas.svelte`.

### 11.3 Focus management

- After a successful reparent, focus returns to the reparented node.
- After a cancel, focus returns to the node that was being moved.
- During keyboard move mode, focus ring is suppressed on intermediate navigation targets (they show the preview connection instead).

### 11.4 Reduced motion

All drag animations must respect `prefers-reduced-motion`:

| Animation | Reduced motion behavior |
|-----------|------------------------|
| Ghost follow cursor | Immediate (no transition) |
| Drop zone border appear | Immediate (no transition) |
| Preview connection dash animation | Disabled (static line at 0.6 opacity) |
| Node snap-back on cancel | Immediate position reset (no spring) |
| Success connection flash | Disabled |
| Keyboard move mode pulse | Disabled (static border instead) |

CSS pattern:
```css
@media (prefers-reduced-motion: reduce) {
  .drag-ghost,
  .drop-zone-highlight,
  .keyboard-move-mode {
    animation: none;
    transition: none;
  }
}
```

### 11.5 Touch drag accessibility

Touch drag (long-press) is a gesture-dependent interaction with no inherent keyboard or screen reader equivalent. The keyboard move mode (Section 6) provides the fully accessible alternative. Documentation and the onboarding tour must both mention keyboard move.

---

## 12. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Drop on the dragged node itself | Rejected (no visual change, node snaps back) |
| Drop on a descendant (would create cycle) | Invalid state shown; rejected on drop |
| Drop on existing direct parent | Invalid state shown (already a parent — reparenting to same parent is a no-op and confusing); rejected |
| Drop on a collapsed node | Allowed; the reparented node appears inside the collapsed subtree. Toast: "Node moved inside a collapsed branch. [Expand]" |
| Drag starts while streaming is in progress on that node | Not blocked — streaming continues on the dragged node |
| Drag starts on a root node (no parent) | Allowed — root nodes can gain a parent |
| Drag starts on the only child of a parent | Allowed — parent becomes childless (not deleted) |
| Viewport scale < 0.15 (nodes invisible) | Drag handles hidden; reparenting only possible via keyboard |
| Multi-select, dragged node is in selection | Position of all selected nodes moves; only dragged node reparents |
| Multi-select, dragged node is NOT in selection | Single-node drag (selection is not involved) |
| `engine.reparentNode()` throws (defensive) | Error toast: "Couldn't move node. Try again." Snapshot rolled back via undo. |

---

## 13. Visual Design Reference

### 13.1 Drag handle icon

```
· ·
· ·
· ·
```

2×3 grid, each dot 2px diameter, 6px vertical spacing, 5px horizontal spacing.
SVG viewBox: `0 0 11 16`

```xml
<svg viewBox="0 0 11 16" fill="currentColor" aria-hidden="true">
  <circle cx="2" cy="2" r="1.5"/>
  <circle cx="9" cy="2" r="1.5"/>
  <circle cx="2" cy="8" r="1.5"/>
  <circle cx="9" cy="8" r="1.5"/>
  <circle cx="2" cy="14" r="1.5"/>
  <circle cx="9" cy="14" r="1.5"/>
</svg>
```

### 13.2 Color tokens used

| Token | Default (dark) | Purpose |
|-------|---------------|---------|
| `--traek-accent` | `#00d8ff` | Valid drop zone border, ghost border, preview line |
| `--traek-error` | `#ff4d4d` | Invalid drop zone border |
| `--traek-node-bg` | `#161616` | Ghost background |
| `--traek-text-tertiary` | `#555555` | Drag handle at rest |
| `--traek-text-secondary` | `#888888` | Drag handle on hover |

### 13.3 Timing

| Animation | Duration | Easing |
|-----------|----------|--------|
| Drag handle appear on hover | 150ms | ease |
| Drop zone border appear | 100ms | ease |
| Preview connection appear (dwell) | 200ms | ease-out |
| Node lift on drag start | 150ms | ease-out (scale 1.0 → 1.02) |
| Ghost appear | 100ms | fade |
| Node snap-back on cancel | 200ms | ease-out |
| Success connection flash | 400ms | ease-in-out |
| Toast appear | 200ms | existing toast timing |

---

## 14. Implementation Checklist (for developer handoff)

The following items need to be built or modified. This list is ordered by dependency.

### New components
- [ ] `DragGhost.svelte` — floating ghost rendered during drag
- [ ] `DragHandle.svelte` — the 2×3 dot-grid button (reusable, placed inside `TraekNodeWrapper`)

### Modified components
- [ ] `TraekNodeWrapper.svelte` — add drag handle slot, apply `.drop-target-*` classes, `.keyboard-move-mode` class
- [ ] `CanvasInteraction.svelte.ts` — add auto-scroll logic, `altKey` snap override, `Escape` cancel with `discardLastUndoSnapshot()`
- [ ] `NodeRenderer.svelte` — pass new drop zone class props to each node wrapper
- [ ] `TraekCanvas.svelte` — mount `DragGhost`, wire keyboard move mode events to `LiveRegion`
- [ ] `KeyboardNavigator.svelte.ts` — add Space-key move mode, arrow navigation in move mode
- [ ] `ConnectionLayer.svelte` — add dashed preview connection rendering
- [ ] `TraekEngine.svelte.ts` — add `discardLastUndoSnapshot()` method

### New CSS classes
- `.drag-handle` — on the handle button
- `.node-dragging` — on the node being dragged (0.6 opacity, dashed border)
- `.drop-target-valid` — on nodes that can receive the drop
- `.drop-target-invalid` — on nodes that cannot
- `.drop-target-hover-valid` — on the node currently under cursor (valid)
- `.drop-target-hover-invalid` — on the node currently under cursor (invalid)
- `.keyboard-move-mode` — on a node in keyboard move mode
- `.reparent-mode` — on the viewport element while any drag is in flight (useful for global cursor overrides)

### Keyboard shortcut additions
| Key | Context | Action |
|-----|---------|--------|
| `Space` | Node keyboard-focused | Enter keyboard move mode |
| `Enter` | Keyboard move mode active | Confirm reparent |
| `Escape` | Keyboard move mode active | Cancel move |
| `Escape` | Mouse drag in flight | Cancel drag |

---

## 15. Open Questions

1. **Reparent vs. "add connection":** The current engine supports multi-parent nodes (DAG, not pure tree). `reparentNode()` replaces all parents. Should we expose an "add as additional parent" option in the drag flow (e.g., hold `Ctrl` while dropping)? Or keep reparent as the only semantic?

2. **Auto-layout after reparent:** When `layoutMode` is `tree-vertical` (auto layout), should reparenting trigger a full layout recompute? Or should the user manually re-run layout? A reparented node in the middle of an auto-layout tree may cause jarring repositioning of other nodes.

3. **Multi-select reparent (future):** Drag all selected nodes onto a new parent simultaneously. This would reparent all of them. Needs cycle detection across all nodes, clear preview of all new connections, and a single undoable snapshot.

4. **Drag from minimap:** Should nodes be draggable from the minimap thumbnail? Probably not for v1 — too small to be precise.

5. **Drop on connection line:** Alternative reparenting model: drag a node onto an existing connection line to insert it between parent and child. Clean UX for "insert node in path" but complex to implement and discover.

---

## Appendix: UX Principles Applied

| Principle | Application |
|-----------|-------------|
| **Fitts's Law** | Large drop zones (full node bounding box), not just headers. Drag handle sized for easy targeting (24px hit area). |
| **Hick's Law** | Single clear action per drag (reparent). No ambiguity about what will happen. |
| **Jakob's Law** | Drag handle idiom matches Figma, Notion, Linear — familiar to power users. |
| **Error prevention** | Invalid drop zones highlighted before user releases. Cycle detection at drag start. |
| **Undo/redo** | Every reparent is a single undoable step. Cancel does not pollute undo stack. |
| **Feedback** | Ghost follows cursor, drop zones update in real time, toast confirms success, ARIA announces to screen readers. |
| **Accessibility** | Full keyboard alternative (Space → arrow → Enter), ARIA live region for all state changes, reduced-motion alternatives for all animations. |
