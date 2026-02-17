<script lang="ts">
	import type { Node, TraekEngine } from '../TraekEngine.svelte';
	import { PREDEFINED_TAGS, getNodeTags } from './tagUtils';

	let { node, engine, onClose }: { node: Node; engine: TraekEngine; onClose?: () => void } =
		$props();

	let isOpen = $state(false);
	let customTagInput = $state('');
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let panelTop = $state(0);
	let panelLeft = $state(0);

	const nodeTags = $derived(getNodeTags(node));

	/** Svelte action that teleports an element to document.body, escaping any overflow/transform context. */
	function portal(el: HTMLElement) {
		document.body.appendChild(el);
		return {
			destroy() {
				el.remove();
			}
		};
	}

	function toggleDropdown() {
		if (!isOpen && triggerEl) {
			const rect = triggerEl.getBoundingClientRect();
			panelTop = rect.bottom + 4;
			panelLeft = rect.left;
		}
		isOpen = !isOpen;
	}

	function handleAddTag(tag: string) {
		engine.addTag(node.id, tag);
	}

	function handleRemoveTag(tag: string) {
		engine.removeTag(node.id, tag);
	}

	function handleToggleTag(tag: string) {
		if (nodeTags.includes(tag)) {
			handleRemoveTag(tag);
		} else {
			handleAddTag(tag);
		}
	}

	function handleAddCustomTag() {
		const tag = customTagInput.trim().toLowerCase();
		if (tag && !nodeTags.includes(tag)) {
			handleAddTag(tag);
			customTagInput = '';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleAddCustomTag();
		} else if (e.key === 'Escape') {
			isOpen = false;
			onClose?.();
		}
	}

	function handleBackdropClick() {
		isOpen = false;
		onClose?.();
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && isOpen) {
			handleBackdropClick();
		}
	}}
/>

{#if isOpen}
	<div
		class="tag-dropdown-backdrop"
		role="presentation"
		tabindex="-1"
		onclick={handleBackdropClick}
		use:portal
	></div>
{/if}

<div class="tag-dropdown-container">
	<button
		type="button"
		class="tag-dropdown-trigger"
		bind:this={triggerEl}
		onclick={toggleDropdown}
		title="Manage tags"
		aria-expanded={isOpen}
	>
		<span class="tag-icon">🏷️</span>
		<span>Tags</span>
		{#if nodeTags.length > 0}
			<span class="tag-count">{nodeTags.length}</span>
		{/if}
	</button>

	{#if isOpen}
		<div class="tag-dropdown-panel" style:top="{panelTop}px" style:left="{panelLeft}px" use:portal>
			<div class="tag-dropdown-header">Add Tags</div>

			<div class="tag-list">
				{#each Object.entries(PREDEFINED_TAGS) as [key, config] (key)}
					{@const isActive = nodeTags.includes(key)}
					<button
						type="button"
						class="tag-item"
						class:active={isActive}
						style:--tag-color={config.color}
						style:--tag-bg={config.bgColor}
						onclick={() => handleToggleTag(key)}
					>
						<span class="tag-item-check">{isActive ? '✓' : ''}</span>
						<span class="tag-item-label">{config.label}</span>
					</button>
				{/each}
			</div>

			<div class="tag-divider"></div>

			<div class="tag-custom">
				<input
					type="text"
					class="tag-custom-input"
					placeholder="Custom tag..."
					bind:value={customTagInput}
					onkeydown={handleKeydown}
				/>
				<button
					type="button"
					class="tag-custom-add"
					onclick={handleAddCustomTag}
					disabled={!customTagInput.trim()}
				>
					Add
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.tag-dropdown-backdrop {
		position: fixed;
		inset: 0;
		z-index: 99;
		pointer-events: auto;
	}

	.tag-dropdown-container {
		position: relative;
		display: inline-block;
	}

	.tag-dropdown-trigger {
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
		line-height: 1.4;
	}

	.tag-dropdown-trigger:hover {
		background: var(--traek-toolbar-badge-hover, rgba(255, 255, 255, 0.12));
		border-color: var(--traek-toolbar-badge-border-hover, rgba(255, 255, 255, 0.18));
	}

	.tag-dropdown-trigger:focus-visible {
		outline: 2px solid var(--traek-input-button-bg, #00d8ff);
		outline-offset: 2px;
	}

	.tag-icon {
		font-size: 13px;
		line-height: 1;
	}

	.tag-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		border-radius: 999px;
		background: var(--traek-thought-tag-cyan, #00d8ff);
		color: #000;
		font-size: 10px;
		font-weight: 600;
		line-height: 1;
	}

	.tag-dropdown-panel {
		position: fixed;
		min-width: 200px;
		background: var(--traek-thought-panel-bg, rgba(22, 22, 22, 0.95));
		border: 1px solid var(--traek-thought-panel-border, #333333);
		border-radius: 12px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(16px);
		z-index: 100;
		overflow: hidden;
	}

	.tag-dropdown-header {
		padding: 10px 12px 6px;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		color: var(--traek-thought-header-muted, #666666);
	}

	.tag-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 4px 8px;
	}

	.tag-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: var(--traek-thought-row-muted-2, #aaaaaa);
		font: inherit;
		font-size: 12px;
		text-align: left;
		cursor: pointer;
		transition:
			background 0.12s,
			color 0.12s;
	}

	.tag-item:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.tag-item.active {
		background: var(--tag-bg);
		color: var(--tag-color);
	}

	.tag-item-check {
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

	.tag-item.active .tag-item-check {
		opacity: 1;
	}

	.tag-item-label {
		flex: 1;
	}

	.tag-divider {
		height: 1px;
		margin: 6px 8px;
		background: var(--traek-thought-divider, rgba(255, 255, 255, 0.06));
	}

	.tag-custom {
		display: flex;
		gap: 6px;
		padding: 8px;
	}

	.tag-custom-input {
		flex: 1;
		padding: 6px 10px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--traek-thought-toggle-border, #555555);
		border-radius: 6px;
		color: var(--traek-textnode-text, #dddddd);
		font: inherit;
		font-size: 11px;
	}

	.tag-custom-input::placeholder {
		color: var(--traek-thought-row-muted-4, #666666);
	}

	.tag-custom-input:focus {
		outline: none;
		border-color: var(--traek-input-button-bg, #00d8ff);
	}

	.tag-custom-add {
		padding: 6px 12px;
		background: var(--traek-input-button-bg, #00d8ff);
		border: none;
		border-radius: 6px;
		color: var(--traek-input-button-text, #000000);
		font: inherit;
		font-size: 11px;
		font-weight: 600;
		cursor: pointer;
		transition:
			opacity 0.12s,
			transform 0.12s;
	}

	.tag-custom-add:hover:not(:disabled) {
		opacity: 0.9;
		transform: scale(1.02);
	}

	.tag-custom-add:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
