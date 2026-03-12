<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		TraekCanvas,
		TraekEngine,
		type MessageNode,
		type ConversationSnapshot,
		ThemeProvider,
		type NodeComponentMap,
		TextNode,
		ImageNode,
		CodeNode
	} from '@traek/svelte';
	import { getConversation, saveConversation } from '$lib/client/local-storage.js';
	import { page } from '$app/state';
	import { track } from '$lib/client/analytics.js';

	let shareUrl = $state<string | null>(null);
	let sharing = $state(false);
	let shareError = $state<string | null>(null);

	const componentMap: NodeComponentMap = {
		text: TextNode as any,
		image: ImageNode as any,
		code: CodeNode as any
	};

	async function shareConversation() {
		if (!engine) return;
		sharing = true;
		shareError = null;
		try {
			const res = await fetch('/api/share', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ conversationId: convId, snapshot: engine.serialize() })
			});
			if (!res.ok) {
				shareError = 'Failed to create share link.';
				return;
			}
			const { token } = await res.json();
			shareUrl = `${window.location.origin}/share/${token}`;
			track('conversation_shared');
		} catch {
			shareError = 'Network error.';
		} finally {
			sharing = false;
		}
	}

	function copyShareUrl() {
		if (shareUrl) navigator.clipboard.writeText(shareUrl);
	}

	function closeShareModal() {
		shareUrl = null;
		shareError = null;
	}

	const convId = $derived(page.params.id ?? '');

	let engine: TraekEngine | null = $state(null);
	let loading = $state(true);
	let apiKeyMissing = $state(false);
	let cleanup: (() => void) | null = null;
	let messageSentTracked = false;

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
		// JSON round-trip so IDB gets a plain object (no Proxies / non-cloneable refs)
		const raw = engine.serialize();
		const snapshot = JSON.parse(JSON.stringify(raw)) as ConversationSnapshot;
		await saveConversation({
			id,
			title: stored?.title ?? 'Conversation',
			createdAt: stored?.createdAt ?? new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			snapshot
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

		if (!messageSentTracked) {
			messageSentTracked = true;
			track('first_message_sent');
		}

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
	<div class="canvas-page">
		<ThemeProvider>
			<TraekCanvas {componentMap} {engine} onSendMessage={handleSend} />
		</ThemeProvider>
	</div>
	<div class="conv-toolbar">
		<a href="/app" class="toolbar-btn" aria-label="All conversations">←</a>
		<button class="toolbar-btn" onclick={shareConversation} disabled={sharing}>
			{sharing ? '...' : 'Share'}
		</button>
	</div>
{/if}

{#if shareUrl || shareError}
	<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="share-title">
		<div class="modal">
			{#if shareUrl}
				<h2 id="share-title">Shareable link</h2>
				<p>Anyone with this link can view a read-only snapshot of this conversation.</p>
				<div class="share-url-row">
					<input type="text" readonly value={shareUrl} />
					<button class="btn-copy" onclick={copyShareUrl}>Copy</button>
				</div>
			{:else}
				<h2 id="share-title">Share failed</h2>
				<p>{shareError}</p>
			{/if}
			<button class="btn-close" onclick={closeShareModal}>Close</button>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		overflow: hidden;
	}

	.canvas-page {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.canvas-page :global(> *) {
		width: 100%;
		height: 100%;
		min-height: 0;
		display: block;
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

	.conv-toolbar {
		position: fixed;
		top: 12px;
		right: 12px;
		z-index: 50;
		display: flex;
		gap: 6px;
	}

	.toolbar-btn {
		background: var(--pg-surface);
		border: 1px solid var(--pg-border);
		border-radius: var(--pg-radius);
		color: var(--pg-text);
		font-size: 0.8rem;
		font-weight: 600;
		padding: 6px 12px;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		transition: border-color 0.15s;
	}

	.toolbar-btn:hover:not(:disabled) {
		border-color: var(--pg-accent);
		color: var(--pg-accent);
	}

	.toolbar-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
		backdrop-filter: blur(4px);
	}

	.modal {
		background: var(--pg-surface);
		border: 1px solid var(--pg-border);
		border-radius: calc(var(--pg-radius) * 1.5);
		padding: 28px;
		max-width: 480px;
		width: 90%;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.modal h2 {
		font-size: 1.1rem;
		font-weight: 700;
	}

	.modal p {
		font-size: 0.875rem;
		color: var(--pg-text-muted);
		line-height: 1.5;
	}

	.share-url-row {
		display: flex;
		gap: 8px;
	}

	.share-url-row input {
		flex: 1;
		padding: 8px 12px;
		background: var(--pg-bg);
		border: 1px solid var(--pg-border);
		border-radius: var(--pg-radius);
		color: var(--pg-text);
		font-size: 0.8rem;
		font-family: monospace;
		outline: none;
	}

	.btn-copy,
	.btn-close {
		padding: 8px 16px;
		border-radius: var(--pg-radius);
		font-size: 0.875rem;
		font-weight: 600;
		border: none;
		cursor: pointer;
	}

	.btn-copy {
		background: var(--pg-accent);
		color: white;
	}

	.btn-close {
		background: transparent;
		border: 1px solid var(--pg-border);
		color: var(--pg-text);
	}

	.btn-close:hover {
		border-color: var(--pg-text-muted);
	}
</style>
