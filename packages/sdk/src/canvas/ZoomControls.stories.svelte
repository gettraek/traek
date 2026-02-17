<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ZoomControls from './ZoomControls.svelte';
	import { ViewportManager } from './ViewportManager.svelte';
	import { TraekEngine, DEFAULT_TRACK_ENGINE_CONFIG } from '../TraekEngine.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/ZoomControls',
		component: ZoomControls,
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
		return viewport;
	}

	function createMockEngine() {
		const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG);
		engine.addNode('Node 1', 'user');
		engine.addNode('Node 2', 'assistant');
		return engine;
	}
</script>

<Story asChild name="Default">
	{#if typeof window !== 'undefined'}
		{@const viewport = createMockViewport()}
		{@const engine = createMockEngine()}
		<div style="padding: 20px; background: var(--traek-canvas-bg); height: 200px;">
			<ZoomControls {viewport} nodes={engine.nodes} config={DEFAULT_TRACK_ENGINE_CONFIG} />
		</div>
	{/if}
</Story>

<Story asChild name="Zoomed In">
	{#if typeof window !== 'undefined'}
		{@const viewport = createMockViewport()}
		{@const engine = createMockEngine()}
		{@const _r = viewport.scale = 2}
		<div style="padding: 20px; background: var(--traek-canvas-bg); height: 200px;">
			<ZoomControls {viewport} nodes={engine.nodes} config={DEFAULT_TRACK_ENGINE_CONFIG} />
		</div>
	{/if}
</Story>

<Story asChild name="Zoomed Out">
	{#if typeof window !== 'undefined'}
		{@const viewport = createMockViewport()}
		{@const engine = createMockEngine()}
		{@const _r = viewport.scale = 0.5}
		<div style="padding: 20px; background: var(--traek-canvas-bg); height: 200px;">
			<ZoomControls {viewport} nodes={engine.nodes} config={DEFAULT_TRACK_ENGINE_CONFIG} />
		</div>
	{/if}
</Story>
