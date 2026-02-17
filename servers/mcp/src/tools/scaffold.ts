import { z } from 'zod/v3';
import { getSnippet, listSnippets } from '../data/snippets';

/** Generate a complete SvelteKit page scaffold based on the requested features. */
function generateScaffold(options: {
	streaming: boolean;
	persistence: boolean;
	customNode: boolean;
	theme: 'dark' | 'light' | 'none';
}): string {
	const imports: string[] = [`import { TraekEngine, TraekCanvas, type MessageNode } from 'traek'`];
	const extras: string[] = [];
	const instanceCode: string[] = ['const engine = new TraekEngine()'];
	const sendMessageLines: string[] = [];
	const templateParts: string[] = [];

	if (options.persistence) {
		imports.push(`import { ConversationStore, ChatList, SaveIndicator } from 'traek'`);
		instanceCode.push(`const store = new ConversationStore(engine)`);
		extras.push(`$effect(() => { store.init() })`);
	}

	if (options.customNode) {
		imports.push(`import ImageNode from '$lib/ImageNode.svelte'`);
		instanceCode.push(`const componentMap = { image: ImageNode }`);
	}

	if (options.streaming) {
		sendMessageLines.push(
			`  const assistantNode = engine.addNode('', 'assistant', {`,
			`    parentIds: [userNode.id],`,
			`    status: 'streaming'`,
			`  })`,
			``,
			`  const messages = engine.contextPath().map((n) => ({`,
			`    role: (n as MessageNode).role,`,
			`    content: (n as MessageNode).content ?? ''`,
			`  }))`,
			``,
			`  try {`,
			`    const res = await fetch('/api/chat', {`,
			`      method: 'POST',`,
			`      headers: { 'Content-Type': 'application/json' },`,
			`      body: JSON.stringify({ messages })`,
			`    })`,
			``,
			`    if (!res.ok) throw new Error(\`HTTP \${res.status}\`)`,
			``,
			`    const reader = res.body!.getReader()`,
			`    const decoder = new TextDecoder()`,
			`    let content = ''`,
			``,
			`    for (;;) {`,
			`      const { done, value } = await reader.read()`,
			`      if (done) break`,
			`      content += decoder.decode(value, { stream: true })`,
			`      engine.updateNode(assistantNode.id, { content, status: 'streaming' })`,
			`    }`,
			``,
			`    engine.updateNode(assistantNode.id, { status: 'done' })`,
			`  } catch (err) {`,
			`    engine.updateNode(assistantNode.id, {`,
			`      status: 'error',`,
			`      errorMessage: err instanceof Error ? err.message : String(err)`,
			`    })`,
			`  }`
		);
	} else {
		sendMessageLines.push(
			`  engine.addNode('Response to: ' + input, 'assistant', {`,
			`    parentIds: [userNode.id],`,
			`    status: 'done'`,
			`  })`
		);
	}

	const canvasProps: string[] = ['{engine}', 'onSendMessage={handleSend}'];
	if (options.persistence) {
		canvasProps.push('onNodesChanged={() => store.save()}');
	}
	if (options.customNode) {
		canvasProps.push('{componentMap}');
	}

	const canvasTag = `<TraekCanvas ${canvasProps.join(' ')} />`;

	if (options.persistence) {
		templateParts.push(
			`<div class="layout">`,
			`  <aside class="sidebar">`,
			`    <button onclick={() => store.newConversation()}>+ New Chat</button>`,
			`    <ChatList {store} />`,
			`  </aside>`,
			`  <main>`,
			`    <SaveIndicator {store} />`,
			`    ${canvasTag}`,
			`  </main>`,
			`</div>`
		);
	} else {
		templateParts.push(`<div style="height: 100dvh; width: 100%;">`, `  ${canvasTag}`, `</div>`);
	}

	const styleLines: string[] = [];
	if (options.persistence) {
		styleLines.push(
			`.layout { display: flex; height: 100dvh; }`,
			`.sidebar { width: 240px; overflow-y: auto; border-right: 1px solid var(--traek-color-border); padding: 8px; }`,
			`main { flex: 1; position: relative; }`
		);
	}

	const scriptLines = [
		...imports,
		``,
		...instanceCode,
		...(extras.length > 0 ? ['', ...extras] : []),
		``,
		`async function handleSend(input: string, userNode: MessageNode) {`,
		...sendMessageLines,
		`}`
	];

	const lines = [
		`<script lang="ts">`,
		...scriptLines.map((l) => (l ? `  ${l}` : '')),
		`<\/script>`,
		``,
		...templateParts,
		...(styleLines.length > 0
			? [``, `<style>`, ...styleLines.map((l) => `  ${l}`), `</style>`]
			: [])
	];

	return lines.join('\n');
}

function generateApiRoute(options: { provider: 'openai' | 'none' }): string {
	if (options.provider === 'none') {
		return `// src/routes/api/chat/+server.ts
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request }) => {
  const { messages } = await request.json()

  // TODO: call your AI provider here
  const response = 'Hello from the server!'

  return new Response(response, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}`;
	}

	return `// src/routes/api/chat/+server.ts
import { OpenAI } from 'openai'
import type { RequestHandler } from './$types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const POST: RequestHandler = async ({ request }) => {
  const { messages } = await request.json()

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      ...messages
    ],
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
}`;
}

function generateCustomNodeComponent(): string {
	return `<!-- src/lib/ImageNode.svelte -->
<script lang="ts">
  import type { TraekNodeComponentProps } from 'traek'

  // Every custom node must accept exactly these three props
  let { node, engine, isActive }: TraekNodeComponentProps = $props()

  const data = $derived(node.data as { url?: string; alt?: string })
<\/script>

<div class="image-node" class:active={isActive}>
  {#if data?.url}
    <img src={data.url} alt={data.alt ?? 'Image'} />
  {:else}
    <p>No image URL provided</p>
  {/if}
  <footer>
    <button onclick={() => engine.deleteNodeAndDescendants(node.id)}>Delete</button>
  </footer>
</div>

<style>
  .image-node {
    border: 2px solid var(--traek-color-border);
    border-radius: var(--traek-radius-node);
    overflow: hidden;
    background: var(--traek-color-surface);
  }
  .image-node.active { border-color: var(--traek-color-accent); }
  img { width: 100%; display: block; max-height: 400px; object-fit: contain; }
  footer {
    padding: 8px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  button {
    padding: 4px 10px;
    border: 1px solid var(--traek-color-border);
    border-radius: var(--traek-radius-button);
    background: var(--traek-color-surface-elevated);
    color: var(--traek-color-text);
    cursor: pointer;
    font-size: var(--traek-font-size-sm);
  }
</style>`;
}

export const scaffoldTools = [
	{
		name: 'get_snippet',
		description:
			'Get a complete, runnable code snippet for a specific Træk integration scenario. Returns copy-paste ready code with correct imports.',
		inputSchema: {
			id: z
				.string()
				.describe(
					'Snippet ID. Run list_snippets to see all available IDs. Common ones: basic-setup, controlled-engine, openai-streaming, openai-streaming-page, custom-node, custom-node-usage, persistence, serialization, theming, slash-commands, sveltekit-layout'
				)
		},
		handler: async ({ id }: { id: string }) => {
			const snippet = getSnippet(id);
			if (!snippet) {
				const available = listSnippets()
					.map((s) => s.id)
					.join(', ');
				return {
					content: [
						{
							type: 'text' as const,
							text: `No snippet found for "${id}". Available: ${available}`
						}
					],
					isError: true
				};
			}

			const related =
				snippet.relatedSnippets && snippet.relatedSnippets.length > 0
					? `\n\n---\nRelated snippets: ${snippet.relatedSnippets.join(', ')}`
					: '';

			return {
				content: [
					{
						type: 'text' as const,
						text: `# ${snippet.title}\n\n${snippet.description}\n\n\`\`\`${snippet.language}\n${snippet.code}\n\`\`\`${related}`
					}
				]
			};
		}
	},

	{
		name: 'scaffold_page',
		description:
			'Generate a complete SvelteKit page (and optionally API route and custom node component) with Træk integrated. Returns ready-to-use file contents.',
		inputSchema: {
			streaming: z
				.boolean()
				.default(true)
				.describe('Include streaming AI response support (recommended). Default: true'),
			persistence: z
				.boolean()
				.default(false)
				.describe('Include ConversationStore for localStorage persistence. Default: false'),
			customNode: z
				.boolean()
				.default(false)
				.describe('Include a custom ImageNode component example. Default: false'),
			apiProvider: z
				.enum(['openai', 'none'])
				.default('openai')
				.describe("Generate API route for 'openai' streaming or 'none' (stub). Default: openai"),
			includeApiRoute: z
				.boolean()
				.default(true)
				.describe('Also generate the /api/chat +server.ts file. Default: true')
		},
		handler: async ({
			streaming,
			persistence,
			customNode,
			apiProvider,
			includeApiRoute
		}: {
			streaming: boolean;
			persistence: boolean;
			customNode: boolean;
			apiProvider: 'openai' | 'none';
			includeApiRoute: boolean;
		}) => {
			const files: Array<{ path: string; language: string; content: string }> = [];

			// Main page
			files.push({
				path: 'src/routes/+page.svelte',
				language: 'svelte',
				content: generateScaffold({ streaming, persistence, customNode, theme: 'dark' })
			});

			// API route
			if (includeApiRoute && streaming) {
				files.push({
					path: 'src/routes/api/chat/+server.ts',
					language: 'typescript',
					content: generateApiRoute({ provider: apiProvider })
				});
			}

			// Custom node component
			if (customNode) {
				files.push({
					path: 'src/lib/ImageNode.svelte',
					language: 'svelte',
					content: generateCustomNodeComponent()
				});
			}

			const output = files
				.map((f) => `## \`${f.path}\`\n\n\`\`\`${f.language}\n${f.content}\n\`\`\``)
				.join('\n\n---\n\n');

			const notes: string[] = [];
			if (apiProvider === 'openai' && streaming) {
				notes.push('Add `OPENAI_API_KEY=sk-...` to your `.env` file.');
				notes.push('Run `npm install openai` in your project.');
			}
			if (persistence) {
				notes.push(
					'ConversationStore persists to localStorage under the key `traek-conversations`.'
				);
			}

			const noteSection =
				notes.length > 0 ? `\n\n## Setup notes\n\n${notes.map((n) => `- ${n}`).join('\n')}` : '';

			return {
				content: [
					{
						type: 'text' as const,
						text: `# Scaffolded Træk Integration\n\n${output}${noteSection}`
					}
				]
			};
		}
	}
];
