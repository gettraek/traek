<script lang="ts">
	import type { NodeColor } from '../TraekEngine.svelte';

	const COLORS: { value: NodeColor; label: string }[] = [
		{ value: 'red', label: 'Red' },
		{ value: 'orange', label: 'Orange' },
		{ value: 'yellow', label: 'Yellow' },
		{ value: 'green', label: 'Green' },
		{ value: 'blue', label: 'Blue' },
		{ value: 'purple', label: 'Purple' },
		{ value: 'pink', label: 'Pink' },
		{ value: 'cyan', label: 'Cyan' }
	];

	let {
		value = $bindable<NodeColor | null>(null),
		onchange
	}: {
		value?: NodeColor | null;
		onchange?: (color: NodeColor | null) => void;
	} = $props();

	function select(color: NodeColor | null) {
		value = color;
		onchange?.(color);
	}
</script>

<div class="color-picker" role="group" aria-label="Node color">
	<button
		class="swatch swatch--none"
		class:selected={value == null}
		onclick={() => select(null)}
		aria-label="No color"
		title="None"
	>
		<span class="swatch-x">×</span>
	</button>
	{#each COLORS as { value: color, label } (color)}
		<button
			class="swatch"
			class:selected={value === color}
			style="--c: var(--traek-color-{color})"
			onclick={() => select(color)}
			aria-label={label}
			aria-pressed={value === color}
			title={label}
		></button>
	{/each}
</div>

<style>
	.color-picker {
		display: flex;
		gap: 4px;
		padding: 6px;
		flex-wrap: wrap;
		max-width: 200px;
	}

	.swatch {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: 2px solid transparent;
		background: var(--c, transparent);
		cursor: pointer;
		transition:
			transform 0.1s,
			border-color 0.1s;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.swatch:hover {
		transform: scale(1.2);
	}

	.swatch.selected {
		border-color: white;
		transform: scale(1.15);
	}

	.swatch--none {
		background: rgba(255, 255, 255, 0.08);
		font-size: 14px;
		color: rgba(255, 255, 255, 0.5);
	}

	.swatch-x {
		line-height: 1;
	}
</style>
