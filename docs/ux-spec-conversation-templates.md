# UX Specification: Conversation Templates (TRK-113)

**Status:** Ready for implementation
**Author:** UX Expert
**Date:** 2026-03-08

---

## 1. Problem Statement

Users who open Traek for the first time or start a new conversation face a blank canvas with no guidance on how to structure their thinking. The cognitive load of deciding _how_ to organise a conversation is a barrier to adoption. Templates solve this by offering ready-made, opinionated layouts that demonstrate the value of spatial, branched thinking immediately.

---

## 2. User Goals

- **Discover quickly:** "What can I do with this canvas?"
- **Start fast:** One click to begin a structured conversation without setup friction.
- **Customise freely:** Templates are starting points, not constraints.
- **Integrate cleanly:** Library consumers need a stable API to ship their own templates.

---

## 3. Template Gallery: Entry Points

### 3.1 Empty-State Entry (Primary)

When `engine.nodes.length === 0`, the canvas shows a centred empty-state overlay instead of a blank grid. This overlay contains:

```
┌─────────────────────────────────────────┐
│                                         │
│   ✦  Start with a template             │
│      or begin with a blank canvas       │
│                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │Preview │ │Preview │ │Preview │  →   │
│  │        │ │        │ │        │      │
│  └────────┘ └────────┘ └────────┘      │
│  Brainstorm  Code Rev.  Research        │
│                                         │
│  [Browse all templates]  [Start blank]  │
│                                         │
└─────────────────────────────────────────┘
```

- Shows first 3 templates horizontally (most commonly useful).
- "Browse all templates" opens the full Gallery Modal.
- "Start blank" dismisses the overlay permanently for this session.
- Overlay appears above the canvas grid (not in front of toolbar).

### 3.2 Toolbar Button (Secondary)

A "Templates" button in the canvas toolbar (near the layout picker), visible at all times. Icon: grid/tiles symbol. Clicking opens the Gallery Modal.

- Label: **"Templates"** (not just icon — keyboard discoverability).
- Keyboard shortcut: `T` (while not typing in an input).

### 3.3 ChatList "New from template" Option (Tertiary)

In the `ChatList` header's "New conversation" area, add a secondary action: **"From template →"** that opens the Gallery Modal before creating a new conversation.

---

## 4. Gallery Modal

### 4.1 Layout

```
┌────────────────────────────────────────────────────────────┐
│  Templates                                      [×]        │
│  ─────────────────────────────────────────────────────     │
│  [All] [Brainstorming] [Code] [Research] [Creative]        │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  [thumbnail] │  │  [thumbnail] │  │  [thumbnail] │    │
│  │              │  │              │  │              │    │
│  │ Brainstorm   │  │ Code Review  │  │  Research    │    │
│  │ tree         │  │ flow         │  │  exploration │    │
│  │              │  │              │  │              │    │
│  │ 6 nodes      │  │ 8 nodes      │  │ 5 nodes      │    │
│  │ [Use this →] │  │ [Use this →] │  │ [Use this →] │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │  [thumbnail] │  │  [thumbnail] │                       │
│  │ Debate       │  │ Creative     │                       │
│  │ structure    │  │ writing      │                       │
│  │ 7 nodes      │  │ 9 nodes      │                       │
│  │ [Use this →] │  │ [Use this →] │                       │
│  └──────────────┘  └──────────────┘                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Modal Specs

| Property | Value |
|---|---|
| Width | `min(720px, 92vw)` |
| Max height | `85vh` with overflow scroll |
| Overlay | `rgba(0,0,0,0.65)` backdrop blur `4px` |
| Border radius | `var(--traek-radius-lg, 12px)` |
| Animation | Fade + scale-up from 0.95 → 1.0, 200ms ease-out |

### 4.3 Filter Tabs

Horizontal tab strip at the top of the modal. Categories:
- **All** (default)
- **Brainstorming**
- **Code**
- **Research**
- **Creative**

Tab switching is instant (no loader). Active tab uses `aria-selected="true"` and a visible underline/highlight.

### 4.4 Template Cards

Each card (grid: 3 columns desktop, 2 tablet, 1 mobile):

| Element | Detail |
|---|---|
| Thumbnail | SVG schematic, 100% width, 140px height, `object-fit: contain` |
| Title | `font-size: 14px`, `font-weight: 600` |
| Node count | `font-size: 12px`, muted color — e.g. "6 nodes" |
| CTA button | `"Use this template →"`, full width, primary style |

**Hover state:** Card lifts with `box-shadow` and border colour brightens. Thumbnail zooms to 1.03 scale (respect `prefers-reduced-motion`).

**Focus state:** 2px outline using `--traek-nodeActiveBorder` colour. Keyboard `Enter` activates.

### 4.5 Preview Detail (Optional Enhancement)

Clicking on the thumbnail (not the CTA button) opens an inline preview panel that slides in from the right inside the modal, showing:
- Larger thumbnail
- Description text
- "Use this template" CTA
- "← Back" link

This is optional for v1 but the layout should leave room for it.

---

## 5. The 5 Built-in Templates

### Template 1: Brainstorming Tree

**Category:** Brainstorming
**Purpose:** Free-form idea generation with divergent branches.
**Node count:** 6
**Layout:** `tree-vertical`

**Structure:**
```
[System: Central Topic]
        │
   ┌────┴────┐
[User: Idea A] [User: Idea B]
   │              │
[Asst: Explore A] [Asst: Explore B]
```

**Seed nodes:**
1. System node (root): `"What is the central topic or challenge you want to explore?"`
2. User node (child of 1): `"First angle or idea"`
3. User node (child of 1): `"Second angle or idea"`
4. Assistant node (child of 2): `"Let's dig deeper into this direction..."`
5. Assistant node (child of 3): `"Let's dig deeper into this direction..."`
6. User node (child of 4): `"What else could branch from here?"`

**Thumbnail:** Tree diagram — single root splits into two branches, each with a child leaf.

---

### Template 2: Code Review Flow

**Category:** Code
**Purpose:** Structured code review conversation: context → code → review → improvements.
**Node count:** 8
**Layout:** `tree-vertical`

**Structure:**
```
[System: Context]
      │
[User: Paste code]
      │
[Asst: Initial review]
   ┌──┴──┐
[Asst: Issues] [Asst: Positives]
   │
[User: Ask about issue]
   │
[Asst: Detailed explanation]
   │
[User: Revised code]
```

**Seed nodes:**
1. System: `"You are a code reviewer. Provide constructive, specific feedback."`
2. User (child of 1): `"Here is the code I'd like reviewed:\n\n[paste code here]"`
3. Assistant (child of 2): `"I'll review this systematically..."`
4. Assistant (child of 3): `"Areas for improvement:"`
5. Assistant (child of 3): `"What's working well:"`
6. User (child of 4): `"Can you explain the issue with [specific part]?"`
7. Assistant (child of 6): `"Sure, let me break this down..."`
8. User (child of 7): `"Here's my revised version:"`

---

### Template 3: Research Exploration

**Category:** Research
**Purpose:** Systematic research with source tracking and synthesis.
**Node count:** 5
**Layout:** `tree-horizontal`

**Structure:**
```
[System: Research frame]
         │
    [User: Question]
    ┌────┴────┐
[Asst: Angle1] [Asst: Angle2]
         │
[User: Synthesise]
```

**Seed nodes:**
1. System: `"You are a research assistant. Provide balanced perspectives, cite reasoning, and flag uncertainties."`
2. User (child of 1): `"Research question: [enter your question]"`
3. Assistant (child of 2): `"Perspective 1: [economic / technical / historical / etc.]"`
4. Assistant (child of 2): `"Perspective 2: [contrasting viewpoint]"`
5. User (child of 3): `"Synthesise these perspectives. What do we know for certain, what is contested?"`

---

### Template 4: Debate Structure

**Category:** Research
**Purpose:** Structured argument mapping — proposition, opposition, steelmanning.
**Node count:** 7
**Layout:** `tree-horizontal`

**Structure:**
```
[System: Proposition]
         │
   ┌─────┴─────┐
[For]         [Against]
  │               │
[Strongest    [Strongest
  argument]    counter]
       │
   [Synthesis]
```

**Seed nodes:**
1. System: `"We will explore both sides of a debate. Present strongest arguments for each position fairly."`
2. User (child of 1): `"Proposition: [state the claim or motion]"`
3. Assistant (child of 2): `"Arguments FOR the proposition:"`
4. Assistant (child of 2): `"Arguments AGAINST the proposition:"`
5. User (child of 3): `"Steelman the FOR position — what is its absolute strongest version?"`
6. User (child of 4): `"Steelman the AGAINST position — what is its absolute strongest version?"`
7. User (child of 5): `"Given both steelmanned positions, what does an honest synthesis look like?"`

---

### Template 5: Creative Writing Branches

**Category:** Creative
**Purpose:** Branching narrative with alternate story paths.
**Node count:** 9
**Layout:** `tree-vertical`

**Structure:**
```
[System: Story world]
        │
  [User: Scene 1]
        │
  [Asst: Opening]
   ┌────┴────┐
[User:     [User:
 Path A]    Path B]
   │           │
[Asst:      [Asst:
 Branch A]   Branch B]
   │
[User: Continue]
```

**Seed nodes:**
1. System: `"You are a creative collaborator. Write vivid, immersive prose that respects the story world we establish."`
2. User (child of 1): `"Setting: [describe the world, time period, tone]"`
3. Assistant (child of 2): `"[Opening scene — 2-3 paragraphs]"`
4. User (child of 3): `"Path A: [describe one direction the story could go]"`
5. User (child of 3): `"Path B: [describe an alternative direction]"`
6. Assistant (child of 4): `"[Story continues down Path A...]"`
7. Assistant (child of 5): `"[Story continues down Path B...]"`
8. User (child of 6): `"Continue the story — introduce a complication"`
9. User (child of 6): `"Jump forward in time — what changed?"`

---

## 6. Template Thumbnails

### Design Approach

Thumbnails are **SVG schematics** — not screenshots. They show the _shape_ of the conversation graph:
- Nodes rendered as rounded rectangles, coloured by role (user: blue-tinted border, assistant: green-tinted border, system: muted)
- Edges rendered as curved paths (matching `ConnectionLayer.svelte` style)
- No text content inside node boxes — just shape and structure
- Background: `var(--traek-canvasBg)` or a fixed dark colour for consistency

### Thumbnail Sizes

| Context | Dimensions |
|---|---|
| Gallery card | 100% width × 140px |
| Empty-state preview | 200px × 130px |
| Detail panel (optional) | 100% × 240px |

### Generation Strategy

SVG thumbnails are **statically authored** per template (not dynamically rendered from canvas state). This ensures:
- No runtime rendering cost
- Perfect visual consistency
- Works without loading the full engine

Each template exports an `svgThumbnail: string` alongside its node definition.

---

## 7. Template Instantiation Flow

```
User clicks "Use this template"
        │
        ▼
Confirm if canvas already has nodes?
   YES → "Replace current canvas with template? Your work will be lost."
          [Cancel] [Replace canvas]
   NO  → Instantiate immediately (no confirmation)
        │
        ▼
1. engine.reset() — clear all nodes
2. Load template nodes via engine.fromSnapshot(templateSnapshot)
3. engine.applyLayout(template.defaultLayout)
4. Viewport: fit-all (show entire template)
5. Close modal / dismiss overlay
6. Toast: "Brainstorming template loaded. Start typing to begin." (3s)
7. Focus: move focus to first user-editable node input area
```

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Canvas has unsaved streaming node | Confirm dialog warns: "A message is still streaming." |
| Template load fails (corrupt snapshot) | Toast error: "Could not load template. Try again." |
| User presses Escape during confirm | Modal stays open, no action taken |
| Template loaded, user presses Ctrl+Z | Undo brings back previous canvas state |

---

## 8. Template Customisation API (Library Consumers)

### 8.1 Type Definition

```typescript
export interface ConversationTemplate {
  /** Unique identifier — must be URL-safe slug */
  id: string;
  /** Display name shown in the gallery */
  title: string;
  /** Short description (max 120 chars) */
  description: string;
  /** Category for gallery filtering */
  category: TemplateCategory;
  /** SVG string for the thumbnail schematic */
  svgThumbnail: string;
  /** Number of seed nodes (informational) */
  nodeCount: number;
  /** The conversation snapshot to instantiate */
  snapshot: ConversationSnapshot;
  /** Preferred layout mode when instantiated */
  defaultLayout?: LayoutMode;
}

export type TemplateCategory =
  | 'brainstorming'
  | 'code'
  | 'research'
  | 'creative'
  | string; // allow custom categories
```

### 8.2 TemplateRegistry

```typescript
export class TemplateRegistry {
  /** Returns a copy of all registered templates */
  getAll(): ConversationTemplate[];

  /** Returns templates filtered by category */
  getByCategory(category: string): ConversationTemplate[];

  /** Returns a single template by id, or undefined */
  get(id: string): ConversationTemplate | undefined;

  /**
   * Register one or more custom templates.
   * Custom templates appear after built-ins in the gallery.
   * Duplicate IDs throw a console.warn and are ignored.
   */
  register(templates: ConversationTemplate | ConversationTemplate[]): void;

  /**
   * Remove a built-in or custom template by id.
   * Use to suppress built-in templates you don't want shown.
   */
  remove(id: string): void;

  /**
   * Replace the entire built-in list.
   * Use this to take full control of what appears in the gallery.
   */
  setBuiltins(templates: ConversationTemplate[]): void;
}

/** Singleton registry — import and use directly */
export const templateRegistry: TemplateRegistry;
```

### 8.3 Usage Example (Library Consumer)

```typescript
import { templateRegistry } from '@traek/svelte';

// Add a custom template
templateRegistry.register({
  id: 'sprint-retro',
  title: 'Sprint Retrospective',
  description: 'Structured retro: went well, improve, actions.',
  category: 'custom',
  svgThumbnail: '<svg>...</svg>',
  nodeCount: 5,
  defaultLayout: 'tree-horizontal',
  snapshot: { /* ConversationSnapshot */ }
});

// Remove a built-in you don't want
templateRegistry.remove('creative-writing-branches');
```

### 8.4 TraekCanvas Integration

`TraekCanvas` and the gallery component accept an optional `templateRegistry` prop:

```svelte
<TraekCanvas
  {engine}
  {onSendMessage}
  templateRegistry={myRegistry}
/>
```

If not provided, the default singleton (with 5 built-ins) is used.

---

## 9. Accessibility Requirements

| Requirement | Detail |
|---|---|
| Gallery modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby="template-gallery-title"` |
| Focus trap | Focus constrained to modal while open; returns to trigger element on close |
| ESC key | Closes modal |
| Filter tabs | `role="tablist"` / `role="tab"` / `aria-selected` |
| Template cards | `role="article"` with accessible name |
| CTA buttons | Descriptive label: `"Use Brainstorming Tree template"` |
| Thumbnails | `aria-hidden="true"` (decorative SVGs) |
| Confirm dialog | Native `<dialog>` or ARIA alert dialog with focus on destructive action button |
| Reduced motion | Thumbnail hover scale disabled; modal entrance is instant (opacity only) |
| Touch targets | CTA buttons minimum 44×44px |
| Keyboard nav | Arrow keys navigate cards; Enter activates CTA; Tab moves through cards |

---

## 10. Responsive Behaviour

| Breakpoint | Gallery columns | Behaviour |
|---|---|---|
| ≥1024px (lg) | 3 columns | Standard layout |
| 768–1023px (md) | 2 columns | Cards reflow |
| <768px (sm) | 1 column | Full-width cards, modal is 100vw |

On mobile, the empty-state entry shows a single template card plus "Browse all" CTA.

---

## 11. CSS Variables (New Additions)

The template UI introduces these new `--traek-*` tokens:

```css
--traek-template-card-bg          /* default: var(--traek-nodeBg) */
--traek-template-card-border      /* default: var(--traek-nodeBorder) */
--traek-template-card-border-hover /* default: var(--traek-nodeActiveBorder) */
--traek-template-card-shadow-hover /* default: 0 4px 20px rgba(0,0,0,0.3) */
--traek-template-thumbnail-bg     /* default: var(--traek-canvasBg) */
--traek-template-modal-bg         /* default: var(--traek-overlayCardBg) */
--traek-template-modal-border     /* default: var(--traek-overlayCardBorder) */
```

All fall back to existing tokens — no new mandatory config.

---

## 12. Out of Scope (v1)

- User-created templates ("save current canvas as template")
- Template search/filtering by keyword
- Template rating or favouriting
- Cloud-hosted template marketplace
- Template versioning

These are documented here as explicit non-goals so the implementation does not over-engineer for them — but the API surface should not prevent them being added later.

---

## 13. Success Criteria

| Metric | Target |
|---|---|
| Template gallery opens in | < 100ms |
| Time to first node after "Use this template" | < 500ms |
| All interactions reachable via keyboard only | ✓ |
| WCAG 2.1 AA contrast on all template card text | ✓ |
| `prefers-reduced-motion` respected | ✓ |
| Zero layout shift when gallery opens | ✓ |
| Custom template registration with 0 errors | ✓ |

---

## 14. Open Questions for Dev Review

1. **Confirm dialog:** Use native `confirm()` (simple but ugly) or a custom `<dialog>`-based component consistent with the design system?
   - _Recommendation: Custom dialog — consistent with the existing Toast/overlay patterns._

2. **Undo support for template instantiation:** Should loading a template be a single undo step that restores the previous canvas?
   - _Recommendation: Yes. Use `engine.fromSnapshot()` after capturing the current snapshot to HistoryManager._

3. **Thumbnail storage:** Inline SVG strings in the template definition, or separate `.svg` imports?
   - _Recommendation: Inline strings — simpler for library consumers to ship custom templates without bundler config._

4. **Empty-state overlay z-index:** Should it sit above or below the input toolbar?
   - _Recommendation: Above the canvas grid but below the input toolbar — users can still type to dismiss._
