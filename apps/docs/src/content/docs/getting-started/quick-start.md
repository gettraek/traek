---
title: Quick Start
description: Get Træk running in 5 minutes.
---

# Quick Start

## Basic Setup

`addNode(content, role, options?)` takes the message text first, then the role. When the user submits a message, `TraekCanvas` adds the user node itself and passes it to `onSendMessage` — your handler only adds the response.

```svelte
<script>
  import { TraekCanvas, TraekEngine } from 'traek'

  const engine = new TraekEngine()
  engine.addNode('Hello! How can I help you today?', 'assistant')

  async function handleSend(input, userNode) {
    // userNode is already in the tree. Add your AI response here:
    engine.addNode('...', 'assistant', { parentIds: [userNode.id] })
  }
</script>

<div style="height: 100dvh; width: 100%;">
  <TraekCanvas {engine} onSendMessage={handleSend} />
</div>
```

The canvas fills its parent, so make sure the container has a size.

## With OpenAI Streaming

See the [OpenAI Streaming guide](/guides/openai-streaming) for a complete example with real-time streaming responses.
