# UX Specification: Keyboard Shortcuts & Command Palette (TRK-117)

**Status:** Ready for implementation
**Author:** UX Expert
**Date:** 2026-03-08

---

## 1. Problem Statement

Power users who have learned the Traek canvas model want to operate it entirely from the keyboard — but the current shortcut system has three gaps:

1. **Discoverability**: Shortcuts are documented in the `?` help overlay, but there is no way to _search_ across all available actions. Users must know a shortcut exists before they can find it.
2. **Completeness**: Not all canvas actions (zoom, pan, branch creation, layout switching) are keyboard-accessible. Mouse-only paths block users who rely on keyboards.
3. **Customisability**: Library consumers have no API to register additional shortcuts, override defaults, or detect conflicts when layering their own handlers on top.

The command palette (`⌘K` / `Ctrl+K`) solves discoverability. The shortcut registry solves completeness and customisability. Together they make Traek a first-class keyboard-driven application.

---

## 2. User Goals

- **Find actions fast:** "I know what I want to do — let me type it and go."
- **Learn by exploring:** "Show me everything the canvas can do."
- **Work without a mouse:** "I want to navigate, create, zoom, and branch without ever reaching for the trackpad."
- **Customise my setup:** "I use Vim bindings everywhere — Traek should respect that."
- **Build on top safely:** "My library integration shouldn't silently conflict with Traek's built-in shortcuts."

---

## 3. Command Palette: Overview

The command palette is a modal overlay triggered by `⌘K` (macOS) / `Ctrl+K` (Windows/Linux). It provides a unified, fuzzy-searchable interface for every canvas action, node operation, navigation command, and configuration toggle.

### 3.1 Trigger Points

| Trigger | Context | Action |
|---|---|---|
| `⌘K` / `Ctrl+K` | Any time (canvas or input focused) | Opens command palette |
| `⌘K` / `Ctrl+K` again | Palette open | Closes palette |
| `Escape` | Palette open | Closes palette |
| Toolbar "Commands" button | Canvas | Opens command palette |

**Input field exception:** When an `<input>` or `<textarea>` has focus, `⌘K` still opens the palette. The browser interprets `Ctrl+K` differently on some platforms (address bar), so `⌘K` is preferred on macOS. On Windows/Linux, `Ctrl+K` is used when the canvas has focus; if it conflicts with the host app, library consumers may remap via the registry API.

### 3.2 Palette Anatomy

```
┌─────────────────────────────────────────────────────────┐
│  🔍  Search commands, nodes, or type a message...  [⌘K] │
├─────────────────────────────────────────────────────────┤
│  RECENT                                                  │
│  ⎌  Fit all nodes                           f            │
│  ⤢  Branch from current node               ⇧B           │
│                                                          │
│  NAVIGATION                                              │
│  ↑  Go to parent node                      ↑            │
│  ↓  Go to first child                      ↓            │
│  ⌂  Go to root                             Home          │
│  ⤓  Go to deepest leaf                     End           │
│  ⌕  Fuzzy search nodes                     /            │
│                                                          │
│  CANVAS                                                  │
│  ⊞  Fit all nodes                          f            │
│  ⊕  Zoom in                                ⌘=           │
│  ⊖  Zoom out                               ⌘-           │
│  ↺  Reset zoom to 100%                     ⌘0           │
│  ☰  Switch layout: tree-vertical           ⌥1           │
│  ⇔  Switch layout: tree-horizontal         ⌥2           │
│                                                          │
│  NODES                                                   │
│  +  New message (focus input)              n / i        │
│  ⎇  Branch from focused node               ⇧B           │
│  ⌦  Delete focused node                    Del          │
│  ⊞  Collapse / expand                      Space        │
│  ✏  Rename / edit focused node             r            │
│                                                          │
│  SETTINGS                                               │
│  ⌨  Toggle vim mode                        —            │
│  ?  Show keyboard shortcuts                ?            │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Palette Specs

| Property | Value |
|---|---|
| Width | `min(640px, 92vw)` |
| Max height | `80vh` with overflow scroll |
| Position | Centred horizontally, `20vh` from top (not vertically centred — higher feels more "command-like") |
| Backdrop | `rgba(0,0,0,0.6)` + `backdrop-filter: blur(6px)` |
| Border radius | `var(--traek-radius-lg, 12px)` |
| Animation | Fade + scale from 0.96 → 1.0, 160ms cubic-bezier(0.16, 1, 0.3, 1) |
| `prefers-reduced-motion` | Opacity only, no scale |

---

## 4. Command Palette: Search Behaviour

### 4.1 Three Search Modes

The search input handles three distinct query types, determined by the query content:

| Mode | Trigger | Description |
|---|---|---|
| **Action search** | Any text not starting with `>` or `@` | Fuzzy-matches across action labels and their aliases |
| **Node search** | Query starts with `@` or `/` | Searches node content (delegates to FuzzySearchOverlay logic) |
| **Explicit action** | Query starts with `>` | Forces action-only results, no node results |

**Default (empty query):** Show recent commands (up to 5) followed by all action groups.

### 4.2 Fuzzy Matching Rules

- Match is scored by: contiguous run bonus, start-of-word bonus, exact match bonus
- Results are ranked by score descending
- Each result highlights the matching characters (bold or coloured, not underline)
- Minimum match: all query chars must appear in order (same algorithm as existing `fuzzyMatch` in `FuzzySearchOverlay`)

**Aliases:** Each registered action can declare `aliases: string[]`. For example, the "Fit all nodes" action has aliases `['zoom fit', 'show all', 'overview']`. Aliases are searched but not shown in the result label.

### 4.3 Result Groups

Results are grouped in this order when unfiltered:

1. **Recent** — last 5 executed commands, stored in `sessionStorage`
2. **Navigation** — node traversal shortcuts
3. **Canvas** — zoom, fit, layout
4. **Nodes** — create, branch, delete, collapse, edit
5. **Settings** — mode toggles, help

When a search query is active, groups collapse and results appear in a flat ranked list (no group headers). If no results: show "No commands found for '…'" and a hint to press `Escape`.

### 4.4 Keyboard Interaction in Palette

| Key | Action |
|---|---|
| `↑` / `↓` | Move selection up/down |
| `Enter` | Execute selected command |
| `Tab` | Select first result (convenience) |
| `Escape` | Close palette |
| `⌘K` / `Ctrl+K` | Close palette |
| `Backspace` (empty query) | Close palette |

Mouse hover also updates selection. Clicking a result executes it.

### 4.5 Node Search Results

When the query starts with `@` or `/`, results show:

```
┌───────────────────────────────────────────┐
│  @  research                              │
├───────────────────────────────────────────┤
│  NODES — 3 results                        │
│  👤 "Here is my research question about…" │
│  🤖 "Based on the research you shared…"   │
│  👤 "Follow-up on the research angle…"    │
└───────────────────────────────────────────┘
```

Selecting a node result: closes the palette and navigates (keyboard focus + viewport scroll) to that node.

---

## 5. Command Palette: Command Result Item

```
┌─────────────────────────────────────────────┐
│  [icon]  Label text              [shortcut] │
│          Group label (if grouped)            │
└─────────────────────────────────────────────┘
```

| Element | Detail |
|---|---|
| Icon | 16×16 SVG, `aria-hidden="true"`, uses `--traek-*` colour tokens |
| Label | `font-size: 14px`, `font-weight: 500`, matching chars highlighted |
| Shortcut badge | `font-size: 12px`, monospace, muted, right-aligned; hidden on mobile |
| Row height | `48px` (touch-friendly) |
| Selected state | Background `var(--traek-nodeActiveBorder)` at 12% opacity, left border 2px accent |

---

## 6. Default Keyboard Shortcut Registry

This is the complete canonical shortcut set. It formalises what is already implemented in `KeyboardNavigator.svelte.ts` and adds the missing actions.

### 6.1 Navigation

| Action | Key(s) | Context | Notes |
|---|---|---|---|
| Go to parent node | `↑` | Canvas | Not in input field |
| Go to first child | `↓` | Canvas | |
| Go to previous sibling | `←` | Canvas | |
| Go to next sibling | `→` | Canvas | |
| Go to root | `Home` | Canvas | |
| Go to deepest leaf | `End` | Canvas | |
| Go to root (chord) | `g` `g` | Canvas | 500ms window |
| Go to deepest leaf (chord) | `g` `e` | Canvas | 500ms window |
| Jump to nth child | `1`–`9` | Canvas | Not in input field |
| Fuzzy node search | `/` | Canvas | Opens FuzzySearchOverlay |
| Open command palette | `⌘K` / `Ctrl+K` | Global | Works in input fields too |

### 6.2 Node Actions

| Action | Key(s) | Context | Notes |
|---|---|---|---|
| Focus input / new message | `n` / `i` | Canvas | |
| Activate focused node | `Enter` | Canvas | Sets activeNodeId |
| Collapse / expand | `Space` | Canvas | Needs children |
| Delete focused node | `Delete` / `Backspace` | Canvas | Moves focus to parent first |
| Branch from focused node | `⇧B` | Canvas | **NEW** — creates sibling branch |
| Edit focused node content | `r` | Canvas | **NEW** — opens inline edit |

### 6.3 Canvas / Viewport

| Action | Key(s) | Context | Notes |
|---|---|---|---|
| Fit all nodes in view | `f` / `F` | Canvas | |
| Zoom in | `⌘=` / `Ctrl+=` | Global | Also `⌘+` |
| Zoom out | `⌘-` / `Ctrl+-` | Global | |
| Reset zoom to 100% | `⌘0` / `Ctrl+0` | Global | **NEW** |
| Pan left | `⌘←` / `Ctrl+←` | Global | **NEW** |
| Pan right | `⌘→` / `Ctrl+→` | Global | **NEW** |
| Pan up | `⌘↑` / `Ctrl+↑` | Global | **NEW** |
| Pan down | `⌘↓` / `Ctrl+↓` | Global | **NEW** |
| Switch to tree-vertical layout | `⌥1` / `Alt+1` | Canvas | **NEW** |
| Switch to tree-horizontal layout | `⌥2` / `Alt+2` | Canvas | **NEW** |
| Switch to radial layout | `⌥3` / `Alt+3` | Canvas | **NEW** |

### 6.4 Settings & Overlays

| Action | Key(s) | Context | Notes |
|---|---|---|---|
| Show / hide keyboard help | `?` | Canvas | Existing |
| Open command palette | `⌘K` / `Ctrl+K` | Global | |
| Toggle vim mode | (command palette only) | — | No default key to avoid conflicts |
| Undo | `⌘Z` / `Ctrl+Z` | Global | Delegates to history manager |
| Redo | `⌘⇧Z` / `Ctrl+⇧Z` | Global | |

### 6.5 Annotations (Existing)

| Action | Key(s) | Context | Notes |
|---|---|---|---|
| Toggle annotation mode | `A` | Canvas | |
| Select sticky note tool | `1` | Annotation mode | |
| Select marker tool | `2` | Annotation mode | |
| Select pin tool | `3` | Annotation mode | |
| Select eraser tool | `E` | Annotation mode | |

### 6.6 Vim Mode (Optional)

| Action | Key(s) | Vim equivalent of |
|---|---|---|
| Navigate up (parent) | `k` | `↑` |
| Navigate down (child) | `j` | `↓` |
| Navigate left (prev sibling) | `h` | `←` |
| Navigate right (next sibling) | `l` | `→` |

---

## 7. Shortcut Registry API

### 7.1 Motivation

Library consumers need to:
- Register additional commands that appear in the command palette
- Override default shortcut bindings (e.g. remap `f` to `z` for zoom fit)
- Detect conflicts before they cause silent bugs
- Remove built-in shortcuts they don't want active

### 7.2 Type Definitions

```typescript
export type KeyCombo = {
  /** Primary key (e.g. 'k', 'Enter', 'ArrowUp', '=') */
  key: string;
  /** Modifier requirements */
  meta?: boolean;   // ⌘ on macOS
  ctrl?: boolean;   // Ctrl on all platforms
  shift?: boolean;
  alt?: boolean;    // ⌥ on macOS
  /** Platform-aware: true means meta on macOS, ctrl elsewhere */
  cmdOrCtrl?: boolean;
};

export type ShortcutContext = 'global' | 'canvas' | 'input' | 'palette';

export type ShortcutAction = {
  /** Unique identifier (URL-safe slug) */
  id: string;
  /** Display label in command palette */
  label: string;
  /** Search aliases (not displayed) */
  aliases?: string[];
  /** Command palette group */
  group?: 'navigation' | 'canvas' | 'nodes' | 'settings' | string;
  /** 16×16 icon identifier or SVG string */
  icon?: string;
  /** Key binding(s) — first is primary, rest are alternatives */
  keys?: KeyCombo[];
  /** Keyboard contexts where this action is active */
  context?: ShortcutContext;
  /** The handler called when this action executes */
  handler: (engine: TraekEngine) => void;
  /** If true, appears in command palette. Default: true */
  showInPalette?: boolean;
  /** If true, this action cannot be removed. Default: false (for built-ins, true) */
  builtin?: boolean;
};
```

### 7.3 ShortcutRegistry Class

```typescript
export class ShortcutRegistry {
  /**
   * Register a custom action.
   * If `id` already exists: console.warn, keep existing unless `force: true`.
   */
  register(action: ShortcutAction, options?: { force?: boolean }): void;

  /**
   * Register multiple actions at once.
   */
  registerAll(actions: ShortcutAction[]): void;

  /**
   * Remove an action by id.
   * Built-in actions (builtin: true) cannot be removed — logs a warning.
   */
  remove(id: string): void;

  /**
   * Override the key binding for an existing action.
   * Runs conflict detection before applying.
   * Returns: { success: boolean; conflict?: ShortcutAction }
   */
  remap(actionId: string, keys: KeyCombo[]): { success: boolean; conflict?: ShortcutAction };

  /**
   * Get all registered actions (built-in + custom), sorted by group.
   */
  getAll(): ShortcutAction[];

  /**
   * Get a single action by id.
   */
  get(id: string): ShortcutAction | undefined;

  /**
   * Check if a key combo is already bound to any action.
   * Returns the conflicting action, or null if free.
   */
  checkConflict(combo: KeyCombo, context?: ShortcutContext): ShortcutAction | null;

  /**
   * Resolve and execute an action by id.
   */
  execute(id: string, engine: TraekEngine): void;

  /**
   * Handle a raw KeyboardEvent.
   * Finds matching registered action and executes it.
   * Returns true if the event was handled.
   */
  handleKeyDown(e: KeyboardEvent, engine: TraekEngine): boolean;
}

/** Singleton registry — import and use directly */
export const shortcutRegistry: ShortcutRegistry;
```

### 7.4 Conflict Detection Rules

A conflict exists when two actions share the same `key` + modifiers AND their `context` values overlap.

Context overlap matrix:

| | `global` | `canvas` | `input` | `palette` |
|---|---|---|---|---|
| `global` | conflict | conflict | conflict | conflict |
| `canvas` | conflict | conflict | — | — |
| `input` | conflict | — | conflict | — |
| `palette` | conflict | — | — | conflict |

When `remap()` detects a conflict:
- Returns `{ success: false, conflict: <existing action> }`
- Does NOT apply the remap
- Consumer must explicitly `remove(conflictingId)` first, then call `remap()` again

### 7.5 Usage Example (Library Consumer)

```typescript
import { shortcutRegistry, type ShortcutAction } from '@traek/svelte';

// 1. Add a custom palette command
shortcutRegistry.register({
  id: 'my-app:save-snapshot',
  label: 'Save canvas snapshot',
  aliases: ['export', 'save'],
  group: 'my-app',
  keys: [{ key: 's', cmdOrCtrl: true, shift: true }],
  context: 'canvas',
  handler: (engine) => {
    const snapshot = engine.toSnapshot();
    localStorage.setItem('my-canvas', JSON.stringify(snapshot));
  }
});

// 2. Check for conflicts before remapping
const conflict = shortcutRegistry.checkConflict({ key: 'f' }, 'canvas');
if (conflict) {
  console.warn(`'f' is already bound to: ${conflict.label}`);
} else {
  shortcutRegistry.remap('canvas:fit-all', [{ key: 'z' }]);
}

// 3. Remove a built-in you don't want
shortcutRegistry.remove('nav:vim-chord-gg'); // logs warning — built-in, use force:
shortcutRegistry.register(
  { id: 'nav:vim-chord-gg', label: '...', handler: () => {} },
  { force: true }
);
```

### 7.6 TraekCanvas Integration

```svelte
<TraekCanvas
  {engine}
  {onSendMessage}
  {shortcutRegistry}
/>
```

If not provided, the default singleton (with all built-in actions) is used.

---

## 8. Keyboard Cheat Sheet Overlay (`?`)

The existing `KeyboardHelpOverlay.svelte` covers the current shortcut set. This spec defines the enhanced version that integrates with the registry.

### 8.1 Layout

```
┌──────────────────────────────────────────────────────────┐
│  Keyboard shortcuts                               [×]    │
│                                                          │
│  NAVIGATION         │  CANVAS                           │
│  ──────────────────  │  ────────────────────────────     │
│  ↑  Parent          │  f    Fit all                     │
│  ↓  First child     │  ⌘=   Zoom in                     │
│  ←  Prev sibling    │  ⌘-   Zoom out                    │
│  →  Next sibling    │  ⌘0   Reset zoom                  │
│  Home  Root         │  ⌥1   Tree vertical               │
│  End   Deepest leaf │  ⌥2   Tree horizontal             │
│  gg    Root (chord) │                                   │
│  ge    Leaf (chord) │  NODES                            │
│  1–9   Nth child    │  ────────────────────────────     │
│  /     Find nodes   │  n/i  New message                 │
│  ⌘K   Commands      │  Enter  Activate                  │
│                     │  Space  Collapse / expand          │
│                     │  ⇧B   Branch                      │
│                     │  Del  Delete                       │
│                     │  r    Edit                         │
│                                                          │
│  Press ⌘K to search all commands                        │
│                          [Got it]                        │
└──────────────────────────────────────────────────────────┘
```

### 8.2 Changes from Existing Overlay

| Change | Detail |
|---|---|
| Two-column layout | Navigation and Canvas/Nodes side by side on ≥ 600px |
| Dynamic content | Shortcut key labels pulled from `shortcutRegistry` — custom remaps are reflected automatically |
| "⌘K" prompt at bottom | Nudges users toward the command palette for discovery |
| Custom actions section | If library consumer registered custom actions, they appear in a "Custom" section at the bottom |
| Shortcut editing shortcut | Clicking a key badge opens the remap flow (v2 enhancement — optional for v1) |

### 8.3 Overlay Specs

| Property | Value |
|---|---|
| Width | `min(720px, 92vw)` |
| Max height | `85vh` |
| Columns | 2 on ≥ 600px, 1 on < 600px |
| Trigger | `?` key (when not in input field) |
| Dismiss | `Escape`, `?`, click backdrop, "Got it" button |

---

## 9. Command Palette: Full Interaction Flow

```
User presses ⌘K
        │
        ▼
Canvas loses pointer events (not keyboard focus)
Palette mounts with fade+scale animation
Input auto-focused (inputRef.focus())
        │
        ▼
  Empty query?
  YES → Show "Recent" (session) + all groups
  NO  → Starts with @ or /? → Node search mode
        Starts with >?       → Action-only mode
        Otherwise            → Fuzzy action+node
        │
        ▼
User types "branch"
        │
        ▼
Results: [⎇ Branch from focused node (⇧B)]
         [⎇ my-app: Import branch snapshot]  (custom)
        │
        ▼
User presses ↓ to select, Enter to confirm
        │
        ▼
1. handler(engine) executes
2. Palette closes (fade out 120ms)
3. Command added to "Recent" in sessionStorage
4. Focus returns to canvas element
5. Accessible announcement: "Branch from focused node executed"
```

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Action requires a focused node; none selected | Show a toast: "Select a node first." Palette stays open |
| Action requires focused node; node is streaming | Disable the action row (visual muted state), tooltip: "Wait for message to finish" |
| Cmd+K during text streaming | Opens palette normally — user can navigate without interrupting stream |
| Empty canvas (no nodes) | Navigation actions disabled in palette (muted + non-selectable) |
| Consumer removes all actions from a group | Group header is omitted entirely |
| Two shortcuts conflict after hot-reload | Registry logs a `console.warn` with both action IDs |
| `prefers-reduced-motion` | Scale animation disabled, opacity-only transition |
| Mobile (< 480px) | Palette is `100vw`, positioned at top of screen, keyboard shortcut badges hidden |

---

## 10. Accessibility Requirements

| Requirement | Detail |
|---|---|
| Palette role | `role="dialog"`, `aria-modal="true"`, `aria-labelledby="command-palette-label"` |
| Search input | `role="combobox"`, `aria-autocomplete="list"`, `aria-controls="palette-results"`, `aria-activedescendant` updated on selection |
| Results list | `role="listbox"`, `id="palette-results"` |
| Result items | `role="option"`, `aria-selected` on focused item |
| Focus trap | Focus constrained to palette while open |
| Return focus | On close, return focus to the element that had focus before palette opened |
| ESC key | Closes palette |
| No results state | `aria-live="polite"` region announces "No results for '…'" |
| Shortcut badges | `aria-label="keyboard shortcut: Command K"` on the trigger badge |
| Disabled actions | `aria-disabled="true"`, `tabindex="-1"` |
| Keyboard help overlay | `role="dialog"`, `aria-modal="true"`, `aria-labelledby="help-title"` (existing — keep) |
| Screen reader announcements | `role="status"`, `aria-live="polite"` region announces executed action |
| Touch targets | Result rows 48px height minimum |
| High contrast | All interactive states defined with explicit border/background (not just colour change) |

---

## 11. Responsive Behaviour

| Breakpoint | Palette width | Shortcut badges | Groups | Position |
|---|---|---|---|---|
| ≥ 768px | `min(640px, 92vw)` | Visible | Labelled | 20vh from top, centred |
| 480–767px | `92vw` | Visible | Labelled | 10vh from top |
| < 480px | `100vw` | Hidden | Labelled | Top of screen, full width |

On mobile, the palette is effectively a bottom-sheet variant — but remains at top to avoid keyboard (virtual keyboard) overlap. The touch target for each result is 56px height on mobile.

---

## 12. CSS Variables (New Additions)

```css
--traek-palette-bg              /* default: var(--traek-overlayCardBg) */
--traek-palette-border          /* default: var(--traek-overlayCardBorder) */
--traek-palette-input-bg        /* default: rgba(255,255,255,0.05) */
--traek-palette-input-border    /* default: var(--traek-nodeBorder) */
--traek-palette-result-hover-bg /* default: rgba(255,255,255,0.06) */
--traek-palette-result-selected-bg /* default: rgba(0,216,255,0.12) */
--traek-palette-result-selected-border /* default: var(--traek-nodeActiveBorder) */
--traek-palette-group-label     /* default: var(--traek-thought-header-accent, #888888) */
--traek-palette-shortcut-bg     /* default: var(--traek-thought-toggle-bg, #444444) */
--traek-palette-shortcut-border /* default: var(--traek-thought-toggle-border, #555555) */
--traek-palette-shortcut-text   /* default: var(--traek-thought-tag-cyan, #00d8ff) */
```

All fall back to existing tokens — no new mandatory config.

---

## 13. File Structure

New files to create:

```
packages/svelte/src/lib/keyboard/
  CommandPalette.svelte          ← New: palette UI component
  CommandPalette.stories.svelte  ← New: Storybook stories
  ShortcutRegistry.svelte.ts     ← New: registry class + singleton
  shortcutRegistry.ts            ← New: default built-in actions
  types.ts                       ← New: KeyCombo, ShortcutAction types
```

Existing files to modify:

```
packages/svelte/src/lib/keyboard/
  KeyboardNavigator.svelte.ts    ← Wire up ShortcutRegistry.handleKeyDown
  KeyboardHelpOverlay.svelte     ← Pull shortcut keys dynamically from registry
  FuzzySearchOverlay.svelte      ← Share fuzzy match logic (or import from util)

packages/svelte/src/lib/
  TraekCanvas.svelte             ← Mount CommandPalette; pass shortcutRegistry prop
  index.ts                       ← Export ShortcutRegistry, shortcutRegistry, types
```

---

## 14. Out of Scope (v1)

- Inline key remapping UI (click a key badge to remap it visually) — spec reference only
- Persistent user remaps via `localStorage` — consumers can implement via the registry API
- Multi-step command palette flows (e.g. "Move node to…" followed by a destination picker)
- Voice command integration
- Command palette plugins / dynamic command loading

---

## 15. Success Criteria

| Metric | Target |
|---|---|
| Command palette opens in | < 80ms from keydown |
| First result rendered in | < 50ms after input starts |
| All canvas actions reachable via keyboard | ✓ |
| `checkConflict()` returns result in | < 1ms (sync, O(n) scan) |
| Custom action appears in palette after `register()` | Immediately, no remount required |
| WCAG 2.1 AA contrast on palette text | ✓ |
| `prefers-reduced-motion` respected | ✓ |
| Palette works when canvas has no nodes | ✓ (navigation commands disabled gracefully) |
| Screen reader announces executed action | ✓ |
| Zero conflicts in default built-in action set | ✓ |

---

## 16. Open Questions for Dev Review

1. **`ShortcutRegistry` as Svelte store or plain class?**
   The registry holds state (`actions` map) and must be reactive so the palette and help overlay re-render when actions are added/removed. Using `$state` inside the class (Svelte 5 runes) is the cleanest path, consistent with `TraekEngine`. Alternatively, a reactive `Map` exposed via a Svelte store. _Recommendation: Svelte 5 `$state` inside the class, matching the `TraekEngine` pattern._

2. **Where does `sessionStorage` for "Recent" commands live?**
   The palette needs to persist recent commands across re-mounts but not across page loads. _Recommendation: `sessionStorage` key `traek:palette-recent`, max 5 entries, stored as `string[]` of action IDs._

3. **Conflict between `⌘K` and host app shortcuts?**
   Some host apps use `⌘K` for links (rich text editors). Library consumers need an escape hatch. _Recommendation: Expose `paletteKey?: KeyCombo` prop on `TraekCanvas` to override the default palette trigger._

4. **`FuzzySearchOverlay` vs command palette node results — should they merge?**
   Currently `/` opens `FuzzySearchOverlay` and `@` in the palette opens node search. These are two UIs for the same task. _Recommendation: v1 keeps both; v2 can consolidate. The palette's `@` mode calls the same logic as `FuzzySearchOverlay` and eventually replaces it._

5. **Action `handler` receives `engine` — is that sufficient?**
   Some actions might need access to the viewport controller (pan/zoom), canvas DOM element, or toast API. _Recommendation: Extend handler signature to `handler: (engine: TraekEngine, ctx: CommandContext) => void` where `CommandContext` includes `{ viewport, showToast, registry }`._
