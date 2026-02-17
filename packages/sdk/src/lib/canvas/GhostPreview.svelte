<script lang="ts">
	import type { TraekEngine, TraekEngineConfig } from '../TraekEngine.svelte';
	import { fade } from 'svelte/transition';

	let {
		engine,
		config,
		userInput
	}: {
		engine: TraekEngine;
		config: TraekEngineConfig;
		userInput: string;
	} = $props();

	// Calculate ghost position based on active node
	const ghostPosition = $derived.by(() => {
		if (!userInput.trim() || !engine.activeNodeId) return null;

		const activeNode = engine.getNode(engine.activeNodeId);
		if (!activeNode) return null;

		const step = config.gridStep;
		const nodeWidthGrid = config.nodeWidth / step;
		const gapYGrid = config.layoutGapY / step;
		const defaultH = config.nodeHeightDefault;
		const parentHeightGrid = (activeNode.metadata?.height ?? defaultH) / step;

		const parentX = activeNode.metadata?.x ?? 0;
		const parentY = activeNode.metadata?.y ?? 0;

		// Position: below parent, centered
		const ghostX = parentX + nodeWidthGrid / 2 - nodeWidthGrid / 2;
		const ghostY = parentY + parentHeightGrid + gapYGrid;

		return {
			x: ghostX * step,
			y: ghostY * step
		};
	});
</script>

{#if ghostPosition && userInput.trim()}
	<div
		class="ghost-preview"
		transition:fade={{ duration: 200 }}
		style:left="{ghostPosition.x}px"
		style:top="{ghostPosition.y}px"
		style:width="{config.nodeWidth}px"
	>
		<div class="ghost-role-tag">user</div>
		<div class="ghost-content">
			{userInput}
		</div>
	</div>
{/if}

<style>
	.ghost-preview {
		position: absolute;
		min-height: 100px;
		background: var(--traek-node-bg, #161616);
		border: 1px dashed var(--traek-node-border, #2a2a2a);
		border-radius: 12px;
		padding: 16px;
		color: var(--traek-node-text, #dddddd);
		opacity: 0.5;
		pointer-events: none;
		transition:
			opacity 0.3s ease,
			transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
		animation: ghost-pulse 2s ease-in-out infinite;
	}

	@keyframes ghost-pulse {
		0%,
		100% {
			opacity: 0.4;
		}
		50% {
			opacity: 0.6;
		}
	}

	.ghost-role-tag {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 1px;
		margin-bottom: 8px;
		opacity: 0.5;
		color: var(--traek-thought-tag-cyan, #00d8ff);
	}

	.ghost-content {
		font-size: 13px;
		line-height: 1.45;
		white-space: pre-wrap;
		word-break: break-word;
		opacity: 0.8;
	}

	@media (prefers-reduced-motion: reduce) {
		.ghost-preview {
			animation: none;
			transition: opacity 0.15s;
		}
	}
</style>
