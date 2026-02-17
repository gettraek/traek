<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import TextNode from './TextNode.svelte';
	import { TraekEngine, DEFAULT_TRACK_ENGINE_CONFIG } from './TraekEngine.svelte';

	const { Story } = defineMeta({
		title: 'Atoms/TextNode',
		component: TextNode,
		tags: ['autodocs'],
		argTypes: {
			node: { control: false },
			isActive: { control: 'boolean' },
			engine: { control: false }
		},
		args: {
			isActive: false
		}
	});

	const MARKDOWN_CONTENT = `## Hello World

This is a **TextNode** with markdown support.

- List item 1
- List item 2
- List item 3

> This is a blockquote with some important information.

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

Regular text with [a link](https://example.com).`;

	const CODE_CONTENT = `\`\`\`typescript
interface User {
  id: string;
  name: string;
  email: string;
}

function createUser(data: Partial<User>): User {
  return {
    id: crypto.randomUUID(),
    name: data.name ?? 'Anonymous',
    email: data.email ?? 'user@example.com'
  };
}
\`\`\``;

	const IMAGE_CONTENT = `# Image Test

![Sample Image](https://picsum.photos/seed/textnode/400/200)

Regular text after the image.`;

	const STREAMING_CONTENT = `This is a streaming message that appears character by character...`;
</script>

<Story asChild name="Default">
	{#if typeof window !== 'undefined'}
		{@const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG)}
		{@const node = engine.addNode('Simple text message', 'user')}
		<div style="width: 350px; padding: 20px; background: var(--traek-canvas-bg);">
			<TextNode {node} isActive={false} {engine} />
		</div>
	{/if}
</Story>

<Story asChild name="Markdown">
	{#if typeof window !== 'undefined'}
		{@const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG)}
		{@const node = engine.addNode(MARKDOWN_CONTENT, 'assistant')}
		<div style="width: 350px; padding: 20px; background: var(--traek-canvas-bg);">
			<TextNode {node} isActive={false} {engine} />
		</div>
	{/if}
</Story>

<Story asChild name="Code">
	{#if typeof window !== 'undefined'}
		{@const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG)}
		{@const node = engine.addNode(CODE_CONTENT, 'assistant')}
		<div style="width: 350px; padding: 20px; background: var(--traek-canvas-bg);">
			<TextNode {node} isActive={false} {engine} />
		</div>
	{/if}
</Story>

<Story asChild name="With Image">
	{#if typeof window !== 'undefined'}
		{@const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG)}
		{@const node = engine.addNode(IMAGE_CONTENT, 'assistant')}
		<div style="width: 350px; padding: 20px; background: var(--traek-canvas-bg);">
			<TextNode {node} isActive={false} {engine} />
		</div>
	{/if}
</Story>

<Story asChild name="Streaming">
	{#if typeof window !== 'undefined'}
		{@const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG)}
		{@const node = engine.addNode(STREAMING_CONTENT, 'assistant')}
		{@const _r = engine.updateNode(node.id, { status: 'streaming' })}
		<div style="width: 350px; padding: 20px; background: var(--traek-canvas-bg);">
			<TextNode {node} isActive={false} {engine} />
		</div>
	{/if}
</Story>

<Story asChild name="Error">
	{#if typeof window !== 'undefined'}
		{@const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG)}
		{@const node = engine.addNode('', 'assistant')}
		{@const _r = engine.updateNode(node.id, {
			status: 'error',
			errorMessage: 'Failed to generate response'
		})}
		<div style="width: 350px; padding: 20px; background: var(--traek-canvas-bg);">
			<TextNode {node} isActive={false} {engine} />
		</div>
	{/if}
</Story>

<Story asChild name="Active">
	{#if typeof window !== 'undefined'}
		{@const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG)}
		{@const node = engine.addNode('This is an active node', 'user')}
		<div style="width: 350px; padding: 20px; background: var(--traek-canvas-bg);">
			<TextNode {node} isActive={true} {engine} />
		</div>
	{/if}
</Story>

<Story asChild name="Long Content">
	{#if typeof window !== 'undefined'}
		{@const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG)}
		{@const longText = Array(20).fill('This is a line of text. ').join('\n')}
		{@const node = engine.addNode(longText, 'assistant')}
		<div style="width: 350px; padding: 20px; background: var(--traek-canvas-bg);">
			<TextNode {node} isActive={false} {engine} />
		</div>
	{/if}
</Story>
