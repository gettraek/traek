---
title: Types
description: TypeScript type reference for Træk.
---

# Types

All types are exported from the `traek` package:

```ts
import type { Node, MessageNode, NodeStatus, AddNodePayload, TraekEngineConfig } from 'traek'
```

## Node

The base shape of every node on the canvas. Nodes form a DAG: a node can have **multiple parents** (`parentIds`), and the first entry is the primary parent used for layout and the context path.

```ts
interface Node {
  id: string
  parentIds: string[]                          // [] for root nodes
  role: 'user' | 'assistant' | 'system'
  type: 'text' | 'code' | 'thought' | string   // custom type strings allowed
  status?: 'streaming' | 'done' | 'error'      // NodeStatus
  errorMessage?: string
  createdAt?: number                           // Unix epoch ms
  metadata?: {
    x: number                                  // position in grid units
    y: number
    height?: number                            // measured height in px
    [key: string]: unknown                     // e.g. tags, manualPosition
  }
  data?: unknown                               // arbitrary payload for custom nodes
}
```

## MessageNode

A text-bearing node — what `engine.addNode()` returns and what `TextNode` renders.

```ts
interface MessageNode extends Node {
  content: string
}
```

## NodeStatus

```ts
type NodeStatus = 'streaming' | 'done' | 'error'
```

## AddNodePayload

Payload for `engine.addNodes()` (bulk add, e.g. loading a saved project). `id` is optional; parents must appear earlier in the list or already exist in the engine.

```ts
interface AddNodePayload {
  id?: string
  parentIds: string[]
  content: string
  role: 'user' | 'assistant' | 'system'
  type?: string
  status?: NodeStatus
  errorMessage?: string
  createdAt?: number
  metadata?: Partial<{ x: number; y: number; height?: number }>
  data?: unknown
}
```

## TraekEngineConfig

Engine configuration. The constructor accepts a `Partial<TraekEngineConfig>` merged with `DEFAULT_TRACK_ENGINE_CONFIG`. A matching Zod schema is exported as `traekEngineConfigSchema`.

```ts
interface TraekEngineConfig {
  focusDurationMs: number       // focus animation duration (default 280)
  zoomSpeed: number             // wheel zoom speed (default 0.004)
  zoomLineModeBoost: number     // zoom boost for line-mode wheel events (default 20)
  scaleMin: number              // minimum zoom (default 0.05)
  scaleMax: number              // maximum zoom (default 8)
  nodeWidth: number             // node width in px (default 350)
  nodeHeightDefault: number     // default node height in px (default 100)
  streamIntervalMs: number      // streaming update interval (default 30)
  rootNodeOffsetX: number       // root placement offset in px (default -175)
  rootNodeOffsetY: number       // root placement offset in px (default -50)
  layoutGapX: number            // horizontal gap between siblings in px (default 35)
  layoutGapY: number            // vertical gap between generations in px (default 50)
  heightChangeThreshold: number // min px change before re-layout (default 5)
  gridStep: number              // px per grid unit; metadata.x/y are in grid units (default 20)
}
```
