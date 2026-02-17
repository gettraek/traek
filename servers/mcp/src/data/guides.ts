/**
 * Integration guides for Træk.
 * Written for developers integrating traek into their SvelteKit apps.
 */

export interface Guide {
	id: string;
	title: string;
	description: string;
	content: string;
}

export const guides: Record<string, Guide> = {
	'getting-started': {
		id: 'getting-started',
		title: 'Getting Started',
		description: 'Install Træk and render your first canvas in 5 minutes.',
		content: `# Getting Started with Træk

## Install

\`\`\`bash
npm install traek
# or
pnpm add traek
\`\`\`

## Peer dependencies

Træk requires Svelte 5 and SvelteKit. It is designed exclusively for Svelte 5 runes syntax.

## Basic page

Create a SvelteKit route:

\`\`\`svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { TraekCanvas, TraekEngine, type MessageNode } from 'traek'

  const engine = new TraekEngine()

  async function handleSend(input: string, userNode: MessageNode) {
    const node = engine.addNode('Echo: ' + input, 'assistant', {
      parentIds: [userNode.id],
      status: 'done'
    })
  }
<\/script>

<div style="height: 100dvh;">
  <TraekCanvas {engine} onSendMessage={handleSend} />
</div>
\`\`\`

## What you get

- Pannable / zoomable canvas
- Message nodes rendered as markdown
- Branching: users can branch from any node
- Keyboard navigation (arrow keys, Tab, Enter, /)
- Dark theme by default

## Next steps

- Connect a real AI: see the **OpenAI Streaming** guide
- Save conversations: see the **Persistence** guide
- Customize rendering: see the **Custom Nodes** guide
`
	},

	'openai-streaming': {
		id: 'openai-streaming',
		title: 'OpenAI Streaming Integration',
		description: 'Full guide to streaming OpenAI completions with context-aware branching.',
		content: `# OpenAI Streaming with Træk

## Architecture

\`\`\`
User types → TraekCanvas calls onSendMessage → fetch('/api/chat')
→ SvelteKit +server.ts → OpenAI stream → ReadableStream → UI
\`\`\`

## 1. Install OpenAI SDK

\`\`\`bash
npm install openai
\`\`\`

## 2. API route

\`\`\`typescript
// src/routes/api/chat/+server.ts
import { OpenAI } from 'openai'
import type { RequestHandler } from './$types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const POST: RequestHandler = async ({ request }) => {
  const { messages } = await request.json()

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,  // [{ role: 'user' | 'assistant', content: string }]
    stream: true
  })

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) controller.enqueue(new TextEncoder().encode(text))
      }
      controller.close()
    }
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}
\`\`\`

## 3. Environment variable

\`\`\`bash
# .env
OPENAI_API_KEY=sk-...
\`\`\`

## 4. Page with context-aware streaming

The key insight: use \`engine.contextPath()\` to send the full branch path as conversation context.

\`\`\`svelte
<script lang="ts">
  import { TraekEngine, TraekCanvas, type MessageNode } from 'traek'

  const engine = new TraekEngine()

  async function handleSend(input: string, userNode: MessageNode) {
    // Add a streaming placeholder
    const assistantNode = engine.addNode('', 'assistant', {
      parentIds: [userNode.id],
      status: 'streaming'
    })

    // Build conversation from the active branch (primary parent path)
    const messages = engine.contextPath().map((n) => ({
      role: (n as MessageNode).role,
      content: (n as MessageNode).content ?? ''
    }))

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      })

      if (!res.ok) throw new Error(\`HTTP \${res.status}\`)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let content = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        content += decoder.decode(value, { stream: true })
        engine.updateNode(assistantNode.id, { content, status: 'streaming' })
      }

      engine.updateNode(assistantNode.id, { status: 'done' })
    } catch (err) {
      engine.updateNode(assistantNode.id, {
        status: 'error',
        errorMessage: err instanceof Error ? err.message : String(err)
      })
    }
  }
<\/script>

<div style="height: 100dvh;">
  <TraekCanvas {engine} onSendMessage={handleSend} />
</div>
\`\`\`

## Branching behavior

When users branch from any node, \`engine.contextPath()\` follows the primary parent chain from the active node up to the root. This gives the correct linear context for any branch, automatically.

## System prompt

Add a system message as the first item:

\`\`\`typescript
const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  ...engine.contextPath().map(n => ({ role: n.role, content: (n as MessageNode).content }))
]
\`\`\`

Or add it as a node:
\`\`\`typescript
engine.addNode('You are a helpful assistant.', 'system')
\`\`\`
`
	},

	'custom-nodes': {
		id: 'custom-nodes',
		title: 'Building Custom Node Types',
		description:
			'Create custom Svelte components for non-text content like images, charts, or code results.',
		content: `# Custom Node Types

## When to use custom nodes

- Image results from DALL-E or Stable Diffusion
- Rendered charts or data visualizations
- Interactive code execution results
- File attachments
- Structured data cards

## 1. Create the component

Every custom node component receives \`TraekNodeComponentProps\`:

\`\`\`svelte
<!-- src/lib/ImageNode.svelte -->
<script lang="ts">
  import type { TraekNodeComponentProps } from 'traek'

  // REQUIRED: exactly these three props
  let { node, engine, isActive }: TraekNodeComponentProps = $props()

  // Access custom data from node.data
  const src = $derived((node.data as { url: string })?.url ?? '')
  const alt = $derived((node.data as { alt?: string })?.alt ?? 'Image')
<\/script>

<div class="image-node" class:active={isActive}>
  <img {src} {alt} />
  <footer>
    <button onclick={() => engine.deleteNodeAndDescendants(node.id)}>×</button>
  </footer>
</div>

<style>
  .image-node {
    border: 2px solid var(--traek-color-border);
    border-radius: var(--traek-radius-node);
    overflow: hidden;
  }
  .image-node.active { border-color: var(--traek-color-accent); }
  img { width: 100%; display: block; max-height: 400px; object-fit: contain; }
  footer { padding: 8px; display: flex; justify-content: flex-end; }
</style>
\`\`\`

## 2. Register via componentMap

\`\`\`svelte
<script lang="ts">
  import { TraekCanvas, TraekEngine } from 'traek'
  import ImageNode from '$lib/ImageNode.svelte'

  const engine = new TraekEngine()
  const componentMap = { image: ImageNode }
<\/script>

<TraekCanvas {engine} {componentMap} onSendMessage={handleSend} />
\`\`\`

## 3. Add custom nodes

\`\`\`typescript
// addCustomNode(component, props, role, options)
engine.addCustomNode(ImageNode, { url: 'https://...', alt: 'Result' }, 'assistant', {
  type: 'image',           // must match componentMap key
  parentIds: [userNode.id]
})
\`\`\`

## 4. Advanced: NodeTypeRegistry

For toolbar actions and lifecycle hooks, use the registry:

\`\`\`typescript
import { createDefaultRegistry } from 'traek'
import ImageNode from '$lib/ImageNode.svelte'

const registry = createDefaultRegistry()

registry.register({
  type: 'image',
  component: ImageNode,
  actions: [
    {
      id: 'download',
      label: 'Download',
      icon: '⬇',
      handler: ({ node }) => window.open((node.data as any).url, '_blank')
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: '🗑',
      variant: 'destructive',
      handler: ({ node, engine }) => engine.deleteNodeAndDescendants(node.id)
    }
  ]
})
\`\`\`

Then pass to TraekCanvas: \`<TraekCanvas {engine} {registry} />\`

## TypeScript tip

Define a typed interface for your node data:

\`\`\`typescript
interface ImageNodeData {
  url: string
  alt?: string
  width?: number
  height?: number
}

// In your component:
const data = $derived(node.data as ImageNodeData)
\`\`\`
`
	},

	persistence: {
		id: 'persistence',
		title: 'Conversation Persistence',
		description:
			'Auto-save and load conversations using ConversationStore or manual serialization.',
		content: `# Conversation Persistence

Træk provides two persistence options:

## Option 1: ConversationStore (localStorage, batteries included)

\`\`\`svelte
<script lang="ts">
  import {
    TraekEngine, TraekCanvas,
    ConversationStore, ChatList, SaveIndicator,
    type MessageNode
  } from 'traek'

  const engine = new TraekEngine()
  const store = new ConversationStore(engine)

  // Initialize from localStorage
  $effect(() => { store.init() })
<\/script>

<div class="layout">
  <aside>
    <button onclick={() => store.newConversation()}>+ New Chat</button>
    <ChatList {store} />
  </aside>
  <main>
    <SaveIndicator {store} />
    <TraekCanvas
      {engine}
      onSendMessage={handleSend}
      onNodesChanged={() => store.save()}
    />
  </main>
</div>
\`\`\`

## Option 2: Manual serialization (custom backend)

\`\`\`typescript
// Save
const snapshot = engine.serialize('Conversation title')
await db.saveConversation(snapshot)  // your backend

// Load
const snapshot = await db.loadConversation(id)
const engine = TraekEngine.fromSnapshot(snapshot)  // Zod-validated
\`\`\`

## Export to Markdown

\`\`\`typescript
import { snapshotToMarkdown, downloadFile } from 'traek'

const snapshot = engine.serialize()
const markdown = snapshotToMarkdown(snapshot)
downloadFile(markdown, 'conversation.md', 'text/markdown')
\`\`\`

## Snapshot format

\`\`\`typescript
interface ConversationSnapshot {
  version: 1
  createdAt: number
  title?: string
  activeNodeId: string | null
  nodes: SerializedNode[]
}

interface SerializedNode {
  id: string
  parentIds: string[]
  content: string
  role: 'user' | 'assistant' | 'system'
  type: string
  status?: 'streaming' | 'done' | 'error'
  createdAt: number
  metadata: { x: number; y: number; height?: number; tags?: string[] }
  data?: unknown
}
\`\`\`

Validate with Zod: \`conversationSnapshotSchema.parse(raw)\`
`
	},

	theming: {
		id: 'theming',
		title: 'Theming and Styling',
		description: 'Customize the visual appearance using built-in themes or CSS custom properties.',
		content: `# Theming Træk

## Built-in themes

Use ThemeProvider in your root layout:

\`\`\`svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { ThemeProvider } from 'traek'
<\/script>

<ThemeProvider theme="dark">   <!-- or "light" or "highContrast" -->
  <slot />
</ThemeProvider>
\`\`\`

## Custom theme object

\`\`\`typescript
import { createCustomTheme, darkTheme } from 'traek'

const myTheme = createCustomTheme({
  ...darkTheme,
  colors: {
    ...darkTheme.colors,
    accent: '#7c3aed',       // purple
    background: '#080811',
  }
})
\`\`\`

## CSS custom properties

All Træk styles use \`--traek-*\` CSS custom properties. Override them anywhere:

\`\`\`css
:root {
  --traek-color-accent: #f59e0b;      /* amber accent */
  --traek-color-background: #1c1917;  /* warm dark */
  --traek-font-family: 'JetBrains Mono', monospace;
  --traek-radius-node: 4px;           /* square nodes */
}
\`\`\`

## Key tokens

| Token | Default (dark) | Purpose |
|-------|---------------|---------|
| \`--traek-color-background\` | \`#0d0d12\` | Canvas background |
| \`--traek-color-surface\` | \`#16161f\` | Node card surface |
| \`--traek-color-accent\` | \`#6366f1\` | Buttons, focus rings, active states |
| \`--traek-color-text\` | \`#e8e8f0\` | Primary text |
| \`--traek-color-text-muted\` | \`#8888a0\` | Secondary text |
| \`--traek-color-border\` | \`#2a2a3a\` | Node borders, dividers |
| \`--traek-radius-node\` | \`12px\` | Node border radius |
| \`--traek-font-family\` | \`'Space Grotesk', system-ui\` | All UI text |
`
	},

	'sveltekit-setup': {
		id: 'sveltekit-setup',
		title: 'SvelteKit Project Setup',
		description: 'Step-by-step guide to set up a new SvelteKit project with Træk.',
		content: `# SvelteKit + Træk Setup

## 1. Create a SvelteKit project

\`\`\`bash
npx sv create my-traek-app
cd my-traek-app
npm install
\`\`\`

Choose: Svelte 5, TypeScript, no additional plugins needed.

## 2. Install Træk

\`\`\`bash
npm install traek
\`\`\`

## 3. Configure SvelteKit

Make sure your \`svelte.config.js\` uses \`vitePreprocess\`:

\`\`\`javascript
import adapter from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

export default {
  preprocess: vitePreprocess(),
  kit: { adapter: adapter() }
}
\`\`\`

## 4. Root layout with ThemeProvider

\`\`\`svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { ThemeProvider } from 'traek'
  let { children } = $props()
<\/script>

<ThemeProvider theme="dark">
  {@render children()}
</ThemeProvider>

<style>
  :global(body) { margin: 0; height: 100dvh; overflow: hidden; }
</style>
\`\`\`

## 5. Canvas page

\`\`\`svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { TraekEngine, TraekCanvas, type MessageNode } from 'traek'

  const engine = new TraekEngine()

  async function handleSend(input: string, userNode: MessageNode) {
    // Wire to your AI backend here
  }
<\/script>

<div style="height: 100dvh;">
  <TraekCanvas {engine} onSendMessage={handleSend} />
</div>
\`\`\`

## 6. OpenAI API route (optional)

\`\`\`bash
echo "OPENAI_API_KEY=sk-..." > .env
\`\`\`

See the **OpenAI Streaming** guide for the full API route.

## Adapter

For deployment, use \`@sveltejs/adapter-node\`, \`@sveltejs/adapter-vercel\`, or \`@sveltejs/adapter-cloudflare\` — Træk works with all of them.
`
	}
};

export function getGuide(id: string): Guide | null {
	return guides[id] ?? null;
}

export function listGuides(): Array<{ id: string; title: string; description: string }> {
	return Object.values(guides).map(({ id, title, description }) => ({ id, title, description }));
}

export function searchGuides(query: string): Array<{ guide: string; excerpt: string }> {
	const lower = query.toLowerCase();
	const results: Array<{ guide: string; excerpt: string }> = [];

	for (const [id, guide] of Object.entries(guides)) {
		const text = `${guide.title} ${guide.description} ${guide.content}`;
		if (text.toLowerCase().includes(lower)) {
			const idx = text.toLowerCase().indexOf(lower);
			const excerpt = text.slice(Math.max(0, idx - 40), idx + 120).trim();
			results.push({ guide: id, excerpt: `...${excerpt}...` });
		}
	}

	return results;
}
