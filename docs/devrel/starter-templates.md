# Starter Templates & Code Examples

Ready-to-use conversation templates and integration examples for common Træk use cases.

---

## Conversation Templates

### Code Review Assistant

A branching code review session with a system prompt primed for detailed feedback.

```json
{
  "nodes": [
    {
      "id": "sys",
      "parentId": null,
      "role": "system",
      "type": "TEXT",
      "content": "You are an expert code reviewer. Analyse diffs for correctness, performance, security, and style. For each issue, explain the problem and suggest a concrete fix. Use branching to explore alternative approaches when multiple solutions exist.",
      "status": "done",
      "metadata": { "x": 0, "y": 0 }
    },
    {
      "id": "prompt",
      "parentId": "sys",
      "role": "user",
      "type": "TEXT",
      "content": "Please review this diff:\n\n```diff\n\n```",
      "status": "done",
      "metadata": { "x": 0, "y": 120 }
    }
  ]
}
```

### Brainstorming Session

Open-ended exploration with encouragement to branch multiple directions.

```json
{
  "nodes": [
    {
      "id": "sys",
      "parentId": null,
      "role": "system",
      "type": "TEXT",
      "content": "You are a creative brainstorming partner. When exploring an idea, offer at least 3 distinct angles or approaches. Be concrete — suggest names, features, or mechanisms, not just categories.",
      "status": "done",
      "metadata": { "x": 0, "y": 0 }
    }
  ]
}
```

### Research Deep-Dive

Structured research with citation prompting.

```json
{
  "nodes": [
    {
      "id": "sys",
      "parentId": null,
      "role": "system",
      "type": "TEXT",
      "content": "You are a research assistant. For each claim, note the source or indicate if it is uncertain. Structure long answers with headers. Suggest follow-up questions at the end of each response.",
      "status": "done",
      "metadata": { "x": 0, "y": 0 }
    }
  ]
}
```

### Customer Support Triage

Route and escalate support queries with branching resolution paths.

```json
{
  "nodes": [
    {
      "id": "sys",
      "parentId": null,
      "role": "system",
      "type": "TEXT",
      "content": "You are a tier-1 support agent. Classify the issue by category (billing, technical, account, feature request). For technical issues, ask for environment details. Escalate issues you cannot resolve to Tier 2 with a summary.",
      "status": "done",
      "metadata": { "x": 0, "y": 0 }
    }
  ]
}
```

---

## Code Examples

### Minimal Svelte app

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { TraekCanvas, TraekEngine } from '@traek/svelte'

  const engine = new TraekEngine()

  async function onSendMessage(content: string, parentId: string | null) {
    const userNode = engine.addNode({ role: 'user', content, parentId })

    const streamNode = engine.addNode({
      role: 'assistant',
      content: '',
      parentId: userNode.id,
      status: 'streaming'
    })

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content })
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      accumulated += decoder.decode(value, { stream: true })
      engine.updateNode(streamNode.id, { content: accumulated })
    }

    engine.updateNode(streamNode.id, { status: 'done' })
  }
</script>

<TraekCanvas {engine} {onSendMessage} />
```

### React equivalent

```tsx
// src/App.tsx
import { TraekCanvas, useTraekEngine } from '@traek/react'

export function App() {
  const engine = useTraekEngine()

  const onSendMessage = async (content: string, parentId: string | null) => {
    const userNode = engine.addNode({ role: 'user', content, parentId })
    const streamNode = engine.addNode({
      role: 'assistant', content: '', parentId: userNode.id, status: 'streaming'
    })

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content })
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      accumulated += decoder.decode(value, { stream: true })
      engine.updateNode(streamNode.id, { content: accumulated })
    }
    engine.updateNode(streamNode.id, { status: 'done' })
  }

  return <TraekCanvas engine={engine} onSendMessage={onSendMessage} />
}
```

### Cloud persistence integration

```ts
// lib/cloud.ts
import { CloudClient, RestAdapter } from '@traek/cloud-client'

export const cloud = new CloudClient({
  adapter: new RestAdapter({
    baseUrl: 'https://api.gettraek.com',
    apiKey: import.meta.env.VITE_TRAEK_API_KEY
  })
})
```

```svelte
<!-- Auto-save on every engine change -->
<script lang="ts">
  import { TraekCanvas, TraekEngine } from '@traek/svelte'
  import { cloud } from '$lib/cloud'

  const engine = new TraekEngine()
  let savedId: string | undefined

  $effect(() => {
    const snapshot = engine.serialize()
    // Debounce in production
    cloud.save('My session', snapshot, { id: savedId }).then(conv => {
      savedId = conv.id
    })
  })
</script>
```

### Analytics integration

```ts
// After a session ends
import { generateReport, reportToMarkdown } from '@traek/analytics'

const snapshot = engine.serialize()
const report = generateReport(snapshot)

console.log(reportToMarkdown(report))
// → # Analytics Report
// → Generated: 2026-03-08T14:00:00Z
// → ...
```

### Custom node type (Svelte 5)

```svelte
<!-- src/MermaidNode.svelte -->
<script lang="ts">
  import type { MessageNode } from '@traek/core'
  import mermaid from 'mermaid'
  import { onMount } from 'svelte'

  let { node }: { node: MessageNode } = $props()
  let container: HTMLDivElement

  onMount(async () => {
    mermaid.initialize({ theme: 'dark' })
    const { svg } = await mermaid.render('diagram-' + node.id, node.content)
    container.innerHTML = svg
  })
</script>

<div class="mermaid-node" bind:this={container}></div>

<style>
  .mermaid-node {
    padding: 1rem;
    background: var(--traek-node-bg);
    border-radius: var(--traek-radius-md);
  }
</style>
```

```ts
// src/index.ts — register for the Marketplace
import MermaidNode from './MermaidNode.svelte'
import type { TraekPlugin } from '@traek/core'

export const plugin: TraekPlugin = {
  nodeTypes: {
    MERMAID: MermaidNode
  }
}
```

---

## Starter Repos

| Template | Stack | Description |
|----------|-------|-------------|
| `create-traek-app` | SvelteKit + Svelte | Full app with OpenAI streaming + cloud save |
| `traek-react-starter` | Next.js + React | Same with React adapter |
| `traek-plugin-template` | TypeScript | Scaffold for a custom node type |
| `traek-theme-template` | CSS | Minimal theme with all token overrides |

```bash
# Quickstart
npm create traek@latest my-app
cd my-app && pnpm install && pnpm dev
```

---

## Where to Go Next

- [Developer Program overview →](./developer-program.md)
- [Marketplace submission guidelines →](./marketplace-submission.md)
- [Cloud API reference →](./cloud-api.md)
- [Analytics API reference →](./analytics-api.md)
- [Revenue sharing & payouts →](./revenue-sharing.md)
