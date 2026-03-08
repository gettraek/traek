<script lang="ts">
	let {
		size = 24,
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
	viewBox="0 0 24 24"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	class={className}
	aria-label={ariaLabel}
	aria-hidden={ariaHidden}
>
	<rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.5" />
	<path
		d="M9 10L7 12L9 14"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path
		d="M15 10L17 12L15 14"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M13.5 8.5L10.5 15.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
</svg>
