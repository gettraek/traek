<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { GravityDotsBackground, ChatList, ConversationStore, track } from '@traek/sdk';

	const store = new ConversationStore();

	onMount(() => {
		store.init();
		return () => store.destroy();
	});

	async function newChat() {
		track('demo-new-chat');
		const id = await store.create('New chat');
		goto(resolve('/demo/[id]', { id }));
	}

	function open(id: string) {
		track('demo-open-conversation', { conversationId: id });
		goto(resolve('/demo/[id]', { id }));
	}
</script>

<div class="demo-wrap">
	<GravityDotsBackground />
	<div class="demo-list">
		<header>
			<h1>træk</h1>
			<p class="header-desc">Follow ideas, not threads.</p>
			<div class="info-box" role="status">
				<p>
					<strong>Everything is stored directly on your device.</strong> Chats and layout are persisted
					locally (IndexedDB with localStorage fallback). Nothing is sent anywhere except your messages
					to the OpenAI API (via the demo backend).
				</p>
				<p>
					This demo showcases <strong>træk</strong> — a spatial conversation engine for building non‑linear
					AI chat UIs in Svelte.
				</p>
			</div>
		</header>
		<div class="chatlist-wrap">
			<ChatList {store} onSelect={open} onCreate={newChat} />
		</div>
		<p class="home">
			<a href={resolve('/')} data-umami-event="demo-nav-home">← Home</a>
		</p>
	</div>
</div>

<style>
	.demo-wrap {
		position: relative;
		min-height: 100vh;
		overflow: hidden;
	}

	/* —— Content (above background) —— */
	.demo-list {
		position: relative;
		z-index: 1;
		max-width: 32rem;
		margin: 0 auto;
		padding: 2.5rem 1.25rem 3rem;
		font-family: system-ui, sans-serif;
		color: var(--traek-demo-text-main, #e4e4e7);
	}
	header {
		margin-bottom: 1.5rem;
	}
	h1 {
		font-size: 1.65rem;
		font-weight: 600;
		margin: 0 0 0.25rem 0;
		color: var(--traek-demo-text-strong, #fafafa);
		letter-spacing: -0.02em;
	}
	.header-desc {
		margin: 0 0 1rem 0;
		color: var(--traek-demo-text-muted-1, #a1a1aa);
		font-size: 0.9rem;
	}
	.info-box {
		margin-bottom: 1.25rem;
		padding: 1rem 1.15rem;
		background: var(--traek-demo-panel-bg-1, rgba(24, 24, 27, 0.85));
		border: 1px solid var(--traek-demo-border-soft, rgba(255, 255, 255, 0.1));
		border-radius: 0.5rem;
		font-size: 0.875rem;
		line-height: 1.55;
		color: var(--traek-demo-text-muted-2, #d4d4d8);
		backdrop-filter: blur(8px);
		box-shadow: var(--traek-shadow-demo-info);
	}
	.info-box p {
		margin: 0 0 0.5rem 0;
	}
	.info-box p:last-child {
		margin-bottom: 0;
	}
	.info-box strong {
		color: var(--traek-demo-text-muted-3, #f4f4f5);
		font-weight: 600;
	}
	.chatlist-wrap {
		margin-bottom: 1.5rem;
		border-radius: 0.5rem;
		overflow: hidden;
		border: 1px solid var(--traek-demo-border-soft, rgba(255, 255, 255, 0.1));
		background: var(--traek-demo-panel-bg-1, rgba(24, 24, 27, 0.85));
		backdrop-filter: blur(8px);
		max-height: 60vh;
	}
	.home {
		margin-top: 2rem;
		font-size: 0.9rem;
	}
	.home a {
		color: var(--traek-demo-text-muted-1, #a1a1aa);
		text-decoration: none;
		transition: color 0.15s;
	}
	.home a:hover {
		color: var(--traek-demo-text-muted-3, #f4f4f5);
	}
</style>
