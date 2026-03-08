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
	<!-- Thought bubble: main circle -->
	<circle cx="12.5" cy="10.5" r="3.5" stroke="currentColor" stroke-width="1.5" />
	<!-- Ellipsis dots suggesting thinking -->
	<circle cx="9" cy="15" r="1" fill="currentColor" />
	<circle cx="12.5" cy="16" r="1" fill="currentColor" />
	<circle cx="16" cy="15" r="1" fill="currentColor" />
</svg>
