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
  Branch icon: Y-fork representing canvas node branching.
  A trunk line splits into two branches, with filled circles at each tip.
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
	<path
		d="M8 13V7M8 7L4.5 3M8 7L11.5 3"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<circle cx="8" cy="13.5" r="1.5" fill="currentColor" />
	<circle cx="4" cy="2.5" r="1.5" fill="currentColor" />
	<circle cx="12" cy="2.5" r="1.5" fill="currentColor" />
</svg>
