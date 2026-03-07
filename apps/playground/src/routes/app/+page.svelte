<script lang="ts">
	import { onMount } from 'svelte';
	import {
		listConversations,
		saveConversation,
		deleteConversation,
		type ConversationMeta
	} from '$lib/client/local-storage.js';
	import { goto } from '$app/navigation';

	const FREE_LIMIT = 5;

	let conversations = $state<ConversationMeta[]>([]);
	let count = $state(0);
	let loading = $state(true);

	onMount(async () => {
		conversations = await listConversations();
		count = conversations.length;
		loading = false;
	});

	async function newConversation() {
		if (count >= FREE_LIMIT) {
			// TODO: trigger upgrade prompt
			alert('Free tier limit reached. Upgrade to Pro for unlimited conversations.');
			return;
		}
		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		await saveConversation({
			id,
			title: 'New conversation',
			createdAt: now,
			updatedAt: now,
			snapshot: null
		});
		goto(`/app/${id}`);
	}

	async function remove(id: string) {
		await deleteConversation(id);
		conversations = conversations.filter((c) => c.id !== id);
		count = conversations.length;
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('en', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Conversations — Traek Playground</title>
</svelte:head>

<div class="shell">
	<nav class="sidebar">
		<a href="/" class="logo">træk</a>
		<button class="btn-new" onclick={newConversation}>+ New conversation</button>
		<div class="sidebar-section">
			<span class="sidebar-label">Conversations</span>
			{#if loading}
				<p class="muted">Loading...</p>
			{:else if conversations.length === 0}
				<p class="muted">No conversations yet.</p>
			{:else}
				<ul class="conv-list">
					{#each conversations as c (c.id)}
						<li>
							<a href="/app/{c.id}" class="conv-item">
								<span class="conv-title">{c.title}</span>
								<span class="conv-date">{formatDate(c.updatedAt)}</span>
							</a>
							<button
								class="conv-delete"
								onclick={() => remove(c.id)}
								aria-label="Delete conversation"
							>
								×
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		<div class="sidebar-footer">
			<a href="/app/settings" class="settings-link">Settings</a>
			<span class="tier-badge">Free {count}/{FREE_LIMIT}</span>
		</div>
	</nav>

	<main class="main-empty">
		<div class="empty-state">
			<h2>Start a conversation</h2>
			<p>Create a new conversation or select one from the sidebar.</p>
			<button class="btn btn-primary" onclick={newConversation}>New conversation</button>
		</div>
	</main>
</div>

<style>
	.shell {
		display: flex;
		height: 100vh;
		overflow: hidden;
	}

	.sidebar {
		width: 260px;
		flex-shrink: 0;
		background: var(--pg-surface);
		border-right: 1px solid var(--pg-border);
		display: flex;
		flex-direction: column;
		padding: 20px 16px;
		gap: 16px;
		overflow-y: auto;
	}

	.logo {
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--pg-text);
		letter-spacing: -0.03em;
		padding: 4px 0;
	}

	.btn-new {
		background: var(--pg-accent);
		color: white;
		border: none;
		padding: 10px 14px;
		border-radius: var(--pg-radius);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
		text-align: left;
	}

	.btn-new:hover {
		background: var(--pg-accent-hover);
	}

	.sidebar-section {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
		overflow-y: auto;
	}

	.sidebar-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--pg-text-muted);
	}

	.muted {
		font-size: 0.85rem;
		color: var(--pg-text-muted);
	}

	.conv-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.conv-list li {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.conv-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 8px 10px;
		border-radius: calc(var(--pg-radius) / 2);
		color: var(--pg-text);
		text-decoration: none;
		overflow: hidden;
		transition: background 0.1s;
	}

	.conv-item:hover {
		background: color-mix(in srgb, var(--pg-text) 5%, transparent);
		text-decoration: none;
	}

	.conv-title {
		font-size: 0.875rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.conv-date {
		font-size: 0.75rem;
		color: var(--pg-text-muted);
	}

	.conv-delete {
		background: none;
		border: none;
		color: var(--pg-text-muted);
		font-size: 1.1rem;
		padding: 4px 6px;
		border-radius: 4px;
		opacity: 0;
		cursor: pointer;
		flex-shrink: 0;
	}

	.conv-list li:hover .conv-delete {
		opacity: 1;
	}

	.conv-delete:hover {
		color: var(--pg-danger);
	}

	.sidebar-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 12px;
		border-top: 1px solid var(--pg-border);
	}

	.settings-link {
		font-size: 0.85rem;
		color: var(--pg-text-muted);
	}

	.tier-badge {
		font-size: 0.75rem;
		color: var(--pg-text-muted);
		background: var(--pg-bg);
		padding: 2px 8px;
		border-radius: 100px;
		border: 1px solid var(--pg-border);
	}

	.main-empty {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.empty-state {
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 12px;
		align-items: center;
	}

	.empty-state h2 {
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.empty-state p {
		color: var(--pg-text-muted);
		font-size: 0.9rem;
	}

	.btn {
		padding: 10px 20px;
		border-radius: var(--pg-radius);
		font-size: 0.9rem;
		font-weight: 600;
		border: none;
		cursor: pointer;
	}

	.btn-primary {
		background: var(--pg-accent);
		color: white;
	}

	.btn-primary:hover {
		background: var(--pg-accent-hover);
	}
</style>
