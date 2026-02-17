<script lang="ts">
	import type { TraekEngine } from '../TraekEngine.svelte';
	import type { MessageNode } from '../TraekEngine.svelte';
	import { getTraekI18n } from '../i18n/index';

	const t = getTraekI18n();

	let {
		engine,
		onClose,
		onSelect
	}: {
		engine: TraekEngine;
		onClose: () => void;
		onSelect: (nodeId: string) => void;
	} = $props();

	let searchQuery = $state('');
	let selectedIndex = $state(0);
	let inputRef: HTMLInputElement | null = $state(null);

	// Fuzzy matching function
	function fuzzyMatch(text: string, query: string): boolean {
		const textLower = text.toLowerCase();
		const queryLower = query.toLowerCase();
		let textIndex = 0;
		let queryIndex = 0;

		while (textIndex < textLower.length && queryIndex < queryLower.length) {
			if (textLower[textIndex] === queryLower[queryIndex]) {
				queryIndex++;
			}
			textIndex++;
		}

		return queryIndex === queryLower.length;
	}

	// Filtered results
	const filteredNodes = $derived.by(() => {
		if (!searchQuery.trim()) {
			return engine.nodes.filter((n) => n.type !== 'thought').slice(0, 50);
		}

		return engine.nodes
			.filter((n) => {
				if (n.type === 'thought') return false;
				const messageNode = n as MessageNode;
				if (!messageNode.content) return false;
				return fuzzyMatch(messageNode.content, searchQuery);
			})
			.slice(0, 50);
	});

	// Reset selected index when results change
	$effect(() => {
		void filteredNodes;
		selectedIndex = 0;
	});

	// Auto-focus input
	$effect(() => {
		if (inputRef) {
			inputRef.focus();
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, filteredNodes.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const selected = filteredNodes[selectedIndex];
			if (selected) {
				onSelect(selected.id);
				onClose();
			}
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleNodeClick(nodeId: string) {
		onSelect(nodeId);
		onClose();
	}

	function truncate(text: string, maxLength: number): string {
		if (text.length <= maxLength) return text;
		return text.slice(0, maxLength) + '...';
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fuzzy-search-overlay" role="dialog" aria-modal="true" aria-labelledby="fuzzy-title">
	<div class="fuzzy-backdrop" onclick={handleBackdropClick}></div>
	<div class="fuzzy-content">
		<div class="fuzzy-header">
			<input
				bind:this={inputRef}
				type="text"
				bind:value={searchQuery}
				placeholder={t.fuzzySearch.placeholder}
				class="fuzzy-input"
				aria-label={t.fuzzySearch.ariaLabel}
			/>
			<div class="fuzzy-count">
				{t.fuzzySearch.resultCount(filteredNodes.length)}
			</div>
		</div>

		<div class="fuzzy-results" role="listbox">
			{#each filteredNodes as node, index (node.id)}
				{@const messageNode = node as MessageNode}
				{@const isSelected = index === selectedIndex}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div
					class="fuzzy-result"
					class:selected={isSelected}
					role="option"
					aria-selected={isSelected}
					tabindex="-1"
					onclick={() => handleNodeClick(node.id)}
				>
					<div class="fuzzy-result-role">{node.role}</div>
					<div class="fuzzy-result-content">
						{truncate(messageNode.content || t.fuzzySearch.noContent, 120)}
					</div>
				</div>
			{/each}

			{#if filteredNodes.length === 0}
				<div class="fuzzy-empty">{t.fuzzySearch.noMatchingNodes}</div>
			{/if}
		</div>

		<div class="fuzzy-footer">
			<kbd>↑↓</kbd>
			{t.fuzzySearch.navigate}
			<kbd>Enter</kbd>
			{t.fuzzySearch.select}
			<kbd>Esc</kbd>
			{t.keyboard.close}
		</div>
	</div>
</div>

<style>
	.fuzzy-search-overlay {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 20vh;
		animation: overlay-fade-in 150ms ease;
	}

	@keyframes overlay-fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.fuzzy-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(4px);
	}

	.fuzzy-content {
		position: relative;
		width: 90%;
		max-width: 600px;
		max-height: 60vh;
		display: flex;
		flex-direction: column;
		background: var(--traek-thought-panel-bg, rgba(22, 22, 22, 0.95));
		border: 1px solid var(--traek-thought-panel-border, #333333);
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
		animation: fuzzy-slide-in 200ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes fuzzy-slide-in {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.fuzzy-header {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 16px;
		border-bottom: 1px solid var(--traek-thought-panel-border, #333333);
	}

	.fuzzy-input {
		width: 100%;
		padding: 12px;
		background: var(--traek-thought-toggle-bg, #444444);
		border: 1px solid var(--traek-thought-toggle-border, #555555);
		border-radius: 8px;
		color: var(--traek-node-text, #dddddd);
		font-size: 14px;
		font-family: inherit;
		outline: none;
		transition: border-color 0.15s;
	}

	.fuzzy-input:focus {
		border-color: var(--traek-thought-tag-cyan, #00d8ff);
	}

	.fuzzy-input::placeholder {
		color: var(--traek-thought-row-muted-2, #aaaaaa);
	}

	.fuzzy-count {
		font-size: 12px;
		color: var(--traek-thought-row-muted-2, #aaaaaa);
		padding: 0 4px;
	}

	.fuzzy-results {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
	}

	.fuzzy-result {
		padding: 12px;
		margin-bottom: 4px;
		background: var(--traek-thought-header-bg, rgba(255, 255, 255, 0.03));
		border: 1px solid transparent;
		border-radius: 8px;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.fuzzy-result:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.fuzzy-result.selected {
		background: rgba(0, 216, 255, 0.15);
		border-color: var(--traek-thought-tag-cyan, #00d8ff);
	}

	.fuzzy-result-role {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--traek-thought-header-accent, #888888);
		margin-bottom: 4px;
	}

	.fuzzy-result-content {
		font-size: 13px;
		line-height: 1.4;
		color: var(--traek-node-text, #dddddd);
		white-space: pre-wrap;
		word-break: break-word;
	}

	.fuzzy-empty {
		padding: 32px;
		text-align: center;
		color: var(--traek-thought-row-muted-2, #aaaaaa);
		font-size: 14px;
	}

	.fuzzy-footer {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		border-top: 1px solid var(--traek-thought-panel-border, #333333);
		font-size: 12px;
		color: var(--traek-thought-row-muted-2, #aaaaaa);
	}

	.fuzzy-footer kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 24px;
		height: 24px;
		padding: 0 6px;
		background: var(--traek-thought-toggle-bg, #444444);
		border: 1px solid var(--traek-thought-toggle-border, #555555);
		border-radius: 4px;
		font-family: var(--traek-font-mono, 'Space Mono', monospace);
		font-size: 11px;
		font-weight: 600;
		color: var(--traek-thought-tag-cyan, #00d8ff);
	}

	/* Scrollbar styling */
	.fuzzy-results::-webkit-scrollbar {
		width: 8px;
	}

	.fuzzy-results::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 4px;
	}

	.fuzzy-results::-webkit-scrollbar-thumb {
		background: var(--traek-thought-toggle-bg, #444444);
		border-radius: 4px;
	}

	.fuzzy-results::-webkit-scrollbar-thumb:hover {
		background: var(--traek-thought-toggle-border, #555555);
	}

	@media (prefers-reduced-motion: reduce) {
		.fuzzy-search-overlay,
		.fuzzy-content {
			animation: none;
		}
	}
</style>
