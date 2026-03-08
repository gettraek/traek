<script lang="ts">
	/**
	 * ProgressBar — animated progress indicator for bulk canvas operations.
	 * Renders a slim bar that shows determinate or indeterminate progress.
	 */
	let {
		value = 0,
		max = 100,
		label,
		indeterminate = false,
		size = 'sm',
		class: className = ''
	}: {
		/** Current progress value (0–max). Ignored when indeterminate. */
		value?: number;
		/** Maximum progress value. Default: 100. */
		max?: number;
		/** Accessible label describing the operation in progress. */
		label?: string;
		/** When true, renders an indeterminate (looping) animation. */
		indeterminate?: boolean;
		/** Bar height. 'xs' = 2px, 'sm' = 4px (default), 'md' = 6px. */
		size?: 'xs' | 'sm' | 'md';
		class?: string;
	} = $props();

	const percent = $derived(indeterminate ? 0 : Math.min(100, Math.max(0, (value / max) * 100)));
</script>

<div
	class="progress-bar progress-bar--{size} {className}"
	role="progressbar"
	aria-valuenow={indeterminate ? undefined : value}
	aria-valuemin={indeterminate ? undefined : 0}
	aria-valuemax={indeterminate ? undefined : max}
	aria-label={label}
	aria-valuetext={indeterminate ? 'Loading…' : `${Math.round(percent)}%`}
>
	<div
		class="progress-bar__fill"
		class:progress-bar__fill--indeterminate={indeterminate}
		style:width={indeterminate ? undefined : `${percent}%`}
	></div>
</div>

<style>
	@layer base {
		@keyframes progress-indeterminate {
			0% {
				left: -35%;
				right: 100%;
			}
			40% {
				left: 30%;
				right: -5%;
			}
			100% {
				left: 110%;
				right: -10%;
			}
		}

		.progress-bar {
			position: relative;
			width: 100%;
			background: var(--traek-node-border, rgba(255, 255, 255, 0.08));
			border-radius: 999px;
			overflow: hidden;
		}

		.progress-bar--xs {
			height: 2px;
		}

		.progress-bar--sm {
			height: 4px;
		}

		.progress-bar--md {
			height: 6px;
		}

		.progress-bar__fill {
			height: 100%;
			background: linear-gradient(
				90deg,
				var(--traek-node-user-border-top, #00d8ff),
				var(--traek-input-button-bg, #00d8ff)
			);
			border-radius: inherit;
			transition: width 0.25s ease-out;
			box-shadow: 0 0 8px var(--traek-thought-panel-glow, rgba(0, 216, 255, 0.4));
		}

		.progress-bar__fill--indeterminate {
			position: absolute;
			top: 0;
			bottom: 0;
			width: auto;
			animation: progress-indeterminate 1.4s ease-in-out infinite;
			transition: none;
		}

		@media (prefers-reduced-motion: reduce) {
			.progress-bar__fill {
				transition: none;
			}

			.progress-bar__fill--indeterminate {
				/* Static center bar as fallback */
				animation: none;
				left: 20%;
				right: 20%;
				opacity: 0.6;
			}
		}
	}
</style>
