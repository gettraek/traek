<script lang="ts">
	import { fly } from 'svelte/transition';

	let {
		message,
		show = false,
		duration = 2000,
		onDismiss
	}: {
		message: string;
		show?: boolean;
		duration?: number;
		onDismiss?: () => void;
	} = $props();

	let visible = $state(false);
	let pulse = $state(false); // Item 3: Pulse-Animation bei Wiederholung

	$effect(() => {
		if (show) {
			// Item 3: Wenn schon sichtbar, trigger Pulse
			if (visible) {
				pulse = true;
				setTimeout(() => {
					pulse = false;
				}, 150);
			} else {
				visible = true;
			}

			const timer = setTimeout(() => {
				visible = false;
				onDismiss?.();
			}, duration);

			return () => clearTimeout(timer);
		} else {
			visible = false;
		}
	});
</script>

{#if visible}
	<div
		class="toast"
		class:pulse
		role="status"
		aria-live="polite"
		transition:fly={{ y: 20, duration: 200 }}
	>
		{message}
	</div>
{/if}

<style>
	.toast {
		position: fixed;
		bottom: 120px; /* über Input */
		left: 50%;
		transform: translateX(-50%);
		padding: 12px 20px;
		background: rgba(0, 0, 0, 0.9);
		backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		color: var(--traek-node-text, #dddddd);
		font-size: 14px;
		z-index: 1000;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
		max-width: 80%;
		text-align: center;
	}

	/* Item 3: Pulse Animation bei Wiederholung */
	.toast.pulse {
		animation: toastPulse 0.15s ease;
	}

	@keyframes toastPulse {
		0%,
		100% {
			transform: translateX(-50%) scale(1);
		}
		50% {
			transform: translateX(-50%) scale(1.05);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.toast.pulse {
			animation: none;
		}
	}
</style>
