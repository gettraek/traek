# UX Specification: Canvas Export & Share (TRK-118)

**Status:** Ready for implementation
**Author:** UX Expert
**Date:** 2026-03-08
**Issue:** TRK-118

---

## 1. Problem Statement

Traek conversations are uniquely spatial — branches, visual hierarchy, and node positions are core to their value. When users want to share a conversation with a colleague, save it for future reference, or hand off context to another tool, they currently have no discoverable, unified interface to do so.

Several export primitives already exist in the codebase (`snapshotToJSON`, `snapshotToMarkdown`, `snapshotToPDFHtml`, `SharePreviewCard`, `TraekEmbed`, `QrHandoff`) but they are developer APIs with no user-facing surface. This spec defines the UX for surfacing all export and sharing capabilities through a single, coherent interaction layer.

### 1.1 User Problems

1. **"I want to send this conversation to a colleague"** — No share link, no copy-paste that preserves structure.
2. **"I need a screenshot of the canvas for a report"** — No image export; manual screenshotting loses UI chrome.
3. **"I want to back up this conversation and restore it later"** — No import mechanism is discoverable.
4. **"I copied the text from a node but it still had markdown syntax in it"** — No clean copy-to-clipboard per node.
5. **"I built a Traek integration and want to share a read-only view"** — The embed exists but there's no UX for generating the share URL.

---

## 2. User Goals

- **Share instantly:** "Give me a link I can paste into Slack."
- **Capture the visual:** "I want a PNG that looks like the canvas."
- **Portable backup:** "Export as JSON so I can restore it anywhere."
- **Document creation:** "Export as Markdown so I can paste it into Notion."
- **Selective sharing:** "Copy just what this node says, without markdown."
- **Import existing work:** "I have a JSON file — I want to open it in Traek."

---

## 3. Entry Points

Export and share are accessible through three surfaces:

### 3.1 Canvas Toolbar Button

A dedicated **"Share"** button in the `CanvasToolbar` (right section), using the `share` icon. Opens the Export & Share sheet.

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Fit] [Zoom -] [100%] [Zoom +]          [Minimap] [Share] [⋮]    │
└─────────────────────────────────────────────────────────────────────┘
```

- **Keyboard shortcut:** `⌘⇧E` (macOS) / `Ctrl+Shift+E` (Windows/Linux)
- **ARIA label:** `"Export and share conversation"`

### 3.2 Node Context Menu

Each node's `NodeToolbar` gains a **"Copy"** action (already partially supported by `defaultNodeActions`). This opens a mini copy picker, not the full sheet.

### 3.3 Command Palette

The command palette (TRK-117) includes export commands:

| Command | Action |
|---|---|
| Export as PNG | Opens sheet, pre-selects PNG tab |
| Export as JSON | Triggers download directly |
| Export as Markdown | Triggers download directly |
| Share link | Opens sheet, pre-selects Share tab |
| Copy node text | Requires focused node |

---

## 4. Export & Share Sheet

The primary surface is a **bottom sheet** (mobile) or **slide-over panel** (desktop, right side, 480px wide). It slides in from the right without obscuring the canvas, keeping the spatial view visible for reference.

### 4.1 Sheet Structure

```
┌──────────────────────────────────────────────────────────┐
│  Export & Share                                  [✕]    │
├──────────────────────────────────────────────────────────┤
│  [Image]  [Text]  [Share]  [Import]                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  (tab content — see sections below)                     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Tab labels and icons:**

| Tab | Icon | Description |
|---|---|---|
| Image | camera | PNG/SVG canvas capture |
| Text | file-text | JSON, Markdown, PDF |
| Share | share-2 | Link generation, embed code, QR |
| Import | upload | Restore from JSON |

**Sheet behaviour:**
- Opens via CSS transform slide-in (300ms ease-out); respects `prefers-reduced-motion` (instant show/hide)
- Backdrop at 30% opacity; clicking backdrop closes the sheet
- Escape key closes the sheet; focus returns to trigger element
- Focus is trapped within the sheet while open
- Sheet scrolls internally if content overflows; it does not cause the page to scroll
- On mobile (< 768px): full-screen bottom sheet with drag-to-dismiss handle

---

## 5. Image Tab (Canvas Screenshot)

### 5.1 Scope Selector

Before exporting, the user chooses what region to capture:

```
Export area
  ○ Full canvas  — all nodes, regardless of current viewport
  ● Current view — exactly what is visible on screen now
  ○ Selection    — drag a selection rectangle on the canvas
```

**Full canvas** renders every node at their spatial coordinates. This may produce a very large image for complex conversations; the UI shows an estimated pixel size: _"~3200 × 2100 px"_.

**Current view** captures the viewport at the current zoom level. Fastest option, always predictable.

**Selection mode** temporarily hides the sheet and puts the canvas into a rectangular-selection mode (crosshair cursor). The user drags a rectangle; confirmed with Enter or by clicking a floating "Capture" button. Cancel with Escape.

### 5.2 Format Options

```
Format
  ● PNG   — best for sharing and screenshots (transparent background optional)
  ○ SVG   — scalable, smaller file for diagrams
```

For PNG, an additional toggle: **[ ] Transparent background** (unchecked by default; dark background is used).

### 5.3 Scale (PNG only)

```
Scale
  ○ 1×  — screen resolution
  ● 2×  — retina (recommended)
  ○ 3×  — high-res print
```

Estimated file size shown next to each option: _"~420 KB"_.

### 5.4 Preview

A small thumbnail preview (max 240 × 160 px, letterboxed) shows a preview of what will be exported. Updates whenever scope or options change.

If the canvas is empty, the preview shows a placeholder: _"Add some nodes to capture the canvas."_

### 5.5 Actions

```
[Download PNG]          or         [Copy to clipboard]
```

- **Download PNG** triggers the browser download with filename: `traek-{title}-{date}.png`
- **Copy to clipboard** uses the Clipboard API (`navigator.clipboard.write` with `ClipboardItem`); graceful fallback shown if clipboard permission is denied: _"Download the image instead."_
- Both buttons show a loading spinner during the `html2canvas` / SVG generation process
- On success, a toast notification confirms: _"Image copied to clipboard"_ or _"Download started"_

### 5.6 Technical Notes for Implementation

The PNG capture must use the **`html2canvas`** library (or equivalent like `dom-to-image-more`) applied to the canvas container element. The Svelte TraekCanvas element renders nodes as HTML, so rasterisation via `html2canvas` is the practical approach. Key implementation considerations:

- The canvas element `transform: scale(zoom) translate(panX, panY)` must be temporarily reset to capture full canvas
- Node positions come from the TraekEngine's spatial layout
- For full-canvas capture: calculate the bounding box of all nodes' `x, y, width, height`, then render at that size
- SVG export uses `foreignObject` wrapping; limited browser support — note this limitation to users

---

## 6. Text Tab (Structured Export)

### 6.1 Format Cards

Three format options displayed as selectable cards:

```
┌─────────────────────────────────────────┐
│  📄  JSON                               │
│  Full conversation backup.              │
│  Includes all nodes, branches,          │
│  and spatial layout.                    │
│                                [Export] │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ✏  Markdown                            │
│  Flat text for Notion, Obsidian,        │
│  or any markdown editor. Branches       │
│  shown as indented sections.            │
│                                [Export] │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  🖨  PDF / Print                         │
│  Opens print dialog. Branches           │
│  become separate pages.                 │
│                          [Open printer] │
└─────────────────────────────────────────┘
```

Each card has a subtle hover and active state (border highlight in `--traek-node-active-border`). The export button within each card triggers immediately on click — no confirmation required for non-destructive downloads.

### 6.2 Markdown Options

Clicking the Markdown card expands an options row (inline, no modal):

```
Include branch headers  [ ✓ ]
Include timestamps      [ ✓ ]
Flatten to single path  [   ]  (uses main thread only)
```

These are ephemeral settings (session only — not persisted).

### 6.3 JSON Options

```
Include spatial layout (x, y coordinates)  [ ✓ ]
Pretty-print (human-readable)              [ ✓ ]
```

Disabling spatial layout produces a smaller file suitable for portability between Traek instances with different canvas sizes.

### 6.4 Filenames

| Format | Filename |
|---|---|
| JSON | `traek-{slug}-{YYYY-MM-DD}.json` |
| Markdown | `traek-{slug}-{YYYY-MM-DD}.md` |
| PDF | Opens browser print dialog with document title set |

Where `{slug}` is the conversation title lowercased with spaces replaced by hyphens, truncated to 40 characters. Untitled conversations use `conversation`.

### 6.5 Slack & Discord

Below the three primary cards, a collapsed section **"Send to..."** reveals:

```
▼  Send to...

  [Slack]   [Discord]   [Notion ↗]
```

- **Slack**: Copies the Slack Block Kit JSON payload to clipboard (uses `snapshotToSlackJSON`). Toast: _"Slack payload copied — paste it into your Slack app's Block Kit Builder or API call."_
- **Discord**: Copies the Discord webhook JSON payload (uses `snapshotToDiscordJSON`). Toast: _"Discord payload copied."_
- **Notion**: Opens Notion's import URL with the markdown content pre-encoded (if the Notion integration is available in the host app; otherwise, a tooltip: _"Export as Markdown first, then import via Notion's 'Import' menu."_)

---

## 7. Share Tab (Link & Embed)

### 7.1 Share Link Generation

```
Share link

  ┌────────────────────────────────────────────────┐
  │  https://traek.app/c/abc123                [⎘] │
  └────────────────────────────────────────────────┘

  [Generate link]       Link valid for: [7 days ▾]

  ● Read-only   ○ View + comment   ○ View + fork
```

- **Generate link** calls the library consumer's `shareProvider` (a prop on `TraekCanvas`). If no provider is configured, the button is disabled with tooltip: _"Configure a shareProvider to enable link sharing."_
- The generated URL is displayed in a read-only input; clicking anywhere on the input or the copy icon copies it
- Expiry options: 24 hours, 7 days, 30 days, Never (if host allows)
- Permission modes: Read-only (default), View + comment, View + fork
- A "Regenerate" link appears after first generation (rotates the token without changing the URL structure)

### 7.2 QR Code

Below the share link, the `QrHandoff` component is rendered automatically once a URL is generated:

```
  ┌───────────────┐
  │  ░░░░░░░░░░░  │
  │  ░  ████  ░  │   Scan to open on mobile
  │  ░░░░░░░░░░░  │   traek.app/c/abc123
  └───────────────┘

  [Download QR code]
```

QR code download: saves as `traek-qr-{slug}.png` at 512 × 512 px.

### 7.3 Embed Code

Below QR code, a collapsed section **"Embed"**:

```
▼  Embed

  ┌────────────────────────────────────────────────┐
  │  <iframe                                       │
  │    src="https://traek.app/embed/abc123"        │
  │    width="100%" height="600"                   │
  │    style="border:none;"                        │
  │    title="Traek conversation">                 │
  │  </iframe>                              [Copy] │
  └────────────────────────────────────────────────┘

  Preview:
  ┌────────────────────────────────────────────────┐
  │  [TraekEmbed component preview]                │
  └────────────────────────────────────────────────┘
```

The preview renders the live `TraekEmbed` component at 100% width. Users can see exactly what recipients will see.

### 7.4 Social Share

```
Share on...  [X/Twitter]  [LinkedIn]  [Copy text snippet]
```

Each button opens the platform's share intent URL pre-populated with the conversation title and share link. "Copy text snippet" copies a formatted plain-text version of the first 280 characters plus the share URL.

---

## 8. Import Tab (JSON Restore)

### 8.1 Drop Zone

```
┌──────────────────────────────────────────────┐
│                                              │
│          ↑                                   │
│   Drop a Traek JSON file here                │
│   or click to browse                         │
│                                              │
│   .json files only · Max 10 MB              │
│                                              │
└──────────────────────────────────────────────┘
```

- File input with `accept=".json"` and a visible drop zone
- Drag-over state: border changes to cyan, background lightens slightly
- File size limit: 10 MB (display error if exceeded)

### 8.2 Validation Preview

After file selection, the JSON is validated against the `ConversationSnapshot` Zod schema. Success shows a preview card:

```
✓ Valid Traek conversation

  "My Research Session"
  Created March 7, 2026
  42 messages · 3 branches

  [Import and open]  [Cancel]
```

Validation failure shows an error with guidance:

```
✗ Invalid file

  This file doesn't appear to be a Traek conversation export.
  Make sure you're using a .json file exported from Traek.

  Error detail: [collapsed by default, click to expand]
```

### 8.3 Import Modes

```
When importing:
  ● Open as new conversation
  ○ Merge into current canvas
  ○ Replace current canvas  ⚠
```

**Open as new**: Creates a new conversation in the persistence layer and navigates to it.
**Merge**: Adds the imported nodes to the current canvas, offset to avoid overlapping existing nodes. Useful for combining conversations.
**Replace**: Replaces the current canvas. Shows a warning: _"This will permanently overwrite your current conversation. This cannot be undone."_ Requires an explicit confirmation step.

### 8.4 Spatial Layout Handling

If the imported JSON includes spatial layout data, it is preserved. If not (a "portable" export without coordinates), the import runs the engine's auto-layout algorithm to assign positions.

---

## 9. Per-Node Copy Actions

### 9.1 Copy Picker (Node Toolbar)

Each node in its `NodeToolbar` gains a **"Copy"** button. On click, a small popover appears (not a full sheet):

```
┌───────────────────────────────────┐
│  Copy as...                       │
│                                   │
│  [Plain text]  [Markdown]  [JSON] │
└───────────────────────────────────┘
```

- **Plain text**: Strips all markdown syntax; copies the rendered text content
- **Markdown**: Copies the raw markdown content of the node
- **JSON**: Copies the serialized `SerializedNode` object

After copying, the popover auto-closes and a toast confirms: _"Copied as plain text"_.

### 9.2 Keyboard Shortcut

When a node has keyboard focus: `⌘C` (macOS) / `Ctrl+C` copies plain text. `⌘⇧C` / `Ctrl+Shift+C` opens the copy picker.

### 9.3 Multi-Node Copy

When multiple nodes are selected (future feature — not in scope for TRK-118), `⌘C` copies all selected nodes as a JSON array.

---

## 10. Accessibility Requirements

### 10.1 Keyboard Navigation

| Action | Key |
|---|---|
| Open Export & Share sheet | `⌘⇧E` / `Ctrl+Shift+E` |
| Navigate tabs | `←` / `→` arrow keys when tab has focus |
| Close sheet | `Escape` |
| Trigger download | `Enter` on focused button |
| Select scope option | `Space` on focused radio |

The sheet must trap focus. On close, focus returns to the toolbar "Share" button.

### 10.2 Screen Reader Support

- Sheet heading: `<h2>Export & Share</h2>` with `role="dialog"` and `aria-labelledby`
- Tabs: `role="tablist"`, each tab `role="tab"`, panels `role="tabpanel"`
- Copy actions: `aria-live="polite"` region for toast confirmations
- Loading states: `aria-busy="true"` on action buttons during async operations
- Error states: `role="alert"` for validation failures

### 10.3 Contrast & Visual Design

- All text must meet 4.5:1 contrast ratio against the dark background (`#0e0e10`)
- Active tab indicator: 2px underline in `--traek-color-cyan` (`#00d8ff`)
- Selected radio/checkbox states are distinguishable by shape + color (not color alone)
- Disabled states: 40% opacity, `cursor: not-allowed`, clear label via `aria-disabled`

### 10.4 Reduced Motion

- Sheet slide animation: replaced with instant show/hide when `prefers-reduced-motion: reduce`
- Progress spinners: replaced with static text ("Processing…")
- Preview thumbnail: no animated transitions

---

## 11. States & Edge Cases

### 11.1 Empty Canvas

If there are no nodes, the Image tab shows: _"Add some nodes to the canvas first."_ The Text and Share tabs show the same empty state, with a button to dismiss the sheet.

### 11.2 Streaming Node

If a node is currently streaming, a notice appears at the top of the sheet:

```
⚠  One node is still streaming. Exports will capture the content received so far.
```

### 11.3 Very Large Canvases

For PNG export of a full canvas with > 200 nodes, a performance warning appears before generation:

```
⚠  This canvas has 234 nodes. Full-canvas PNG export may take a few seconds and
   produce a large file (~18 MB). Continue?

   [Export anyway]  [Export current view instead]
```

### 11.4 No Share Provider

When no `shareProvider` is configured on `TraekCanvas`, the Share tab shows:

```
Link sharing requires configuration.

To enable share links, pass a shareProvider prop to TraekCanvas:

  <TraekCanvas shareProvider={myProvider} ... />

See documentation →
```

The QR and embed sections are also hidden.

### 11.5 Clipboard Permission Denied

When the Clipboard API is unavailable or permission is denied, the "Copy to clipboard" button is replaced with a download button and a note:

```
Clipboard access was denied. The image has been downloaded instead.
```

### 11.6 Import — File Too Large

```
✗ File too large

  This file is 14.2 MB. Maximum size is 10 MB.
  For large exports, try splitting conversations before exporting.
```

---

## 12. `shareProvider` API

The `TraekCanvas` component accepts an optional `shareProvider` prop that the library consumer implements:

```typescript
interface ShareProvider {
  /**
   * Generate a shareable URL for the given snapshot.
   * Returns the URL string, or throws on failure.
   */
  generateLink(
    snapshot: ConversationSnapshot,
    options: ShareLinkOptions
  ): Promise<string>;

  /**
   * Revoke a previously generated share link.
   * Optional — if not provided, the "Regenerate" button is hidden.
   */
  revokeLink?(linkId: string): Promise<void>;
}

interface ShareLinkOptions {
  /** Expiry in seconds from now. undefined = no expiry. */
  expiresIn?: number;
  /** What the recipient is allowed to do */
  permission: 'read' | 'comment' | 'fork';
}
```

Example usage:

```svelte
<TraekCanvas
  engine={myEngine}
  onSendMessage={handleMessage}
  shareProvider={{
    async generateLink(snapshot, options) {
      const res = await fetch('/api/share', {
        method: 'POST',
        body: JSON.stringify({ snapshot, options })
      });
      const { url } = await res.json();
      return url;
    }
  }}
/>
```

---

## 13. `onImport` Callback

Import triggers an `onImport` callback on `TraekCanvas`:

```typescript
interface TraekCanvasProps {
  // ... existing props
  onImport?: (snapshot: ConversationSnapshot, mode: ImportMode) => void | Promise<void>;
}

type ImportMode = 'new' | 'merge' | 'replace';
```

If `onImport` is not provided, the Import tab is hidden. This lets library consumers control whether import is available and implement their own persistence logic.

---

## 14. Component Architecture

```
ExportShareSheet.svelte          ← sheet container, tab routing
├── ImageExportTab.svelte        ← PNG/SVG capture
│   ├── ScopeSelector.svelte     ← full / current view / selection
│   ├── CanvasSelectionOverlay.svelte  ← drag-to-select mode
│   └── ExportPreview.svelte     ← thumbnail preview
├── TextExportTab.svelte         ← JSON / Markdown / PDF
│   └── FormatCard.svelte        ← reusable format card
├── ShareTab.svelte              ← link / QR / embed
│   ├── QrHandoff.svelte         ← (existing, reused)
│   ├── SharePreviewCard.svelte  ← (existing, reused)
│   └── EmbedCodeBlock.svelte    ← iframe snippet + preview
├── ImportTab.svelte             ← JSON restore
│   └── DropZone.svelte          ← file drop + validation
└── CopyPickerPopover.svelte     ← per-node copy (inline, no sheet)
```

All new components live in `packages/svelte/src/lib/export/`.

---

## 15. Design Tokens

All new components use existing `--traek-*` custom properties. No new tokens are required. Key tokens in use:

| Token | Usage |
|---|---|
| `--traek-bg` | Sheet background |
| `--traek-surface` | Cards, drop zone background |
| `--traek-border` | Card and sheet borders |
| `--traek-color-cyan` | Active tab indicator, success states |
| `--traek-color-error` | Error messages |
| `--traek-text-primary` | Heading text |
| `--traek-text-secondary` | Descriptions, labels |
| `--traek-text-muted` | File size estimates, meta |

---

## 16. Success Metrics

| Metric | Target |
|---|---|
| Time to first export | < 15 seconds from opening the sheet |
| PNG generation time (current view, 1× scale) | < 3 seconds |
| Share link copy rate (when shareProvider configured) | > 60% of sheet opens |
| Import success rate (valid JSON) | > 95% (schema validation coverage) |
| Keyboard-only completion | All flows completable without mouse |
| WCAG 2.1 AA | Zero violations in automated audit |

---

## 17. Out of Scope

The following are explicitly deferred:

- **Real-time collaborative sharing** (covered by separate collab spec)
- **Video/GIF export** of canvas animations
- **Figma plugin** export
- **Native mobile share sheet** integration (covered by touch spec)
- **Server-side OG image generation** for share URLs (backend concern; `SharePreviewCard` is available for consumer use)
- **Export templates** (custom branding on PDF/PNG)
