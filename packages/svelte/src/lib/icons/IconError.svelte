<script lang="ts">
	let {
		size = 16,
		class: className = '',
		'aria-label': ariaLabel = undefined,
		'aria-hidden': ariaHidden = true
	}: {
		size?: number;
		class?: string;
		'aria-label'?: string;
		'aria-hidden'?: boolean | 'true' | 'false';
	} = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 16 16"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	class={className}
	aria-label={ariaLabel}
	aria-hidden={ariaHidden}
>
	<circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5" />
	<path
		d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
	/>
</svg>
