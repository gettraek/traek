# træk Social & Community Copy

Twitter/X threads, Reddit posts, Hacker News Show HN, LinkedIn.

---

## Twitter/X Threads

### Thread 1: The Problem (Pre-launch, Day -14)

**Tweet 1 (hook)**
```
You're 20 messages into a ChatGPT conversation.

You hit something genuinely useful around message 8.

You kept going. It's buried now.

This is not a prompt engineering problem. It's an interface problem. 🧵
```

**Tweet 2**
```
Real thinking doesn't move in a straight line.

You start with a question.
The answer gives you 3 more questions.
You want to follow all of them simultaneously.

Linear chat gives you one scroll position. That's it.
```

**Tweet 3**
```
So everyone builds workarounds:

• Copy interesting replies into Notion
• Open a new chat for each branch
• Paste everything back with "recap what we discussed"
• Scroll up repeatedly trying to find that one message

None of these fix the underlying shape mismatch.
```

**Tweet 4**
```
The shape mismatch: your thinking is a tree. Chat is a list.

Every branch you want to explore requires abandoning the last one.

You end up with 14 chat tabs and no way to see how they connect.
```

**Tweet 5**
```
What if messages were nodes on a canvas?

Branch from anything.
Both paths stay open.
Zoom out and see the whole session.

That's what we built.
```

**Tweet 6 (CTA)**
```
træk is a spatial canvas for AI conversations.

Every message is a node. Branch from any of them. Pan and zoom to navigate.

Waitlist open now → app.gettraek.com

BYOK (OpenAI / Anthropic). Your keys go directly to the API.
```

---

### Thread 2: The Technical Launch (Day 0, for developers)

**Tweet 1 (hook)**
```
We just open-sourced @traek/svelte — a Svelte 5 library for spatial AI conversation UIs.

50 lines of code → a branching, pannable canvas with streaming.

Here's how it works 🧵
```

**Tweet 2**
```
The core idea: messages are nodes at (x, y) coordinates, not scroll positions.

TraekEngine manages the tree.
TraekCanvas renders it with pan/zoom.

```ts
const engine = new TraekEngine()
```
That's your entire state layer.
```

**Tweet 3**
```
When a user sends a message, you walk up the parent chain to build conversation history.

Each branch has its own context. That's what makes branching meaningful — not just visual, but semantically correct.

```ts
let current = userNode
while (current) {
  path.unshift(current)
  current = engine.getNode(current.parentIds[0])
}
```
```

**Tweet 4**
```
Streaming works by creating the response node immediately (empty, status: 'streaming'), then updating it chunk by chunk.

```ts
engine.updateNode(id, { content: accumulated })
```

Svelte 5 runes under the hood — every read is reactive automatically.
```

**Tweet 5**
```
@traek/collab adds real-time multi-user sync.

Built on Yjs (CRDT).
y-websocket for transport.
Awareness for cursors.

```ts
const collab = useCollab(engine, {
  serverUrl: 'wss://collab.example.com',
  roomId: 'my-room',
  user: { id, name, color }
})
```
```

**Tweet 6**
```
Full component set included:
• CollabStatusIndicator — connection state badge
• CollabPresenceBubbles — peer avatars
• CollabCursorsOverlay — remote cursors on canvas

All framework-agnostic core. @traek/svelte is just the first adapter.
```

**Tweet 7 (CTA)**
```
npm install @traek/svelte

Docs: gettraek.com
Playground: app.gettraek.com
GitHub: github.com/traek-dev/traek

Built with Svelte 5, TypeScript, Yjs, Zod.
```

---

### Thread 3: Product Launch — Playground (Day 0, for all audiences)

**Tweet 1 (hook)**
```
Today we're launching træk Playground.

Bring your own OpenAI or Anthropic key. Every conversation is a branching canvas.

app.gettraek.com
```

**Tweet 2**
```
What's different:

Your AI messages are nodes, not scroll positions.
Branch from any of them.
Both paths stay open.

Zoom out. See the whole shape of your thinking.
```

**Tweet 3**
```
Private by design.

Your API key goes directly from your browser to OpenAI or Anthropic.

We don't proxy your messages. We don't store your conversations.

You pay your AI provider. We charge for the canvas app.
```

**Tweet 4**
```
Free tier: 5 conversations, everything local.
Pro ($12/mo): unlimited, cloud sync, export, sharing.

No subscription required to try it.
```

**Tweet 5 (CTA)**
```
app.gettraek.com

If you've ever wanted to hold two threads of AI conversation open at the same time — this is for you.
```

---

## Reddit Posts

### r/sveltejs — Library Announcement

**Title:** Show r/sveltejs: @traek/svelte — a Svelte 5 spatial AI canvas library (branching conversations, streaming, real-time collab)

**Body:**
```
Hey r/sveltejs,

I've been building a Svelte 5 library for spatial AI conversation UIs. The core idea: instead of a scrolling chat list, every message is a node at (x, y) coordinates on a pannable/zoomable canvas. You can branch from any node.

**The library (@traek/svelte)**

```bash
npm install @traek/svelte @traek/core
```

- `TraekEngine` — Svelte 5 state management for the conversation tree. O(1) map-based lookups, reactive via runes.
- `TraekCanvas` — the canvas component with pan/zoom, connection lines, streaming input.
- Full streaming support: create node immediately, update content chunk by chunk.
- Custom node renderers via `componentMap` prop.
- CSS custom properties (`--traek-*`) for theming.

**The collab package (@traek/collab)**

Built on Yjs + y-websocket. CRDT-backed node sync, cursor tracking, presence. `useCollab()` hook returns reactive `status` and `peers` state.

**Why Svelte 5?**

Runes made the reactive engine clean. `$state` on the node map, `$derived` for computed views, `$effect` for collab subscriptions. The streaming pattern (create node → update chunk by chunk) maps naturally to fine-grained reactivity.

**Stack**

- Svelte 5 runes
- TypeScript strict mode
- Zod for schema validation
- Yjs for CRDT collab
- Vitest + Playwright for tests

**Links**

- Repo: github.com/traek-dev/traek
- Docs: gettraek.com/docs
- Live demo: app.gettraek.com

Happy to answer questions about the architecture — especially the Svelte 5 patterns. The `useCollab` hook had some interesting constraints around where $effects can be created.
```

---

### r/LocalLLaMA — BYOK Spatial Canvas

**Title:** Built a BYOK spatial canvas for AI conversations — branch from any message, both paths stay open

**Body:**
```
Wanted to share something I built for heavy AI users.

The problem I kept running into: I'd be 20 messages into a conversation, hit something interesting, and want to explore two different follow-ups simultaneously. Linear chat forces you to pick one. The other path disappears.

**What I built**

træk Playground (app.gettraek.com) — a web app where every AI message is a node on a canvas. You can branch from any node. Both branches stay alive. Zoom out to see the shape of your whole session.

**BYOK**

You paste your OpenAI or Anthropic API key. Messages go from your browser directly to the API — we never see them, never store them. Standard BYOK: you pay your provider, we charge for the app.

**Free tier**

5 conversations, fully local. No account required to try it.

**For researchers / power users**

The workflow change is: instead of picking one direction and hoping, you try 3-4 directions simultaneously. The canvas keeps them all connected to the original question. You can see which threads went somewhere and which hit dead ends.

Feedback welcome, especially from people doing research workflows with LLMs.
```

---

### Hacker News — Show HN

**Title:** Show HN: træk – open-source spatial canvas for AI conversations (Svelte 5, Yjs, BYOK)

**Body:**
```
I built træk — a library and hosted app that puts AI conversation messages on a pannable/zoomable canvas instead of a linear scroll.

The core insight: complex thinking branches. You ask a question, get an answer, want to explore three different follow-ups. Linear chat forces you to pick one and abandon the others.

With a spatial canvas, every message is a node at (x, y). Branch from any node. Both paths stay open. Zoom out to see the structure of your session.

**Open-source library: @traek/svelte**

A Svelte 5 component library. `TraekEngine` manages the tree with O(1) map-based lookups. `TraekCanvas` renders it with pan/zoom and streaming. The streaming pattern: create a node immediately with status 'streaming', update content chunk by chunk, set status 'done'. Svelte 5 runes handle fine-grained reactivity automatically.

**Real-time collab: @traek/collab**

Built on Yjs (CRDT) + y-websocket. Nodes sync via Y.Map. Cursors and presence via Awareness. The `useCollab()` Svelte hook returns reactive status and peers state. Must be called at component init (Svelte 5 constraint on where $effects can be created).

**Hosted product: træk Playground**

BYOK (OpenAI / Anthropic). Your key goes directly from browser to API. We proxy nothing. Free tier: 5 conversations. Pro: $12/month.

**Tech stack:** Svelte 5, SvelteKit, TypeScript, Yjs, y-websocket, Zod, Vitest, Playwright.

Repo: github.com/traek-dev/traek
Live: app.gettraek.com

Happy to answer questions about the Yjs/Svelte 5 integration — there were some non-obvious constraints around effect lifecycles.
```

---

## LinkedIn Post

**For launch day:**

```
Today we're launching træk Playground — a spatial canvas for AI conversations.

The problem with linear chat for serious work: your thinking branches, but the interface doesn't. Every time you want to explore a second direction, you have to abandon the first one.

træk puts every message on a canvas. Branch from anything. Both paths stay alive. Zoom out to see the full structure of your session.

Three things that matter to us:

1. Privacy. Your API key goes directly from your browser to OpenAI or Anthropic. We never see your conversations.

2. Open source. The @traek/svelte library is MIT-licensed. Embed a branching AI canvas in your own Svelte app.

3. Free to start. 5 conversations free. No credit card. See if it changes how you use AI before paying anything.

app.gettraek.com

If you use AI for research, writing, planning, or debugging — we built this for you.
```
