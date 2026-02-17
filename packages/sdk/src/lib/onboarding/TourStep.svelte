<script lang="ts">
	import { onMount } from 'svelte';
	import { getTraekI18n } from '../i18n/index';

	const t = getTraekI18n();

	let {
		title,
		description,
		currentStep,
		totalSteps,
		targetSelector,
		position = 'bottom',
		onNext,
		onPrevious,
		onSkip
	}: {
		title: string;
		description: string;
		currentStep: number;
		totalSteps: number;
		targetSelector?: string;
		position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
		onNext: () => void;
		onPrevious: () => void;
		onSkip: () => void;
	} = $props();

	let targetEl = $state<HTMLElement | null>(null);
	let tooltipEl = $state<HTMLElement | null>(null);
	let cutoutRect = $state<DOMRect | null>(null);
	let tooltipStyle = $state('');

	onMount(() => {
		if (targetSelector) {
			targetEl = document.querySelector(targetSelector);
			if (targetEl) {
				cutoutRect = targetEl.getBoundingClientRect();
				calculateTooltipPosition();
			}
		}

		const handleResize = () => {
			if (targetSelector && targetEl) {
				cutoutRect = targetEl.getBoundingClientRect();
				calculateTooltipPosition();
			}
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});

	function calculateTooltipPosition() {
		if (!cutoutRect || !tooltipEl) return;

		const padding = 20;
		const tooltipRect = tooltipEl.getBoundingClientRect();
		let top = 0;
		let left = 0;

		switch (position) {
			case 'bottom':
				top = cutoutRect.bottom + padding;
				left = cutoutRect.left + cutoutRect.width / 2 - tooltipRect.width / 2;
				break;
			case 'top':
				top = cutoutRect.top - tooltipRect.height - padding;
				left = cutoutRect.left + cutoutRect.width / 2 - tooltipRect.width / 2;
				break;
			case 'left':
				top = cutoutRect.top + cutoutRect.height / 2 - tooltipRect.height / 2;
				left = cutoutRect.left - tooltipRect.width - padding;
				break;
			case 'right':
				top = cutoutRect.top + cutoutRect.height / 2 - tooltipRect.height / 2;
				left = cutoutRect.right + padding;
				break;
			case 'center':
				top = window.innerHeight / 2 - tooltipRect.height / 2;
				left = window.innerWidth / 2 - tooltipRect.width / 2;
				break;
		}

		// Keep within viewport bounds
		top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
		left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

		tooltipStyle = `top: ${top}px; left: ${left}px;`;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onSkip();
		} else if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onNext();
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			if (currentStep > 0) onPrevious();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="tour-step-overlay" role="dialog" aria-modal="true" aria-labelledby="tour-step-title">
	<!-- Backdrop with cutout -->
	<svg class="tour-backdrop">
		<defs>
			<mask id="tour-cutout-mask">
				<rect x="0" y="0" width="100%" height="100%" fill="white" />
				{#if cutoutRect}
					<rect
						x={cutoutRect.x - 8}
						y={cutoutRect.y - 8}
						width={cutoutRect.width + 16}
						height={cutoutRect.height + 16}
						rx="12"
						fill="black"
					/>
				{/if}
			</mask>
		</defs>
		<rect
			x="0"
			y="0"
			width="100%"
			height="100%"
			fill="rgba(0, 0, 0, 0.85)"
			mask="url(#tour-cutout-mask)"
		/>
	</svg>

	<!-- Highlight border around target -->
	{#if cutoutRect}
		<div
			class="tour-highlight"
			style="
				top: {cutoutRect.y - 8}px;
				left: {cutoutRect.x - 8}px;
				width: {cutoutRect.width + 16}px;
				height: {cutoutRect.height + 16}px;
			"
		></div>
	{/if}

	<!-- Tooltip -->
	<div bind:this={tooltipEl} class="tour-tooltip" style={tooltipStyle}>
		<button class="tour-skip-button" onclick={onSkip} aria-label={t.tour.skipAriaLabel}>
			{t.tour.skip}
		</button>

		<div class="tour-content">
			<h2 id="tour-step-title">{title}</h2>
			<p>{description}</p>
		</div>

		<div class="tour-footer">
			<div class="tour-progress-dots" role="list" aria-label={t.tour.tourProgress}>
				{#each Array(totalSteps) as _step, i (i)}
					<span
						class="tour-dot"
						class:active={i === currentStep}
						role="listitem"
						aria-current={i === currentStep ? 'step' : undefined}
					></span>
				{/each}
			</div>

			<div class="tour-buttons">
				{#if currentStep > 0}
					<button class="tour-button tour-button-secondary" onclick={onPrevious}
						>{t.tour.back}</button
					>
				{/if}
				<button class="tour-button tour-button-primary" onclick={onNext}>
					{currentStep < totalSteps - 1 ? t.tour.next : t.tour.letsGo}
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.tour-step-overlay {
		position: fixed;
		inset: 0;
		z-index: 1000;
		pointer-events: auto;
	}

	.tour-backdrop {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		backdrop-filter: blur(4px);
	}

	.tour-highlight {
		position: fixed;
		border: 2px solid var(--traek-input-dot, #00d8ff);
		border-radius: 12px;
		pointer-events: none;
		box-shadow:
			0 0 0 4px rgba(0, 216, 255, 0.1),
			0 0 20px rgba(0, 216, 255, 0.3);
		animation: tour-pulse 2s ease-in-out infinite;
	}

	@keyframes tour-pulse {
		0%,
		100% {
			box-shadow:
				0 0 0 4px rgba(0, 216, 255, 0.1),
				0 0 20px rgba(0, 216, 255, 0.3);
		}
		50% {
			box-shadow:
				0 0 0 8px rgba(0, 216, 255, 0.15),
				0 0 30px rgba(0, 216, 255, 0.5);
		}
	}

	.tour-tooltip {
		position: fixed;
		width: 90%;
		max-width: 480px;
		background: var(--traek-input-bg, rgba(30, 30, 30, 0.95));
		border: 1px solid var(--traek-input-border, #444444);
		border-radius: 16px;
		padding: 24px;
		color: var(--traek-node-text, #dddddd);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
		animation: tour-tooltip-fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes tour-tooltip-fade-in {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.tour-skip-button {
		position: absolute;
		top: 12px;
		right: 12px;
		background: transparent;
		border: none;
		color: var(--traek-input-context-text, #888888);
		font-size: 14px;
		cursor: pointer;
		padding: 8px 12px;
		min-height: 44px;
		min-width: 44px;
		border-radius: 8px;
		transition: background 0.2s ease;
	}

	.tour-skip-button:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.tour-content h2 {
		font-size: 20px;
		font-weight: 600;
		line-height: 1.3;
		margin: 0 0 12px 0;
		color: var(--traek-node-text, #dddddd);
	}

	.tour-content p {
		font-size: 15px;
		line-height: 1.6;
		color: var(--traek-input-context-text, #aaaaaa);
		margin: 0 0 24px 0;
	}

	.tour-footer {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.tour-progress-dots {
		display: flex;
		justify-content: center;
		gap: 8px;
	}

	.tour-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--traek-input-dot-muted, #555555);
		transition: all 0.3s ease;
	}

	.tour-dot.active {
		width: 24px;
		border-radius: 4px;
		background: var(--traek-input-dot, #00d8ff);
	}

	.tour-buttons {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
	}

	.tour-button {
		padding: 12px 24px;
		min-height: 44px;
		border: none;
		border-radius: 10px;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.tour-button-primary {
		background: var(--traek-input-button-bg, #00d8ff);
		color: var(--traek-input-button-text, #000000);
	}

	.tour-button-primary:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 216, 255, 0.3);
	}

	.tour-button-primary:active {
		transform: translateY(0);
	}

	.tour-button-secondary {
		background: rgba(255, 255, 255, 0.08);
		color: var(--traek-node-text, #dddddd);
	}

	.tour-button-secondary:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	@media (prefers-reduced-motion: reduce) {
		.tour-tooltip {
			animation: none;
		}
		.tour-highlight {
			animation: none;
		}
	}
</style>
