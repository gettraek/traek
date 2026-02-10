# træk

> **Follow ideas, not threads.**

**træk** is a spatial conversation engine designed to go beyond traditional chat UIs for AI applications.

*træk (/træk/) comes from Danish **træ** (tree) and English **track** (path).*

Most chat interfaces force complex thinking into a linear stream of messages. træk breaks that constraint by turning conversations into **navigable structures** — paths you can branch, explore, and revisit.

Built for AI-native products where reasoning is not linear.

---

## 🚨 The Problem with Chat UIs

Classic chat layouts work well for simple back-and-forth messaging.

They fail when conversations become:

* exploratory
* multi-directional
* iterative
* agent-driven
* reasoning-heavy

Important context gets buried.
Alternative approaches disappear.
Thinking becomes flattened.

**If AI thinking branches — your UI should too.**

---

## ✅ What træk Enables

træk replaces the timeline with a **spatial mental model**:

* 🌿 Branch conversations without losing history
* 🧭 Navigate discussions like a map, not a log
* 🧠 Keep reasoning visible but structured
* 🔁 Revisit earlier paths instantly
* 🔎 Compare alternative outputs side‑by‑side

This is not "chat with nicer bubbles."
It is infrastructure for **non-linear AI interaction**.

---

## 🧬 Core Concept

Conversations in træk form a tree:

```
Message
 └─ Reply
     ├─ Alternative path
     ├─ Deeper exploration
     └─ Agent branch
```

Every message is a node.
Every reply is a possible direction.

You don’t scroll conversations.

**You navigate them.**

---

## ✨ Key Features

* **Branching conversations**
  Explore alternatives without overwriting the past.

* **Spatial layout**
  Parents stay above, replies spread horizontally — structure remains readable as complexity grows.

* **Streaming-first**
  Render token-by-token output in place while keeping the conversation topology intact.

* **Thought nodes**
  Attach reasoning steps without polluting the primary path.

* **Pan & zoom canvas**
  Move through large conversations like a diagram.

* **Markdown support**
  Safe rendering with images, lists, and code blocks.

* **Fully configurable engine**
  Control layout, spacing, zoom behavior, and interaction tuning.

---

## 🧠 Mental Model

træk separates **conversation structure** from **message rendering**.

### TraekEngine

Handles nodes, relationships, layout logic, and state.

### TraekCanvas

Renders the spatial UI and manages interaction.

You control:

* message creation
* streaming
* persistence
* model orchestration

træk keeps everything **navigable and coherent**.

---

## 🚀 Quick Start

Install the package:

```bash
npm install @eweren/traek
```

Create a spatial AI chat:

```svelte
<script lang="ts">
  import {
    TraekCanvas,
    TraekEngine,
    DEFAULT_TRACK_ENGINE_CONFIG,
    type MessageNode
  } from '@eweren/traek';

  const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG);

  function onSendMessage(input: string, _userNode: MessageNode) {
    engine.addNode(input, 'user');

    const assistantNode = engine.addNode('', 'assistant', {
      autofocus: true
    });

    engine.updateNode(assistantNode.id, { status: 'streaming' });

    // stream chunks
    // engine.updateNode(assistantNode.id, { content });

    // when finished
    // engine.updateNode(assistantNode.id, { status: 'done' });
  }
</script>

<TraekCanvas {engine} {onSendMessage} />
```

---

## 🎯 Who træk Is For

træk is ideal if you are building:

* AI chat products
* agent interfaces
* prompt exploration tools
* research assistants
* reasoning-heavy workflows
* multi-path generation UIs

If you only need a simple message list — træk is probably not the right tool.

---

## 🎨 Styling & Theming

træk ships unopinionated about your design system, but you can use CSS variables for basic color theming of the core engine elements without searching for specific classes. All styles and variables are scoped to the `base` layer, so you can easily override them without worrying about specificity issues.

All variables live on `:root` (see `src/app.css` in this repo). The most important ones for the **engine UI** are:

```css
/* Canvas + nodes */
--traek-canvas-bg: #0b0b0b;
--traek-node-bg: #161616;
--traek-node-border: #2a2a2a;
--traek-node-text: #dddddd;
--traek-node-active-border: #00d8ff;
--traek-node-active-glow: rgba(0, 216, 255, 0.15);
--traek-node-user-border-top: #00d8ff;
--traek-node-assistant-border-top: #ff3e00;

--traek-connection-stroke: #333333;
--traek-connection-highlight: #00d8ff;

/* Floating input / context bar */
--traek-input-bg: rgba(30, 30, 30, 0.8);
--traek-input-border: #444444;
--traek-input-shadow: rgba(0, 0, 0, 0.4);
--traek-input-button-bg: #00d8ff;
--traek-input-button-text: #000000;
--traek-input-context-bg: rgba(0, 0, 0, 0.4);
--traek-input-context-text: #888888;
--traek-input-dot: #00d8ff;
--traek-input-dot-muted: #555555;
--traek-stats-text: #555555;

/* Message text / markdown */
--traek-textnode-text: #dddddd;
--traek-textnode-bg: #222222;
--traek-markdown-quote-border: #444444;
--traek-markdown-quote-text: #999999;
--traek-markdown-hr: #333333;
--traek-scroll-hint-bg: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
--traek-scroll-hint-text: #444444;
--traek-scrollbar-thumb: #333333;
--traek-scrollbar-thumb-hover: #444444;
--traek-typing-cursor: #ff3e00;

/* Thought / reasoning panel (MessageNodeWrapper) */
--traek-thought-panel-bg: rgba(22, 22, 22, 0.9);
--traek-thought-panel-border: #333333;
--traek-thought-panel-border-active: #00d8ff;
--traek-thought-panel-glow: rgba(0, 216, 255, 0.15);

--traek-thought-header-bg: rgba(255, 255, 255, 0.03);
--traek-thought-header-border: #222222;
--traek-thought-header-muted: #666666;
--traek-thought-header-accent: #888888;

--traek-thought-tag-cyan: #00d8ff;
--traek-thought-tag-orange: #ff3e00;
--traek-thought-tag-gray: #444444;

--traek-thought-divider: rgba(255, 255, 255, 0.06);
--traek-thought-row-muted-1: #888888;
--traek-thought-row-muted-2: #aaaaaa;
--traek-thought-row-muted-3: #999999;
--traek-thought-row-muted-4: #666666;
--traek-thought-badge-cyan: #00dddd;
--traek-thought-footer-muted: #bbbbbb;
--traek-thought-footer-bg: rgba(0, 0, 0, 0.2);
--traek-thought-footer-border: rgba(255, 255, 255, 0.05);
--traek-thought-toggle-bg: #444444;
--traek-thought-toggle-border: #555555;

/* Global overlays (e.g. initial loading overlay) */
--traek-overlay-gradient-1: rgba(0, 0, 0, 0.7);
--traek-overlay-gradient-2: rgba(0, 0, 0, 0.9);
--traek-overlay-gradient-3: rgba(0, 0, 0, 1);
--traek-overlay-card-bg: rgba(15, 15, 15, 0.9);
--traek-overlay-card-border: rgba(255, 255, 255, 0.08);
--traek-overlay-card-shadow: rgba(0, 0, 0, 0.8);
--traek-overlay-text: #e5e5e5;
--traek-overlay-pill-bg: #00d8ff;
--traek-overlay-pill-shadow: rgba(0, 216, 255, 0.7);
```

You can override any of these in your app’s `:root` (or a scoped container) to align træk with your own design system:

```css
:root {
  --traek-canvas-bg: #050816;
  --traek-node-bg: #0b1020;
  --traek-accent-cyan: #4ade80;
}
```

For a complete list, check `src/app.css` in this repository.

## 📦 Status

træk is under active development and evolving quickly.

Feedback, ideas, and contributions are welcome.

---

## 🌲 Philosophy

> AI conversations are not linear.
> Stop designing them that way.

**træk helps you build interfaces that think the way AI does.**

## License

MIT
