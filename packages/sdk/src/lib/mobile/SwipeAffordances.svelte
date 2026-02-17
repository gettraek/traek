<script lang="ts">
	let {
		canSwipeUp = false,
		canSwipeDown = false,
		canSwipeLeft = false,
		canSwipeRight = false,
		isGestureActive = false
	}: {
		canSwipeUp?: boolean;
		canSwipeDown?: boolean;
		canSwipeLeft?: boolean;
		canSwipeRight?: boolean;
		isGestureActive?: boolean;
	} = $props();

	// Hint-Animation nach 0.5s Inaktivität (Quick Win 1: reduziert von 2s)
	let showHint = $state(false);
	let hintTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if (!isGestureActive) {
			hintTimer = setTimeout(() => {
				showHint = true;
				// Auto-hide nach 5s (Item 1: erhöht von 3s auf 5s)
				setTimeout(() => {
					showHint = false;
				}, 5000);
			}, 500); // Quick Win 1: reduziert von 2000ms auf 500ms
		} else {
			if (hintTimer) clearTimeout(hintTimer);
			showHint = false;
		}

		return () => {
			if (hintTimer) clearTimeout(hintTimer);
		};
	});
</script>

<div class="swipe-affordances" class:show-hint={showHint} aria-hidden="true">
	{#if canSwipeUp}
		<div class="affordance top">
			<div class="chevron">
				<svg viewBox="0 0 24 24" width="20" height="20">
					<path
						d="M7 14l5-5 5 5"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						fill="none"
					/>
				</svg>
			</div>
			{#if showHint}
				<span class="hint-label">Wische nach oben für mehr</span>
			{/if}
		</div>
	{/if}

	{#if canSwipeDown}
		<div class="affordance bottom">
			<div class="chevron">
				<svg viewBox="0 0 24 24" width="20" height="20">
					<path
						d="M7 10l5 5 5-5"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						fill="none"
					/>
				</svg>
			</div>
			{#if showHint}
				<span class="hint-label">Wische nach unten zurück</span>
			{/if}
		</div>
	{/if}

	{#if canSwipeLeft}
		<div class="affordance left">
			<div class="chevron">
				<svg viewBox="0 0 24 24" width="20" height="20">
					<path
						d="M14 7l-5 5 5 5"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						fill="none"
					/>
				</svg>
			</div>
		</div>
	{/if}

	{#if canSwipeRight}
		<div class="affordance right">
			<div class="chevron">
				<svg viewBox="0 0 24 24" width="20" height="20">
					<path
						d="M10 7l5 5-5 5"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						fill="none"
					/>
				</svg>
			</div>
		</div>
	{/if}
</div>

<style>
	.swipe-affordances {
		pointer-events: none;
		position: absolute;
		inset: 0;
		z-index: 5;
	}

	.affordance {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.4; /* Quick Win 1: erhöht von 0.15 auf 0.4 */
		transition: opacity 0.3s ease;
		color: var(--traek-input-dot, #00d8ff);
	}

	.show-hint .affordance {
		opacity: 0.6; /* Quick Win 1: leicht erhöht von 0.5 auf 0.6 für noch bessere Sichtbarkeit */
	}

	.affordance.top {
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		flex-direction: column;
		gap: 4px;
		padding: 8px;
	}

	.affordance.bottom {
		bottom: 80px; /* über Input */
		left: 50%;
		transform: translateX(-50%);
		flex-direction: column;
		gap: 4px;
		padding: 8px;
	}

	.affordance.left {
		left: 8px;
		top: 50%;
		transform: translateY(-50%);
		padding: 12px 8px;
	}

	.affordance.right {
		right: 8px;
		top: 50%;
		transform: translateY(-50%);
		padding: 12px 8px;
	}

	.chevron {
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.3;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.1);
		}
	}

	.hint-label {
		font-size: 12px;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(8px);
		padding: 6px 12px;
		border-radius: 8px;
		white-space: nowrap;
		animation: fadeIn 0.3s ease;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.chevron {
			animation: none;
			opacity: 0.5;
		}
		.hint-label {
			animation: none;
		}
	}
</style>
