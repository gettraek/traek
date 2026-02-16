<script lang="ts">
	import { onMount } from 'svelte';

	let {
		onClose,
		onSearch,
		onNext,
		onPrevious,
		currentIndex = 0,
		totalMatches = 0
	}: {
		onClose: () => void;
		onSearch: (query: string) => void;
		onNext: () => void;
		onPrevious: () => void;
		currentIndex?: number;
		totalMatches?: number;
	} = $props();

	let query = $state('');
	let inputRef: HTMLInputElement | null = $state(null);

	onMount(() => {
		inputRef?.focus();
	});

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		query = target.value;
		onSearch(query);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		} else if (e.key === 'Enter') {
			if (e.shiftKey) {
				onPrevious();
			} else {
				onNext();
			}
		}
	}
</script>

<div class="search-bar">
	<div class="search-bar-content">
		<svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
			<circle
				cx="7"
				cy="7"
				r="5.5"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
			/>
			<line
				x1="11"
				y1="11"
				x2="14"
				y2="14"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
			/>
		</svg>

		<input
			bind:this={inputRef}
			type="text"
			class="search-input"
			placeholder="Search..."
			value={query}
			oninput={handleInput}
			onkeydown={handleKeydown}
		/>

		{#if totalMatches > 0}
			<div class="match-counter">
				{currentIndex + 1}/{totalMatches}
			</div>
		{:else if query.trim() !== ''}
			<div class="match-counter no-matches">No matches</div>
		{/if}

		<div class="search-controls">
			<button
				class="nav-button"
				onclick={onPrevious}
				disabled={totalMatches === 0}
				title="Previous match (Shift+Enter)"
				aria-label="Previous match"
			>
				<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
					<path
						d="M7 9L4 6L7 3"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>

			<button
				class="nav-button"
				onclick={onNext}
				disabled={totalMatches === 0}
				title="Next match (Enter)"
				aria-label="Next match"
			>
				<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
					<path
						d="M5 3L8 6L5 9"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>

			<button
				class="close-button"
				onclick={onClose}
				title="Close search (Escape)"
				aria-label="Close search"
			>
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
					<path
						d="M3 3L11 11M11 3L3 11"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
				</svg>
			</button>
		</div>
	</div>
</div>

<style>
	.search-bar {
		position: fixed;
		top: 20px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 200;
		min-width: 400px;
		max-width: 500px;
	}

	.search-bar-content {
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--traek-input-bg, rgba(30, 30, 30, 0.95));
		border: 1px solid var(--traek-input-border, #444444);
		border-radius: 8px;
		padding: 10px 14px;
		box-shadow: 0 4px 24px var(--traek-input-shadow, rgba(0, 0, 0, 0.4));
		backdrop-filter: blur(12px);
	}

	.search-icon {
		flex-shrink: 0;
		color: var(--traek-input-context-text, #888888);
	}

	.search-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		color: var(--traek-input-text, #ffffff);
		font-family: inherit;
		font-size: 14px;
		padding: 0;
	}

	.search-input::placeholder {
		color: var(--traek-input-context-text, #888888);
	}

	.match-counter {
		flex-shrink: 0;
		font-size: 12px;
		color: var(--traek-input-context-text, #888888);
		font-family: monospace;
		padding: 2px 8px;
		background: var(--traek-input-context-bg, rgba(0, 0, 0, 0.4));
		border-radius: 4px;
	}

	.match-counter.no-matches {
		color: var(--traek-error-text, #cc0000);
		background: transparent;
	}

	.search-controls {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
	}

	.nav-button,
	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background: transparent;
		border: none;
		border-radius: 4px;
		color: var(--traek-input-context-text, #888888);
		cursor: pointer;
		transition: all 0.15s ease;
		padding: 0;
	}

	.nav-button:hover:not(:disabled),
	.close-button:hover {
		background: var(--traek-input-context-bg, rgba(0, 0, 0, 0.4));
		color: var(--traek-input-text, #ffffff);
	}

	.nav-button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.nav-button:focus-visible,
	.close-button:focus-visible {
		outline: 2px solid var(--traek-node-active-border, #00d8ff);
		outline-offset: 2px;
	}

	@media (max-width: 768px) {
		.search-bar {
			min-width: 0;
			max-width: calc(100vw - 40px);
			width: calc(100vw - 40px);
		}
	}
</style>
