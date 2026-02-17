<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { NodeTypeAction, ActionVariant } from './node-types/types';
	import type { Node, TraekEngine } from './TraekEngine.svelte';
	import TagDropdown from './tags/TagDropdown.svelte';
	import { getTraekI18n } from './i18n/index';

	const t = getTraekI18n();

	let {
		actions,
		node,
		engine,
		x,
		y,
		nodeWidth
	}: {
		actions: NodeTypeAction[];
		node: Node;
		engine: TraekEngine;
		x: number;
		y: number;
		nodeWidth: number;
	} = $props();

	let expandedActionId = $state<string | null>(null);
	let expandedVariants = $state<ActionVariant[] | null>(null);

	function handleActionClick(e: MouseEvent, action: NodeTypeAction) {
		e.stopPropagation();
		if (action.variants) {
			const result = action.variants(node, engine);
			if (result && result.length > 0) {
				expandedActionId = action.id;
				expandedVariants = result;
				return;
			}
		}
		action.handler(node, engine);
	}

	function handleVariantClick(e: MouseEvent, variant: ActionVariant) {
		e.stopPropagation();
		variant.handler(node, engine);
		expandedActionId = null;
		expandedVariants = null;
	}

	function closeVariants() {
		expandedActionId = null;
		expandedVariants = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && expandedActionId) {
			e.stopPropagation();
			closeVariants();
		}
	}

	/** Check if icon string looks like an iconify identifier (has a colon). */
	function isIconifyIcon(icon: string): boolean {
		return icon.includes(':');
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if expandedActionId}
	<div
		class="traek-toolbar-backdrop"
		role="presentation"
		tabindex="-1"
		onclick={closeVariants}
		onkeydown={(e) => {
			if (e.key === 'Escape') closeVariants();
		}}
	></div>
{/if}

{#if actions.length > 0}
	<div
		class="traek-node-toolbar"
		role="toolbar"
		aria-label={t.toolbar.nodeActions}
		style:left="{x}px"
		style:top="{y}px"
		style:max-width="{nodeWidth}px"
	>
		<!-- Tag Dropdown -->
		<TagDropdown {node} {engine} />

		{#each actions as action (action.id)}
			{#if expandedActionId === action.id && expandedVariants}
				{#each expandedVariants as variant (variant.label)}
					<button
						type="button"
						class="traek-toolbar-badge traek-toolbar-badge--variant"
						title={variant.label}
						onclick={(e) => handleVariantClick(e, variant)}
					>
						<span>{variant.label}</span>
					</button>
				{/each}
			{:else}
				<button
					type="button"
					class="traek-toolbar-badge"
					title={action.label}
					onclick={(e) => handleActionClick(e, action)}
				>
					{#if action.icon}
						<span class="traek-toolbar-badge__icon">
							{#if isIconifyIcon(action.icon)}
								<Icon icon={action.icon} width="14" height="14" />
							{:else}
								{action.icon}
							{/if}
						</span>
					{/if}
					<span>{action.label}</span>
				</button>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.traek-toolbar-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9;
		pointer-events: auto;
	}

	.traek-node-toolbar {
		position: absolute;
		display: flex;
		flex-wrap: nowrap;
		gap: 4px;
		padding: 6px;
		background: var(--traek-toolbar-bg, rgba(30, 30, 30, 0.95));
		backdrop-filter: blur(16px);
		border: 1px solid var(--traek-node-border, #444444);
		border-radius: 16px;
		box-shadow: 0 4px 16px var(--traek-toolbar-shadow, rgba(0, 0, 0, 0.3));
		pointer-events: auto;
		z-index: 10;
		overflow-x: auto;
		overflow-y: hidden;
		scrollbar-width: none;
		width: fit-content;
	}

	.traek-node-toolbar::-webkit-scrollbar {
		display: none;
	}

	.traek-toolbar-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 5px 10px;
		border: 1px solid var(--traek-toolbar-badge-border, rgba(255, 255, 255, 0.08));
		border-radius: 999px;
		background: var(--traek-toolbar-badge-bg, rgba(255, 255, 255, 0.06));
		color: var(--traek-toolbar-text, #cccccc);
		font-size: 12px;
		cursor: pointer;
		white-space: nowrap;
		transition:
			background 0.12s,
			border-color 0.12s;
		flex-shrink: 0;
		line-height: 1.4;
	}

	.traek-toolbar-badge:hover {
		background: var(--traek-toolbar-badge-hover, rgba(255, 255, 255, 0.12));
		border-color: var(--traek-toolbar-badge-border-hover, rgba(255, 255, 255, 0.18));
		color: var(--traek-toolbar-text-hover, #ffffff);
	}

	.traek-toolbar-badge--variant {
		background: var(--traek-toolbar-variant-bg, rgba(255, 140, 0, 0.1));
		border-color: var(--traek-toolbar-variant-border, rgba(255, 140, 0, 0.25));
		color: var(--traek-toolbar-variant-text, #ffb366);
	}

	.traek-toolbar-badge--variant:hover {
		background: var(--traek-toolbar-variant-hover, rgba(255, 140, 0, 0.2));
		border-color: var(--traek-toolbar-variant-border-hover, rgba(255, 140, 0, 0.4));
	}

	.traek-toolbar-badge__icon {
		display: inline-flex;
		align-items: center;
		font-size: 13px;
		opacity: 0.8;
	}

	.traek-toolbar-badge:focus-visible {
		outline: 2px solid var(--traek-input-button-bg, #00d8ff);
		outline-offset: 2px;
	}

	/* Mobile touch target improvements */
	@media (max-width: 768px) {
		.traek-toolbar-badge {
			padding: 6px 12px;
			min-height: 44px;
			min-width: 44px;
		}
	}
</style>
