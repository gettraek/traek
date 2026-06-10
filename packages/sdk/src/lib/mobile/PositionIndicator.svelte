<script lang="ts">
	import { onMount } from 'svelte';
	import { getTraekI18n } from '../i18n/index';

	const t = getTraekI18n();

	let {
		depth,
		maxDepth,
		siblingIndex,
		siblingTotal,
		hasChildren,
		childCount = 0,
		showLabels = false
	}: {
		depth: number;
		maxDepth: number;
		siblingIndex: number;
		siblingTotal: number;
		hasChildren: boolean;
		childCount?: number;
		showLabels?: boolean;
	} = $props();

	let showTooltip = $state(false);
	let tooltipTimer: ReturnType<typeof setTimeout> | null = null;

	// Quick Win 2: Auto-show tooltip on first load
	onMount(() => {
		const TOOLTIP_SHOWN_KEY = 'traek-position-tooltip-shown';
		const hasShownTooltip = localStorage.getItem(TOOLTIP_SHOWN_KEY);

		if (!hasShownTooltip) {
			// Show tooltip automatically for 3 seconds on first load
			showTooltip = true;
			tooltipTimer = setTimeout(() => {
				showTooltip = false;
			}, 3000);

			// Mark as shown
			localStorage.setItem(TOOLTIP_SHOWN_KEY, 'true');
		}

		return () => {
			if (tooltipTimer) clearTimeout(tooltipTimer);
		};
	});

	function handleInteraction() {
		showTooltip = true;
		if (tooltipTimer) clearTimeout(tooltipTimer);
		tooltipTimer = setTimeout(() => {
			showTooltip = false;
		}, 3000);
	}
</script>

<div
	class="position-indicator"
	role="status"
	aria-live="polite"
	aria-label={t.positionIndicator.positionAriaLabel(
		depth + 1,
		maxDepth + 1,
		siblingIndex + 1,
		siblingTotal
	)}
	onmouseenter={handleInteraction}
	ontouchstart={handleInteraction}
>
	<!-- Depth -->
	<div class="indicator-item">
		{#if showLabels}
			<span class="item-label">{t.positionIndicator.levelLabel}</span>
		{/if}
		<span class="depth-label">{depth + 1} / {maxDepth + 1}</span>
	</div>

	<!-- Siblings (Item 5: Truncation bei >5) -->
	{#if siblingTotal > 1}
		<div class="separator" aria-hidden="true">•</div>
		<div class="indicator-item">
			{#if showLabels}
				<span class="item-label">{t.positionIndicator.positionLabel}</span>
			{/if}
			{#if siblingTotal <= 5}
				<!-- Item 5: Normal dots wenn ≤5 -->
				<div class="sibling-dots" role="list" aria-label={t.positionIndicator.siblingDotsAriaLabel}>
					<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
					{#each Array(siblingTotal) as _, i (i)}
						<span
							class="dot"
							class:active={i === siblingIndex}
							role="listitem"
							aria-label={t.positionIndicator.siblingDotAriaLabel(i + 1, siblingTotal)}
							aria-current={i === siblingIndex ? 'true' : undefined}
						></span>
					{/each}
				</div>
			{:else}
				<!-- Item 5: Text-Fallback bei >5 Siblings -->
				<span
					class="sibling-text"
					aria-label={t.positionIndicator.siblingPositionAriaLabel(siblingIndex + 1, siblingTotal)}
				>
					{siblingIndex + 1}/{siblingTotal}
				</span>
			{/if}
		</div>
	{/if}

	<!-- Children -->
	{#if hasChildren}
		<div class="separator" aria-hidden="true">•</div>
		<div class="indicator-item">
			{#if showLabels}
				<span class="item-label">{t.positionIndicator.childrenLabel}</span>
			{/if}
			<span class="branch-icon" title={t.positionIndicator.childCountTitle(childCount)}>
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
					<path
						d="M7 2v6M7 8c-2 0-3 2-5 2M7 8c2 0 3 2 5 2"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
				</svg>
				{#if childCount > 1}
					<span class="child-count">{childCount}</span>
				{/if}
			</span>
		</div>
	{/if}

	<!-- Tooltip -->
	{#if showTooltip}
		<div class="position-tooltip" role="tooltip">
			<div class="tooltip-row">
				<strong>{t.positionIndicator.tooltipLevelLabel(depth + 1, maxDepth + 1)}</strong>
				{t.positionIndicator.tooltipLevelText(depth + 1)}
			</div>
			{#if siblingTotal > 1}
				<div class="tooltip-row">
					<strong
						>{t.positionIndicator.tooltipAlternativeLabel(siblingIndex + 1, siblingTotal)}</strong
					>
					{t.positionIndicator.tooltipAlternativeText}
				</div>
			{/if}
			{#if hasChildren}
				<div class="tooltip-row">
					<strong>{t.positionIndicator.tooltipChildrenLabel(childCount)}</strong>
					{t.positionIndicator.tooltipChildrenText}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.position-indicator {
		position: relative;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		background: var(--traek-input-context-bg, rgba(0, 0, 0, 0.6));
		backdrop-filter: blur(12px);
		border-radius: 24px;
		font-size: 12px;
		color: var(--traek-input-context-text, #888888);
		user-select: none;
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: all 0.2s ease;
	}

	.position-indicator:hover,
	.position-indicator:focus-within {
		background: var(--traek-input-context-bg, rgba(0, 0, 0, 0.8));
		border-color: var(--traek-input-dot, #00d8ff);
	}

	.indicator-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.item-label {
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		opacity: 0.6;
	}

	.separator {
		opacity: 0.3;
		margin: 0 4px;
	}

	.depth-label {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		color: var(--traek-node-text, #dddddd);
	}

	.sibling-dots {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--traek-input-dot-muted, #555555);
		transition: all 0.2s ease;
	}

	.dot.active {
		background: var(--traek-input-dot, #00d8ff);
		width: 8px;
		height: 8px;
		box-shadow: 0 0 8px var(--traek-input-dot, #00d8ff);
	}

	.branch-icon {
		display: flex;
		align-items: center;
		gap: 3px;
		color: var(--traek-node-text, #dddddd);
	}

	.child-count {
		font-size: 11px;
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}

	/* Item 5: Text-Fallback für viele Siblings */
	.sibling-text {
		font-size: 12px;
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		color: var(--traek-node-text, #dddddd);
	}

	/* Tooltip */
	.position-tooltip {
		position: absolute;
		top: calc(100% + 12px);
		left: 50%;
		transform: translateX(-50%);
		min-width: 280px;
		max-width: 320px;
		max-height: 150px;
		overflow-y: auto;
		background: rgba(0, 0, 0, 0.95);
		backdrop-filter: blur(16px);
		border: 1px solid var(--traek-input-border, #444444);
		border-radius: 12px;
		padding: 12px 16px;
		font-size: 13px;
		line-height: 1.4;
		color: var(--traek-node-text, #dddddd);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		z-index: 100;
		animation: tooltipFadeIn 0.2s ease;
	}

	.position-tooltip::before {
		content: '';
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 6px solid transparent;
		border-bottom-color: rgba(0, 0, 0, 0.95);
	}

	.tooltip-row {
		padding: 6px 0;
	}

	.tooltip-row:not(:last-child) {
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.tooltip-row strong {
		color: var(--traek-input-dot, #00d8ff);
		display: block;
		margin-bottom: 2px;
	}

	@keyframes tooltipFadeIn {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.position-tooltip {
			animation: none;
		}
	}
</style>
