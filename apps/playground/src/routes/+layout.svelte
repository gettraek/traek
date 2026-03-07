<script lang="ts">
	import '../app.css';

	let { children }: { children: import('svelte').Snippet } = $props();
</script>

<svelte:head>
	<title>træk Playground — Spatial AI conversations</title>
	<meta
		name="description"
		content="A hosted spatial AI conversation environment. Branch, compare, and share AI conversations — no setup required."
	/>
	<meta property="og:title" content="træk Playground" />
	<meta
		property="og:description"
		content="Branch, compare, and share AI conversations spatially. No setup."
	/>
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

{@render children()}
