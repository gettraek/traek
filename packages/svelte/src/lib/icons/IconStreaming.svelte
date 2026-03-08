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
  Streaming status icon: three dots in a wave pattern.
  Apply CSS animation (e.g. @keyframes pulse with staggered delay) to signal active streaming.
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
	<circle cx="3.5" cy="9" r="1.5" fill="currentColor" />
	<circle cx="8" cy="9" r="1.5" fill="currentColor" />
	<circle cx="12.5" cy="9" r="1.5" fill="currentColor" />
</svg>
