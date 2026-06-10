---
title: Custom Node Types
description: Create custom node renderers for Træk.
---

# Custom Node Types

## Creating a Custom Renderer

Custom node components receive `node`, `engine`, and `isActive` props (type these with the exported `TraekNodeComponentProps`):

```svelte
<!-- MyCustomNode.svelte -->
<script lang="ts">
  import type { TraekNodeComponentProps } from 'traek'

  let { node, engine, isActive }: TraekNodeComponentProps = $props()
</script>

<div class="custom-node" class:active={isActive}>
  <p>{node.data ? JSON.stringify(node.data) : node.id}</p>
</div>
```

## Registering with TraekCanvas

Pass a `componentMap` that maps `node.type` strings to components. Built-in types are lowercase (`'text'`, `'thought'`); you can also invent your own type strings:

```svelte
<script>
  import { TraekCanvas, TraekEngine } from 'traek'
  import MyCustomNode from './MyCustomNode.svelte'

  const engine = new TraekEngine()

  const componentMap = {
    myCustomType: MyCustomNode
  }

  function handleSend(input, userNode) {
    // Create a node rendered by MyCustomNode
    engine.addNode('', 'assistant', {
      type: 'myCustomType',
      parentIds: [userNode.id],
      data: { answer: 42 }
    })
  }
</script>

<TraekCanvas {engine} {componentMap} onSendMessage={handleSend} />
```

To replace the default text renderer, map the `'text'` type: `{ text: MyCustomNode }`.

## One-off custom nodes

For a single ad-hoc node you can skip the map and pass a component directly:

```js
import MyCustomNode from './MyCustomNode.svelte'

engine.addCustomNode(MyCustomNode, { someProp: 'value' }, 'assistant', {
  parentIds: [parent.id]
})
```
