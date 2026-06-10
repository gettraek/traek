---
title: TraekEngine
description: API reference for the TraekEngine class.
---

# TraekEngine

Core state management class that manages the conversation tree: nodes, parent-child relationships (a DAG — nodes can have multiple parents), spatial layout, and search.

## Constructor

```ts
import { TraekEngine } from 'traek'

const engine = new TraekEngine(config?: Partial<TraekEngineConfig>)
```

The config is merged with `DEFAULT_TRACK_ENGINE_CONFIG` (also exported). See [Types](/api/types/) for all `TraekEngineConfig` fields.

## State

| Property | Type | Description |
|----------|------|-------------|
| `nodes` | `Node[]` | All nodes in the conversation tree (reactive `$state`) |
| `activeNodeId` | `string \| null` | ID of the currently active node — new nodes attach to it by default |
| `version` | `number` (read-only) | Monotonic counter bumped on every mutation; useful for auto-save |
| `collapsedNodes` | `SvelteSet<string>` | IDs of collapsed nodes (their descendants are hidden) |
| `searchQuery` | `string` | Current search query |
| `searchMatches` | `string[]` | IDs of nodes matching the current search |
| `currentSearchIndex` | `number` | Index of the current search match (0-based) |
| `pendingFocusNodeId` | `string \| null` | Node the canvas should center on next (set by `focusOnNode`) |

## Adding nodes

### `addNode(content, role, options?): MessageNode`

Adds a message node. If `options.parentIds` is omitted, the node is attached to the active node (or becomes a root when there is none). The new node becomes active (unless `type` is `'thought'`).

```ts
addNode(
  content: string,
  role: 'user' | 'assistant' | 'system',
  options?: {
    type?: string            // 'text' (default), 'thought', or a custom type
    parentIds?: string[]
    autofocus?: boolean      // center the canvas on the new node
    x?: number               // explicit position in grid units
    y?: number
    data?: unknown
    deferLayout?: boolean    // skip layout; call flushLayoutFromRoot() after a batch
  }
): MessageNode
```

```ts
const root = engine.addNode('Hello!', 'user')
const reply = engine.addNode('Hi there.', 'assistant', { parentIds: [root.id] })
```

### `addCustomNode(component, props?, role?, options?): CustomTraekNode`

Like `addNode`, but renders an arbitrary Svelte component instead of a message. Takes the same `options` as `addNode`.

### `addNodes(payloads: AddNodePayload[]): MessageNode[]`

Bulk add (e.g. loading a saved project) with a single layout pass. Payloads may include an `id` for round-tripping; parents may reference ids in the same batch or existing nodes. See [Types](/api/types/) for `AddNodePayload`.

## Updating and deleting

### `updateNode(nodeId: string, updates: Partial<MessageNode>): void`

Shallow-merges `updates` into the node. Used heavily during streaming:

```ts
engine.updateNode(node.id, { content: accumulated, status: 'streaming' })
engine.updateNode(node.id, { status: 'done' })
```

### `deleteNode(nodeId: string): void`

Deletes a single node. Surviving children are re-parented (the deleted id is stripped from their `parentIds`).

### `deleteNodeAndDescendants(nodeId: string): void`

Deletes a node and its full subtree, then navigates to the deleted node's first parent if the active node was removed.

### `restoreDeleted(): boolean`

Restores the most recently deleted node(s). The undo buffer expires after 30 seconds; returns `false` if there is nothing to restore.

### `duplicateNode(nodeId: string): Node | null`

Creates a sibling copy with the same parents, role, type, and content.

## Branching and navigation

### `branchFrom(nodeId: string): void`

Sets `activeNodeId` to the given node, so the next message sent creates a new branch from it.

### `contextPath(): Node[]`

Returns the linear path from the root to the active node (following each node's primary parent). Use this to build the message history for an LLM request:

```ts
const messages = engine
  .contextPath()
  .map((n) => ({ role: n.role, content: (n as MessageNode).content ?? '' }))
```

### `focusOnNode(nodeId: string): void`

Asks the canvas to center the viewport on a node (sets `pendingFocusNodeId`).

### `clearPendingFocus(): void`

Clears a pending focus request.

## Reading the tree

| Method | Returns | Description |
|--------|---------|-------------|
| `getNode(id)` | `Node \| undefined` | O(1) lookup by ID |
| `getChildren(parentId)` | `Node[]` | Children of a node (`null` for roots) |
| `getParent(nodeId)` | `Node \| null` | Primary parent (first in `parentIds`) |
| `getSiblings(nodeId)` | `Node[]` | Children of the same primary parent (includes self) |
| `getDescendants(nodeId)` | `Node[]` | All descendants via BFS (excludes thought nodes) |
| `getDescendantCount(nodeId)` | `number` | Count of visible descendants |
| `getAncestorPath(nodeId)` | `string[]` | All ancestor IDs across every parent link (includes self) |
| `getDepth(nodeId)` | `number` | Depth along the primary-parent chain (root = 0, not found = -1) |
| `getMaxDepth()` | `number` | Maximum depth across all nodes (-1 for an empty tree) |
| `getActiveLeaf(nodeId)` | `Node \| undefined` | Follows children downward to a leaf |
| `getSiblingIndex(nodeId)` | `{ index, total }` | Position among siblings |

## Positioning and layout

Positions (`metadata.x` / `metadata.y`) are stored in **grid units** (`config.gridStep` pixels per unit).

### `setNodePosition(nodeId, xPx, yPx, snapThresholdPx?): void`

Sets a node's position from canvas pixel coordinates (e.g. during a drag). Marks the node as manually positioned and re-layouts its subtree. When `snapThresholdPx` is set, snaps to the grid within that distance.

### `moveNodeAndDescendants(nodeId, dx, dy): void`

Moves a node by a pixel delta and re-layouts its subtree.

### `snapNodeToGrid(nodeId): void`

Rounds a node's position to integer grid coordinates (e.g. on drop).

### `layoutChildren(parentId): void` / `flushLayoutFromRoot(): void`

Re-run automatic layout for one subtree, or from every root (use after batched `addNode` calls with `deferLayout: true`).

## Connections (multi-parent DAG)

### `addConnection(parentId, childId): boolean`

Adds an extra parent link. Returns `false` if it would create a cycle (checked with the exported `wouldCreateCycle` helper) or already exists.

### `removeConnection(parentId, childId): boolean`

Removes a parent link.

## Collapse

| Method | Description |
|--------|-------------|
| `toggleCollapse(nodeId)` | Collapse/expand a subtree |
| `isCollapsed(nodeId)` | Whether a node is collapsed |
| `isInCollapsedSubtree(nodeId)` | Whether a node is hidden by a collapsed ancestor |
| `getHiddenDescendantCount(nodeId)` | How many descendants collapsing hides |

## Search

| Method | Description |
|--------|-------------|
| `searchNodesMethod(query)` | Case-insensitive content search; updates `searchMatches`, auto-expands collapsed matches, focuses the first match |
| `nextSearchMatch()` / `previousSearchMatch()` | Cycle through matches |
| `clearSearch()` | Reset search state |

## Tags

| Method | Description |
|--------|-------------|
| `addTag(nodeId, tag)` | Add a tag (stored in `metadata.tags`) |
| `removeTag(nodeId, tag)` | Remove a tag |
| `getTags(nodeId)` | Get a node's tags |

## Persistence

### `serialize(title?: string): ConversationSnapshot`

Serializes the full engine state into a JSON-safe snapshot. Component references from `addCustomNode` are stripped — only `node.type` is stored.

### `TraekEngine.fromSnapshot(snapshot, config?): TraekEngine` (static)

Creates an engine from a snapshot. Input is validated with Zod (`conversationSnapshotSchema`) and throws on invalid data.

```ts
const snapshot = engine.serialize('My chat')
localStorage.setItem('chat', JSON.stringify(snapshot))

const restored = TraekEngine.fromSnapshot(JSON.parse(localStorage.getItem('chat')))
```
