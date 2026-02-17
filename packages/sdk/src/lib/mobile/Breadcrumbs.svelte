<script lang="ts">
	/**
	 * Item 8: Breadcrumbs Navigation
	 * Zeigt den Pfad vom Root zum aktuellen Node
	 */

	import type { TraekEngine, Node, MessageNode } from '../TraekEngine.svelte';

	let {
		engine,
		currentNodeId,
		onNavigate
	}: {
		engine: TraekEngine;
		currentNodeId: string | null;
		onNavigate: (nodeId: string) => void;
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
	const maxVisibleCrumbs = 3;
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
						aria-label="Zeige vollständigen Pfad"
					>
						...
					</button>
					<span class="separator" aria-hidden="true">›</span>
				{/if}

				{#if !isHidden}
					<button
						class="breadcrumb-item"
						class:active={isLast}
						onclick={() => !isLast && onNavigate(node.id)}
						disabled={isLast}
						aria-current={isLast ? 'page' : undefined}
					>
						<span class="role-icon">{node.role === 'user' ? '👤' : '🤖'}</span>
						<span class="crumb-text">
							{(node as MessageNode).content?.slice(0, 15) ?? 'Nachricht'}
							{(node as MessageNode).content && (node as MessageNode).content.length > 15
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
		padding: 8px 12px;
		background: var(--traek-input-context-bg, rgba(0, 0, 0, 0.4));
		backdrop-filter: blur(8px);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
		gap: 6px;
		padding: 6px 10px;
		min-height: 32px;
		background: transparent;
		border: none;
		border-radius: 8px;
		color: var(--traek-input-context-text, #888888);
		font-size: 13px;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.15s ease;
	}

	.breadcrumb-item:not(:disabled):hover,
	.breadcrumb-item:not(:disabled):focus-visible {
		background: rgba(255, 255, 255, 0.1);
		color: var(--traek-node-text, #dddddd);
	}

	.breadcrumb-item.active {
		color: var(--traek-input-dot, #00d8ff);
		font-weight: 600;
		cursor: default;
	}

	.breadcrumb-item:disabled {
		cursor: default;
	}

	.role-icon {
		flex-shrink: 0;
		font-size: 14px;
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
		min-height: 32px;
		border-radius: 8px;
		transition: all 0.15s ease;
	}

	.expand-button:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.crumb-text {
		max-width: 80px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
