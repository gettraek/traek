# Træk Developer Program

> Build plugins, themes, and components that extend the Træk canvas — and earn revenue through the Marketplace.

---

## What You Can Build

| Type | What it is | Examples |
|------|------------|---------|
| **Component** | Custom node type for the canvas | Mermaid diagrams, code diff viewer, image generator |
| **Theme** | CSS variable overrides + optional font | Midnight indigo, warm paper, high-contrast light |
| **Template** | Pre-seeded conversation tree | Code review workflow, brainstorming session, support triage |
| **Plugin** | Combination of the above + lifecycle hooks | AI assistant integration, export-to-PDF, real-time collab |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- A Træk app to test against (`npm create traek@latest`)

### Create your first plugin

```bash
# Scaffold a new plugin
npx create-traek-plugin@latest my-plugin

# Choose type: component | theme | template | plugin
cd my-plugin
pnpm install
pnpm dev
```

The scaffolder creates:

```
my-plugin/
├── src/
│   ├── index.ts          # Main export
│   └── MyNode.svelte     # (for components)
├── traek-plugin.json     # Manifest — required for Marketplace
├── package.json
└── README.md
```

---

## Plugin Manifest (`traek-plugin.json`)

Every Marketplace submission requires a valid manifest at the package root.

```json
{
  "name": "@your-org/my-plugin",
  "displayName": "My Plugin",
  "version": "1.0.0",
  "type": "component",
  "description": "One sentence, max 150 chars.",
  "author": "Your Name <you@example.com>",
  "license": "MIT",
  "icon": "🧩",
  "tags": ["diagram", "visualization"],
  "pricing": {
    "model": "one_time",
    "price": 9
  },
  "compatibility": {
    "traek": ">=0.1.0",
    "frameworks": ["svelte", "react", "vue"]
  },
  "entrypoint": "./dist/index.js",
  "repository": "https://github.com/your-org/my-plugin"
}
```

### Manifest fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✓ | npm package name |
| `displayName` | ✓ | Human-readable name (≤ 40 chars) |
| `version` | ✓ | Semver |
| `type` | ✓ | `component` \| `theme` \| `template` \| `plugin` |
| `description` | ✓ | Short description (≤ 150 chars, shown on card) |
| `author` | ✓ | Name + email |
| `license` | ✓ | SPDX identifier |
| `icon` | ✓ | Emoji or 32×32 image path |
| `tags` | ✓ | 1–5 lowercase tags |
| `pricing.model` | ✓ | `free` \| `one_time` \| `subscription` |
| `pricing.price` | if not free | Price in USD |
| `compatibility.traek` | ✓ | Semver range |
| `entrypoint` | ✓ | Path to built entry file |

---

## Building Components

Custom node types render inside `TraekNodeWrapper`. They receive a typed `node` prop and optionally a `toolbar` snippet.

### Svelte 5

```svelte
<script lang="ts">
  import type { MessageNode } from '@traek/core'

  let { node }: { node: MessageNode } = $props()
</script>

<div class="my-node">
  <p>{node.content}</p>
</div>

<style>
  .my-node {
    padding: var(--traek-node-padding, 1rem);
    background: var(--traek-node-bg);
    border-radius: var(--traek-radius-md);
  }
</style>
```

### Register the node type

```ts
// src/index.ts
import MyNode from './MyNode.svelte'
import type { TraekPlugin } from '@traek/core'

export const plugin: TraekPlugin = {
  nodeTypes: {
    MY_TYPE: MyNode
  }
}
```

```svelte
<!-- App.svelte -->
<script>
  import { TraekCanvas } from '@traek/svelte'
  import { plugin } from 'my-plugin'
</script>

<TraekCanvas
  componentMap={{ ...plugin.nodeTypes }}
  onSendMessage={...}
/>
```

### React

```tsx
import { TraekCanvas } from '@traek/react'
import { plugin } from 'my-plugin'

<TraekCanvas
  componentMap={{ ...plugin.nodeTypes }}
  onSendMessage={...}
/>
```

---

## Building Themes

A theme is a CSS file (or Svelte component with `<style>`) that overrides `--traek-*` CSS custom properties.

```css
/* my-theme.css */
:root {
  --traek-bg-canvas:       #faf7f2;
  --traek-bg-node:         #ffffff;
  --traek-border-node:     #e8e0d5;
  --traek-text-primary:    #1a1a1a;
  --traek-text-secondary:  #6b6459;
  --traek-accent:          #c4602c;
  --traek-node-shadow:     0 2px 12px rgba(0,0,0,0.08);
}
```

Reference all available tokens in [Theming Guide →](./theming.md).

### Apply the theme

```ts
import 'my-theme/dist/my-theme.css'
```

---

## Building Templates

Templates are JSON-serialized `ConversationSnapshot` files that pre-seed the canvas with a starting conversation tree.

```json
{
  "nodes": [
    {
      "id": "root",
      "parentId": null,
      "role": "system",
      "type": "TEXT",
      "content": "You are a code review assistant...",
      "status": "done",
      "metadata": { "x": 0, "y": 0 }
    },
    {
      "id": "prompt",
      "parentId": "root",
      "role": "user",
      "type": "TEXT",
      "content": "Here is the PR diff:\n\n```diff\n...",
      "status": "done",
      "metadata": { "x": 0, "y": 120 }
    }
  ]
}
```

Export from `TraekEngine`:

```ts
const snapshot = engine.serialize()
// Save this JSON as your template file
```

Load in the app:

```ts
import template from './my-template.json'
const engine = TraekEngine.fromSnapshot(template)
```

---

## Lifecycle Hooks

Plugins may export hooks to react to engine events:

```ts
export const plugin: TraekPlugin = {
  nodeTypes: { ... },
  hooks: {
    onNodeAdded(node, engine) { ... },
    onNodeUpdated(node, engine) { ... },
    onBranchCreated(nodeId, engine) { ... },
    onEngineInit(engine) { ... }
  }
}
```

---

## Testing Your Plugin

```bash
# Unit tests
pnpm test

# Integration: link to a local Træk app
pnpm link --global
cd ../my-traek-app && pnpm link my-plugin
pnpm dev
```

Automated checks run in CI via the Marketplace review pipeline. Make sure your plugin passes:

- `traek-plugin validate` — manifest + entrypoint check
- `traek-plugin test` — runs your test suite in a Træk sandbox
- `traek-plugin bundle-size` — warns if bundle > 200 kB gzipped

---

## Next Steps

- [Marketplace Submission Guidelines →](./marketplace-submission.md)
- [Revenue Sharing & Payouts →](./revenue-sharing.md)
- [Cloud Persistence API Reference →](./cloud-api.md)
- [Analytics API Reference →](./analytics-api.md)
- [Plugin documentation template →](../plugin-docs-template.md)
