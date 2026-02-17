<script lang="ts">
	import { slide } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	import type { ReplayController } from '../persistence/ReplayController.svelte';
	import { getTraekI18n } from '../i18n/index';

	const t = getTraekI18n();

	let { controller }: { controller: ReplayController } = $props();

	const isPlaying = $derived(controller.isPlaying);
	const currentIndex = $derived(controller.currentIndex);
	const totalNodes = $derived(controller.totalNodes);
	const speed = $derived(controller.speed);

	const progress = $derived(totalNodes > 0 ? ((currentIndex + 1) / totalNodes) * 100 : 0);
	const isAtStart = $derived(currentIndex < 0);
	const isAtEnd = $derived(currentIndex >= totalNodes - 1);

	const speedOptions = [0.5, 1, 2, 4];
	let showSpeedMenu = $state(false);

	function togglePlayPause() {
		if (isPlaying) {
			controller.pause();
		} else {
			controller.play();
		}
	}

	function handleStepBack() {
		controller.stepBack();
	}

	function handleStepForward() {
		controller.step();
	}

	function handleReset() {
		controller.reset();
	}

	function handleSeek(e: Event) {
		const target = e.target as HTMLInputElement;
		const index = parseInt(target.value, 10) - 1;
		controller.seekTo(index);
	}

	function handleSpeedChange(newSpeed: number) {
		controller.setSpeed(newSpeed);
		showSpeedMenu = false;
	}

	function formatSpeed(s: number): string {
		return s === 1 ? '1x' : `${s}x`;
	}
</script>

<div class="replay-controls">
	<div class="replay-header">
		<div class="replay-title">
			<Icon icon="mdi:play-circle-outline" width="18" height="18" />
			<span>Replay Mode</span>
		</div>
		<div class="replay-counter">
			{currentIndex + 1} / {totalNodes}
		</div>
	</div>

	<div class="replay-timeline">
		<input
			type="range"
			class="replay-slider"
			min="0"
			max={totalNodes}
			value={currentIndex + 1}
			oninput={handleSeek}
			disabled={totalNodes === 0}
		/>
		<div class="replay-progress" style:width="{progress}%"></div>
	</div>

	<div class="replay-buttons">
		<button
			type="button"
			class="replay-btn replay-btn-icon"
			onclick={handleReset}
			disabled={isAtStart}
			title={t.replay.stepBack}
		>
			<Icon icon="mdi:skip-previous" width="20" height="20" />
		</button>

		<button
			type="button"
			class="replay-btn replay-btn-icon"
			onclick={handleStepBack}
			disabled={isAtStart}
			title={t.replay.stepBack}
		>
			<Icon icon="mdi:step-backward" width="20" height="20" />
		</button>

		<button
			type="button"
			class="replay-btn replay-btn-play"
			onclick={togglePlayPause}
			disabled={isAtEnd && !isPlaying}
			title={isPlaying ? t.replay.pause : t.replay.play}
		>
			<Icon icon={isPlaying ? 'mdi:pause' : 'mdi:play'} width="24" height="24" />
		</button>

		<button
			type="button"
			class="replay-btn replay-btn-icon"
			onclick={handleStepForward}
			disabled={isAtEnd}
			title={t.replay.stepForward}
		>
			<Icon icon="mdi:step-forward" width="20" height="20" />
		</button>

		<div class="replay-speed">
			<button
				type="button"
				class="replay-btn replay-btn-speed"
				onclick={() => (showSpeedMenu = !showSpeedMenu)}
				title="Playback speed"
			>
				<Icon icon="mdi:speedometer" width="18" height="18" />
				<span>{formatSpeed(speed)}</span>
			</button>

			{#if showSpeedMenu}
				<div class="replay-speed-menu" transition:slide={{ duration: 150 }}>
					{#each speedOptions as speedOpt (speedOpt)}
						<button
							type="button"
							class="replay-speed-option"
							class:active={speed === speedOpt}
							onclick={() => handleSpeedChange(speedOpt)}
						>
							{formatSpeed(speedOpt)}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.replay-controls {
		position: fixed;
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		max-width: 500px;
		padding: 16px;
		background: var(--traek-input-bg, rgba(30, 30, 30, 0.95));
		border: 1px solid var(--traek-input-border, #444444);
		border-radius: 16px;
		box-shadow: 0 8px 32px var(--traek-input-shadow, rgba(0, 0, 0, 0.4));
		backdrop-filter: blur(16px);
		z-index: 100;
	}

	.replay-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}

	.replay-title {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--traek-textnode-text, #dddddd);
		font-size: 14px;
		font-weight: 600;
	}

	.replay-counter {
		color: var(--traek-thought-row-muted-3, #999999);
		font-size: 12px;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.replay-timeline {
		position: relative;
		height: 6px;
		margin-bottom: 16px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		overflow: hidden;
	}

	.replay-progress {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		background: var(--traek-input-button-bg, #00d8ff);
		border-radius: 3px;
		transition: width 0.2s;
		pointer-events: none;
	}

	.replay-slider {
		position: absolute;
		top: 50%;
		left: 0;
		width: 100%;
		height: 20px;
		margin: 0;
		transform: translateY(-50%);
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		cursor: pointer;
		z-index: 1;
	}

	.replay-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 14px;
		height: 14px;
		background: var(--traek-input-button-bg, #00d8ff);
		border: 2px solid var(--traek-input-bg, rgba(30, 30, 30, 0.95));
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 216, 255, 0.4);
	}

	.replay-slider::-moz-range-thumb {
		width: 14px;
		height: 14px;
		background: var(--traek-input-button-bg, #00d8ff);
		border: 2px solid var(--traek-input-bg, rgba(30, 30, 30, 0.95));
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 216, 255, 0.4);
	}

	.replay-slider:disabled {
		cursor: not-allowed;
	}

	.replay-slider:disabled::-webkit-slider-thumb {
		background: var(--traek-thought-row-muted-4, #666666);
		box-shadow: none;
	}

	.replay-slider:disabled::-moz-range-thumb {
		background: var(--traek-thought-row-muted-4, #666666);
		box-shadow: none;
	}

	.replay-buttons {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	.replay-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 8px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 10px;
		color: var(--traek-textnode-text, #dddddd);
		font: inherit;
		font-size: 13px;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s,
			opacity 0.15s,
			transform 0.15s;
	}

	.replay-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.18);
	}

	.replay-btn:active:not(:disabled) {
		transform: scale(0.96);
	}

	.replay-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.replay-btn:focus-visible {
		outline: 2px solid var(--traek-input-button-bg, #00d8ff);
		outline-offset: 2px;
	}

	.replay-btn-play {
		width: 48px;
		height: 48px;
		background: var(--traek-input-button-bg, #00d8ff);
		border-color: var(--traek-input-button-bg, #00d8ff);
		color: var(--traek-input-button-text, #000000);
	}

	.replay-btn-play:hover:not(:disabled) {
		background: rgba(0, 216, 255, 0.9);
		border-color: rgba(0, 216, 255, 0.9);
	}

	.replay-btn-icon {
		width: 40px;
		height: 40px;
	}

	.replay-speed {
		position: relative;
	}

	.replay-btn-speed {
		padding: 8px 12px;
	}

	.replay-speed-menu {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		margin-bottom: 8px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 6px;
		background: var(--traek-thought-panel-bg, rgba(22, 22, 22, 0.95));
		border: 1px solid var(--traek-thought-panel-border, #333333);
		border-radius: 10px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(16px);
	}

	.replay-speed-option {
		padding: 8px 16px;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: var(--traek-thought-row-muted-2, #aaaaaa);
		font: inherit;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition:
			background 0.12s,
			color 0.12s;
		white-space: nowrap;
	}

	.replay-speed-option:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.replay-speed-option.active {
		background: var(--traek-input-button-bg, #00d8ff);
		color: var(--traek-input-button-text, #000000);
	}

	@media (max-width: 768px) {
		.replay-controls {
			max-width: calc(100% - 40px);
		}

		.replay-btn-icon {
			width: 36px;
			height: 36px;
		}

		.replay-btn-play {
			width: 44px;
			height: 44px;
		}
	}
</style>
