<script lang="ts">
	import '../app.css';
	import { ThemeProvider } from '@traek/sdk';
</script>

<svelte:head>
	<title>Træk - spatial conversation engine</title>
	<meta
		name="description"
		content="Træk is a spatial conversation engine for building non-linear AI chat UIs in Svelte."
	/>
	<meta name="keywords" content="Træk, Svelte, SvelteKit, AI, Chat, Conversation, Engine" />
	<meta name="author" content="Nico Hülscher" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<ThemeProvider>
	<slot />
</ThemeProvider>
