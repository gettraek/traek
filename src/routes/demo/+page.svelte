<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { goto } from '$app/navigation';
	import GravityDotsBackground from '$lib/GravityDotsBackground.svelte';
	import {
		listConversations,
		createConversation,
		type ConversationMeta
	} from '$lib/demo-persistence.js';

	let conversations = $state<ConversationMeta[]>([]);

	afterNavigate(() => {
		conversations = listConversations();
	});

	function newChat() {
		const conv = createConversation();
		goto(`/demo/${conv.id}`);
	}

	function open(id: string) {
		goto(`/demo/${id}`);
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
					<strong>Everything is stored directly on your device.</strong> Chats and layout live in this
					browser only (localStorage). Nothing is sent anywhere except your messages to the OpenAI API
					(via the demo backend).
				</p>
				<p>
					This demo showcases <strong>træk</strong> — a spatial conversation engine for building non‑linear
					AI chat UIs in Svelte.
				</p>
			</div>
			<button type="button" onclick={newChat}>New chat</button>
		</header>
		<ul>
			{#each conversations as conv}
				<li>
					<button type="button" onclick={() => open(conv.id)}>
						<span class="title">{conv.title}</span>
						<span class="meta">
							{conv.nodeCount ?? '—'}
							{conv.nodeCount === 1 ? 'node' : 'nodes'}
							<span class="meta-sep">·</span>
							{new Date(conv.updatedAt).toLocaleString()}
						</span>
					</button>
				</li>
			{:else}
				<li class="empty">No conversations yet. Start a new chat.</li>
			{/each}
		</ul>
		<p class="home">
			<a href="/">← Home</a>
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
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
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
	button {
		padding: 0.55rem 1.1rem;
		background: var(--traek-demo-button-bg, rgba(255, 255, 255, 0.1));
		color: var(--traek-demo-text-strong, #fafafa);
		border: 1px solid var(--traek-demo-border-strong, rgba(255, 255, 255, 0.15));
		border-radius: 0.375rem;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	button:hover {
		background: var(--traek-demo-button-bg-hover, rgba(255, 255, 255, 0.16));
		border-color: rgba(255, 255, 255, 0.22);
	}
	ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	li {
		margin-bottom: 0.5rem;
	}
	li button {
		width: 100%;
		text-align: left;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.35rem;
		padding: 0.9rem 1.1rem;
		background: var(--traek-demo-panel-bg-2, rgba(24, 24, 27, 0.8));
		color: var(--traek-demo-text-muted-3, #f4f4f5);
		border: 1px solid var(--traek-demo-border-soft, rgba(255, 255, 255, 0.1));
		border-radius: 0.5rem;
		backdrop-filter: blur(6px);
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
		transition:
			background 0.15s,
			border-color 0.15s,
			box-shadow 0.15s;
	}
	li button:hover {
		background: var(--traek-demo-list-bg-hover, rgba(39, 39, 42, 0.9));
		border-color: var(--traek-demo-border-hover, rgba(255, 255, 255, 0.16));
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}
	.title {
		font-weight: 600;
		color: var(--traek-demo-text-strong, #fafafa);
		font-size: 0.95rem;
	}
	.meta {
		font-size: 0.8rem;
		color: var(--traek-demo-text-muted-1, #a1a1aa);
	}
	.meta-sep {
		margin: 0 0.35em;
		opacity: 0.7;
	}
	li.empty {
		padding: 1.5rem 1.1rem;
		color: var(--traek-demo-text-muted-4, #71717a);
		font-style: italic;
		background: var(--traek-demo-panel-bg-empty, rgba(24, 24, 27, 0.5));
		border: 1px dashed var(--traek-demo-border-dashed, rgba(255, 255, 255, 0.08));
		border-radius: 0.5rem;
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
