# traek

> **Follow ideas, not threads.**

**traek** is a Svelte 5 UI library for building spatial, tree-structured AI conversation interfaces.

_traek (/traek/) comes from Danish **trae** (tree) and English **track** (path)._

Most chat interfaces force complex thinking into a linear stream of messages. traek breaks that constraint by turning conversations into **navigable structures** -- paths you can branch, explore, and revisit.

Built for AI-native products where reasoning is not linear.

---

## The Problem with Chat UIs

Classic chat layouts work well for simple back-and-forth messaging.

They fail when conversations become:

- exploratory
- multi-directional
- iterative
- agent-driven
- reasoning-heavy

Important context gets buried.
Alternative approaches disappear.
Thinking becomes flattened.

**If AI thinking branches -- your UI should too.**

---

## What traek Enables

traek replaces the timeline with a **spatial mental model**:

- Branch conversations without losing history
- Navigate discussions like a map, not a log
- Keep reasoning visible but structured
- Revisit earlier paths instantly
- Compare alternative outputs side-by-side

This is not "chat with nicer bubbles."
It is infrastructure for **non-linear AI interaction**.

---

## Core Concept

Conversations in traek form a tree:

```
Message
 +-- Reply
      |-- Alternative path
      |-- Deeper exploration
      +-- Agent branch
```

Every message is a node.
Every reply is a possible direction.

You don't scroll conversations.

**You navigate them.**

---

## Key Features

### Spatial Canvas

- **Pan & zoom canvas** -- Move through large conversations like a diagram
- **Spatial layout** -- Parents stay above, replies spread horizontally
- **Minimap** -- Bird's-eye overview of the conversation tree
- **Breadcrumb navigation** -- Always see the path from root to current node

### Branching & Comparison

- **Branching conversations** -- Explore alternatives without overwriting the past
- **Branch comparison** -- Side-by-side word-diff of alternative response paths
- **Copy branch** -- Export any path as Markdown to clipboard

### Streaming & Rendering

- **Streaming-first** -- Render token-by-token output while keeping topology intact
- **Markdown support** -- Safe rendering with images, lists, code highlighting (highlight.js)
- **Thought nodes** -- Attach reasoning steps without polluting the primary path

### Navigation

- **Keyboard navigation** -- Full Vim-inspired shortcuts: arrow keys, Home/End, number keys for quick-jump, chord sequences
- **Fuzzy search** -- Search across all nodes with `/`
- **Text search** -- `Ctrl+F` / `Cmd+F` to search message content with match highlighting
- **Help overlay** -- `?` to show all keyboard shortcuts

### Mobile

- **Focus mode** -- Mobile-optimized single-node interface with swipe gestures
- **Swipe navigation** -- Up/down to traverse the tree, left/right for sibling branches
- **Haptic feedback** -- Vibration on supported devices
- **Onboarding tutorial** -- Guided walkthrough for mobile gestures

### Persistence & Replay

- **Conversation storage** -- IndexedDB with localStorage fallback via `ConversationStore`
- **Snapshot export** -- `snapshotToJSON()` and `snapshotToMarkdown()` for portable exports
- **Replay controller** -- Step-through playback of conversation history with speed control
- **Save indicator** -- Visual feedback for auto-save state

### Node Actions

- **Built-in actions** -- Duplicate, delete (with descendant variants), retry, edit, copy branch, compare
- **Action system** -- Two-stage resolver with keyword matching and optional semantic search
- **Slash commands** -- `/` command dropdown in the input
- **Custom node types** -- Register your own node types via `NodeTypeRegistry`

### Theming & i18n

- **Theme system** -- Built-in dark, light, and high-contrast themes with `ThemeProvider`
- **Custom themes** -- `createCustomTheme()` from a base theme + accent color
- **CSS custom properties** -- All `--traek-*` variables scoped to the `base` layer for easy overrides
- **Internationalization** -- All user-facing strings are customizable via the `translations` prop
- **Tag system** -- Predefined and custom tags with filtering support

### Accessibility

- **ARIA live regions** -- Screen reader announcements for dynamic updates
- **Keyboard-first** -- Full keyboard navigation without requiring a mouse
- **Semantic HTML** -- Proper roles, labels, and landmarks throughout

---

## Quick Start

Install the package:

```bash
npm install traek
```

Create a spatial AI chat:

```svelte
<script lang="ts">
  import { TraekCanvas, TraekEngine, DEFAULT_TRACK_ENGINE_CONFIG, type MessageNode } from 'traek';

  const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG);

  function onSendMessage(input: string, _userNode: MessageNode) {
    engine.addNode(input, 'user');

    const assistantNode = engine.addNode('', 'assistant', {
      autofocus: true
    });

    engine.updateNode(assistantNode.id, { status: 'streaming' });

    // stream chunks
    // engine.updateNode(assistantNode.id, { content });

    // when finished
    // engine.updateNode(assistantNode.id, { status: 'done' });
  }
</script>

<TraekCanvas {engine} {onSendMessage} />
```

---

## Architecture

traek separates **conversation structure** from **message rendering**.

### TraekEngine

Core state management class. Manages the conversation tree: nodes, parent-child relationships, spatial layout (x/y coordinates), and operations like `addNode()`, `branchFrom()`, `focusOnNode()`, `moveNode()`.

All data structures use Maps for O(1) lookups.

### TraekCanvas

Main exported component. Renders the interactive canvas with pan/zoom, message nodes, connection lines, and streaming input. Accepts `onSendMessage` callback and a customizable component map for node types.

### Key Props

```svelte
<TraekCanvas
  {engine}
  {onSendMessage}
  translations={{ canvas: { emptyStateTitle: 'Your custom title' } }}
  nodeActions={createDefaultNodeActions({ onRetry, onEditNode })}
  componentMap={{ text: CustomTextNode }}
/>
```

You control:

- message creation
- streaming
- persistence
- model orchestration

traek keeps everything **navigable and coherent**.

---

## Internationalization (i18n)

All user-facing strings can be customized. Pass a partial translations object -- only override what you need:

```svelte
<TraekCanvas
  {engine}
  {onSendMessage}
  translations={{
    canvas: {
      emptyStateTitle: 'Starte eine Konversation',
      emptyStateSubtitle: 'Schreibe eine Nachricht'
    },
    input: {
      placeholder: 'Frag den Experten...'
    },
    search: {
      placeholder: 'Suchen...'
    }
  }}
/>
```

The translations object is organized by feature area: `canvas`, `input`, `zoom`, `search`, `keyboard`, `fuzzySearch`, `nodeActions`, `textNode`, `toast`, `onboarding`, `tour`, `breadcrumb`, `loading`, `toolbar`, `replay`.

Import the types for full IntelliSense:

```typescript
import type { TraekTranslations, PartialTraekTranslations } from 'traek';
import { DEFAULT_TRANSLATIONS, mergeTranslations } from 'traek';
```

---

## Theming

traek ships with three built-in themes and a programmatic API:

```svelte
<script lang="ts">
  import { ThemeProvider, ThemePicker, darkTheme, lightTheme, createCustomTheme } from 'traek';
</script>

<ThemeProvider theme={darkTheme}>
  <TraekCanvas {engine} {onSendMessage} />
  <ThemePicker />
</ThemeProvider>
```

Or use CSS custom properties directly. All variables are scoped to the `base` layer:

```css
:root {
  --traek-canvas-bg: #050816;
  --traek-node-bg: #0b1020;
  --traek-node-active-border: #4ade80;
}
```

See the full list of `--traek-*` variables in the [theming docs](https://docs.gettraek.com).

---

## Persistence

Save and load conversations with the built-in store:

```typescript
import { ConversationStore, snapshotToJSON, snapshotToMarkdown, downloadFile } from 'traek';

const store = new ConversationStore();

// Save
await store.save(engine.snapshot());

// Load
const conversations = await store.list();
const snapshot = await store.load(conversations[0].id);
engine.restore(snapshot);

// Export
downloadFile('chat.json', snapshotToJSON(engine.snapshot()));
downloadFile('chat.md', snapshotToMarkdown(engine.snapshot()));
```

---

## Replay

Step through conversation history:

```svelte
<script lang="ts">
  import { ReplayController, ReplayControls } from 'traek';

  const replay = new ReplayController(engine);
</script>

<ReplayControls controller={replay} />
```

---

## Adding the traek MCP to Your Project

The traek MCP (Model Context Protocol) server gives AI assistants like Claude Code full knowledge of the traek API, guides, and code snippets. It helps you integrate traek faster by providing your AI assistant with component docs, integration guides, and ready-to-use scaffolding.

### What the MCP provides

| Tool | Description |
|------|-------------|
| `get_component_api` | Full prop/method API for TraekCanvas, TraekEngine, etc. |
| `list_exports` | All traek exports grouped by category |
| `list_guides` | Available integration guides |
| `get_guide` | Full text of an integration guide |
| `search_docs` | Full-text search across all docs |
| `list_snippets` | Available code snippets |
| `get_snippet` | Runnable code snippet for a scenario |
| `scaffold_page` | Generate a complete SvelteKit page + API route |

> The MCP server lives in this repo as `@traek/mcp` (`servers/mcp`). It is **not yet published to npm**, so run it from a checkout of this repository (or use the hosted instance once available at `https://mcp.gettraek.com`).

### Option 1: Run from this repo (stdio)

```bash
git clone https://github.com/gettraek/traek.git
cd traek
pnpm install
pnpm --filter @traek/mcp run build
```

Then add to your `.mcp.json` (project root) or `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "traek": {
      "command": "node",
      "args": ["/path/to/traek/servers/mcp/dist/index.js"]
    }
  }
}
```

### Option 2: Docker (Streamable HTTP)

```bash
docker compose up mcp   # serves Streamable HTTP on port 3010
```

```json
{
  "mcpServers": {
    "traek": {
      "type": "url",
      "url": "http://localhost:3010"
    }
  }
}
```

Once configured, your AI assistant can query traek docs, generate integration code, and scaffold pages directly.

---

## Who traek Is For

traek is ideal if you are building:

- AI chat products
- agent interfaces
- prompt exploration tools
- research assistants
- reasoning-heavy workflows
- multi-path generation UIs

If you only need a simple message list -- traek is probably not the right tool.

---

## Exports

The main `traek` package exports:

**Components:** `TraekCanvas`, `TextNode`, `DefaultLoadingOverlay`, `FocusMode`, `ReplayControls`, `SaveIndicator`, `ChatList`, `HeaderBar`, `ToastContainer`, `Toast`, `ThemeProvider`, `ThemePicker`, `DesktopTour`, `ActionBadges`, `SlashCommandDropdown`, `TagBadges`, `TagDropdown`, `TagFilter`

**Engine:** `TraekEngine`, `DEFAULT_TRACK_ENGINE_CONFIG`, `wouldCreateCycle()`

**Actions:** `createDefaultNodeActions()`, `createDuplicateAction()`, `createDeleteAction()`, `createCopyBranchAction()`, `createRetryAction()`, `createEditAction()`, `createCompareAction()`, `ActionResolver`

**Persistence:** `ConversationStore`, `ReplayController`, `snapshotToJSON()`, `snapshotToMarkdown()`, `downloadFile()`

**Theming:** `darkTheme`, `lightTheme`, `highContrastTheme`, `createCustomTheme()`, `applyThemeToRoot()`

**i18n:** `DEFAULT_TRANSLATIONS`, `setTraekI18n()`, `getTraekI18n()`, `mergeTranslations()`

**Node Types:** `NodeTypeRegistry`, `textNodeDefinition`, `thoughtNodeDefinition`

**Tags:** `PREDEFINED_TAGS`, `getNodeTags()`, `getTagConfig()`, `matchesTagFilter()`

**Validation:** Zod schemas for snapshots, configs, node types, and actions

---

## Status

traek is under active development and evolving quickly.

Feedback, ideas, and contributions are welcome.

---

## Philosophy

> AI conversations are not linear.
> Stop designing them that way.

**traek helps you build interfaces that think the way AI does.**

## License

MIT
