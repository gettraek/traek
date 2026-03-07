# Conference Talk Proposal

## Primary Proposal

**Talk title:** Spatial Interfaces for AI: Building a Branching Canvas with Svelte 5

**Target conferences:**
- Svelte Summit (primary)
- JSConf / ViteConf
- CityJS / React Summit (framework-agnostic version)
- AI Engineer World's Fair

**Duration:** 30 minutes + 5 min Q&A

**Speaker:** [Founder name]

---

### Abstract (public-facing, 150 words)

Linear chat is the wrong interface for complex AI workflows. When your thinking branches — and it always does — a scrolling list forces you to pick one direction and abandon the others. The result: 14 chat tabs with no structure between them.

This talk is about building a better interface: a spatial canvas where every AI message is a node at (x, y), conversations branch instead of scroll, and multiple threads stay open simultaneously.

We'll build this live in Svelte 5. Svelte 5's rune system — $state, $derived, $effect — turns out to be an unusually good fit for canvas UIs: fine-grained reactivity on large node trees, streaming content updates without re-rendering entire subtrees, and real-time collab via Yjs with clean $effect lifecycle management.

You'll leave with a working mental model for spatial UI in Svelte 5, patterns for streaming AI responses, and concrete code for the CRDT collab layer.

---

### Detailed Outline

**[0–5 min] The problem with linear chat**

- Complex thinking is a tree. Chat is a list. The shape mismatch is the bug.
- What users actually do: the notes-app bridge, the new-chat cascade, the mega-context prompt.
- Live demo: træk Playground — showing what a spatial canvas looks like in practice.

**[5–10 min] TraekEngine: reactive state for a node tree**

- The data model: nodes with (x, y, parentIds, content, status, role).
- Why Maps over Arrays: O(1) lookup matters at 100+ nodes.
- Svelte 5 $state on the node map — fine-grained reactivity means only affected nodes re-render.
- `$derived` for computed views: visible nodes, connections, subtrees.

**[10–18 min] TraekCanvas: the rendering layer**

- Pan/zoom with CSS transform matrix — why not SVG, why not WebGL.
- ResizeObserver for auto-height, IntersectionObserver for viewport culling.
- The streaming pattern:
  ```ts
  const node = engine.addNode('', 'assistant', { parentIds: [userNode.id] })
  engine.updateNode(node.id, { status: 'streaming' })
  // ... stream chunks ...
  engine.updateNode(node.id, { content: accumulated })
  engine.updateNode(node.id, { status: 'done' })
  ```
- Each branch walks its own parent chain for context — the branching is semantically correct, not just visual.

**[18–26 min] Real-time collab with Yjs + Svelte 5**

- Why Yjs: CRDT guarantees, battle-tested, ecosystem (y-websocket, persistence adapters).
- Y.Map for node sync. Awareness for cursors and presence.
- The `useCollab()` hook — must be called at component init:
  ```ts
  export function useCollab(engine, config): CollabHandle {
    const provider = $state(new CollabProvider(engine, config))
    let status = $state('connecting')
    let peers = $state(new Map())

    $effect(() => {
      status = provider.status
      peers = new Map(provider.peers)
      const unsubStatus = provider.onStatusChange(s => { status = s })
      const unsubPresence = provider.onPresenceChange(p => { peers = new Map(p) })
      return () => { unsubStatus(); unsubPresence(); provider.destroy() }
    })

    return { get provider() {...}, get status() {...}, get peers() {...} }
  }
  ```
- The Svelte 5 constraint: $effects must be created at component init time, not in event handlers. How the conditional mounting pattern solves this.
- Cursor overlay: canvas-space to screen-space conversion using scale + offset from onViewportChange.

**[26–30 min] What we learned + what's next**

- Svelte 5 runes are a great fit for canvas UIs: fine-grained reactivity, minimal boilerplate, clean effect lifecycles.
- Framework-agnostic core (@traek/core) — the engine is portable. @traek/svelte is just the first adapter.
- Open questions: physics-based layout, node grouping, agent-to-agent collab.

---

### Speaker bio (100 words)

[Founder name] is building træk — an open-source Svelte 5 library for spatial AI conversation UIs. Previously [background]. The @traek/svelte library is MIT-licensed; the hosted product træk Playground is live at app.gettraek.com. They write about AI interface design and Svelte 5 patterns at [blog URL].

---

### Why this talk for Svelte Summit

Svelte 5 is new enough that real-world architectural patterns are still being established. This talk gives the community:

1. A non-trivial Svelte 5 codebase to study — canvas + streaming + CRDT collab.
2. Clear answers to "where do I put $effects?" in a complex component hierarchy.
3. Concrete evidence that Svelte 5 fine-grained reactivity shines for data-heavy UIs.
4. An interesting product context (spatial AI) that demonstrates Svelte 5's reach beyond typical web apps.

---

## Alternative Talk: Shorter Format (15 min lightning)

**Title:** Five Svelte 5 Patterns from Building a Real-Time AI Canvas

**Abstract:**
Building a spatial AI conversation canvas revealed five non-obvious Svelte 5 patterns. This lightning talk covers them concisely: (1) $state on Maps for O(1) reactive lookups, (2) the streaming node update pattern, (3) where $effects must live in a CRDT collab integration, (4) viewport transform state for canvas-space-to-screen-space cursor overlays, (5) the conditional mounting pattern for optional WebSocket providers. Each pattern illustrated with ~10 lines of real code.

---

## Alternative Talk: AI Engineer Focus

**Title:** The Interface Layer for AI: Why Your Chat UI Is the Bug

**Abstract:**
Most AI applications are built with the same UI primitive: a scrolling list of messages. This works for simple Q&A. It fails for complex workflows where the user's thinking branches. This talk examines the gap between how AI reasoning works (branching, parallel hypothesis exploration) and how current UIs expose it (linear scroll). We demonstrate an alternative: spatial, tree-structured conversation UIs. Implementation details covered: streaming with CRDT-backed sync, the tree-walk for branch-aware context building, and the performance considerations for rendering large node trees. Framework-agnostic; examples in Svelte 5.
