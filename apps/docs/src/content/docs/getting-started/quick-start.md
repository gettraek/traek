---
title: Quick Start
description: Get Træk running in 5 minutes.
---

# Quick Start

## Basic Setup

```svelte
<script>
  import { TraekCanvas, TraekEngine } from 'traek'

  const engine = new TraekEngine()
  engine.addNode({
    role: 'assistant',
    content: 'Hello! How can I help you today?'
  })

  async function handleSend({ content }) {
    engine.addNode({ role: 'user', content })
    // Add your AI response here
    engine.addNode({ role: 'assistant', content: '...' })
  }
</script>

<TraekCanvas {engine} onSendMessage={handleSend} />
```

## With OpenAI Streaming

See the [OpenAI Streaming guide](/guides/openai-streaming) for a complete example with real-time streaming responses.
