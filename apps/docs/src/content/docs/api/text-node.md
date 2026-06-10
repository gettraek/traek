---
title: TextNode
description: API reference for the TextNode component.
---

# TextNode

Default message renderer with markdown, code highlighting, and inline editing support.

## Features

- Markdown rendering via `marked`, sanitized with `DOMPurify`
- Syntax highlighting via `highlight.js`
- Streaming, done, and error states (driven by `node.status`)
- Inline editing of node content
- Thought/reasoning panel support

## Usage

TextNode renders nodes of type `'text'` automatically — you don't need to wire it up yourself. To replace it with a custom component, map the `'text'` type in the `componentMap` prop on `TraekCanvas`:

```svelte
<TraekCanvas {engine} componentMap={{ text: MyTextNode }} onSendMessage={handleSend} />
```

See [Custom Node Types](/guides/custom-nodes/) for writing custom renderers.

## Props

When used directly (it is also exported as `TextNode` from `traek`), the main props are:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `node` | `MessageNode` | Yes | The node to render |
| `isActive` | `boolean` | Yes | Whether the node is the active node |
| `isFocused` | `boolean` | No | Whether the node is keyboard-focused |
| `engine` | `TraekEngine` | No | Engine instance (enables toolbar actions) |
| `onEditSave` | `(nodeId: string, content: string) => void` | No | Called when an inline edit is saved |
| `onEditCancel` | `() => void` | No | Called when an inline edit is cancelled |
| `onStartEdit` | `(nodeId: string) => void` | No | Called when inline editing starts |
