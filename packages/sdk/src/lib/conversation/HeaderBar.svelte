<script lang="ts">
	import type { ConversationStore } from '../persistence/ConversationStore.svelte.js';
	import SaveIndicator from '../persistence/SaveIndicator.svelte';

	interface Props {
		backHref: string;
		backLabel?: string;
		store: ConversationStore;
		class?: string;
	}

	let { backHref, backLabel = 'Chats', store, class: className = '' }: Props = $props();
</script>

<header class="header-bar {className}">
	<div class="header-content">
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a href={backHref} class="back-button">
			<svg
				class="chevron-icon"
				width="16"
				height="16"
				viewBox="0 0 16 16"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
			>
				<path
					d="M10 12L6 8L10 4"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			<span class="back-label">{backLabel}</span>
		</a>

		<div class="header-actions">
			<SaveIndicator {store} />
		</div>
	</div>
</header>

<style>
	.header-bar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 200;
		height: 56px;
		background: var(--traek-header-bg, rgba(11, 11, 11, 0.85));
		border-bottom: 1px solid var(--traek-header-border, rgba(255, 255, 255, 0.08));
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
	}

	.header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 100%;
		padding: 0 1rem;
		max-width: 100%;
	}

	.back-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		min-height: 44px;
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		color: var(--traek-header-text, #d4d4d8);
		text-decoration: none;
		font-size: 0.9375rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}

	.back-button:hover {
		background: var(--traek-header-hover-bg, rgba(255, 255, 255, 0.08));
		color: var(--traek-header-hover-text, #fafafa);
	}

	.back-button:hover .chevron-icon {
		transform: translateX(-2px);
	}

	.back-button:focus-visible {
		outline: 2px solid var(--traek-input-button-bg, #00d8ff);
		outline-offset: 2px;
	}

	.chevron-icon {
		flex-shrink: 0;
		transition: transform 0.15s ease;
	}

	.back-label {
		font-weight: 500;
		letter-spacing: 0.01em;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	/* Light mode support */
	:global([data-theme='light']) .header-bar {
		background: var(--traek-header-bg, rgba(255, 255, 255, 0.9));
		border-bottom-color: var(--traek-header-border, rgba(0, 0, 0, 0.1));
	}

	:global([data-theme='light']) .back-button {
		color: var(--traek-header-text, #52525b);
	}

	:global([data-theme='light']) .back-button:hover {
		background: var(--traek-header-hover-bg, rgba(0, 0, 0, 0.04));
		color: var(--traek-header-hover-text, #18181b);
	}

	/* Mobile breakpoint */
	@media (max-width: 768px) {
		.header-bar {
			height: 52px;
		}

		.header-content {
			padding: 0 0.75rem;
		}

		.back-button {
			padding: 0.4rem 0.6rem;
			font-size: 0.875rem;
		}
	}

	/* Very small screens: hide label */
	@media (max-width: 360px) {
		.back-label {
			display: none;
		}

		.back-button {
			padding: 0.5rem;
		}
	}
</style>
