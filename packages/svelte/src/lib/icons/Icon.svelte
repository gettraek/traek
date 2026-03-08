<script lang="ts">
	import { ICONS, type IconName } from './icons.js';

	interface Props {
		name: IconName;
		size?: number;
		strokeWidth?: number;
		class?: string;
		'aria-label'?: string;
		'aria-hidden'?: boolean | 'true' | 'false';
	}

	let { name, size = 24, strokeWidth = 2, class: className = '', ...rest }: Props = $props();

	const def = $derived(ICONS[name]);
	const label = $derived(rest['aria-label']);
	const isHidden = $derived(rest['aria-hidden'] ?? (label ? undefined : true));
</script>

{#if def}
	<svg
		viewBox={def.viewBox ?? '0 0 24 24'}
		width={size}
		height={size}
		fill="none"
		stroke="currentColor"
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
		class={className}
		aria-label={label}
		aria-hidden={isHidden}
		role={label ? 'img' : undefined}
	>
		{#each def.elements as el, i (i)}
			{#if el.type === 'path'}
				<path d={el.d} fill={el.fill ?? 'none'} stroke={el.stroke ?? 'currentColor'} />
			{:else if el.type === 'circle'}
				<circle
					cx={el.cx}
					cy={el.cy}
					r={el.r}
					fill={el.fill ?? 'none'}
					stroke={el.stroke === 'none' ? 'none' : (el.stroke ?? 'currentColor')}
				/>
			{:else if el.type === 'rect'}
				<rect
					x={el.x}
					y={el.y}
					width={el.width}
					height={el.height}
					rx={el.rx}
					fill={el.fill ?? 'none'}
					stroke={el.stroke === 'none' ? 'none' : (el.stroke ?? 'currentColor')}
				/>
			{/if}
		{/each}
	</svg>
{/if}
