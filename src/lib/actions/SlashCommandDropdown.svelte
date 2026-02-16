<script lang="ts">
	import type { ActionDefinition } from './types.js';

	let {
		actions,
		filter,
		onSelect,
		onDismiss
	}: {
		actions: ActionDefinition[];
		filter: string;
		onSelect: (id: string) => void;
		onDismiss: () => void;
	} = $props();

	let activeIndex = $state(0);

	const filtered = $derived(
		actions.filter(
			(a) => a.slashCommand && a.slashCommand.toLowerCase().startsWith(filter.toLowerCase())
		)
	);

	// Reset active index when filtered list changes
	$effect(() => {
		// Track filtered to trigger effect on change
		void filtered;
		activeIndex = 0;
	});

	function handleKeydown(e: KeyboardEvent): void {
		if (filtered.length === 0) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIndex = (activeIndex + 1) % filtered.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIndex = (activeIndex - 1 + filtered.length) % filtered.length;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const item = filtered[activeIndex];
			if (item) onSelect(item.id);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			onDismiss();
		}
	}

	export { handleKeydown };
</script>

{#if filtered.length > 0}
	<div class="slash-dropdown" role="listbox">
		{#each filtered as action, i (action.id)}
			<button
				type="button"
				class="slash-item"
				class:active={i === activeIndex}
				role="option"
				aria-selected={i === activeIndex}
				onclick={() => onSelect(action.id)}
				onmouseenter={() => (activeIndex = i)}
			>
				{#if action.icon}<span class="slash-item-icon">{action.icon}</span>{/if}
				<span class="slash-item-command">/{action.slashCommand}</span>
				<span class="slash-item-desc">{action.description}</span>
			</button>
		{/each}
	</div>
{/if}

<style>
	.slash-dropdown {
		position: absolute;
		bottom: 100%;
		left: 0;
		right: 0;
		margin-bottom: 4px;
		padding: 4px;
		background: var(--traek-slash-dropdown-bg, rgba(30, 30, 30, 0.98));
		backdrop-filter: blur(16px);
		border: 1px solid var(--traek-input-border, #444444);
		border-radius: 16px;
		box-shadow: 0 -8px 24px var(--traek-slash-dropdown-shadow, rgba(0, 0, 0, 0.3));
		display: flex;
		flex-direction: column;
		gap: 4px;
		z-index: 110;
	}

	.slash-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 8px 10px;
		border: none;
		border-radius: 10px;
		background: transparent;
		color: var(--traek-slash-dropdown-text, #dddddd);
		font-size: 12px;
		text-align: left;
		cursor: pointer;
		transition: background 0.1s;
	}

	.slash-item:hover,
	.slash-item.active {
		background: var(--traek-slash-dropdown-item-active, rgba(255, 255, 255, 0.08));
	}

	.slash-item:focus-visible {
		outline: 2px solid var(--traek-input-button-bg, #00d8ff);
		outline-offset: 2px;
	}

	.slash-item-icon {
		font-size: 1.1em;
		flex-shrink: 0;
	}

	.slash-item-command {
		font-weight: 600;
		color: var(--traek-slash-dropdown-command, #00d8ff);
		flex-shrink: 0;
	}

	.slash-item-desc {
		color: var(--traek-slash-dropdown-desc, #888888);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Mobile touch target improvements */
	@media (max-width: 768px) {
		.slash-item {
			padding: 12px 10px;
			min-height: 44px;
		}
	}
</style>
