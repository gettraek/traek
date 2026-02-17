---
title: TraekCanvas
description: API reference for the TraekCanvas component.
---

# TraekCanvas

The main component that renders the interactive conversation canvas.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `engine` | `TraekEngine` | Yes | The engine instance managing conversation state |
| `onSendMessage` | `(event: SendEvent) => void` | Yes | Callback fired when user submits a message |
| `components` | `ComponentMap` | No | Override default node renderers |
| `class` | `string` | No | Additional CSS classes |

## Usage

```svelte
<script>
  import { TraekCanvas, TraekEngine } from 'traek'

  const engine = new TraekEngine()
</script>

<TraekCanvas
  {engine}
  onSendMessage={({ content, parentId }) => {
    // Handle message submission
  }}
/>
```

## CSS Custom Properties

Træk uses `--traek-*` CSS custom properties for theming. See [Theming](/guides/theming) for details.
