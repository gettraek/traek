# Mycelium

Spatial tree-chat UI for AI agents (Svelte 5). Messages are nodes in a tree: parent on top, children in a horizontal row below. Supports branching, streaming, thought nodes, markdown (including images), pan/zoom, and configurable layout.

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Install](#install)
- [Quick start](#quick-start)
- [Implementation guide](#implementation-guide)
- [Configuration](#configuration)
- [API reference](#api-reference)
- [Storybook](#storybook)
- [Demo app](#demo-app)
- [Building and publishing](#building-and-publishing)
- [License](#license)

## Features

- **Tree layout** — Conversations branch; each reply can have multiple follow-ups.
- **Streaming** — Stream assistant content token-by-token with `engine.updateNode(id, { content })`.
- **Thought nodes** — Optional “thinking” steps attached to a reply.
- **Markdown** — Rendered with [marked](https://github.com/markedjs/marked) and sanitized (images, bold, lists, code).
- **Pan & zoom** — Canvas with mouse/touch pan and zoom.
- **Configurable** — Node size, gaps, zoom speed, grid step, etc. via `ChatEngineConfig`.

## Requirements

- **Svelte ^5** (peer dependency)
- **Node.js** 18+ (for your app/build)

## Install

```bash
npm install mycelium
```

Peer dependency: **Svelte ^5**. The package also depends on `marked` and `dompurify` (included).

## Quick start

1. Create a `ChatEngine` (optional: pass partial config).
2. Render `<ChatCanvas engine={engine} onSendMessage={...} />`.
3. In `onSendMessage`: add the user node, add an empty assistant node with `status: 'streaming'`, stream content with `engine.updateNode(id, { content })`, then set `status: 'done'`.

```svelte
<script lang="ts">
  import { ChatCanvas, ChatEngine, DEFAULT_CHAT_ENGINE_CONFIG, type MessageNode } from 'mycelium';

  const engine = new ChatEngine(DEFAULT_CHAT_ENGINE_CONFIG);

  function onSendMessage(input: string, _userNode: MessageNode) {
    engine.addNode(input, 'user');
    const assistantNode = engine.addNode('', 'assistant', { autofocus: true });
    engine.updateNode(assistantNode.id, { status: 'streaming' });
    // Stream chunks: engine.updateNode(assistantNode.id, { content: currentContent + chunk });
    // When done: engine.updateNode(assistantNode.id, { status: 'done' });
  }
</script>

<ChatCanvas {engine} {onSendMessage} />
```

## Implementation guide

Follow these steps to integrate the chat into your app.

### 1. Set up engine and canvas

Create one `ChatEngine` per conversation (e.g. per page or per chat id). You can pass a partial `ChatEngineConfig` to override defaults.

```svelte
<script lang="ts">
  import { ChatCanvas, ChatEngine, DEFAULT_CHAT_ENGINE_CONFIG, type MessageNode } from 'mycelium';

  const engine = new ChatEngine({
    ...DEFAULT_CHAT_ENGINE_CONFIG,
    nodeWidth: 420,
    layoutGapX: 400,
  });
</script>

<ChatCanvas {engine} onSendMessage={handleSend} />
```

### 2. Handle sending a message (user + assistant reply)

In `onSendMessage(input: string, userNode: MessageNode)`:

1. **User node** — Already added by the canvas when the user submits; you receive it as `userNode`. Optionally add your own with `engine.addNode(input, 'user')` if you need to control timing.
2. **Assistant node** — Add an empty assistant node and mark it streaming so the UI shows a loading state. Use `autofocus: true` so the canvas scrolls to the new reply.

```ts
function onSendMessage(input: string, userNode: MessageNode) {
  engine.addNode(input, 'user');
  const assistantNode = engine.addNode('', 'assistant', { autofocus: true });
  engine.updateNode(assistantNode.id, { status: 'streaming' });
  // Call your API / stream logic; when you get chunks, update content:
  // engine.updateNode(assistantNode.id, { content: accumulatedContent });
  // When finished:
  // engine.updateNode(assistantNode.id, { status: 'done' });
}
```

### 3. Streaming content

Append chunks to the assistant node’s `content` and call `updateNode`. The canvas re-renders and keeps the node in view.

```ts
let content = '';
for await (const chunk of streamFromAPI()) {
  content += chunk;
  engine.updateNode(assistantNode.id, { content });
}
engine.updateNode(assistantNode.id, { status: 'done' });
```

### 4. Error state

On API or stream error, set `status: 'error'` and optionally `errorMessage`:

```ts
engine.updateNode(assistantNode.id, {
  status: 'error',
  errorMessage: 'Failed to connect',
});
```

### 5. Loading a saved conversation

Use `engine.addNodes(payloads)` with an array of `AddNodePayload`. Include `id`, `parentId`, `content`, `role`, and optionally `type`, `status`, `errorMessage`, `metadata`, `data`. Parents must appear earlier in the list or already exist. After loading, set `engine.activeNodeId` if you want a specific node focused.

```ts
const payloads: AddNodePayload[] = [
  { id: '1', parentId: null, content: 'Hello', role: 'user' },
  { id: '2', parentId: '1', content: 'Hi there!', role: 'assistant', status: 'done' },
];
engine.addNodes(payloads);
engine.activeNodeId = '2'; // optional: focus last reply
```

### 6. Persisting layout and viewport

Use `onNodesChanged` when node positions change (e.g. after drag) and `onViewportChange` when pan/zoom changes. Persist `engine.nodes` (e.g. via `nodesToPayloads`-style mapping), `engine.activeNodeId`, and the viewport `{ scale, offset }` so you can restore with `addNodes` and `initialScale` / `initialOffset` on `ChatCanvas`.

```svelte
<ChatCanvas
  {engine}
  {onSendMessage}
  onNodesChanged={() => saveLayout(engine)}
  onViewportChange={({ scale, offset }) => saveViewport({ scale, offset })}
  initialScale={savedScale}
  initialOffset={savedOffset}
/>
```

### 7. Branching (multiple replies under one message)

Add a new assistant (or user) node with `parentId` set to the node you’re replying to. The tree will lay out children in a row below that parent.

```ts
engine.addNode('Another reply', 'assistant', { parentId: someMessageNode.id });
```

### 8. Thought nodes (optional “thinking” steps)

Add nodes with `type: 'thought'` and `parentId` set to the assistant message they belong to. They are laid out as attached steps and don’t change the main “active” branch.

```ts
engine.addNode('Reasoning step 1', 'assistant', {
  type: 'thought',
  parentId: assistantNode.id,
});
```

## Configuration

Pass partial config to the `ChatEngine` constructor or as the `config` prop of `ChatCanvas`. Options (see `ChatEngineConfig` and `DEFAULT_CHAT_ENGINE_CONFIG`):

| Option | Description | Default |
|--------|-------------|--------|
| `nodeWidth` | Card width (px) | 400 |
| `nodeHeightDefault` | Default card height (px) | 100 |
| `layoutGapX`, `layoutGapY` | Horizontal/vertical gap between nodes (px) | 375, 50 |
| `gridStep` | Pixels per grid unit (positions use grid units) | 20 |
| `scaleMin`, `scaleMax` | Zoom limits | 0.05, 8 |
| `zoomSpeed` | Zoom sensitivity | 0.004 |
| `focusDurationMs` | Focus animation duration | 280 |
| `streamIntervalMs` | Throttle for stream updates | 30 |
| `rootNodeOffsetX`, `rootNodeOffsetY` | Offset of root node (grid units) | -175, -50 |
| `heightChangeThreshold` | Min height delta to trigger layout (px) | 5 |

## API reference

### Exports from `mycelium`

| Export | Description |
|--------|-------------|
| `ChatCanvas` | Svelte component: canvas + input; requires `engine` and `onSendMessage`. |
| `ChatEngine` | Class that holds `nodes`, `activeNodeId`, and layout logic. |
| `DEFAULT_CHAT_ENGINE_CONFIG` | Default config object. |
| `ChatEngineConfig` | Type for full config. |
| `MessageNode`, `Node`, `NodeStatus` | Types for nodes and status. |
| `AddNodePayload` | Type for `addNodes()` payloads. |

### ChatCanvas props

| Prop | Type | Description |
|------|------|-------------|
| `engine` | `ChatEngine \| null` | Engine instance (required for controlled use). |
| `config` | `Partial<ChatEngineConfig>` | Override config (used if no engine passed). |
| `onSendMessage` | `(input: string, userNode: MessageNode) => void` | Called when user sends a message. |
| `onNodesChanged` | `() => void` | Called when node positions change (e.g. drag). |
| `onViewportChange` | `(viewport: { scale, offset }) => void` | Called when pan/zoom changes. |
| `initialPlacementPadding` | `{ left, top }` | Padding for initial placement. |
| `initialScale` | `number` | Restore saved zoom. |
| `initialOffset` | `{ x, y }` | Restore saved pan. |
| `showFps` | `boolean` | Show FPS counter (default `false`). |

### ChatEngine methods

| Method | Description |
|--------|-------------|
| `addNode(content, role, options?)` | Add one node; options: `type`, `parentId`, `autofocus`, `x`, `y`, `data`, `deferLayout`. Returns the new `MessageNode`. |
| `addNodes(payloads)` | Add many nodes (e.g. load saved conversation); payloads may include `id`. |
| `updateNode(nodeId, updates)` | Apply partial updates (e.g. `content`, `status`, `errorMessage`). |
| `updateNodeHeight(nodeId, height)` | Set node height (triggers layout). |
| `deleteNode(nodeId)` | Remove node and clear active if needed. |
| `setNodePosition(nodeId, xPx, yPx, snapThresholdPx?)` | Set position from canvas pixels; optional snap. |
| `moveNodeAndDescendants(nodeId, dx, dy)` | Move node and subtree in pixels. |
| `snapNodeToGrid(nodeId)` | Snap position to grid. |
| `focusOnNode(nodeId)` | Center view on node (`pendingFocusNodeId`). |
| `clearPendingFocus()` | Clear pending focus (called by canvas after centering). |
| `flushLayoutFromRoot()` | Re-run layout from all roots (use after `deferLayout` adds). |

Use your editor’s type hints and the types in `dist/` for full signatures.

## Storybook

Stories include: default canvas, mock reply, streaming, error state, thought steps, branched conversation, and a 100-node benchmark.

```bash
npm run storybook
```

## Demo app

This repo includes a demo (conversation list + spatial chat with OpenAI):

1. Set **server-side** env var `OPENAI_API_KEY` (key is not sent to the client; the app uses a SvelteKit API route to stream from OpenAI).
2. Run `npm run dev` and open the app (e.g. go to `/demo` for the conversation list).

## Building and publishing

### Pre-publish checklist

1. **npm account** — Create one at [npmjs.com](https://www.npmjs.com/signup) if needed. Check that the name **mycelium** is [available](https://www.npmjs.com/package/mycelium) (or choose a scoped name, e.g. `@your-username/mycelium`).
2. **Repository URLs** — In `package.json`, set `repository`, `bugs`, and `homepage` to your real repo (replace `your-username/spacial-chat` with your GitHub org/repo).
3. **License** — You have a `LICENSE` file and `"license": "MIT"` in `package.json`. Your current LICENSE is the “No-Sale Variant” (no commercial sale). If that’s intentional, keep it; otherwise switch to [plain MIT](https://opensource.org/license/mit/) text if you want to allow resale.
4. **Build** — Run `npm run build` (or `npm pack`, which runs `prepack` and builds). Ensure `dist/` is produced and no build errors.
5. **Dry run** — Run `npm publish --dry-run` to see which files would be included (should list `dist/`, `package.json`, `README.md`, etc.).

### Publish

```bash
npm login          # once per machine
npm run build      # optional if you use prepack
npm publish        # runs prepack → build, then publishes
```

For a scoped package (e.g. `@your-username/mycelium`), use `npm publish --access public` the first time.

## License

MIT
