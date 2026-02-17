---
title: TraekEngine
description: API reference for the TraekEngine class.
---

# TraekEngine

Core state management class that manages the conversation tree.

## Constructor

```ts
const engine = new TraekEngine(config?: TraekEngineConfig)
```

## Methods

### `addNode(node: Partial<MessageNode>): MessageNode`

Adds a new node to the conversation tree.

### `branchFrom(nodeId: string, content: string): MessageNode`

Creates a new branch from an existing node.

### `focusOnNode(nodeId: string): void`

Centers the viewport on a specific node.

### `moveNode(nodeId: string, x: number, y: number): void`

Moves a node to specific canvas coordinates.

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `nodes` | `MessageNode[]` | All nodes in the conversation tree |
| `focusedNodeId` | `string \| null` | Currently focused node ID |
