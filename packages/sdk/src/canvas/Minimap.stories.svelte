<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Minimap from './Minimap.svelte';
	import { ViewportManager } from './ViewportManager.svelte';
	import { TraekEngine, DEFAULT_TRACK_ENGINE_CONFIG } from '../TraekEngine.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/Minimap',
		component: Minimap,
		tags: ['autodocs'],
		argTypes: {
			viewport: { control: false },
			nodes: { control: false },
			config: { control: false }
		}
	});

	function createMockViewport() {
		const viewport = new ViewportManager(DEFAULT_TRACK_ENGINE_CONFIG);
		viewport.scale = 1;
		viewport.offset = { x: 0, y: 0 };
		return viewport;
	}

	function createSmallEngine() {
		const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG);
		engine.addNode('Node 1', 'user');
		engine.addNode('Node 2', 'assistant');
		engine.addNode('Node 3', 'user');
		return engine;
	}

	function createLargeEngine() {
		const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG);
		engine.addNode('Root', 'user');
		for (let i = 0; i < 3; i++) {
			engine.addNode(`Branch ${i + 1}`, 'assistant');
			for (let j = 0; j < 2; j++) {
				engine.addNode(`Sub ${i + 1}.${j + 1}`, 'user');
			}
		}
		return engine;
	}
</script>

<Story asChild name="Small Tree">
	{#if typeof window !== 'undefined'}
		{@const viewport = createMockViewport()}
		{@const engine = createSmallEngine()}
		<div style="padding: 20px; background: var(--traek-canvas-bg); height: 200px;">
			<Minimap {viewport} nodes={engine.nodes} config={DEFAULT_TRACK_ENGINE_CONFIG} />
		</div>
	{/if}
</Story>

<Story asChild name="Large Tree">
	{#if typeof window !== 'undefined'}
		{@const viewport = createMockViewport()}
		{@const engine = createLargeEngine()}
		<div style="padding: 20px; background: var(--traek-canvas-bg); height: 200px;">
			<Minimap {viewport} nodes={engine.nodes} config={DEFAULT_TRACK_ENGINE_CONFIG} />
		</div>
	{/if}
</Story>

<Story asChild name="Panned View">
	{#if typeof window !== 'undefined'}
		{@const viewport = createMockViewport()}
		{@const engine = createLargeEngine()}
		{@const _r = viewport.offset = { x: -500, y: -300 }}
		<div style="padding: 20px; background: var(--traek-canvas-bg); height: 200px;">
			<Minimap {viewport} nodes={engine.nodes} config={DEFAULT_TRACK_ENGINE_CONFIG} />
		</div>
	{/if}
</Story>
