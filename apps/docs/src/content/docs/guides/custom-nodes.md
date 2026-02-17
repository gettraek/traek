---
title: Custom Node Types
description: Create custom node renderers for Træk.
---

# Custom Node Types

## Creating a Custom Renderer

```svelte
<!-- MyCustomNode.svelte -->
<script>
  let { node } = $props()
</script>

<div class="custom-node">
  <p>{node.content}</p>
</div>
```

## Registering with TraekCanvas

```svelte
<script>
  import { TraekCanvas, TraekEngine } from 'traek'
  import MyCustomNode from './MyCustomNode.svelte'

  const components = {
    TEXT: MyCustomNode
  }
</script>

<TraekCanvas {engine} {components} onSendMessage={handleSend} />
```
