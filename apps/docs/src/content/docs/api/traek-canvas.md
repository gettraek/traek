---
title: TraekCanvas
description: API reference for the TraekCanvas component.
---

# TraekCanvas

The main component that renders the interactive conversation canvas: pan/zoom, message nodes, connection lines, input form, search, minimap, and focus mode.

All props are optional — `<TraekCanvas />` works standalone and creates its own engine internally. Pass an `engine` when you need programmatic control (streaming, persistence, reading state).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `engine` | `TraekEngine \| null` | internal engine | Externally managed engine instance |
| `config` | `Partial<TraekEngineConfig>` | `{}` | Engine/canvas configuration overrides |
| `componentMap` | `NodeComponentMap` | `{}` | Map `node.type` → Svelte component to override node renderers |
| `onSendMessage` | `(input: string, userNode: MessageNode, action?: string \| string[]) => void` | — | Called after the user submits a message. The user node is **already added** to the engine |
| `onNodesChanged` | `() => void` | — | Called when nodes are mutated through canvas interactions |
| `onViewportChange` | `(viewport: { scale: number; offset: { x: number; y: number } }) => void` | — | Pan/zoom change notifications |
| `initialScale` | `number` | — | Initial zoom level |
| `initialOffset` | `{ x: number; y: number }` | — | Initial pan offset |
| `initialPlacementPadding` | `{ left: number; top: number }` | `{ left: 0, top: 0 }` | Padding used when placing the first root node |
| `initialOverlay` | `Snippet` | — | Overlay rendered until the first node exists (e.g. a welcome screen) |
| `inputActions` | `Snippet<[InputActionsContext]>` | — | Custom content rendered next to the input form |
| `actions` | `ActionDefinition[]` | — | Slash-command actions for the input |
| `resolveActions` | `ResolveActions` | — | Custom action resolution logic |
| `registry` | `NodeTypeRegistry` | — | Node type registry (custom node types with lifecycle + actions) |
| `defaultNodeActions` | `NodeTypeAction[]` | built-ins | Override the default node toolbar actions |
| `filterNodeActions` | `(node: Node, actions: NodeTypeAction[]) => NodeTypeAction[]` | — | Filter toolbar actions per node |
| `onRetry` | `(nodeId: string) => void` | — | Called when the user retries an errored node |
| `onEditNode` | `(nodeId: string) => void` | — | Called when the user starts editing a node |
| `mode` | `'auto' \| 'canvas' \| 'focus'` | `'auto'` | Force canvas or mobile focus mode (`'auto'` switches by viewport width) |
| `mobileBreakpoint` | `number` | `768` | Width (px) below which focus mode activates in `'auto'` |
| `focusConfig` | `Partial<FocusModeConfig>` | — | Mobile focus mode configuration |
| `showFps` | `boolean` | `false` | Show an FPS counter |
| `showStats` | `boolean` | `true` | Show canvas stats |
| `tourDelay` | `number` | `0` | Delay (ms) before showing the desktop onboarding tour |
| `minimapMinNodes` | `number` | `0` | Minimum non-thought nodes before the minimap appears |
| `breadcrumbMinNodes` | `number` | `0` | Minimum nodes before the context breadcrumb appears |
| `translations` | `PartialTraekTranslations` | English | Partial translation overrides, deep-merged with defaults |

## Usage

```svelte
<script lang="ts">
  import { TraekCanvas, TraekEngine, type MessageNode } from 'traek'

  const engine = new TraekEngine()

  function handleSend(input: string, userNode: MessageNode) {
    // The user node is already in the tree — add the assistant reply:
    engine.addNode('Thinking…', 'assistant', { parentIds: [userNode.id] })
  }
</script>

<div style="height: 100dvh; width: 100%;">
  <TraekCanvas {engine} onSendMessage={handleSend} />
</div>
```

The canvas fills its parent element, so give the container an explicit size.

## Overriding node renderers

Use `componentMap` to map `node.type` values (e.g. `'text'`, or your own custom strings) to Svelte components. See [Custom Node Types](/guides/custom-nodes/).

## CSS Custom Properties

Træk uses `--traek-*` CSS custom properties for theming (dark theme by default).
