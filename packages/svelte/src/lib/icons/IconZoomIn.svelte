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
	<circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5" />
	<path
		d="M6.5 4.5V8.5M4.5 6.5H8.5"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
	/>
	<path d="M10 10L13.5 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
</svg>
