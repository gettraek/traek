<script lang="ts">
	import { page } from '$app/state';
	import TraekCanvas from '$lib/TraekCanvas.svelte';
	import {
		DefaultLoadingOverlay,
		TraekEngine,
		DEFAULT_TRACK_ENGINE_CONFIG,
		type MessageNode,
		type AddNodePayload,
		type ActionDefinition,
		type ResolveActions,
		createDefaultRegistry
	} from '$lib';
	import ExampleCustomComponent from '$lib/ExampleCustomComponent.svelte';
	import ImageDemoNode from '$lib/ImageDemoNode.svelte';
	import {
		getConversation,
		saveConversation,
		titleFromNodes,
		type SavedConversation,
		type SavedViewport
	} from '$lib/demo-persistence';
	import { track } from '$lib/umami';

	const id = $derived(page.params.id);

	const registry = createDefaultRegistry();
	registry.register({
		type: 'debugNode',
		label: 'Debug',
		component: ExampleCustomComponent,
		icon: '🧪'
	});
	registry.register({
		type: 'image',
		label: 'Image',
		component: ImageDemoNode,
		icon: '🖼️'
	});

	let engine = $state<TraekEngine | null>(null);
	let conv = $state<SavedConversation | null>(null);
	let error = $state<string | null>(null);
	/** Latest viewport from TraekCanvas (for persist). */
	let lastViewport = $state<SavedViewport | null>(null);
	let viewportPersistTimeout = 0;
	// Demo: action definitions with keywords and slash commands
	const TOOL_OPTIONS: ActionDefinition[] = [
		{
			id: 'debug',
			label: 'Debug node',
			description: 'Add a debug/inspector node to the canvas',
			icon: '🧪',
			keywords: ['debug', 'inspect', 'test'],
			slashCommand: 'debug'
		},
		{
			id: 'image',
			label: 'Image',
			description: 'Generate an image from your prompt',
			icon: '🖼️',
			keywords: ['image', 'bild', 'picture', 'photo', 'generiere', 'generate', 'draw', 'zeichne'],
			slashCommand: 'image'
		},
		{
			id: 'repeat',
			label: 'Just repeat',
			description: 'Echo your message back as-is',
			icon: '🔁',
			keywords: ['repeat', 'echo', 'wiederhole'],
			slashCommand: 'repeat'
		},
		{
			id: 'exploration',
			label: 'Exploration (2 branches)',
			description: 'Create two parallel response branches for comparison',
			icon: '🧭',
			keywords: ['explore', 'branch', 'compare', 'vergleich'],
			slashCommand: 'explore'
		}
	];

	const resolveActions: ResolveActions = async (input: string, actions: ActionDefinition[]) => {
		try {
			const res = await fetch('/api/resolve-actions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					input,
					actions: actions.map((a: ActionDefinition) => ({
						id: a.id,
						description: a.description
					}))
				})
			});
			if (!res.ok) return [];
			const data = (await res.json()) as { actionIds?: string[] };
			return data.actionIds ?? [];
		} catch {
			return [];
		}
	};

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
			const e = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG);
			if (data.nodes.length > 0) {
				e.addNodes(data.nodes);
			}
			// Restore last focused node (reply context)
			if (data.activeNodeId != null) {
				const exists = data.nodes.some((n) => n.id === data.activeNodeId);
				if (exists) {
					e.activeNodeId = data.activeNodeId;
					e.focusOnNode(data.activeNodeId);
				}
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
			engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG);
			error = null;
		}
	});

	function pathToUserNode(eng: TraekEngine, userNode: MessageNode): MessageNode[] {
		const path: MessageNode[] = [];
		let current: MessageNode | undefined = userNode;
		while (current) {
			path.unshift(current);
			const primaryParentId = current!.parentIds[0];
			current = primaryParentId
				? (eng.nodes.find((n) => n.id === primaryParentId) as MessageNode | undefined)
				: undefined;
		}
		return path;
	}

	function nodesToPayloads(nodes: MessageNode[]): AddNodePayload[] {
		return nodes.map((n) => ({
			id: n.id,
			parentIds: n.parentIds,
			content: n.content ?? '',
			role: n.role,
			type: n.type,
			status: n.status,
			errorMessage: n.errorMessage,
			metadata: n.metadata,
			data: n.data
		}));
	}

	function persist(eng: TraekEngine) {
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

	function handleRetry(nodeId: string) {
		if (!engine) return;
		const assistantNode = engine.nodes.find(
			(n: { id: string }) => n.id === nodeId
		);
		if (!assistantNode) return;
		const userParentId = assistantNode.parentIds[0];
		if (!userParentId) return;
		const userNode = engine.nodes.find(
			(n: { id: string }) => n.id === userParentId
		) as MessageNode | undefined;
		if (!userNode) return;
		// Delete the assistant node and its descendants
		engine.deleteNodeAndDescendants(nodeId);
		// Re-send with the original user message
		const userContent = userNode.content ?? '';
		const actions = (userNode.data as { actions?: string[] })?.actions;
		onSendMessage(userContent, userNode, actions);
	}

	function handleEditNode(nodeId: string) {
		if (!engine) return;
		const node = engine.nodes.find(
			(n: { id: string }) => n.id === nodeId
		) as MessageNode | undefined;
		if (!node) return;
		const newContent = window.prompt('Edit message:', node.content ?? '');
		if (newContent !== null && newContent !== node.content) {
			engine.updateNode(nodeId, { content: newContent });
			persist(engine);
		}
	}

	async function onSendMessage(input: string, userNode: MessageNode, action?: string | string[]) {
		const eng = engine;
		if (!eng || !conv || !id) return;

		const selected = Array.isArray(action) ? (action as string[]) : action ? [action] : [];
		track('demo-send-message', {
			toolCount: selected.length,
			tools: selected.length ? selected.join(',') : 'none',
			hasReplyContext: !!userNode?.id
		});

		// --- Demo-only actions based on selected tools ---
		if (selected.includes('debug')) {
			eng.addCustomNode(ExampleCustomComponent, {}, 'system', {
				parentIds: [userNode.id],
				type: 'debugNode'
			});
		}

		if (selected.includes('image')) {
			const imageNode = eng.addCustomNode(ImageDemoNode, {}, 'assistant', {
				parentIds: [userNode.id],
				type: 'image',
				data: {
					prompt: input,
					status: 'loading'
				}
			});

			// Fire-and-forget image generation so chat can stream in parallel
			(async () => {
				try {
					const res = await fetch('/api/image', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ prompt: input })
					});
					if (!res.ok) {
						const errJson = await res.json().catch(() => ({}));
						const message =
							(errJson as { error?: string })?.error ?? `Image request failed (${res.status})`;
						eng.updateNode(imageNode.id, {
							data: {
								prompt: input,
								status: 'error',
								error: message
							}
						});
						persist(eng);
						return;
					}

					const data = (await res.json()) as { dataUrl?: string };
					if (!data.dataUrl) {
						eng.updateNode(imageNode.id, {
							data: {
								prompt: input,
								status: 'error',
								error: 'No image URL returned'
							}
						});
						persist(eng);
						return;
					}

					eng.updateNode(imageNode.id, {
						data: {
							prompt: input,
							imageUrl: data.dataUrl,
							status: 'done'
						}
					});
					persist(eng);
				} catch (e) {
					eng.updateNode(imageNode.id, {
						data: {
							prompt: input,
							status: 'error',
							error: e instanceof Error ? e.message : 'Unexpected error while generating image'
						}
					});
					persist(eng);
				}
			})();
		}

		if (selected.includes('repeat')) {
			eng.addNode(`🔁 ${input}`, 'assistant', {
				parentIds: [userNode.id]
			});
		}

		// --- Main chat completion path ---
		// When "exploration" is selected, run the default chat flow 2 times
		// to create three parallel branches from the same user message.
		const explorationRuns = selected.includes('exploration') ? 2 : 1;
		const path = pathToUserNode(eng, userNode);
		const messages = path.map((n) => ({
			role: n.role,
			content: (n.content ?? '').trim()
		}));

		// Create all response + thought nodes up front (so parallel runs don't race on addNode).
		const branches: { responseNodeId: string; thoughtNodeId: string }[] = [];
		for (let i = 0; i < explorationRuns; i += 1) {
			const responseNode = eng.addNode('', 'assistant', {
				parentIds: [userNode.id],
				autofocus: i === 0
			});
			const thoughtNode = eng.addNode('Thinking...', 'assistant', {
				type: 'thought',
				parentIds: [responseNode.id]
			});
			eng.updateNode(responseNode.id, { status: 'streaming' });
			branches.push({ responseNodeId: responseNode.id, thoughtNodeId: thoughtNode.id });
		}

		// Each addNode set activeNodeId to the new node; we want selection on the first branch (the one we center on).
		if (branches.length > 0) {
			eng.activeNodeId = branches[0].responseNodeId;
		}

		async function runOneBranch(responseNodeId: string, thoughtNodeId: string) {
			function setThinkingDone() {
				eng?.updateNode(thoughtNodeId, { content: 'Done' });
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
					eng.updateNode(responseNodeId, { status: 'error', errorMessage: msg });
					return;
				}

				const reader = res.body?.getReader();
				if (!reader) {
					setThinkingDone();
					eng.updateNode(responseNodeId, { status: 'done' });
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
					eng.updateNode(responseNodeId, { content });
				}
				if (!thinkingDone) setThinkingDone();
				eng.updateNode(responseNodeId, { status: 'done' });
			} catch (e) {
				setThinkingDone();
				eng.updateNode(responseNodeId, {
					status: 'error',
					errorMessage: e instanceof Error ? e.message : 'Stream failed'
				});
			}
		}

		await Promise.all(branches.map((b) => runOneBranch(b.responseNodeId, b.thoughtNodeId)));
		persist(eng);
	}
</script>

{#if error}
	<p class="error">{error}</p>
{/if}

{#if engine}
	<div class="chat-layout">
		<a href="/demo" class="back" data-umami-event="demo-back-to-list">← Back to list</a>
		<div class="canvas-wrap">
			<TraekCanvas
				{engine}
				config={DEFAULT_TRACK_ENGINE_CONFIG}
				{registry}
				actions={TOOL_OPTIONS}
				{resolveActions}
				initialScale={conv?.viewport?.scale}
				initialOffset={conv?.viewport
					? { x: conv.viewport.offsetX, y: conv.viewport.offsetY }
					: undefined}
				{onSendMessage}
				onRetry={handleRetry}
				onEditNode={handleEditNode}
				onNodesChanged={() => engine && persist(engine)}
				onViewportChange={(v) => {
					lastViewport = { scale: v.scale, offsetX: v.offset.x, offsetY: v.offset.y };
					scheduleViewportPersist();
				}}
			>
				{#snippet initialOverlay()}
					<DefaultLoadingOverlay />
				{/snippet}
			</TraekCanvas>
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
		background: var(--traek-conv-bg, #fafafa);
	}
	.back {
		position: absolute;
		top: 0.75rem;
		left: 1rem;
		z-index: 10;
		padding: 0.4rem 0.75rem;
		background: var(--traek-conv-back-bg, #0b0b0b);
		border-radius: 0.25rem;
		color: var(--traek-conv-back-text, #dddddd);
		text-decoration: none;
		font-size: 0.9rem;
	}
	.canvas-wrap {
		flex: 1;
		min-height: 0;
	}
	.error {
		color: var(--traek-error-text, #cc0000);
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
		background: var(--traek-loading-bg, #0b0b0b);
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
		border: 2px solid var(--traek-spinner-border, rgba(255, 255, 255, 0.12));
		border-top-color: var(--traek-spinner-top, #888888);
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
		color: var(--traek-loading-top, #888888);
		font-size: 0.95rem;
		letter-spacing: 0.02em;
	}
</style>
