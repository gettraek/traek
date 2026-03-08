# Træk Icon System

Visual language guide and usage reference for the Træk custom icon set.

---

## Visual Language

### Grid

| Size | Use case | viewBox |
|------|----------|---------|
| 24×24 px | Default, node icons, toolbar | `0 0 24 24` |
| 16×16 px | Compact UI, zoom controls | Scale via `size` prop |
| 12×12 px | Status dots, badges | Scale via `size` prop |

All icons live on a 24×24 grid with a **2 px safe-zone** on every side. The live drawing area is 20×20 px. This ensures crisp rendering at all sizes and protects against clipping in hosting contexts.

### Stroke

| Property | Value |
|----------|-------|
| Default weight | `2px` |
| Linecap | `round` |
| Linejoin | `round` |
| Color | `currentColor` |

Using `currentColor` means icons inherit color from their parent element — no hard-coded values. This supports dark mode, themed surfaces, and opacity transitions out of the box.

### Corner Radius

| Context | Radius |
|---------|--------|
| Container shapes (node icons) | `3 px` |
| Small rect elements (snap-grid cells) | `0.5 px` |
| Circle elements | N/A |

Sharp-ish corners with 3 px radius reflect Træk's technical precision while remaining approachable. Avoid circular corners (`rx=full`) which feel too playful for a developer tool.

### Fill vs. Stroke

Icons are **primarily stroke-based** to keep weight consistent across sizes. Fill is used selectively:

- **Filled dots**: status indicators (streaming dots, branch node-tips, tag dots) use `fill="currentColor"` with no stroke
- **Outline shapes**: all containing geometry uses `fill="none" stroke="currentColor"`
- **Circle handles**: slider handles in `settings` use a background fill matching the surface (`var(--traek-node-bg)`) to occlude the track line behind them

### Optical Alignment

When placing icons inline with text:

- Use `vertical-align: middle` or flexbox `align-items: center`
- For 24px icons next to 14px body text, set icon `size={18}` for optical balance
- Add `0.25em` gap between icon and label
- Status icons (streaming, done, error) scale to match surrounding text height (1em)

---

## Icon Catalogue

### Node Type Icons

Used to identify the semantic type of a canvas node. Rendered inside the node header.

| Name | Component | Description |
|------|-----------|-------------|
| `node-text` | `<Icon name="node-text" />` | Text / markdown message node |
| `node-code` | `<Icon name="node-code" />` | Code block node (`</ >` brackets) |
| `node-thought` | `<Icon name="node-thought" />` | Reasoning / thought chain node |
| `node-image` | `<Icon name="node-image" />` | Image / multimodal node |

### Canvas Action Icons

Controls for viewport and canvas interaction (zoom controls toolbar, context menus).

| Name | Component | Description |
|------|-----------|-------------|
| `branch` | `<Icon name="branch" />` | Branch from current node (Y-fork) |
| `collapse` | `<Icon name="collapse" />` | Collapse / fold node |
| `expand` | `<Icon name="expand" />` | Expand / unfold node |
| `zoom-in` | `<Icon name="zoom-in" />` | Zoom into canvas |
| `zoom-out` | `<Icon name="zoom-out" />` | Zoom out of canvas |
| `pan` | `<Icon name="pan" />` | Pan mode (drag to move viewport) |
| `fit` | `<Icon name="fit" />` | Fit all nodes into view |
| `snap-grid` | `<Icon name="snap-grid" />` | Toggle snap-to-grid |
| `focus-mode` | `<Icon name="focus-mode" />` | Focus on single node (crosshair) |

### Status Indicators

Shown in node headers to communicate generation state. Use at 12–16 px.

| Name | Component | Description | Animation |
|------|-----------|-------------|-----------|
| `streaming` | `<Icon name="streaming" />` | AI actively generating | Animate dots with CSS (see below) |
| `done` | `<Icon name="done" />` | Response complete | None |
| `error` | `<Icon name="error" />` | Generation failed | None |
| `warning` | `<Icon name="warning" />` | Non-fatal alert | None |
| `spinner` | `<Icon name="spinner" />` | Generic loading arc | `animation: spin 0.8s linear infinite` |

#### Streaming animation (CSS)

```css
/* Apply to the <svg> element or its parent */
.traek-status-streaming svg circle:nth-child(2) {
  animation: traek-dot-pulse 1.2s ease-in-out infinite;
  animation-delay: 0.2s;
}
.traek-status-streaming svg circle:nth-child(3) {
  animation: traek-dot-pulse 1.2s ease-in-out infinite;
  animation-delay: 0.4s;
}

@keyframes traek-dot-pulse {
  0%, 80%, 100% { opacity: 1; transform: translateY(0); }
  40% { opacity: 0.4; transform: translateY(-2px); }
}

@media (prefers-reduced-motion: reduce) {
  .traek-status-streaming svg circle { animation: none; }
}
```

### Toolbar / Utility Icons

General purpose icons for action menus, node toolbars, and sidebar controls.

| Name | Component | Description |
|------|-----------|-------------|
| `send` | `<Icon name="send" />` | Submit / send message (paper-plane) |
| `search` | `<Icon name="search" />` | Search nodes |
| `bookmark` | `<Icon name="bookmark" />` | Bookmark a node |
| `tag` | `<Icon name="tag" />` | Tag / categorise a node |
| `copy` | `<Icon name="copy" />` | Copy content |
| `delete` | `<Icon name="delete" />` | Delete node (trash can) |
| `settings` | `<Icon name="settings" />` | Open settings (sliders) |
| `pin` | `<Icon name="pin" />` | Pin node in place |
| `link` | `<Icon name="link" />` | Connection / link between nodes |
| `edit` | `<Icon name="edit" />` | Edit node content |
| `retry` | `<Icon name="retry" />` | Retry / regenerate |
| `filter` | `<Icon name="filter" />` | Filter node list |
| `compare` | `<Icon name="compare" />` | Side-by-side branch comparison |
| `undo` | `<Icon name="undo" />` | Undo last action |
| `redo` | `<Icon name="redo" />` | Redo action |

### Primitives

Low-level icons used as building blocks in compound UI elements.

| Name | Component | Description |
|------|-----------|-------------|
| `close` | `<Icon name="close" />` | Dismiss / X |
| `check` | `<Icon name="check" />` | Confirm / checkmark |
| `chevron-down` | `<Icon name="chevron-down" />` | Expand dropdown |
| `chevron-up` | `<Icon name="chevron-up" />` | Collapse dropdown |
| `chevron-right` | `<Icon name="chevron-right" />` | Navigate forward |
| `chevron-left` | `<Icon name="chevron-left" />` | Navigate back |
| `node` | `<Icon name="node" />` | Generic node indicator |

---

## Usage

### Svelte (recommended)

```svelte
<script>
  import { Icon } from '@traek/svelte'
</script>

<!-- Default 24×24 -->
<Icon name="branch" />

<!-- Custom size -->
<Icon name="zoom-in" size={16} />

<!-- With accessible label -->
<Icon name="done" aria-label="Response complete" aria-hidden={false} />

<!-- Custom stroke weight -->
<Icon name="send" strokeWidth={1.5} />

<!-- With CSS class -->
<Icon name="error" class="text-red-500" />
```

### Node-type Svelte components (tree-shakeable)

For node-type icons used at high frequency, import the individual component to exclude unused icons from your bundle:

```svelte
<script>
  import { IconNodeText, IconNodeCode, IconNodeThought } from '@traek/svelte'
</script>

<IconNodeText size={20} aria-hidden />
```

### SVG Sprite (no JavaScript)

Inject `sprite.svg` into your page once, then reference symbols anywhere:

```html
<!-- Inject hidden sprite (once per page, e.g. in <body>) -->
<div aria-hidden="true" style="display:none">
  <!-- paste sprite.svg content here, or load via <object> -->
</div>

<!-- Use anywhere in HTML -->
<svg width="24" height="24" aria-hidden="true">
  <use href="#icon-branch" />
</svg>

<!-- With accessible label -->
<svg width="24" height="24" role="img" aria-label="Branch conversation">
  <use href="#icon-branch" />
</svg>
```

---

## Accessibility

- All `<Icon>` components default to `aria-hidden="true"` (decorative)
- Provide `aria-label` + `aria-hidden={false}` when the icon is the **only** label for an interactive element
- Never rely on icon color alone — always pair with text or a tooltip for meaning
- Icons meet WCAG 3:1 contrast against `var(--traek-node-bg, #161616)` when using `currentColor` at `var(--traek-node-text, #dddddd)`

---

## Design Decisions

### Why a data-driven system over individual `.svelte` files?

The `Icon` component + `icons.ts` data map gives:

- **Single import** for all icons — one tree-shakeable chunk
- **Runtime name binding** — `<Icon name={dynamicName} />` without switch statements
- **Consistent SVG attributes** (viewBox, strokeWidth, aria) set once on the wrapper SVG
- **Easy addition** — add a name to `IconName` + one entry to `ICONS`, done

Individual Svelte components (`IconNodeText.svelte` etc.) are offered only for the four **node-type icons** which need mixed fill+stroke that the path-only system cannot express.

### Why sliders for `settings` instead of a gear?

Gears render poorly at 16×24 px. Two offset horizontal sliders are instantly recognisable as "controls/preferences" at any size and align with the brand's technical-tool aesthetic.

### Why no icon families (Heroicons / Lucide)?

Træk's brand requires: branch nodes as filled circles (brand), thought-bubble internals, and consistent with the canvas dot visual language. Third-party families would need heavy patching to match. A bespoke set ensures pixel-perfect cohesion at every scale.
