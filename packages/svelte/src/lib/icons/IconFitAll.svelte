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

<!--
  Fit-all icon: frame corners around a checkmark — "fit all nodes into view".
-->
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
	<rect
		x="2"
		y="2"
		width="12"
		height="12"
		stroke="currentColor"
		stroke-width="1.5"
		fill="none"
		rx="2"
	/>
	<path
		d="M5 8L7 10.5L11 5.5"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>
