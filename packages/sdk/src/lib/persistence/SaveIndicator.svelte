<script lang="ts">
	import type { ConversationStore } from './ConversationStore.svelte.js';

	interface Props {
		store: ConversationStore;
		class?: string;
	}

	let { store, class: className = '' }: Props = $props();

	const saveState = $derived(store.saveState);
</script>

{#if saveState !== 'idle'}
	<div class="save-indicator {className}" role="status" aria-live="polite">
		{#if saveState === 'saving'}
			<svg
				class="spinner"
				viewBox="0 0 16 16"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
			>
				<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2" />
			</svg>
			<span>Saving...</span>
		{:else if saveState === 'saved'}
			<svg
				class="icon-check"
				viewBox="0 0 16 16"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
			>
				<path
					d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"
					fill="currentColor"
				/>
			</svg>
			<span>Saved</span>
		{:else if saveState === 'error'}
			<svg
				class="icon-error"
				viewBox="0 0 16 16"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
			>
				<path
					d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7 4h2v5H7V4zm0 6h2v2H7v-2z"
					fill="currentColor"
				/>
			</svg>
			<span>Save failed</span>
		{/if}
	</div>
{/if}

<style>
	.save-indicator {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.6rem;
		font-size: 0.8rem;
		border-radius: 0.25rem;
		background: var(--traek-save-indicator-bg, rgba(0, 0, 0, 0.5));
		color: var(--traek-save-indicator-text, #e4e4e7);
		backdrop-filter: blur(4px);
		transition:
			opacity 0.2s,
			transform 0.2s;
		animation: fade-in 0.2s ease-out;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.spinner {
		width: 1rem;
		height: 1rem;
		animation: spin 0.8s linear infinite;
	}

	.spinner circle {
		stroke-dasharray: 24;
		stroke-dashoffset: 18;
		stroke-linecap: round;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.icon-check,
	.icon-error {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.icon-check {
		color: var(--traek-save-indicator-success, #4ade80);
	}

	.icon-error {
		color: var(--traek-save-indicator-error, #f87171);
	}

	span {
		font-weight: 500;
		letter-spacing: 0.01em;
	}
</style>
