/**
 * Runnable code snippets for common Træk integration scenarios.
 * All snippets use Svelte 5 runes syntax and traek imports.
 */

export interface Snippet {
	id: string;
	title: string;
	description: string;
	language: string;
	code: string;
	relatedSnippets?: string[];
}

export const snippets: Record<string, Snippet> = {
	'basic-setup': {
		id: 'basic-setup',
		title: 'Minimal Setup',
		description:
			'The simplest possible Træk integration. Self-contained canvas with no external engine. Good for read-only demos or when you do not need programmatic control.',
		language: 'svelte',
		code: `<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { TraekCanvas } from 'traek'

  async function handleSend(input: string, userNode: import('traek').MessageNode) {
    // userNode has already been added. Add the assistant response:
    console.log('User said:', input, 'from node:', userNode.id)
  }
<\/script>

<div style="height: 100dvh; width: 100%;">
  <TraekCanvas onSendMessage={handleSend} />
</div>`,
		relatedSnippets: ['controlled-engine', 'openai-streaming']
	},

	'controlled-engine': {
		id: 'controlled-engine',
		title: 'Controlled Engine',
		description:
			'Create and manage a TraekEngine externally. Required for programmatic node manipulation, persistence, or reading engine state.',
		language: 'svelte',
		code: `<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { TraekEngine, TraekCanvas, type MessageNode } from 'traek'

  // Engine is Svelte 5 reactive — create it at module level or in a class
  const engine = new TraekEngine()

  async function handleSend(input: string, userNode: MessageNode) {
    const assistantNode = engine.addNode('', 'assistant', {
      parentIds: [userNode.id],
      status: 'streaming'
    })

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      })

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
        errorMessage: String(err)
      })
    }
  }
<\/script>

<div style="height: 100dvh; width: 100%;">
  <TraekCanvas {engine} onSendMessage={handleSend} />
</div>`,
		relatedSnippets: ['openai-streaming', 'persistence']
	},

	'openai-streaming': {
		id: 'openai-streaming',
		title: 'OpenAI Streaming (Server Route + Canvas)',
		description:
			'Full stack: SvelteKit API route that streams OpenAI completions, plus the Svelte page that consumes it with Træk.',
		language: 'typescript',
		code: `// src/routes/api/chat/+server.ts
import { OpenAI } from 'openai'
import type { RequestHandler } from './$types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const POST: RequestHandler = async ({ request }) => {
  const { messages } = await request.json()

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
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
}`,
		relatedSnippets: ['openai-streaming-page', 'controlled-engine']
	},

	'openai-streaming-page': {
		id: 'openai-streaming-page',
		title: 'OpenAI Streaming (Page)',
		description: 'SvelteKit page component that sends context path to the streaming API route.',
		language: 'svelte',
		code: `<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { TraekEngine, TraekCanvas, type MessageNode } from 'traek'

  const engine = new TraekEngine()

  async function handleSend(input: string, userNode: MessageNode) {
    const assistantNode = engine.addNode('', 'assistant', {
      parentIds: [userNode.id],
      status: 'streaming'
    })

    // Build context from the active branch path
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

      if (!res.ok) throw new Error(await res.text())

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

<div style="height: 100dvh; width: 100%;">
  <TraekCanvas {engine} onSendMessage={handleSend} />
</div>`,
		relatedSnippets: ['openai-streaming', 'persistence']
	},

	'custom-node': {
		id: 'custom-node',
		title: 'Custom Node Type',
		description:
			'Create a custom node type with its own Svelte component and register it on TraekCanvas via componentMap. The component must accept node, engine, and isActive props (TraekNodeComponentProps).',
		language: 'svelte',
		code: `<!-- src/lib/ImageNode.svelte -->
<script lang="ts">
  import type { TraekNodeComponentProps } from 'traek'

  // Every custom node gets exactly these three props
  let { node, engine, isActive }: TraekNodeComponentProps = $props()

  const src = $derived((node.data as { url: string })?.url ?? '')
  const alt = $derived((node.data as { alt: string })?.alt ?? 'Image')
<\/script>

<div class="image-node" class:active={isActive}>
  <img {src} {alt} />
  <button onclick={() => engine.deleteNodeAndDescendants(node.id)}>Delete</button>
</div>

<style>
  .image-node { border: 2px solid transparent; border-radius: 8px; overflow: hidden; }
  .image-node.active { border-color: var(--traek-color-accent); }
  img { width: 100%; display: block; }
</style>`,
		relatedSnippets: ['custom-node-usage', 'registry-setup']
	},

	'custom-node-usage': {
		id: 'custom-node-usage',
		title: 'Custom Node — Canvas Usage',
		description:
			'Register a custom node component on TraekCanvas and add custom nodes programmatically.',
		language: 'svelte',
		code: `<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { TraekEngine, TraekCanvas, type MessageNode } from 'traek'
  import ImageNode from '$lib/ImageNode.svelte'

  const engine = new TraekEngine()

  // Map your type string to the component
  const componentMap = { image: ImageNode }

  async function handleSend(input: string, userNode: MessageNode) {
    // Detect a command to add an image node
    if (input.startsWith('/image ')) {
      const url = input.replace('/image ', '')
      engine.addCustomNode(ImageNode, { url, alt: 'Generated image' }, 'assistant', {
        type: 'image',
        parentIds: [userNode.id]
      })
      return
    }

    // Normal text response
    const node = engine.addNode('Response to: ' + input, 'assistant', {
      parentIds: [userNode.id],
      status: 'done'
    })
  }
<\/script>

<div style="height: 100dvh; width: 100%;">
  <TraekCanvas {engine} {componentMap} onSendMessage={handleSend} />
</div>`,
		relatedSnippets: ['custom-node', 'registry-setup']
	},

	'registry-setup': {
		id: 'registry-setup',
		title: 'Node Type Registry (Advanced)',
		description:
			'Use NodeTypeRegistry for custom toolbar actions, context menus, and lifecycle hooks on node types.',
		language: 'svelte',
		code: `<script lang="ts">
  import {
    TraekEngine, TraekCanvas,
    createDefaultRegistry, type NodeTypeDefinition
  } from 'traek'
  import ImageNode from '$lib/ImageNode.svelte'

  const engine = new TraekEngine()
  const registry = createDefaultRegistry()

  const imageDef: NodeTypeDefinition = {
    type: 'image',
    component: ImageNode,
    actions: [
      {
        id: 'download',
        label: 'Download',
        icon: '⬇',
        handler: ({ node }) => {
          const url = (node.data as any)?.url
          if (url) window.open(url, '_blank')
        }
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: '🗑',
        variant: 'destructive',
        handler: ({ node, engine }) => engine.deleteNodeAndDescendants(node.id)
      }
    ]
  }

  registry.register(imageDef)
<\/script>

<div style="height: 100dvh; width: 100%;">
  <TraekCanvas {engine} {registry} onSendMessage={handleSend} />
</div>`,
		relatedSnippets: ['custom-node', 'custom-node-usage']
	},

	persistence: {
		id: 'persistence',
		title: 'Persistence with ConversationStore',
		description:
			'Auto-save conversations to localStorage and show a list of past conversations using ConversationStore.',
		language: 'svelte',
		code: `<!-- src/routes/+page.svelte -->
<script lang="ts">
  import {
    TraekEngine, TraekCanvas, ConversationStore,
    ChatList, SaveIndicator, type MessageNode
  } from 'traek'

  const engine = new TraekEngine()
  const store = new ConversationStore(engine)

  $effect(() => { store.init() })

  async function handleSend(input: string, userNode: MessageNode) {
    const node = engine.addNode('', 'assistant', {
      parentIds: [userNode.id],
      status: 'streaming'
    })
    // ... stream response ...
    engine.updateNode(node.id, { content: 'Response', status: 'done' })
  }
<\/script>

<div class="layout">
  <aside class="sidebar">
    <button onclick={() => store.newConversation()}>New Chat</button>
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

<style>
  .layout { display: flex; height: 100dvh; }
  .sidebar { width: 240px; overflow-y: auto; border-right: 1px solid var(--traek-border); }
  main { flex: 1; position: relative; }
</style>`,
		relatedSnippets: ['controlled-engine', 'serialization']
	},

	serialization: {
		id: 'serialization',
		title: 'Manual Serialization / Snapshot',
		description:
			'Serialize the engine state to JSON for custom persistence (database, file, URL), and restore it.',
		language: 'typescript',
		code: `import { TraekEngine } from 'traek'
import type { ConversationSnapshot } from 'traek'

// Create engine and add some nodes
const engine = new TraekEngine()
engine.addNode('Hello', 'user')
engine.addNode('World', 'assistant', { parentIds: [engine.nodes[0].id] })

// Serialize to JSON-safe snapshot
const snapshot: ConversationSnapshot = engine.serialize('My Conversation')
const json = JSON.stringify(snapshot)

// Save to database, localStorage, file, etc.
localStorage.setItem('conversation', json)

// --- Later: restore ---

const saved = JSON.parse(localStorage.getItem('conversation')!)
const restored = TraekEngine.fromSnapshot(saved) // validates with Zod
// restored.nodes is populated, layout is applied`,
		relatedSnippets: ['persistence']
	},

	theming: {
		id: 'theming',
		title: 'Custom Theme',
		description: 'Apply a built-in theme or create a custom theme with full token control.',
		language: 'svelte',
		code: `<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import {
    ThemeProvider,
    createCustomTheme,
    darkTheme
  } from 'traek'

  const myTheme = createCustomTheme({
    ...darkTheme,
    colors: {
      ...darkTheme.colors,
      background: '#0a0a14',
      accent: '#7c3aed',       // purple accent
      accentForeground: '#fff'
    }
  })

  let { children } = $props()
<\/script>

<ThemeProvider theme={myTheme}>
  {@render children()}
</ThemeProvider>

<!-- Or use a built-in theme name: -->
<!-- <ThemeProvider theme="light"> -->
<!-- <ThemeProvider theme="highContrast"> -->`,
		relatedSnippets: ['css-variables']
	},

	'css-variables': {
		id: 'css-variables',
		title: 'CSS Custom Properties Reference',
		description:
			'All --traek-* CSS custom properties available for manual theming without ThemeProvider.',
		language: 'css',
		code: `/* Apply to :root or any ancestor element */
:root {
  /* Colors */
  --traek-color-background: #0d0d12;
  --traek-color-surface: #16161f;
  --traek-color-surface-elevated: #1e1e2a;
  --traek-color-border: #2a2a3a;
  --traek-color-accent: #6366f1;           /* Primary interactive color */
  --traek-color-accent-foreground: #fff;
  --traek-color-text: #e8e8f0;
  --traek-color-text-muted: #8888a0;
  --traek-color-user-node: #1a1a2e;        /* User message bubble */
  --traek-color-assistant-node: #0f1629;   /* Assistant message bubble */
  --traek-color-error: #ef4444;
  --traek-color-success: #22c55e;

  /* Spacing */
  --traek-spacing-node-padding: 16px;
  --traek-spacing-node-gap: 12px;

  /* Border radius */
  --traek-radius-node: 12px;
  --traek-radius-button: 6px;

  /* Typography */
  --traek-font-family: 'Space Grotesk', system-ui, sans-serif;
  --traek-font-size-base: 14px;
  --traek-font-size-sm: 12px;
  --traek-font-size-code: 13px;

  /* Animation */
  --traek-transition-fast: 100ms ease;
  --traek-transition-base: 200ms ease;
}`,
		relatedSnippets: ['theming']
	},

	'slash-commands': {
		id: 'slash-commands',
		title: 'Slash Commands / Actions',
		description: 'Add custom slash-command actions to the input bar that users can trigger with /.',
		language: 'svelte',
		code: `<script lang="ts">
  import { TraekCanvas, type ActionDefinition, type MessageNode } from 'traek'
  import { TraekEngine } from 'traek'

  const engine = new TraekEngine()

  const actions: ActionDefinition[] = [
    {
      id: 'summarize',
      label: 'Summarize',
      icon: '📝',
      description: 'Summarize the conversation so far'
    },
    {
      id: 'translate',
      label: 'Translate',
      icon: '🌍',
      description: 'Translate the response to another language'
    }
  ]

  async function handleSend(
    input: string,
    userNode: MessageNode,
    action?: string | string[]
  ) {
    const assistantNode = engine.addNode('', 'assistant', {
      parentIds: [userNode.id],
      status: 'streaming'
    })

    // action is the id string of the triggered slash command
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: input, action })
    })
    // ... stream response ...
  }
<\/script>

<div style="height: 100dvh;">
  <TraekCanvas {engine} {actions} onSendMessage={handleSend} />
</div>`,
		relatedSnippets: ['controlled-engine']
	},

	'sveltekit-layout': {
		id: 'sveltekit-layout',
		title: 'SvelteKit Layout Setup',
		description: 'Root layout file with ThemeProvider and global styles for a Træk app.',
		language: 'svelte',
		code: `<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { ThemeProvider } from 'traek'
  import 'traek/styles' // if style exports are available; otherwise import your own

  let { children } = $props()
<\/script>

<ThemeProvider theme="dark">
  {@render children()}
</ThemeProvider>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  :global(body) {
    background: var(--traek-color-background);
    color: var(--traek-color-text);
    font-family: var(--traek-font-family);
    height: 100dvh;
    overflow: hidden;
  }
</style>`,
		relatedSnippets: ['theming', 'basic-setup']
	}
};

export function getSnippet(id: string): Snippet | null {
	return snippets[id] ?? null;
}

export function listSnippets(): Array<{ id: string; title: string; description: string }> {
	return Object.values(snippets).map(({ id, title, description }) => ({ id, title, description }));
}
