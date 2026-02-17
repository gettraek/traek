<script lang="ts">
	import { getTraekI18n } from '../i18n/index';

	const t = getTraekI18n();

	let { onComplete }: { onComplete: () => void } = $props();

	let step = $state(0);
	const steps = $derived([
		{
			title: t.onboarding.welcomeTitle,
			description: t.onboarding.welcomeDescription,
			gesture: 'swipe-demo',
			position: 'center'
		},
		{
			title: t.onboarding.swipeUpTitle,
			description: t.onboarding.swipeUpDescription,
			gesture: 'up',
			position: 'bottom'
		},
		{
			title: t.onboarding.swipeDownTitle,
			description: t.onboarding.swipeDownDescription,
			gesture: 'down',
			position: 'top'
		},
		{
			title: t.onboarding.swipeSidewaysTitle,
			description: t.onboarding.swipeSidewaysDescription,
			gesture: 'horizontal',
			position: 'middle'
		},
		{
			title: t.onboarding.keyboardTitle,
			description: t.onboarding.keyboardDescription,
			gesture: 'keyboard',
			position: 'center'
		}
	]);

	function nextStep() {
		if (step < steps.length - 1) {
			step++;
		} else {
			onComplete();
		}
	}

	function skip() {
		onComplete();
	}

	function handleBackdropClick(e: MouseEvent | KeyboardEvent) {
		// Only close on direct click/enter on backdrop, not bubbled events
		if (e.target === e.currentTarget) {
			skip();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			skip();
		} else if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			nextStep();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="onboarding-backdrop" onclick={handleBackdropClick}></div>

	<div class="onboarding-content">
		<button class="skip-button" onclick={skip} aria-label={t.onboarding.skipAriaLabel}>
			{t.onboarding.skip}
		</button>

		<div class="step-content">
			<h2 id="onboarding-title">{steps[step].title}</h2>
			<p>{steps[step].description}</p>

			<!-- Animierte Gesten-Demo (Platzhalter für SVG/Lottie) -->
			<div class="gesture-animation" data-gesture={steps[step].gesture}>
				{#if steps[step].gesture === 'keyboard'}
					<!-- Quick Win 3: Keyboard shortcuts grid -->
					<div class="keyboard-shortcuts">
						<div class="shortcut-row">
							<div class="key-group">
								<kbd class="key">↑</kbd>
								<kbd class="key">↓</kbd>
								<kbd class="key">←</kbd>
								<kbd class="key">→</kbd>
							</div>
							<span class="shortcut-label">{t.onboarding.keyboardNavigation}</span>
						</div>
						<div class="shortcut-row">
							<div class="key-group">
								<kbd class="key">Home</kbd>
							</div>
							<span class="shortcut-label">{t.onboarding.keyboardToRoot}</span>
						</div>
						<div class="shortcut-row">
							<div class="key-group">
								<kbd class="key">i</kbd>
							</div>
							<span class="shortcut-label">{t.onboarding.keyboardInputFocus}</span>
						</div>
						<div class="shortcut-row">
							<div class="key-group">
								<kbd class="key">Esc</kbd>
							</div>
							<span class="shortcut-label">{t.onboarding.keyboardClose}</span>
						</div>
					</div>
				{:else}
					<!-- Item 6: Animierte Hand-Gesten -->
					<svg viewBox="0 0 100 100" class="gesture-icon">
						{#if steps[step].gesture === 'up'}
							<!-- Item 6: Hand swipe up -->
							<g class="hand-swipe-up">
								<circle cx="50" cy="70" r="8" fill="currentColor" opacity="0.8" />
								<path
									d="M50 70 L50 30"
									stroke="currentColor"
									stroke-width="3"
									stroke-linecap="round"
									opacity="0.6"
								/>
								<path
									d="M40 40 L50 30 L60 40"
									stroke="currentColor"
									stroke-width="3"
									stroke-linecap="round"
									fill="none"
								/>
							</g>
						{:else if steps[step].gesture === 'down'}
							<!-- Item 6: Hand swipe down -->
							<g class="hand-swipe-down">
								<circle cx="50" cy="30" r="8" fill="currentColor" opacity="0.8" />
								<path
									d="M50 30 L50 70"
									stroke="currentColor"
									stroke-width="3"
									stroke-linecap="round"
									opacity="0.6"
								/>
								<path
									d="M40 60 L50 70 L60 60"
									stroke="currentColor"
									stroke-width="3"
									stroke-linecap="round"
									fill="none"
								/>
							</g>
						{:else if steps[step].gesture === 'horizontal'}
							<!-- Item 6: Hand swipe horizontal -->
							<g class="hand-swipe-horizontal">
								<circle cx="20" cy="50" r="8" fill="currentColor" opacity="0.8" />
								<path
									d="M20 50 L80 50"
									stroke="currentColor"
									stroke-width="3"
									stroke-linecap="round"
									opacity="0.6"
								/>
								<path
									d="M70 40 L80 50 L70 60"
									stroke="currentColor"
									stroke-width="3"
									stroke-linecap="round"
									fill="none"
								/>
							</g>
						{:else}
							<!-- Default: Plus-Symbol -->
							<circle cx="50" cy="50" r="20" stroke="currentColor" stroke-width="3" fill="none" />
							<path
								d="M50 40 L50 60 M40 50 L60 50"
								stroke="currentColor"
								stroke-width="3"
								stroke-linecap="round"
							/>
						{/if}
					</svg>
				{/if}
			</div>
		</div>

		<div class="onboarding-footer">
			<div class="progress-dots" role="list" aria-label={t.onboarding.tutorialProgress}>
				<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
				{#each steps as _, i (i)}
					<span
						class="dot"
						class:active={i === step}
						role="listitem"
						aria-current={i === step ? 'step' : undefined}
					></span>
				{/each}
			</div>

			<button class="next-button" onclick={nextStep}>
				{step < steps.length - 1 ? t.onboarding.next : t.onboarding.letsGo}
			</button>
		</div>
	</div>
</div>

<style>
	.onboarding-overlay {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.onboarding-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(8px);
	}

	.onboarding-content {
		position: relative;
		width: 90%;
		max-width: min(90vw, 400px);
		background: var(--traek-input-bg, rgba(30, 30, 30, 0.95));
		border: 1px solid var(--traek-input-border, #444444);
		border-radius: 24px;
		padding: 32px 24px 24px;
		color: var(--traek-node-text, #dddddd);
		animation: overlayFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes overlayFadeIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.skip-button {
		position: absolute;
		top: 16px;
		right: 16px;
		background: transparent;
		border: none;
		color: var(--traek-input-context-text, #888888);
		font-size: 14px;
		cursor: pointer;
		padding: 8px 12px;
		min-height: 44px; /* WCAG touch target */
		min-width: 44px;
	}

	.skip-button:hover {
		opacity: 1;
	}

	.step-content h2 {
		font-size: 24px;
		font-weight: 600;
		line-height: 1.2;
		margin-bottom: 12px;
	}

	.step-content p {
		font-size: 16px;
		line-height: 1.5;
		color: var(--traek-input-context-text, #888888);
		margin-bottom: 24px;
	}

	.gesture-animation {
		height: 200px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 24px 0;
	}

	.gesture-icon {
		width: 100px;
		height: 100px;
		color: var(--traek-input-dot, #00d8ff);
	}

	/* Item 6: Echte Swipe-Animationen */
	.hand-swipe-up {
		animation: handSwipeUp 1.5s ease-in-out infinite;
	}

	@keyframes handSwipeUp {
		0%,
		100% {
			transform: translateY(10px);
			opacity: 0.6;
		}
		50% {
			transform: translateY(-10px);
			opacity: 1;
		}
	}

	.hand-swipe-down {
		animation: handSwipeDown 1.5s ease-in-out infinite;
	}

	@keyframes handSwipeDown {
		0%,
		100% {
			transform: translateY(-10px);
			opacity: 0.6;
		}
		50% {
			transform: translateY(10px);
			opacity: 1;
		}
	}

	.hand-swipe-horizontal {
		animation: handSwipeHorizontal 1.5s ease-in-out infinite;
	}

	@keyframes handSwipeHorizontal {
		0%,
		100% {
			transform: translateX(-10px);
			opacity: 0.6;
		}
		50% {
			transform: translateX(10px);
			opacity: 1;
		}
	}

	/* Quick Win 3: Keyboard shortcuts styling */
	.keyboard-shortcuts {
		display: flex;
		flex-direction: column;
		gap: 12px;
		width: 100%;
		max-width: 280px;
	}

	.shortcut-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 8px 12px;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.key-group {
		display: flex;
		gap: 6px;
	}

	.key {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 32px;
		height: 32px;
		padding: 0 8px;
		background: var(--traek-input-bg, rgba(20, 20, 20, 0.95));
		border: 1px solid var(--traek-input-border, #444444);
		border-radius: 6px;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		font-size: 14px;
		font-weight: 600;
		color: var(--traek-input-dot, #00d8ff);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.1),
			0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.shortcut-label {
		font-size: 14px;
		color: var(--traek-node-text, #dddddd);
		text-align: right;
	}

	.onboarding-footer {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-top: 24px;
	}

	.progress-dots {
		display: flex;
		justify-content: center;
		gap: 8px;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--traek-input-dot-muted, #555555);
		transition: all 0.2s ease;
	}

	.dot.active {
		width: 24px;
		border-radius: 4px;
		background: var(--traek-input-dot, #00d8ff);
	}

	.next-button {
		width: 100%;
		padding: 14px 24px;
		min-height: 48px; /* WCAG touch target */
		background: var(--traek-input-button-bg, #00d8ff);
		color: var(--traek-input-button-text, #000000);
		border: none;
		border-radius: 12px;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.1s ease;
	}

	.next-button:active {
		transform: scale(0.98);
	}

	@media (prefers-reduced-motion: reduce) {
		.onboarding-content {
			animation: none;
		}
		.hand-swipe-up,
		.hand-swipe-down,
		.hand-swipe-horizontal {
			animation: none;
			opacity: 1;
		}
	}
</style>
