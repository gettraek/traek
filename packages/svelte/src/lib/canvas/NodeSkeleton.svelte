<script lang="ts">
	/** Number of skeleton lines to render. Only used for 'text' and 'code' variants. */
	let {
		lines = 3,
		variant = 'text'
	}: {
		lines?: number;
		/** Visual variant for different content types. */
		variant?: 'text' | 'image' | 'code';
	} = $props();

	const TEXT_WIDTHS = ['85%', '72%', '60%'];
	const CODE_WIDTHS = ['78%', '55%', '88%', '42%', '70%'];

	const lineWidths = $derived(
		variant === 'code'
			? Array.from({ length: lines }, (_, i) => CODE_WIDTHS[i % CODE_WIDTHS.length])
			: Array.from({ length: lines }, (_, i) => TEXT_WIDTHS[i % TEXT_WIDTHS.length])
	);
</script>

{#if variant === 'image'}
	<div class="skeleton skeleton--image" aria-hidden="true">
		<div class="skeleton-image-block shimmer-block"></div>
		<div class="skeleton-image-footer">
			<div class="skeleton-line" style:width="40%"></div>
		</div>
	</div>
{:else if variant === 'code'}
	<div class="skeleton skeleton--code" aria-hidden="true">
		<div class="skeleton-code-header">
			<div class="skeleton-line skeleton-line--sm" style:width="60px"></div>
			<div class="skeleton-line skeleton-line--sm" style:width="32px"></div>
		</div>
		<div class="skeleton-code-body">
			{#each lineWidths as width, i (i)}
				<div
					class="skeleton-line skeleton-line--mono"
					style:width
					style:animation-delay="{i * 0.1}s"
				></div>
			{/each}
		</div>
	</div>
{:else}
	<div class="skeleton" aria-hidden="true">
		{#each lineWidths as width, i (i)}
			<div class="skeleton-line" style:width style:animation-delay="{i * 0.15}s"></div>
		{/each}
	</div>
{/if}

<style>
	@layer base {
		@keyframes skeleton-shimmer {
			0% {
				background-position: -200% center;
			}
			100% {
				background-position: 200% center;
			}
		}

		.skeleton {
			display: flex;
			flex-direction: column;
			gap: 10px;
			padding: 4px 0;
		}

		.skeleton--image {
			gap: 0;
			padding: 0;
		}

		.skeleton--code {
			gap: 0;
			padding: 0;
			border-radius: 6px;
			overflow: hidden;
			background: var(--traek-code-bg, rgba(0, 0, 0, 0.25));
		}

		.skeleton-line {
			height: 12px;
			border-radius: 6px;
			background: linear-gradient(
				90deg,
				var(--traek-node-border, rgba(255, 255, 255, 0.08)) 25%,
				var(--traek-node-active-border, rgba(0, 216, 255, 0.12)) 50%,
				var(--traek-node-border, rgba(255, 255, 255, 0.08)) 75%
			);
			background-size: 200% 100%;
			animation: skeleton-shimmer 1.6s ease-in-out infinite;
		}

		.skeleton-line--sm {
			height: 10px;
		}

		.skeleton-line--mono {
			height: 11px;
			border-radius: 3px;
		}

		/* Image variant */
		.skeleton-image-block {
			height: 160px;
			border-radius: 6px 6px 0 0;
		}

		.skeleton-image-footer {
			display: flex;
			padding: 8px 10px;
			gap: 6px;
		}

		/* Code variant */
		.skeleton-code-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 8px 12px;
			border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		}

		.skeleton-code-body {
			display: flex;
			flex-direction: column;
			gap: 8px;
			padding: 10px 12px 12px;
		}

		/* Shared shimmer gradient */
		.shimmer-block {
			background: linear-gradient(
				90deg,
				var(--traek-node-border, rgba(255, 255, 255, 0.06)) 25%,
				var(--traek-node-active-border, rgba(0, 216, 255, 0.1)) 50%,
				var(--traek-node-border, rgba(255, 255, 255, 0.06)) 75%
			);
			background-size: 200% 100%;
			animation: skeleton-shimmer 1.8s ease-in-out infinite;
		}

		@media (prefers-reduced-motion: reduce) {
			.skeleton-line,
			.shimmer-block {
				animation: none;
				opacity: 0.4;
			}
		}
	}
</style>
