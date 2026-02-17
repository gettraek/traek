<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import TraekNodeWrapper from './TraekNodeWrapper.svelte';
	import { TraekEngine, DEFAULT_TRACK_ENGINE_CONFIG } from './TraekEngine.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/TraekNodeWrapper',
		component: TraekNodeWrapper,
		tags: ['autodocs'],
		argTypes: {
			node: { control: false },
			isActive: { control: 'boolean' },
			isFocused: { control: 'boolean' },
			engine: { control: false }
		},
		args: {
			isActive: false,
			isFocused: false
		}
	});
</script>

<Story asChild name="Default">
	{#if typeof window !== 'undefined'}
		{@const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG)}
		{@const node = engine.addNode('Default wrapper', 'user')}
		<div style="width: 350px; padding: 20px; background: var(--traek-canvas-bg);">
			<TraekNodeWrapper {node} isActive={false} {engine}>
				<div
					style="padding: 16px; background: var(--traek-node-bg); color: var(--traek-node-text);"
				>
					Node content goes here
				</div>
			</TraekNodeWrapper>
		</div>
	{/if}
</Story>

<Story asChild name="Active">
	{#if typeof window !== 'undefined'}
		{@const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG)}
		{@const node = engine.addNode('Active wrapper', 'user')}
		<div style="width: 350px; padding: 20px; background: var(--traek-canvas-bg);">
			<TraekNodeWrapper {node} isActive={true} {engine}>
				<div
					style="padding: 16px; background: var(--traek-node-bg); color: var(--traek-node-text);"
				>
					This node is active
				</div>
			</TraekNodeWrapper>
		</div>
	{/if}
</Story>

<Story asChild name="Focused">
	{#if typeof window !== 'undefined'}
		{@const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG)}
		{@const node = engine.addNode('Focused wrapper', 'user')}
		<div style="width: 350px; padding: 20px; background: var(--traek-canvas-bg);">
			<TraekNodeWrapper {node} isActive={true} isFocused={true} {engine}>
				<div
					style="padding: 16px; background: var(--traek-node-bg); color: var(--traek-node-text);"
				>
					This node is focused
				</div>
			</TraekNodeWrapper>
		</div>
	{/if}
</Story>

<Story asChild name="Streaming">
	{#if typeof window !== 'undefined'}
		{@const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG)}
		{@const node = engine.addNode('Streaming content...', 'assistant')}
		{@const _r = engine.updateNode(node.id, { status: 'streaming' })}
		<div style="width: 350px; padding: 20px; background: var(--traek-canvas-bg);">
			<TraekNodeWrapper {node} isActive={true} {engine}>
				<div
					style="padding: 16px; background: var(--traek-node-bg); color: var(--traek-node-text);"
				>
					Streaming content...
				</div>
			</TraekNodeWrapper>
		</div>
	{/if}
</Story>

<Story asChild name="Error">
	{#if typeof window !== 'undefined'}
		{@const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG)}
		{@const node = engine.addNode('', 'assistant')}
		{@const _r = engine.updateNode(node.id, {
			status: 'error',
			errorMessage: 'Failed to generate'
		})}
		<div style="width: 350px; padding: 20px; background: var(--traek-canvas-bg);">
			<TraekNodeWrapper
				{node}
				isActive={false}
				{engine}
				onRetry={(id) => console.log('Retry:', id)}
			>
				<div
					style="padding: 16px; background: var(--traek-node-bg); color: var(--traek-node-text);"
				>
					Error content
				</div>
			</TraekNodeWrapper>
		</div>
	{/if}
</Story>

<Story asChild name="User Node">
	{#if typeof window !== 'undefined'}
		{@const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG)}
		{@const node = engine.addNode('User message', 'user')}
		<div style="width: 350px; padding: 20px; background: var(--traek-canvas-bg);">
			<TraekNodeWrapper {node} isActive={false} {engine}>
				<div
					style="padding: 16px; background: var(--traek-node-bg); color: var(--traek-node-text);"
				>
					User message content
				</div>
			</TraekNodeWrapper>
		</div>
	{/if}
</Story>

<Story asChild name="Assistant Node">
	{#if typeof window !== 'undefined'}
		{@const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG)}
		{@const node = engine.addNode('Assistant message', 'assistant')}
		<div style="width: 350px; padding: 20px; background: var(--traek-canvas-bg);">
			<TraekNodeWrapper {node} isActive={false} {engine}>
				<div
					style="padding: 16px; background: var(--traek-node-bg); color: var(--traek-node-text);"
				>
					Assistant message content
				</div>
			</TraekNodeWrapper>
		</div>
	{/if}
</Story>

<Story asChild name="With Ghost Preview">
	{#if typeof window !== 'undefined'}
		{@const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG)}
		{@const node = engine.addNode('Node with children', 'user')}
		{@const _r = engine.addNode('Child node', 'assistant')}
		<div style="width: 350px; padding: 20px; background: var(--traek-canvas-bg);">
			<TraekNodeWrapper {node} isActive={true} {engine}>
				<div
					style="padding: 16px; background: var(--traek-node-bg); color: var(--traek-node-text);"
				>
					Parent node with child
				</div>
			</TraekNodeWrapper>
		</div>
	{/if}
</Story>
