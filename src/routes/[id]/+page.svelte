<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ChatCanvas from '$lib/ChatCanvas.svelte';
	import { ChatEngine, DEFAULT_CHAT_ENGINE_CONFIG, type MessageNode } from '$lib/ChatEngine.svelte';
	import type { AddNodePayload } from '$lib/ChatEngine.svelte';
	import {
		getConversation,
		saveConversation,
		titleFromNodes,
		type SavedConversation,
		type SavedViewport
	} from '../../lib/demo-persistence.ts';

	const id = $derived($page.params.id);

	let engine = $state<ChatEngine | null>(null);
	let conv = $state<SavedConversation | null>(null);
	let error = $state<string | null>(null);
	/** Latest viewport from ChatCanvas (for persist). */
	let lastViewport = $state<SavedViewport | null>(null);
	let viewportPersistTimeout = 0;
	function scheduleViewportPersist() {
		if (viewportPersistTimeout) clearTimeout(viewportPersistTimeout);
		viewportPersistTimeout = window.setTimeout(() => {
			viewportPersistTimeout = 0;
			if (engine) persist(engine);
		}, 600);
	}

	// Load or create conversation and hydrate engine
	$effect(() => {
		const currentId = id;
		if (!currentId) return;
		const data = getConversation(currentId);
		if (data) {
			conv = data;
			const e = new ChatEngine(DEFAULT_CHAT_ENGINE_CONFIG);
			if (data.nodes.length > 0) {
				e.addNodes(data.nodes);
			}
			// Restore last focused node (reply context)
			if (data.activeNodeId != null) {
				const exists = data.nodes.some((n) => n.id === data.activeNodeId);
				if (exists) e.activeNodeId = data.activeNodeId;
			}
			if (e.activeNodeId == null && data.nodes.length > 0) {
				const last = data.nodes[data.nodes.length - 1];
				if (last?.id) e.activeNodeId = last.id;
			}
			engine = e;
			error = null;
		} else {
			const now = Date.now();
			conv = {
				id: currentId,
				title: 'New chat',
				createdAt: now,
				updatedAt: now,
				nodes: []
			};
			saveConversation(conv);
			engine = new ChatEngine(DEFAULT_CHAT_ENGINE_CONFIG);
			error = null;
		}
	});

	function pathToUserNode(eng: ChatEngine, userNode: MessageNode): MessageNode[] {
		const path: MessageNode[] = [];
		let current: MessageNode | undefined = userNode;
		while (current) {
			path.unshift(current);
			current = eng.nodes.find((n) => n.id === current!.parentId) as MessageNode | undefined;
		}
		return path;
	}

	function nodesToPayloads(nodes: MessageNode[]): AddNodePayload[] {
		return nodes.map((n) => ({
			id: n.id,
			parentId: n.parentId,
			content: n.content ?? '',
			role: n.role,
			type: n.type,
			status: n.status,
			errorMessage: n.errorMessage,
			metadata: n.metadata,
			data: n.data
		}));
	}

	function persist(eng: ChatEngine) {
		if (!conv || !id) return;
		const nodes = nodesToPayloads(eng.nodes);
		const title = titleFromNodes(nodes);
		saveConversation({
			...conv,
			title,
			updatedAt: Date.now(),
			nodes,
			viewport: lastViewport ?? conv.viewport,
			activeNodeId: eng.activeNodeId
		});
		conv = {
			...conv,
			title,
			updatedAt: Date.now(),
			nodes,
			viewport: lastViewport ?? conv.viewport,
			activeNodeId: eng.activeNodeId
		};
	}

	async function onSendMessage(input: string, userNode: MessageNode) {
		const eng = engine;
		if (!eng || !conv || !id) return;

		const path = pathToUserNode(eng, userNode);
		const messages = path.map((n) => ({
			role: n.role,
			content: (n.content ?? '').trim()
		}));

		const responseNode = eng.addNode('', 'assistant', {
			parentId: userNode.id,
			autofocus: true
		});
		const thoughtNode = eng.addNode('Thinking...', 'assistant', {
			type: 'thought',
			parentId: responseNode.id
		});
		eng.updateNode(responseNode.id, { status: 'streaming' });

		function setThinkingDone() {
			eng?.updateNode(thoughtNode.id, { content: 'Done' });
		}

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages })
			});

			if (!res.ok) {
				setThinkingDone();
				const err = await res.json().catch(() => ({ error: res.statusText }));
				const data = err as { error?: string; retryAfter?: number };
				let msg = data.error ?? 'Request failed';
				if (res.status === 429 && data.retryAfter != null) {
					const hours = Math.ceil(data.retryAfter / 3600);
					msg += hours > 0 ? ` Try again in ${hours} hour(s).` : ' Try again later.';
				}
				eng.updateNode(responseNode.id, {
					status: 'error',
					errorMessage: msg
				});
				persist(eng);
				return;
			}

			const reader = res.body?.getReader();
			if (!reader) {
				setThinkingDone();
				eng.updateNode(responseNode.id, { status: 'done' });
				persist(eng);
				return;
			}

			const decoder = new TextDecoder();
			let content = '';
			let thinkingDone = false;
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				content += decoder.decode(value, { stream: true });
				if (!thinkingDone && content.length > 0) {
					thinkingDone = true;
					setThinkingDone();
				}
				eng.updateNode(responseNode.id, { content });
			}
			if (!thinkingDone) setThinkingDone();
			eng.updateNode(responseNode.id, { status: 'done' });
		} catch (e) {
			setThinkingDone();
			eng.updateNode(responseNode.id, {
				status: 'error',
				errorMessage: e instanceof Error ? e.message : 'Stream failed'
			});
		}
		persist(eng);
	}
</script>

{#if error}
	<p class="error">{error}</p>
{/if}

{#if engine}
	<div class="chat-layout">
		<a href="/" class="back">← Back to list</a>
		<div class="canvas-wrap">
			<ChatCanvas
				{engine}
				config={DEFAULT_CHAT_ENGINE_CONFIG}
				initialScale={conv?.viewport?.scale}
				initialOffset={conv?.viewport
					? { x: conv.viewport.offsetX, y: conv.viewport.offsetY }
					: undefined}
				{onSendMessage}
				onNodesChanged={() => engine && persist(engine)}
				onViewportChange={(v) => {
					lastViewport = { scale: v.scale, offsetX: v.offset.x, offsetY: v.offset.y };
					scheduleViewportPersist();
				}}
			/>
		</div>
	</div>
{:else}
	<div class="loading">
		<div class="loading-spinner" aria-hidden="true"></div>
		<p class="loading-text">Loading…</p>
	</div>
{/if}

<style>
	.chat-layout {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		background: #fafafa;
	}
	.back {
		position: absolute;
		top: 0.75rem;
		left: 1rem;
		z-index: 10;
		padding: 0.4rem 0.75rem;
		background: #0b0b0b;
		border-radius: 0.25rem;
		color: #ddd;
		text-decoration: none;
		font-size: 0.9rem;
	}
	.canvas-wrap {
		flex: 1;
		min-height: 0;
	}
	.error {
		color: #c00;
		padding: 1rem;
	}

	.loading {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
		background: #0b0b0b;
		animation: loading-fade 0.3s ease-out;
	}
	@keyframes loading-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	.loading-spinner {
		width: 2rem;
		height: 2rem;
		border: 2px solid rgba(255, 255, 255, 0.12);
		border-top-color: #888;
		border-radius: 50%;
		animation: loading-spin 0.7s linear infinite;
	}
	@keyframes loading-spin {
		to {
			transform: rotate(360deg);
		}
	}
	.loading-text {
		margin: 0;
		color: #888;
		font-size: 0.95rem;
		letter-spacing: 0.02em;
	}
</style>
