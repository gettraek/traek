<script lang="ts">
	import type { ActionDefinition } from './types.js';

	let {
		actions,
		suggestedIds,
		selectedIds,
		onToggle
	}: {
		actions: ActionDefinition[];
		suggestedIds: string[];
		selectedIds: string[];
		onToggle: (id: string) => void;
	} = $props();
</script>

{#if actions.length > 0}
	<div class="action-badges" role="group" aria-label="Message actions">
		{#each actions as action (action.id)}
			{@const isSuggested = suggestedIds.includes(action.id)}
			{@const isSelected = selectedIds.includes(action.id)}
			<button
				type="button"
				class="action-badge"
				class:suggested={isSuggested && !isSelected}
				class:selected={isSelected}
				class:inactive={!isSuggested && !isSelected}
				aria-pressed={isSelected}
				title={action.description}
				onclick={() => onToggle(action.id)}
			>
				{#if action.icon}<span class="action-badge-icon">{action.icon}</span>{/if}
				{action.label}
			</button>
		{/each}
	</div>
{/if}

<style>
	.action-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		justify-content: center;
	}

	.action-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 5px 10px;
		border: 1px solid var(--traek-node-border, #444444);
		border-radius: 999px;
		background: var(--traek-badge-bg, rgba(255, 255, 255, 0.06));
		color: var(--traek-badge-text, #cccccc);
		font-size: 12px;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s,
			color 0.15s,
			opacity 0.15s;
	}

	.action-badge.inactive {
		opacity: 0.4;
	}

	.action-badge.inactive:hover {
		opacity: 0.7;
	}

	.action-badge:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: #666666;
	}

	.action-badge.suggested {
		opacity: 1;
		animation: badge-pulse 1.5s ease-in-out infinite;
	}

	.action-badge.selected {
		opacity: 1;
		background: rgba(0, 216, 255, 0.15);
		border-color: var(--traek-input-button-bg, #00d8ff);
		color: var(--traek-badge-text-active, #00d8ff);
	}

	.action-badge-icon {
		font-size: 1.1em;
	}

	@keyframes badge-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(0, 216, 255, 0);
		}
		50% {
			box-shadow: 0 0 6px 2px rgba(0, 216, 255, 0.3);
		}
	}

	.action-badge:focus-visible {
		outline: 2px solid var(--traek-input-button-bg, #00d8ff);
		outline-offset: 2px;
	}

	/* Mobile touch target improvements */
	@media (max-width: 768px) {
		.action-badge {
			padding: 8px 12px;
			min-height: 44px;
			min-width: 44px;
		}
	}
</style>
