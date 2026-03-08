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
  Focus mode icon: crosshair/target — focus on a single node.
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
	<circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5" />
	<circle cx="8" cy="8" r="1.5" fill="currentColor" />
	<path d="M8 1V3.5M8 12.5V15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
	<path d="M1 8H3.5M12.5 8H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
</svg>
