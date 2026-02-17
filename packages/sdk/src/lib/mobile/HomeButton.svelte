<script lang="ts">
	let {
		onclick,
		show = true
	}: {
		onclick: () => void;
		show?: boolean;
	} = $props();
</script>

{#if show}
	<button
		class="home-button"
		{onclick}
		aria-label="Zurück zum Start"
		title="Zurück zum Start (Home-Taste)"
	>
		<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
			<path
				d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" stroke-width="2" />
		</svg>
	</button>
{/if}

<style>
	/* Item 4: Outline-Style statt Filled */
	.home-button {
		position: absolute;
		bottom: 90px; /* über Input */
		right: 16px;
		width: 56px;
		height: 56px;
		background: transparent; /* Item 4: Transparent statt Cyan */
		color: var(--traek-input-dot, #00d8ff); /* Item 4: Cyan für Icon und Border */
		border: 2px solid var(--traek-input-dot, #00d8ff); /* Item 4: Cyan-Border */
		border-radius: 50%;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 30;
		transition: all 0.2s ease;
		animation: fadeIn 0.3s ease;
		backdrop-filter: blur(8px); /* Item 4: Leichter Blur für Lesbarkeit */
	}

	.home-button:hover,
	.home-button:focus-visible {
		transform: scale(1.1);
		background: rgba(0, 216, 255, 0.15); /* Item 4: Leicht gefüllt bei Hover */
		box-shadow: 0 4px 16px rgba(0, 216, 255, 0.3);
	}

	.home-button:active {
		transform: scale(0.95);
		background: rgba(0, 216, 255, 0.2); /* Item 4: Etwas mehr Fill bei Active */
	}

	.home-button:focus-visible {
		outline: 2px solid var(--traek-input-dot, #00d8ff);
		outline-offset: 2px;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scale(0.8);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.home-button {
			animation: none;
		}
		.home-button:hover,
		.home-button:focus-visible {
			transform: none;
		}
	}
</style>
