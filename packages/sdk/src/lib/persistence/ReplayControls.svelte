<script lang="ts">
	import type { ReplayController } from './ReplayController.svelte.js';

	let { controller }: { controller: ReplayController } = $props();

	const speeds = [0.5, 1, 2, 5];
</script>

<div class="traek-replay-controls">
	<div class="traek-replay-controls__buttons">
		<button
			type="button"
			class="traek-replay-btn"
			title="Step back"
			disabled={controller.currentIndex < 0}
			onclick={() => controller.stepBack()}
		>
			<svg viewBox="0 0 24 24" width="16" height="16">
				<path fill="currentColor" d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
			</svg>
		</button>

		<button
			type="button"
			class="traek-replay-btn traek-replay-btn--primary"
			title={controller.isPlaying ? 'Pause' : 'Play'}
			disabled={controller.currentIndex >= controller.totalNodes - 1 && !controller.isPlaying}
			onclick={() => (controller.isPlaying ? controller.pause() : controller.play())}
		>
			{#if controller.isPlaying}
				<svg viewBox="0 0 24 24" width="18" height="18">
					<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
				</svg>
			{:else}
				<svg viewBox="0 0 24 24" width="18" height="18">
					<path fill="currentColor" d="M8 5v14l11-7z" />
				</svg>
			{/if}
		</button>

		<button
			type="button"
			class="traek-replay-btn"
			title="Step forward"
			disabled={controller.currentIndex >= controller.totalNodes - 1}
			onclick={() => controller.step()}
		>
			<svg viewBox="0 0 24 24" width="16" height="16">
				<path fill="currentColor" d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
			</svg>
		</button>
	</div>

	<div class="traek-replay-controls__scrubber">
		<input
			type="range"
			min="-1"
			max={controller.totalNodes - 1}
			value={controller.currentIndex}
			oninput={(e) => controller.seekTo(parseInt((e.currentTarget as HTMLInputElement).value, 10))}
		/>
		<span class="traek-replay-controls__progress">
			{controller.currentIndex + 1}/{controller.totalNodes}
		</span>
	</div>

	<div class="traek-replay-controls__speed">
		{#each speeds as s (s)}
			<button
				type="button"
				class="traek-replay-speed-btn"
				class:active={controller.speed === s}
				onclick={() => controller.setSpeed(s)}
			>
				{s}x
			</button>
		{/each}
	</div>
</div>

<style>
	.traek-replay-controls {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 16px;
		background: var(--traek-replay-bg, rgba(30, 30, 30, 0.9));
		backdrop-filter: blur(12px);
		border: 1px solid var(--traek-replay-border, #444444);
		border-radius: 12px;
		color: var(--traek-replay-text, #dddddd);
		font-size: 13px;
	}

	.traek-replay-controls__buttons {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.traek-replay-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 8px;
		background: transparent;
		color: var(--traek-replay-btn-text, #cccccc);
		cursor: pointer;
		transition: background 0.1s;
	}

	.traek-replay-btn:hover:not(:disabled) {
		background: var(--traek-replay-btn-hover, rgba(255, 255, 255, 0.1));
	}

	.traek-replay-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.traek-replay-btn--primary {
		width: 36px;
		height: 36px;
		background: var(--traek-replay-btn-primary-bg, rgba(0, 216, 255, 0.15));
		color: var(--traek-replay-btn-primary-text, #00d8ff);
	}

	.traek-replay-btn--primary:hover:not(:disabled) {
		background: var(--traek-replay-btn-primary-hover, rgba(0, 216, 255, 0.25));
	}

	.traek-replay-controls__scrubber {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
	}

	.traek-replay-controls__scrubber input[type='range'] {
		flex: 1;
		height: 4px;
		appearance: none;
		background: var(--traek-replay-scrubber-track, #444444);
		border-radius: 2px;
		outline: none;
	}

	.traek-replay-controls__scrubber input[type='range']::-webkit-slider-thumb {
		appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--traek-replay-scrubber-thumb, #00d8ff);
		cursor: pointer;
	}

	.traek-replay-controls__progress {
		font-variant-numeric: tabular-nums;
		min-width: 4em;
		text-align: right;
		color: var(--traek-replay-progress-text, #888888);
		font-size: 12px;
	}

	.traek-replay-controls__speed {
		display: flex;
		gap: 2px;
	}

	.traek-replay-speed-btn {
		padding: 2px 6px;
		border: 1px solid transparent;
		border-radius: 4px;
		background: transparent;
		color: var(--traek-replay-speed-text, #888888);
		font-size: 11px;
		cursor: pointer;
		transition:
			background 0.1s,
			color 0.1s;
	}

	.traek-replay-speed-btn:hover {
		background: var(--traek-replay-speed-hover, rgba(255, 255, 255, 0.06));
	}

	.traek-replay-speed-btn.active {
		background: var(--traek-replay-speed-active-bg, rgba(0, 216, 255, 0.15));
		color: var(--traek-replay-speed-active-text, #00d8ff);
		border-color: var(--traek-replay-speed-active-border, rgba(0, 216, 255, 0.3));
	}
</style>
