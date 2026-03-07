# How I Built a Spatial AI Canvas in Svelte 5

**Published:** Day -7 (pre-launch)
**Target:** AI product builders, indie devs, Svelte developers
**Channel:** Blog, Dev.to, Hashnode, r/sveltejs, Hacker News
**CTA:** Star @traek/svelte on GitHub / Join the Playground waitlist
**SEO target keywords:** Svelte 5 runes, spatial UI Svelte, AI canvas Svelte, build AI chat interface, Svelte 5 component library

---

## How I Built a Spatial AI Canvas in Svelte 5

A few months ago I got frustrated enough with chat interfaces to start building an alternative. This is the story of what I built, what Svelte 5 made possible, and what surprised me along the way.

The short version: a canvas where AI conversations are nodes you can pan, zoom, and branch from. The long version is below.

---

### The Problem That Started It

I was doing research with Claude — the kind of research where every answer spawns three more questions. Twenty messages in, I hit something worth exploring further, but I was already three branches past it. The chat had no way to go back and fork from an earlier message without losing everything after it.

I started building the tool I wanted to use.

---

### Why Svelte 5

I've been using Svelte since version 3, but Svelte 5 runes changed how I think about state management in ways that made this project much cleaner than it would have been otherwise.

The core of any spatial canvas is a reactive data structure: nodes with positions, parent-child relationships, and content that updates as AI responses stream in. In Svelte 4, I'd have used stores. In Svelte 5, I used `$state` and `$derived` inside a class — and the result is dramatically simpler.

Here's roughly what the core engine looks like:

```typescript
class TraekEngine {
  nodes = $state<Map<string, MessageNode>>(new Map())
  connections = $state<Map<string, Connection>>(new Map())

  rootId = $state<string | null>(null)
  focusedNodeId = $state<string | null>(null)

  addNode(parentId: string | null, role: 'user' | 'assistant', content = '') {
    const id = crypto.randomUUID()
    const node: MessageNode = {
      id,
      parentId,
      role,
      content: $state(content),
      status: $state('streaming'),
      metadata: {
        x: this.computeX(parentId),
        y: this.computeY(parentId)
      }
    }
    this.nodes.set(id, node)
    if (parentId) this.connections.set(`${parentId}-${id}`, { from: parentId, to: id })
    return node
  }

  branchFrom(nodeId: string) {
    // Creates a new user node as a sibling of nodeId's children
    const parent = this.nodes.get(nodeId)
    return this.addNode(parent?.parentId ?? null, 'user')
  }
}
```

The `$state` rune inside the class means that any Svelte component that reads `engine.nodes` or `engine.focusedNodeId` automatically re-renders when they change. No store subscriptions. No manual `$: derived = ...` declarations spread across components. The engine is the source of truth, and the reactivity follows naturally.

This was my favorite thing about Svelte 5 for this use case: **you can write stateful class methods that are fully reactive without any ceremony.**

---

### The Canvas Component

The main `TraekCanvas` component has a few responsibilities:

1. Pan and zoom (CSS `transform: translate() scale()`)
2. Render nodes at their spatial coordinates
3. Draw SVG connection lines between parent and child nodes
4. Handle keyboard shortcuts and drag events

Pan and zoom is simpler than it sounds if you commit to a single approach. I use CSS transforms on a wrapper div and track `offsetX`, `offsetY`, and `scale` in state:

```svelte
<div
  class="canvas-viewport"
  onwheel={handleWheel}
  onpointerdown={handlePanStart}
  onpointermove={handlePanMove}
  onpointerup={handlePanEnd}
>
  <div
    class="canvas-world"
    style="transform: translate({offsetX}px, {offsetY}px) scale({scale})"
  >
    {#each nodes as node}
      <TraekNodeWrapper {node} {engine} />
    {/each}
    <svg class="connections">
      {#each connections as conn}
        <ConnectionLine {conn} {nodes} />
      {/each}
    </svg>
  </div>
</div>
```

The nodes are positioned with `position: absolute` inside `canvas-world`, so they sit at their `x, y` coordinates in the world space. The viewport transforms handle the rest.

One thing I got wrong initially: I was recalculating all SVG paths on every pointer move during pan. With 50+ nodes, this caused visible jank. The fix was to separate the SVG layer from the pointer event handlers and only recompute paths on node position changes, not on viewport changes.

---

### Streaming AI Responses

Streaming was where Svelte 5 really shone. Each node has a `content` field that starts empty and gets characters appended as the stream arrives. Because it's `$state`, every character update re-renders just the node's text content — not the whole canvas.

```typescript
async function streamResponse(node: MessageNode, stream: AsyncIterable<string>) {
  for await (const chunk of stream) {
    node.content += chunk
  }
  node.status = 'done'
}
```

I was worried about performance at first — fine-grained updates inside a large component tree. But Svelte 5's compiler is smart about this. Individual property mutations don't trigger a full component subtree re-render; they target exactly what changed.

The `TraekNodeWrapper` component wraps each node with a `ResizeObserver` that updates the node's height in the engine whenever content changes. This lets sibling branches auto-position themselves vertically without colliding.

---

### The Layout Algorithm

Positioning nodes automatically is the hardest part of a spatial canvas. I tried a few approaches:

**1. Fixed grid:** Nodes snap to a grid. Simple, but conversations quickly look like org charts and the spatial layout stops feeling natural.

**2. Force-directed:** Physics-based repositioning. Fun to watch, terrible for productivity. Nodes drift when you don't want them to.

**3. Tree layout (what I settled on):** Children are placed to the right of their parent, offset vertically by their height plus padding. Siblings are stacked vertically. The horizontal position is parent.x + parent.width + gap.

```typescript
computeX(parentId: string | null): number {
  if (!parentId) return 0
  const parent = this.nodes.get(parentId)!
  return parent.metadata.x + NODE_WIDTH + H_GAP
}

computeY(parentId: string | null): number {
  if (!parentId) return 0
  const siblings = this.childrenOf(parentId)
  const lastSibling = siblings.at(-1)
  if (!lastSibling) return this.nodes.get(parentId)!.metadata.y
  return lastSibling.metadata.y + lastSibling.metadata.height + V_GAP
}
```

This gives conversations a natural left-to-right, top-to-bottom flow. When you branch from a node, the new branch appears below the existing children of that parent — creating a visual structure that reads like a tree diagram.

The only real downside is that deep conversations can get wide fast. I added a zoom-to-fit heuristic that fires when a new node would go off-screen: it calculates the bounding box of all nodes and tweens the viewport to fit.

---

### What I Learned

**Svelte 5 class-based state is the right pattern for complex engines.** Reactivity that lives in a class, not scattered across stores, is much easier to reason about. The `TraekEngine` class has all the mutation logic in one place. Components just read from it.

**SVG for connections, CSS transforms for pan/zoom.** Don't fight the browser. SVG handles the bezier curves between nodes. CSS transforms handle the viewport. They compose naturally because SVG respects the CSS transform context.

**ResizeObserver is your friend for dynamic content.** I don't know the height of a streaming response until it finishes. ResizeObserver gives me height updates in real time, which lets me reflow the layout as content grows.

**Auto-layout and manual positioning are in tension.** Once I added drag-to-reposition, I had to decide: does dragging a node update its auto-layout position, or override it? I went with override — dragging pins a node to its manual position and opts it out of auto-layout. This felt right. Users who want spatial freedom get it; users who don't can leave auto-layout on.

---

### The Library

I extracted the core engine and components into `@traek/svelte` — an open-source library for anyone who wants to build spatial AI conversation interfaces in Svelte 5.

```bash
npm install @traek/svelte
```

```svelte
<script>
  import { TraekCanvas } from '@traek/svelte'

  async function handleSend({ messages, onChunk, onDone }) {
    // Call your own API here
  }
</script>

<TraekCanvas onSendMessage={handleSend} />
```

That's the whole API. You bring the AI backend; træk brings the canvas.

The library is on GitHub. It's MIT licensed. If you're building something with Svelte 5 and want a spatial conversation UI, use it.

---

### What's Next: Playground

The library is one part of this. The other part is træk Playground — a hosted version that lets anyone use a spatial AI canvas without writing any code.

BYOK (bring your own OpenAI or Anthropic key). Free tier for five conversations. Pro at $12/month for unlimited.

We're opening the waitlist now.

**[Join the waitlist at app.gettraek.com →]**

And if you want to dig into the library first:

**[⭐ @traek/svelte on GitHub →]**

---

*Questions about the implementation? Drop them in the comments. I'm particularly interested in talking to people who've tried to build spatial UIs with Svelte — the layout algorithm section above is still the part I'm most uncertain about, and I'd love to see different approaches.*
