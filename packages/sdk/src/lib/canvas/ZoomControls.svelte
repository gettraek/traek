<script lang="ts">
	import type { ViewportManager } from './ViewportManager.svelte';
	import type { Node } from '../TraekEngine.svelte';
	import type { TraekEngineConfig } from '../TraekEngine.svelte';
	import { getTraekI18n } from '../i18n/index';

	const t = getTraekI18n();

	let {
		viewport,
		nodes,
		config
	}: {
		viewport: ViewportManager;
		nodes: Node[];
		config: TraekEngineConfig;
	} = $props();

	function zoomIn() {
		const newScale = Math.min(viewport.scale * 1.2, config.scaleMax);
		viewport.scale = newScale;
		viewport.clampOffset(nodes);
		viewport.scheduleViewportChange();
	}

	function zoomOut() {
		const newScale = Math.max(viewport.scale / 1.2, config.scaleMin);
		viewport.scale = newScale;
		viewport.clampOffset(nodes);
		viewport.scheduleViewportChange();
	}

	function resetZoom() {
		viewport.scale = 1;
		viewport.clampOffset(nodes);
		viewport.scheduleViewportChange();
	}

	function fitAll() {
		viewport.fitAll(nodes);
	}
</script>

<div class="zoom-controls">
	<button
		onclick={zoomIn}
		title={t.zoom.zoomIn}
		aria-label={t.zoom.zoomIn}
		onkeydown={(e) => e.key === 'Enter' && zoomIn()}
	>
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
			<path d="M8 4V12M4 8H12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
		</svg>
	</button>

	<button
		class="zoom-display"
		onclick={resetZoom}
		title={t.zoom.resetZoom}
		aria-label={t.zoom.resetZoom}
		onkeydown={(e) => e.key === 'Enter' && resetZoom()}
	>
		{Math.round(viewport.scale * 100)}%
	</button>

	<button
		onclick={zoomOut}
		title={t.zoom.zoomOut}
		aria-label={t.zoom.zoomOut}
		onkeydown={(e) => e.key === 'Enter' && zoomOut()}
	>
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
			<path d="M4 8H12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
		</svg>
	</button>

	<div class="separator"></div>

	<button
		onclick={fitAll}
		title={t.zoom.fitAllNodes}
		aria-label={t.zoom.fitAllNodes}
		class="fit-all"
		onkeydown={(e) => e.key === 'Enter' && fitAll()}
	>
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
			<rect
				x="2"
				y="2"
				width="12"
				height="12"
				stroke="currentColor"
				stroke-width="1.5"
				fill="none"
				rx="2"
			/>
			<path
				d="M5 8L8 11L11 5"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</button>
</div>

<style>
	.zoom-controls {
		position: absolute;
		bottom: 20px;
		right: 20px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		z-index: 50;
		border-radius: 8px;
		background: var(--traek-node-bg, #161616);
		border: 1px solid var(--traek-node-border, #2a2a2a);
		padding: 4px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	button {
		width: 36px;
		height: 36px;
		border-radius: 6px;
		border: none;
		background: transparent;
		color: var(--traek-node-text, #dddddd);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
	}

	button:hover {
		background: var(--traek-input-button-bg, #00d8ff);
		color: var(--traek-input-button-text, #000000);
	}

	button:active {
		transform: scale(0.95);
	}

	button:focus-visible {
		outline: 2px solid var(--traek-input-button-bg, #00d8ff);
		outline-offset: 2px;
	}

	.zoom-display {
		font-family: monospace;
		font-size: 11px;
		font-weight: 600;
		padding: 0 4px;
	}

	.separator {
		height: 1px;
		background: var(--traek-node-border, #2a2a2a);
		margin: 2px 0;
	}

	.fit-all {
		margin-top: 2px;
	}
</style>
