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
	<!-- Sun / circle in top-right -->
	<circle cx="16" cy="8" r="2" stroke="currentColor" stroke-width="1.5" />
	<!-- Mountain silhouette -->
	<path
		d="M3 16L8 10L12 14L15 11L21 17"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>
