---
title: OpenAI Streaming
description: Real-time streaming with OpenAI and Træk.
---

# OpenAI Streaming

## Server Route

```ts
// src/routes/api/chat/+server.ts
import OpenAI from 'openai'
import type { RequestHandler } from './$types'

const openai = new OpenAI()

export const POST: RequestHandler = async ({ request }) => {
  const { messages } = await request.json()

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    stream: true
  })

  const encoder = new TextEncoder()
  const body = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        if (delta) controller.enqueue(encoder.encode(delta))
      }
      controller.close()
    }
  })

  return new Response(body, { headers: { 'Content-Type': 'text/plain' } })
}
```

## Client Streaming

`TraekCanvas` adds the user node before calling `onSendMessage`, so the handler only creates the assistant node and streams content into it with `updateNode`. The conversation history for the request comes from `engine.contextPath()` — the linear path from the root to the active node.

```svelte
<script>
  import { TraekCanvas, TraekEngine } from 'traek'

  const engine = new TraekEngine()

  async function handleSend(input, userNode) {
    // userNode is already in the tree; create the assistant node below it
    const assistantNode = engine.addNode('', 'assistant', {
      parentIds: [userNode.id]
    })
    engine.updateNode(assistantNode.id, { status: 'streaming' })

    // Build the message history from the path root → user node
    const messages = engine
      .contextPath()
      .filter((n) => n.id !== assistantNode.id)
      .map((n) => ({ role: n.role, content: n.content ?? '' }))

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let content = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        content += decoder.decode(value, { stream: true })
        engine.updateNode(assistantNode.id, { content, status: 'streaming' })
      }

      engine.updateNode(assistantNode.id, { status: 'done' })
    } catch (err) {
      engine.updateNode(assistantNode.id, {
        status: 'error',
        errorMessage: String(err)
      })
    }
  }
</script>

<div style="height: 100dvh; width: 100%;">
  <TraekCanvas {engine} onSendMessage={handleSend} />
</div>
```
