<script lang="ts">
	import type { ViewportManager } from './ViewportManager.svelte';
	import type { Node } from '../TraekEngine.svelte';
	import type { TraekEngineConfig } from '../TraekEngine.svelte';

	let {
		viewport,
		nodes,
		config
	}: {
		viewport: ViewportManager;
		nodes: Node[];
		config: TraekEngineConfig;
	} = $props();

	let isExpanded = $state(false);
	let isDragging = $state(false);

	const WIDTH = 150;
	const HEIGHT = 100;
	const PADDING = 10;

	// Calculate bounds
	const bounds = $derived.by(() => {
		const laidOut = nodes.filter((n) => n.type !== 'thought');
		if (laidOut.length === 0) return null;

		const step = config.gridStep;
		const defaultH = config.nodeHeightDefault;

		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;

		for (const node of laidOut) {
			const xPx = (node.metadata?.x ?? 0) * step;
			const yPx = (node.metadata?.y ?? 0) * step;
			const nodeH = node.metadata?.height ?? defaultH;
			minX = Math.min(minX, xPx);
			maxX = Math.max(maxX, xPx + config.nodeWidth);
			minY = Math.min(minY, yPx);
			maxY = Math.max(maxY, yPx + nodeH);
		}

		const contentW = maxX - minX;
		const contentH = maxY - minY;
		const scale = Math.min((WIDTH - PADDING * 2) / contentW, (HEIGHT - PADDING * 2) / contentH);

		return {
			minX,
			minY,
			contentW,
			contentH,
			scale
		};
	});

	function handleClick(e: MouseEvent) {
		if (!bounds || !viewport.viewportEl) return;

		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const x = e.clientX - rect.left - PADDING;
		const y = e.clientY - rect.top - PADDING;

		// Convert minimap coords to canvas coords
		const canvasX = bounds.minX + x / bounds.scale;
		const canvasY = bounds.minY + y / bounds.scale;

		// Center viewport on this point
		const w = viewport.viewportEl.clientWidth;
		const h = viewport.viewportEl.clientHeight;
		viewport.offset.x = w / 2 - canvasX * viewport.scale;
		viewport.offset.y = h / 2 - canvasY * viewport.scale;
		viewport.clampOffset(nodes);
		viewport.scheduleViewportChange();
	}

	function handleMouseDown(e: MouseEvent) {
		isDragging = true;
		handleClick(e);
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging) return;
		handleClick(e);
	}

	function handleMouseUp() {
		isDragging = false;
	}
</script>

<svelte:window onmouseup={handleMouseUp} onmousemove={handleMouseMove} />

<div class="minimap-container">
	{#if isExpanded && bounds}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<svg
			class="minimap"
			width={WIDTH}
			height={HEIGHT}
			viewBox="0 0 {WIDTH} {HEIGHT}"
			onmousedown={handleMouseDown}
			onclick={handleClick}
			role="img"
			aria-label="Minimap overview"
		>
			<rect class="minimap-bg" x="0" y="0" width={WIDTH} height={HEIGHT} rx="8" />

			<g transform="translate({PADDING}, {PADDING})">
				{#each nodes.filter((n) => n.type !== 'thought') as node (node.id)}
					{@const xPx = (node.metadata?.x ?? 0) * config.gridStep}
					{@const yPx = (node.metadata?.y ?? 0) * config.gridStep}
					{@const nodeH = node.metadata?.height ?? config.nodeHeightDefault}
					{@const x = (xPx - bounds.minX) * bounds.scale}
					{@const y = (yPx - bounds.minY) * bounds.scale}
					{@const w = config.nodeWidth * bounds.scale}
					{@const h = nodeH * bounds.scale}
					<rect
						{x}
						{y}
						width={w}
						height={h}
						rx="1"
						class="minimap-node"
						class:user={node.role === 'user'}
						class:assistant={node.role === 'assistant'}
						class:system={node.role === 'system'}
					/>
				{/each}

				{#if viewport.viewportEl}
					{@const vw = viewport.viewportEl.clientWidth}
					{@const vh = viewport.viewportEl.clientHeight}
					{@const viewportX = (-viewport.offset.x / viewport.scale - bounds.minX) * bounds.scale}
					{@const viewportY = (-viewport.offset.y / viewport.scale - bounds.minY) * bounds.scale}
					{@const viewportW = (vw / viewport.scale) * bounds.scale}
					{@const viewportH = (vh / viewport.scale) * bounds.scale}
					<rect
						class="viewport-indicator"
						x={viewportX}
						y={viewportY}
						width={viewportW}
						height={viewportH}
						rx="2"
					/>
				{/if}
			</g>
		</svg>
	{/if}

	<button
		class="minimap-toggle"
		onclick={() => (isExpanded = !isExpanded)}
		title={isExpanded ? 'Collapse minimap' : 'Expand minimap'}
		aria-label={isExpanded ? 'Collapse minimap' : 'Expand minimap'}
		onkeydown={(e) => e.key === 'Enter' && (isExpanded = !isExpanded)}
	>
		<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
			{#if isExpanded}
				<path d="M3 6L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
			{:else}
				<path d="M6 3L6 9M3 6L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
			{/if}
		</svg>
	</button>
</div>

<style>
	.minimap-container {
		position: absolute;
		bottom: 20px;
		left: 20px;
		z-index: 50;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.minimap {
		border: 1px solid var(--traek-node-border, #2a2a2a);
		cursor: crosshair;
		user-select: none;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.minimap-bg {
		fill: var(--traek-node-bg, #161616);
		opacity: 0.9;
	}

	.minimap-node {
		stroke: none;
		opacity: 0.8;
	}

	.minimap-node.user {
		fill: var(--traek-node-user-border-top, #00d8ff);
	}

	.minimap-node.assistant {
		fill: var(--traek-node-assistant-border-top, #ff3e00);
	}

	.minimap-node.system {
		fill: var(--traek-node-border, #2a2a2a);
	}

	.viewport-indicator {
		fill: none;
		stroke: var(--traek-node-active-border, #00d8ff);
		stroke-width: 1.5;
		opacity: 0.7;
	}

	.minimap-toggle {
		width: 32px;
		height: 32px;
		border-radius: 6px;
		border: 1px solid var(--traek-node-border, #2a2a2a);
		background: var(--traek-node-bg, #161616);
		color: var(--traek-node-text, #dddddd);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.minimap-toggle:hover {
		background: var(--traek-input-button-bg, #00d8ff);
		color: var(--traek-input-button-text, #000000);
		border-color: var(--traek-input-button-bg, #00d8ff);
	}

	.minimap-toggle:focus-visible {
		outline: 2px solid var(--traek-input-button-bg, #00d8ff);
		outline-offset: 2px;
	}
</style>
