# træk Video Tutorial Scripts

Three screencasts for YouTube / embedding in docs.

---

## Video 1: Getting Started in 5 Minutes

**Runtime:** ~5 min
**Audience:** New users, AI power users
**Goal:** First successful branched conversation

### Script

**[0:00 — Hook]**

*[Screen: blank canvas, cursor hovering]*

"This is træk. Instead of your AI chat scrolling down forever, every message is a node on a canvas. You can branch from anything. Let me show you why that changes everything."

**[0:15 — Opening a conversation]**

*[Screen: paste API key in settings, type first message]*

"First, paste your OpenAI or Anthropic key in Settings. Your key goes directly to the API — træk never sees your messages.

Type your first message. Hit Enter. The response appears as a node connected to yours."

**[0:45 — The branching moment]**

*[Screen: hover over first assistant node, click Branch icon]*

"Here's where it gets interesting. Hover any node. See that branch icon? Click it.

Now type a completely different question — a different angle on the same topic. Hit Enter.

*[Both branches visible on canvas]*

Both conversations exist simultaneously. Neither is gone. You can zoom out and see the whole shape of your thinking session at once."

**[1:30 — Why this matters]**

*[Screen: zoom out to show tree structure]*

"In normal chat, every time you wanted to explore a different angle, you had to choose: follow this thread, or lose it and try the other one. You couldn't hold both open.

Here you can. The canvas is the memory."

**[2:00 — Navigating the canvas]**

*[Screen: pan, zoom, minimap]*

"Pan with two fingers or click-drag. Zoom with pinch or scroll wheel. The minimap in the corner shows your whole session — click anywhere on it to jump there."

**[2:30 — Continuing any thread]**

*[Screen: click on a leaf node, type follow-up]*

"Click any node to make it active — a blue ring appears. Type your next message and it continues from that exact point.

You're not limited to the latest message. You can go back to any node in your session and branch from there."

**[3:00 — The workflow shift]**

*[Screen: complex branching tree]*

"The workflow change is this: instead of picking one direction and hoping it works out, you try three directions simultaneously. You see which thread leads somewhere interesting. You pull on that one harder.

Research sessions that used to feel like one long chat now look like a real map of your thinking."

**[3:45 — Pricing]**

"træk Playground is free for 5 conversations. Pro is $12/month for unlimited conversations, cloud sync, and export. Bring your own API key either way."

**[4:15 — CTA]**

"Sign up at app.gettraek.com. The canvas is waiting."

---

## Video 2: Building with the træk Library

**Runtime:** ~12 min
**Audience:** Svelte developers
**Goal:** Install @traek/svelte, embed TraekCanvas, wire up a streaming API endpoint

### Script

**[0:00 — What we're building]**

*[Screen: final demo — a running canvas app]*

"I'm going to show you how to embed a full spatial AI conversation canvas in your Svelte app in about 50 lines of code. This is the @traek/svelte library."

**[0:20 — Install]**

*[Screen: terminal]*

```bash
npm install @traek/svelte @traek/core
```

"Two packages. @traek/core is the engine — pure framework-agnostic state. @traek/svelte wraps it in Svelte 5 components."

**[0:35 — The engine]**

*[Screen: code editor, new file TraekDemo.svelte]*

```svelte
<script lang="ts">
  import { TraekEngine, TraekCanvas } from '@traek/svelte'

  const engine = new TraekEngine()
</script>
```

"TraekEngine is a Svelte 5 class. It manages nodes, parent-child relationships, spatial coordinates, and all the tree operations. Create one instance."

**[1:00 — Rendering the canvas]**

```svelte
<TraekCanvas
  {engine}
  onSendMessage={handleSend}
/>
```

"TraekCanvas takes the engine and a send callback. Everything else — pan, zoom, node rendering, branching UI — is handled for you."

**[1:20 — Wiring up the API]**

*[Screen: scrolling to handleSend function]*

```typescript
async function handleSend(input: string, userNode: MessageNode) {
  // Walk up the tree to build conversation history for this branch
  const path: MessageNode[] = []
  let current: MessageNode | undefined = userNode
  while (current) {
    path.unshift(current)
    const pid = current.parentIds[0]
    current = pid
      ? engine.nodes.find(n => n.id === pid) as MessageNode
      : undefined
  }

  const messages = path.map(n => ({ role: n.role, content: n.content ?? '' }))

  // Create streaming response node
  const responseNode = engine.addNode('', 'assistant', { parentIds: [userNode.id] })
  engine.updateNode(responseNode.id, { status: 'streaming' })

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  })

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let content = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    content += decoder.decode(value, { stream: true })
    engine.updateNode(responseNode.id, { content })
  }

  engine.updateNode(responseNode.id, { status: 'done' })
}
```

**[2:30 — The tree walk explained]**

"The tree walk is the key. When a user sends a message, we walk up the parent chain from that node to the root. That gives us the conversation history for exactly this branch — not the whole canvas, just this thread.

Each branch has its own context. That's what makes the branching semantically meaningful."

**[3:30 — The streaming pattern]**

"We create the response node immediately with empty content, set status to 'streaming', then update it incrementally as chunks arrive. TraekCanvas renders the streaming state with a blinking cursor."

**[4:00 — SvelteKit API endpoint]**

*[Screen: routes/api/chat/+server.ts]*

```typescript
import { OpenAI } from 'openai'
import type { RequestHandler } from './$types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const POST: RequestHandler = async ({ request }) => {
  const { messages } = await request.json()

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    stream: true
  })

  const encoder = new TextEncoder()

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) controller.enqueue(encoder.encode(text))
        }
        controller.close()
      }
    }),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  )
}
```

**[5:30 — Customising node rendering]**

```svelte
<TraekCanvas
  {engine}
  {onSendMessage}
  componentMap={{
    user: MyUserNode,
    assistant: MyAssistantNode
  }}
/>
```

"Each custom component receives the node as a prop. Full control over rendering."

**[6:30 — Theming]**

```css
:root {
  --traek-bg: #ffffff;
  --traek-node-bg: #f8f9fa;
  --traek-accent: #6366f1;
  --traek-text: #111827;
}
```

"All visual properties are CSS custom properties with the `--traek-*` prefix."

**[7:30 — Engine operations reference]**

```typescript
engine.addNode(content, role, { parentIds: [parentId] })
engine.updateNode(id, { content, status })
engine.branchFrom(nodeId)
engine.focusOnNode(id)    // pan/zoom to this node
engine.moveNode(id, { x, y })
```

"All state is Svelte 5 reactive. Any component reading from the engine re-renders automatically."

**[9:00 — Real-time collab teaser]**

"For real-time collaboration — multiple cursors, presence, synced canvas — @traek/collab adds that in ~10 more lines. Video 3 covers that."

**[10:00 — Recap and CTA]**

"Install two packages. Create an engine. Render TraekCanvas. Wire up your streaming endpoint. The tree walk handles branch context automatically.

npm install @traek/svelte. Docs at gettraek.com."

---

## Video 3: Real-Time Collaboration with @traek/collab

**Runtime:** ~8 min
**Audience:** Svelte developers building multi-user apps
**Goal:** Add collab cursors, presence, and CRDT sync to a TraekCanvas

### Script

**[0:00 — Demo]**

*[Screen: two browser windows side by side, cursors moving]*

"Two users. Same canvas. Cursors visible, presence in the corner, changes sync in real time. This is @traek/collab."

**[0:20 — Architecture]**

"@traek/collab is built on Yjs — a battle-tested CRDT library. Canvas nodes live in a Y.Map. Changes sync over WebSocket with y-websocket. Cursors and presence go through Yjs Awareness."

**[0:45 — Install and run the server]**

```bash
npm install @traek/svelte @traek/collab
npx y-websocket   # starts WebSocket server on :1234
```

**[1:15 — The useCollab hook]**

```svelte
<script lang="ts">
  import { TraekEngine, TraekCanvas, useCollab,
           CollabCursorsOverlay, CollabPresenceBubbles,
           CollabStatusIndicator } from '@traek/svelte'
  import { assignColor } from '@traek/collab'

  let { engine, collabConfig } = $props()

  // Call at component init — not inside an event handler
  const collab = useCollab(engine, collabConfig)

  let canvasScale = $state(1)
  let canvasOffset = $state({ x: 0, y: 0 })
</script>
```

"Important: call useCollab at component init. Svelte 5 requires effects to be created at init time — not inside event handlers."

**[2:00 — Config]**

```typescript
const collabConfig = {
  serverUrl: 'ws://localhost:1234',
  roomId: 'my-room',
  user: {
    id: userId,
    name: 'Alice',
    color: assignColor(userId)  // deterministic color from user ID
  }
}
```

**[2:30 — UI components]**

```svelte
<div class="session-root">
  <div class="hud">
    <CollabStatusIndicator provider={collab.provider} />
    {#if collab.peers.size > 0}
      <CollabPresenceBubbles
        provider={collab.provider}
        onPeerClick={(peer) => {
          if (peer.activeNodeId) engine.focusOnNode(peer.activeNodeId)
        }}
      />
    {/if}
  </div>

  <TraekCanvas
    {engine}
    onSendMessage={handleSend}
    onViewportChange={(vp) => {
      canvasScale = vp.scale
      canvasOffset = vp.offset
    }}
  />

  <CollabCursorsOverlay
    provider={collab.provider}
    scale={canvasScale}
    offset={canvasOffset}
  />
</div>
```

"Three components: CollabStatusIndicator for connection state. CollabPresenceBubbles for peer avatars. CollabCursorsOverlay for remote cursors on the canvas."

**[3:30 — Cursor sync]**

"On pointermove in canvas space:

```typescript
collab.updateCursor({ x, y })
```

The overlay converts canvas coords to screen coords using scale and offset from onViewportChange."

**[4:45 — Reconnect and disconnect]**

```typescript
collab.reconnect()
collab.disconnect()
```

"Auto-reconnect with exponential backoff is built in. Manual reconnect is useful after device sleep."

**[5:30 — Conditional mounting pattern]**

```svelte
<!-- Parent page -->
{#if session}
  <CollabSession engine={session.engine} collabConfig={session.config} />
{/if}
```

"If collab is optional — a join/leave flow — isolate it in a sub-component. When it unmounts, the cleanup effect destroys the provider and closes the WebSocket cleanly."

**[6:30 — Reactive state]**

```svelte
<p>Status: {collab.status}</p>
<p>Peers: {collab.peers.size}</p>
```

"collab.status and collab.peers are Svelte 5 $state. Read them anywhere — they update automatically."

**[7:00 — Production checklist]**

- Deploy y-websocket behind a reverse proxy with TLS (wss://)
- Use Redis-backed y-websocket for persistence across restarts
- Validate room IDs server-side (don't trust client-provided room names)
- Yjs has persistence adapters for MongoDB, Postgres, Redis

**[7:30 — CTA]**

"npm install @traek/collab. Live demo at app.gettraek.com/collab — open it in two windows."
