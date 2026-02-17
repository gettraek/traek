<script lang="ts">
	import { slide } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	import { PREDEFINED_TAGS } from './tagUtils';

	let {
		activeTags = $bindable([]),
		onTagsChange
	}: {
		activeTags?: string[];
		onTagsChange?: (tags: string[]) => void;
	} = $props();

	let isExpanded = $state(false);

	function toggleTag(tag: string) {
		if (activeTags.includes(tag)) {
			activeTags = activeTags.filter((t) => t !== tag);
		} else {
			activeTags = [...activeTags, tag];
		}
		onTagsChange?.(activeTags);
	}

	function clearAll() {
		activeTags = [];
		onTagsChange?.([]);
	}
</script>

<div class="tag-filter">
	<button
		type="button"
		class="tag-filter-toggle"
		onclick={() => (isExpanded = !isExpanded)}
		class:active={activeTags.length > 0}
		aria-expanded={isExpanded}
	>
		<Icon icon="mdi:filter-outline" width="16" height="16" />
		<span>Filter by Tags</span>
		{#if activeTags.length > 0}
			<span class="tag-filter-count">{activeTags.length}</span>
		{/if}
		<span class="chevron" style:transform={isExpanded ? 'rotate(180deg)' : 'rotate(0)'}>
			<Icon icon="mdi:chevron-down" width="16" height="16" />
		</span>
	</button>

	{#if isExpanded}
		<div class="tag-filter-panel" transition:slide={{ duration: 200 }}>
			<div class="tag-filter-options">
				{#each Object.entries(PREDEFINED_TAGS) as [key, config] (key)}
					{@const isActive = activeTags.includes(key)}
					<button
						type="button"
						class="tag-filter-option"
						class:active={isActive}
						style:--tag-color={config.color}
						style:--tag-bg={config.bgColor}
						onclick={() => toggleTag(key)}
					>
						<span class="tag-filter-check">{isActive ? '✓' : ''}</span>
						<span class="tag-filter-label">{config.label}</span>
					</button>
				{/each}
			</div>

			{#if activeTags.length > 0}
				<button type="button" class="tag-filter-clear" onclick={clearAll}>
					<Icon icon="mdi:close-circle-outline" width="14" height="14" />
					Clear filters
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.tag-filter {
		position: fixed;
		top: 80px;
		right: 20px;
		z-index: 50;
		min-width: 200px;
	}

	.tag-filter-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 10px 14px;
		background: var(--traek-input-bg, rgba(30, 30, 30, 0.8));
		border: 1px solid var(--traek-input-border, #444444);
		border-radius: 12px;
		color: var(--traek-textnode-text, #dddddd);
		font: inherit;
		font-size: 13px;
		cursor: pointer;
		backdrop-filter: blur(16px);
		transition:
			background 0.15s,
			border-color 0.15s,
			box-shadow 0.15s;
	}

	.tag-filter-toggle:hover {
		background: rgba(30, 30, 30, 0.95);
		border-color: var(--traek-input-button-bg, #00d8ff);
	}

	.tag-filter-toggle.active {
		border-color: var(--traek-input-button-bg, #00d8ff);
		box-shadow: 0 0 16px rgba(0, 216, 255, 0.2);
	}

	.tag-filter-toggle:focus-visible {
		outline: 2px solid var(--traek-input-button-bg, #00d8ff);
		outline-offset: 2px;
	}

	.tag-filter-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 4px;
		border-radius: 999px;
		background: var(--traek-thought-tag-cyan, #00d8ff);
		color: #000;
		font-size: 11px;
		font-weight: 600;
		line-height: 1;
		margin-left: auto;
	}

	.chevron {
		display: inline-flex;
		transition: transform 0.2s;
	}

	.tag-filter-panel {
		margin-top: 8px;
		padding: 12px;
		background: var(--traek-input-bg, rgba(30, 30, 30, 0.9));
		border: 1px solid var(--traek-input-border, #444444);
		border-radius: 12px;
		backdrop-filter: blur(16px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
	}

	.tag-filter-options {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.tag-filter-option {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		background: transparent;
		border: none;
		border-radius: 8px;
		color: var(--traek-thought-row-muted-2, #aaaaaa);
		font: inherit;
		font-size: 12px;
		text-align: left;
		cursor: pointer;
		transition:
			background 0.12s,
			color 0.12s;
	}

	.tag-filter-option:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.tag-filter-option.active {
		background: var(--tag-bg);
		color: var(--tag-color);
	}

	.tag-filter-check {
		width: 16px;
		height: 16px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid currentColor;
		border-radius: 3px;
		font-size: 10px;
		opacity: 0.7;
	}

	.tag-filter-option.active .tag-filter-check {
		opacity: 1;
	}

	.tag-filter-label {
		flex: 1;
	}

	.tag-filter-clear {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		width: 100%;
		margin-top: 8px;
		padding: 8px 10px;
		background: transparent;
		border: 1px solid var(--traek-thought-divider, rgba(255, 255, 255, 0.06));
		border-radius: 8px;
		color: var(--traek-thought-row-muted-3, #999999);
		font: inherit;
		font-size: 11px;
		cursor: pointer;
		transition:
			background 0.12s,
			border-color 0.12s,
			color 0.12s;
	}

	.tag-filter-clear:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: var(--traek-thought-row-muted-2, #aaaaaa);
		color: var(--traek-thought-row-muted-2, #aaaaaa);
	}

	@media (max-width: 768px) {
		.tag-filter {
			left: 20px;
			right: 20px;
			min-width: unset;
		}
	}
</style>
