<script lang="ts">
	import type { TraekEngine } from '../TraekEngine.svelte';
	import ThemePicker from '../theme/ThemePicker.svelte';

	let {
		engine
	}: {
		engine: TraekEngine;
	} = $props();
</script>

<!--
	CanvasToolbar – breakpoint-aware top-right chrome.

	Desktop (≥1025px): compact row, 32px icon buttons
	Tablet  (769–1024px): touch-friendly, 44px icon buttons
-->
<div class="canvas-toolbar">
	{#if engine?.canUndo || engine?.canRedo}
		<div class="undo-redo" role="group" aria-label="Undo / Redo">
			<button
				class="toolbar-btn"
				onclick={() => engine?.undo()}
				disabled={!engine?.canUndo}
				title="Undo (⌘Z)"
				aria-label="Undo"
			>
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
					<path
						d="M2 5H8.5C10.43 5 12 6.57 12 8.5S10.43 12 8.5 12H5"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<path
						d="M4 3L2 5L4 7"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
			<button
				class="toolbar-btn"
				onclick={() => engine?.redo()}
				disabled={!engine?.canRedo}
				title="Redo (⌘⇧Z)"
				aria-label="Redo"
			>
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
					<path
						d="M12 5H5.5C3.57 5 2 6.57 2 8.5S3.57 12 5.5 12H9"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<path
						d="M10 3L12 5L10 7"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
		</div>
	{/if}

	<ThemePicker compact={true} />
</div>

<style>
	.canvas-toolbar {
		position: absolute;
		top: 20px;
		right: 20px;
		z-index: 50;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.undo-redo {
		display: flex;
		gap: 4px;
	}

	.toolbar-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: var(--traek-input-bg, rgba(30, 30, 30, 0.9));
		border: 1px solid var(--traek-input-border, #444444);
		border-radius: 6px;
		color: var(--traek-input-context-text, #888888);
		cursor: pointer;
		transition: all 0.15s ease;
		backdrop-filter: blur(8px);
	}

	.toolbar-btn:hover:not(:disabled) {
		color: var(--traek-input-text, #ffffff);
		border-color: var(--traek-node-active-border, #00d8ff);
	}

	.toolbar-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.toolbar-btn:focus-visible {
		outline: 2px solid var(--traek-node-active-border, #00d8ff);
		outline-offset: 2px;
	}

	/* Tablet: larger touch targets (44px), adjusted position */
	@media (max-width: 1024px) and (min-width: 769px) {
		.canvas-toolbar {
			top: 12px;
			right: 12px;
			gap: 8px;
		}

		.toolbar-btn {
			width: 44px;
			height: 44px;
			border-radius: 8px;
		}
	}

	/* Small tablet / large phone in canvas mode */
	@media (max-width: 768px) {
		.canvas-toolbar {
			top: 8px;
			right: 8px;
			gap: 6px;
		}

		.toolbar-btn {
			width: 44px;
			height: 44px;
		}
	}
</style>
