<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		TraekCanvas,
		TraekEngine,
		type MessageNode,
		type ConversationSnapshot
	} from '@traek/svelte';
	import { getConversation, saveConversation } from '$lib/client/local-storage.js';
	import { page } from '$app/state';

	const convId = $derived(page.params.id ?? '');

	let engine: TraekEngine | null = $state(null);
	let loading = $state(true);
	let apiKeyMissing = $state(false);
	let cleanup: (() => void) | null = null;

	onMount(async () => {
		const id = convId;
		if (!id) return;

		const stored = await getConversation(id);
		if (stored?.snapshot) {
			try {
				engine = TraekEngine.fromSnapshot(stored.snapshot as ConversationSnapshot);
			} catch {
				engine = new TraekEngine();
			}
		} else {
			engine = new TraekEngine();
		}
		loading = false;

		// Auto-save every 30s
		const timer = setInterval(() => persist(id), 30_000);
		cleanup = () => clearInterval(timer);
	});

	async function persist(id: string) {
		if (!engine) return;
		const stored = await getConversation(id);
		await saveConversation({
			id,
			title: stored?.title ?? 'Conversation',
			createdAt: stored?.createdAt ?? new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			snapshot: engine.serialize()
		});
	}

	function pathToUserNode(eng: TraekEngine, userNode: MessageNode): MessageNode[] {
		const path: MessageNode[] = [];
		let current: MessageNode | undefined = userNode;
		while (current) {
			path.unshift(current);
			const primaryParentId: string | undefined = current.parentIds[0];
			current = primaryParentId
				? (eng.nodes.find((n) => n.id === primaryParentId) as MessageNode | undefined)
				: undefined;
		}
		return path;
	}

	async function handleSend(input: string, userNode: MessageNode) {
		const eng = engine;
		if (!eng) return;

		const path = pathToUserNode(eng, userNode);
		const messages = path.map((n) => ({ role: n.role, content: (n.content ?? '').trim() }));

		const responseNode = eng.addNode('', 'assistant', { parentIds: [userNode.id] });
		eng.updateNode(responseNode.id, { status: 'streaming' });

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages })
			});

			if (res.status === 400) {
				const body = (await res.json().catch(() => ({}))) as { error?: string };
				if (body.error === 'no_api_key') apiKeyMissing = true;
				eng.updateNode(responseNode.id, {
					status: 'error',
					errorMessage: body.error ?? 'Bad request'
				});
				return;
			}

			if (!res.ok) {
				eng.updateNode(responseNode.id, { status: 'error', errorMessage: 'Chat request failed' });
				return;
			}

			const reader = res.body!.getReader();
			const decoder = new TextDecoder();
			let content = '';
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				content += decoder.decode(value, { stream: true });
				eng.updateNode(responseNode.id, { content });
			}
			eng.updateNode(responseNode.id, { status: 'done' });
		} catch {
			eng.updateNode(responseNode.id, { status: 'error', errorMessage: 'Network error' });
		}
	}

	onDestroy(() => {
		cleanup?.();
		persist(convId);
	});
</script>

<svelte:head>
	<title>Conversation — Traek Playground</title>
</svelte:head>

{#if loading}
	<div class="loading">Loading...</div>
{:else if apiKeyMissing}
	<div class="no-key">
		<p>No API key configured.</p>
		<a href="/app/settings">Add your OpenAI or Anthropic key in Settings</a>
	</div>
{:else if engine}
	<TraekCanvas {engine} onSendMessage={handleSend} />
{/if}

<style>
	:global(body) {
		overflow: hidden;
	}

	.loading,
	.no-key {
		height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		color: var(--pg-text-muted);
	}
</style>
