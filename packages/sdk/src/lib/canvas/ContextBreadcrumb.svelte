<script lang="ts">
	/**
	 * Desktop Context-Path Breadcrumb
	 * Zeigt den Pfad vom Root zum aktiven Node oben links auf dem Canvas
	 */

	import type { TraekEngine, Node, MessageNode } from '../TraekEngine.svelte';

	let {
		engine,
		currentNodeId
	}: {
		engine: TraekEngine;
		currentNodeId: string | null;
	} = $props();

	const breadcrumbPath = $derived(() => {
		if (!currentNodeId) return [];
		const path: Node[] = [];
		let node: Node | null | undefined = engine.getNode(currentNodeId);

		while (node) {
			path.unshift(node);
			const parent = engine.getParent(node.id);
			node = parent ?? null;
		}

		return path;
	});

	let isExpanded = $state(false);
	const maxVisibleCrumbs = 4;
</script>

<div class="breadcrumbs" class:expanded={isExpanded}>
	{#if breadcrumbPath().length > 0}
		<div class="breadcrumb-container">
			{#each breadcrumbPath() as node, i (i)}
				{@const isLast = i === breadcrumbPath().length - 1}
				{@const isHidden =
					!isExpanded &&
					breadcrumbPath().length > maxVisibleCrumbs &&
					i < breadcrumbPath().length - maxVisibleCrumbs}

				{#if i > 0 && !isHidden}
					<span class="separator" aria-hidden="true">›</span>
				{/if}

				{#if i === 0 && breadcrumbPath().length > maxVisibleCrumbs && !isExpanded}
					<button
						class="expand-button"
						onclick={() => {
							isExpanded = true;
						}}
						aria-label="Show full path"
					>
						...
					</button>
					<span class="separator" aria-hidden="true">›</span>
				{/if}

				{#if !isHidden}
					<button
						class="breadcrumb-item"
						class:active={isLast}
						class:user-role={node.role === 'user'}
						class:assistant-role={node.role === 'assistant'}
						onclick={() => !isLast && engine.focusOnNode(node.id)}
						disabled={isLast}
						aria-current={isLast ? 'page' : undefined}
					>
						<span
							class="role-dot"
							class:user-dot={node.role === 'user'}
							class:assistant-dot={node.role === 'assistant'}
						></span>
						<span class="crumb-text">
							{(node as MessageNode).content?.slice(0, 20) ?? 'Message'}
							{(node as MessageNode).content && (node as MessageNode).content.length > 20
								? '...'
								: ''}
						</span>
					</button>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.breadcrumbs {
		position: fixed;
		top: 70px;
		left: 20px;
		z-index: 90;
		max-width: calc(100vw - 80px);
		background: var(--traek-input-context-bg, rgba(0, 0, 0, 0.4));
		backdrop-filter: blur(8px);
		border: 1px solid var(--traek-node-border, rgba(255, 255, 255, 0.1));
		border-radius: 12px;
		padding: 8px 12px;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}

	.breadcrumbs::-webkit-scrollbar {
		display: none;
	}

	.breadcrumb-container {
		display: flex;
		align-items: center;
		gap: 6px;
		min-height: 32px;
	}

	.breadcrumb-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		min-height: 44px;
		min-width: 44px;
		background: transparent;
		border: none;
		border-radius: 8px;
		color: var(--traek-input-context-text, #888888);
		font-size: 13px;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.15s ease;
	}

	.breadcrumb-item:not(:disabled):hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--traek-node-text, #dddddd);
	}

	.breadcrumb-item:focus-visible {
		outline: 2px solid var(--traek-input-button-bg, #00d8ff);
		outline-offset: 2px;
	}

	.breadcrumb-item.active {
		color: var(--traek-node-text, #dddddd);
		font-weight: 600;
		cursor: default;
	}

	.breadcrumb-item:disabled {
		cursor: default;
	}

	.role-dot {
		flex-shrink: 0;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--traek-input-dot-muted, #555555);
	}

	.role-dot.assistant-dot {
		background: var(--traek-input-dot, #00d8ff);
	}

	.role-dot.user-dot {
		background: var(--traek-node-user-border-top, #ff3e00);
	}

	.separator {
		color: var(--traek-input-context-text, #888888);
		opacity: 0.5;
		font-size: 12px;
	}

	.expand-button {
		padding: 6px 10px;
		background: transparent;
		border: none;
		color: var(--traek-input-context-text, #888888);
		font-size: 16px;
		cursor: pointer;
		min-height: 44px;
		min-width: 44px;
		border-radius: 8px;
		transition: all 0.15s ease;
	}

	.expand-button:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.expand-button:focus-visible {
		outline: 2px solid var(--traek-input-button-bg, #00d8ff);
		outline-offset: 2px;
	}

	.crumb-text {
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Light mode support */
	:global([data-theme='light']) .breadcrumbs {
		background: var(--traek-input-context-bg, rgba(255, 255, 255, 0.85));
		border-color: var(--traek-node-border, rgba(0, 0, 0, 0.1));
	}

	:global([data-theme='light']) .breadcrumb-item {
		color: var(--traek-input-context-text, #666666);
	}

	:global([data-theme='light']) .breadcrumb-item:not(:disabled):hover {
		background: rgba(0, 0, 0, 0.05);
		color: var(--traek-node-text, #111111);
	}

	:global([data-theme='light']) .breadcrumb-item.active {
		color: var(--traek-node-text, #111111);
	}

	:global([data-theme='light']) .separator,
	:global([data-theme='light']) .expand-button {
		color: var(--traek-input-context-text, #666666);
	}

	:global([data-theme='light']) .expand-button:hover {
		background: rgba(0, 0, 0, 0.05);
	}

	/* Responsive: auf kleinen Viewports kompakter */
	@media (max-width: 768px) {
		.breadcrumbs {
			top: 64px;
			left: 12px;
			max-width: calc(100vw - 48px);
			padding: 6px 10px;
		}

		.breadcrumb-item {
			padding: 4px 8px;
			font-size: 12px;
			gap: 6px;
		}

		.crumb-text {
			max-width: 80px;
		}
	}
</style>
