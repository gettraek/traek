<script lang="ts">
	let { size = 24, class: className = '' }: { size?: number; class?: string } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	class={className}
	aria-hidden="true"
>
	<rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="2" />
	<path d="M7 9H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
	<path d="M7 12H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
	<path d="M7 15H13" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg>
