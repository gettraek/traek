# Responsive Canvas Chrome — Design & Implementation

**TRK-114** | 2026-03-08 | UI & Brand Designer

---

## Summary

Adds a 3-tier responsive layout to TraekCanvas chrome — the floating toolbar controls that overlay the spatial canvas. Mobile (<768px) was already handled by FocusMode; this work targets the gap at tablet (769–1024px) and cleans up the chrome architecture.

---

## Breakpoint Strategy

| Breakpoint | Range | Mode | Approach |
|---|---|---|---|
| Desktop | ≥1025px | Canvas | Unchanged — all chrome at current positions |
| Tablet | 769–1024px | Canvas | Touch-optimized: 44px targets, repositioned chrome |
| Mobile | ≤768px | FocusMode | Already implemented — swipe navigation |

The existing `mobileBreakpoint` prop (default 768) controls the canvas↔FocusMode switch. The new CSS breakpoints are additive — they refine the canvas chrome without changing behaviour.

---

## Changes

### New Component: `CanvasToolbar.svelte`

Replaces the inline `.top-right-controls` div in TraekCanvas. Encapsulates undo/redo buttons + ThemePicker in a self-contained, breakpoint-aware component.

- Desktop: 32px buttons, top-right at 20px offset
- Tablet (769–1024px): 44px buttons, top-right at 12px offset
- Mobile canvas: 44px buttons, top-right at 8px offset

### `ZoomControls.svelte`

- Tablet: switches from vertical column to **horizontal strip**, 44px buttons, repositioned to bottom-right at 88px above baseline (above the input form)
- Separator rotates from horizontal divider to vertical divider in horizontal layout

### `Minimap.svelte`

- Tablet/mobile: toggle button grows to 44px (touch-safe)
- Repositioned to `bottom: 100px` on tablet, `bottom: 92px` on small screens
- Starts **collapsed** by default (`isExpanded = false` — unchanged), which is appropriate for small screens where every pixel matters

### `TraekCanvas.svelte` (CSS)

- Tablet: `.floating-input-container` expands to `calc(100vw - 140px)` (wider, leaving room for the ZoomControls strip on the right)
- Tablet: `.annotation-toolbar-wrapper` moves to `bottom: 100px` to clear the ZoomControls strip
- Mobile canvas: `.floating-input-container` expands to `calc(100vw - 1.5rem)`, annotation toolbar at `bottom: 92px`

### `TraekNodeWrapper.svelte` (CSS)

- Tablet (769–1024px): `.node-header` and `.thought-pill` gain `min-height: 44px` — touch-safe targets without changing visual padding (desktop pads are fine, mobile already had 14px padding)

---

## Accessibility

- All interactive chrome elements meet **WCAG 2.5.8** 24×24px minimum; tablet sizes explicitly hit 44×44px
- Focus rings preserved at all breakpoints (`outline: 2px solid var(--traek-node-active-border)`)
- No changes to keyboard navigation

---

## What Was Not Changed

- FocusMode (mobile <768px) — left intact
- Node layout / engine coordinates — no spatial changes; `nodeWidth` prop unchanged
- ThemePicker — already responsive internally
- AnnotationToolbar — positioned responsively via parent CSS, internal structure unchanged

---

## Testing

All 1063 unit tests pass. No new lint errors. `svelte-check` at 0 errors (11 pre-existing warnings, none related to this change).

Visual testing recommended at:
- 1280px (desktop baseline)
- 1024px (tablet boundary)
- 900px (mid-tablet)
- 769px (just above FocusMode threshold)
