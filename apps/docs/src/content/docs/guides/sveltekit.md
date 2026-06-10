---
title: Using with SvelteKit
description: Integrate Træk into a SvelteKit application.
---

# Using with SvelteKit

## Installation

```bash
pnpm add traek
```

## Basic Route

Create a `+page.svelte` file:

```svelte
<script>
  import { TraekCanvas, TraekEngine } from 'traek'

  const engine = new TraekEngine()

  function handleMessage(input, userNode) {
    // The user node is already added by the canvas — respond to it:
    engine.addNode(`You said: ${input}`, 'assistant', { parentIds: [userNode.id] })
  }
</script>

<div class="canvas-container">
  <TraekCanvas {engine} onSendMessage={handleMessage} />
</div>

<style>
  .canvas-container {
    width: 100vw;
    height: 100vh;
  }
</style>
```

## API Routes

For streaming responses, create a `+server.ts`:

```ts
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request }) => {
  const { messages } = await request.json()
  // Stream your AI response
}
```
