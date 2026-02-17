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
			<div class="header-accent"></div>
			<p class="header-desc">Follow ideas, not threads.</p>
		</header>

		<button class="cta-button" onclick={newChat}>
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
				<path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
			</svg>
			Neue Unterhaltung
		</button>

		<div class="chatlist-wrap">
			<ChatList {store} onSelect={open} onCreate={newChat} />
		</div>

		<details class="info-details">
			<summary>Über diese Demo</summary>
			<div class="info-body">
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
		</details>

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
		background: radial-gradient(circle at top center, #151515 0%, #050505 52%, #000000 100%);
	}

	.demo-list {
		position: relative;
		z-index: 1;
		max-width: 32rem;
		margin: 0 auto;
		padding: 2.5rem 1.25rem 3rem;
		color: var(--traek-demo-text-main, #e4e4e7);
	}

	header {
		margin-bottom: 1.75rem;
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
		color: var(--traek-demo-text-strong, #fafafa);
		letter-spacing: -0.04em;
	}

	.header-accent {
		width: 2.5rem;
		height: 2px;
		background: linear-gradient(
			90deg,
			var(--traek-accent-cyan, #00d8ff),
			var(--traek-accent-lime, #00ffa3)
		);
		border-radius: 1px;
		margin-bottom: 0.75rem;
	}

	.header-desc {
		margin: 0;
		color: var(--traek-demo-text-muted-3, #d4d4d8);
		font-size: 1rem;
	}

	.cta-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.65rem 1.25rem;
		margin-bottom: 0.75rem;
		background: linear-gradient(
			135deg,
			var(--traek-accent-cyan, #00d8ff),
			var(--traek-accent-lime, #00ffa3)
		);
		color: #000;
		border: none;
		border-radius: 999px;
		font-family: inherit;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			opacity 0.15s,
			transform 0.15s;
		justify-content: center;
		letter-spacing: -0.01em;
	}

	.cta-button:hover {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	.cta-button:focus-visible {
		outline: 2px solid var(--traek-accent-cyan, #00d8ff);
		outline-offset: 2px;
	}

	.chatlist-wrap {
		margin-bottom: 1rem;
		border-radius: 0.5rem;
		overflow: hidden;
		border: 1px solid var(--traek-demo-border-soft, rgba(255, 255, 255, 0.1));
		background: var(--traek-demo-panel-bg-1, rgba(24, 24, 27, 0.85));
		backdrop-filter: blur(8px);
		max-height: 60vh;
	}

	.info-details {
		margin-bottom: 1.25rem;
		border: 1px solid var(--traek-demo-border-soft, rgba(255, 255, 255, 0.1));
		border-radius: 0.5rem;
		background: var(--traek-demo-panel-bg-1, rgba(24, 24, 27, 0.85));
		backdrop-filter: blur(8px);
	}

	.info-details summary {
		padding: 0.75rem 1rem;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--traek-demo-text-muted-1, #a1a1aa);
		cursor: pointer;
		list-style: none;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		user-select: none;
		transition: color 0.15s;
	}

	.info-details summary::-webkit-details-marker {
		display: none;
	}

	.info-details summary::before {
		content: '›';
		font-size: 1rem;
		line-height: 1;
		transition: transform 0.2s;
		display: inline-block;
	}

	.info-details[open] summary::before {
		transform: rotate(90deg);
	}

	.info-details summary:hover {
		color: var(--traek-demo-text-muted-3, #f4f4f5);
	}

	.info-body {
		padding: 0 1rem 1rem;
		font-size: 0.875rem;
		line-height: 1.55;
		color: var(--traek-demo-text-muted-2, #d4d4d8);
	}

	.info-body p {
		margin: 0 0 0.5rem 0;
	}

	.info-body p:last-child {
		margin-bottom: 0;
	}

	.info-body strong {
		color: var(--traek-demo-text-muted-3, #f4f4f5);
		font-weight: 600;
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
