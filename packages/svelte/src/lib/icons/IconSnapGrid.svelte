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
	<rect x="1" y="1" width="4" height="4" rx="0.5" stroke="currentColor" stroke-width="1.5" />
	<rect x="6" y="1" width="4" height="4" rx="0.5" stroke="currentColor" stroke-width="1.5" />
	<rect x="11" y="1" width="4" height="4" rx="0.5" stroke="currentColor" stroke-width="1.5" />
	<rect x="1" y="6" width="4" height="4" rx="0.5" stroke="currentColor" stroke-width="1.5" />
	<rect x="11" y="6" width="4" height="4" rx="0.5" stroke="currentColor" stroke-width="1.5" />
	<rect x="1" y="11" width="4" height="4" rx="0.5" stroke="currentColor" stroke-width="1.5" />
	<rect x="6" y="11" width="4" height="4" rx="0.5" stroke="currentColor" stroke-width="1.5" />
	<rect x="11" y="11" width="4" height="4" rx="0.5" stroke="currentColor" stroke-width="1.5" />
</svg>
