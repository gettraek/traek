<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import {
		TraekCanvas,
		DefaultLoadingOverlay,
		TraekEngine,
		DEFAULT_TRACK_ENGINE_CONFIG,
		type MessageNode,
		type ActionDefinition,
		type ResolveActions,
		createDefaultRegistry,
		type ConversationSnapshot,
		ConversationStore,
		HeaderBar
	} from 'traek';
	import ExampleCustomComponent from '$lib/components/ExampleCustomComponent.svelte';
	import ImageDemoNode from '$lib/components/ImageDemoNode.svelte';
	import { track } from '$lib/umami';

	const id = $derived(page.params.id);
	const store = new ConversationStore();

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
	let snapshot = $state<ConversationSnapshot | null>(null);
	let error = $state<string | null>(null);
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

	// Initialize store and load conversation
	onMount(() => {
		(async () => {
			await store.init();

			const currentId = id;
			if (!currentId) {
				error = 'No conversation ID provided';
				return;
			}

			const loaded = await store.load(currentId);

			if (loaded) {
				snapshot = loaded;
				engine = TraekEngine.fromSnapshot(loaded, DEFAULT_TRACK_ENGINE_CONFIG);
			} else {
				// Create new conversation
				const newId = await store.create('New chat');
				if (newId !== currentId) {
					// Redirect case: ID mismatch
					console.warn(`Created ID ${newId} doesn't match requested ${currentId}`);
				}
				snapshot = {
					version: 1,
					createdAt: Date.now(),
					title: 'New chat',
					activeNodeId: null,
					nodes: []
				};
				engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG);
			}

			// Enable auto-save
			if (engine) {
				store.enableAutoSave(engine, currentId);
			}
		})();

		return () => {
			store.destroy();
		};
	});

	function pathToUserNode(eng: TraekEngine, userNode: MessageNode): MessageNode[] {
		const path: MessageNode[] = [];
		let current: MessageNode | undefined = userNode;
		while (current) {
			path.unshift(current);
			const primaryParentId: string | undefined = current!.parentIds[0];
			current = primaryParentId
				? (eng.nodes.find((n) => n.id === primaryParentId) as MessageNode | undefined)
				: undefined;
		}
		return path;
	}

	function handleRetry(nodeId: string) {
		if (!engine) return;
		const assistantNode = engine.nodes.find((n: { id: string }) => n.id === nodeId);
		if (!assistantNode) return;
		const userParentId = assistantNode.parentIds[0];
		if (!userParentId) return;
		const userNode = engine.nodes.find((n: { id: string }) => n.id === userParentId) as
			| MessageNode
			| undefined;
		if (!userNode) return;
		// Retry only the selected node: re-stream into it and mark its descendants as outdated
		const userContent = userNode.content ?? '';
		onSendMessage(userContent, userNode, undefined, nodeId);
	}

	async function onSendMessage(
		input: string,
		userNode: MessageNode,
		action?: string | string[],
		retryNodeId?: string
	) {
		const eng = engine;
		if (!eng || !id) return;

		// --- Retry path: stream into existing node, no delete; mark dependent nodes outdated ---
		if (retryNodeId) {
			const path = pathToUserNode(eng, userNode);
			const messages = path.map((n) => ({
				role: n.role,
				content: (n.content ?? '').trim()
			}));

			const descendants = eng.getDescendants(retryNodeId);
			for (const desc of descendants) {
				if (desc.role === 'assistant' && desc.metadata) {
					eng.updateNode(desc.id, { metadata: { ...desc.metadata, outdated: true } });
				}
			}

			eng.updateNode(retryNodeId, {
				status: 'streaming',
				errorMessage: undefined,
				content: ''
			});

			const thoughtChildren = eng.getChildren(retryNodeId).filter((c) => c.type === 'thought');
			const thoughtNodeId =
				thoughtChildren.length > 0
					? thoughtChildren[0].id
					: eng.addNode('Thinking...', 'assistant', {
							type: 'thought',
							parentIds: [retryNodeId]
						}).id;

			async function runOneBranch(responseNodeId: string, thoughtNodeId: string) {
				if (!eng) return;
				const e = eng;
				function setThinkingDone() {
					e.updateNode(thoughtNodeId, { content: 'Done' });
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
				} catch (err) {
					setThinkingDone();
					eng.updateNode(responseNodeId, {
						status: 'error',
						errorMessage: err instanceof Error ? err.message : 'Stream failed'
					});
				}
			}

			await runOneBranch(retryNodeId, thoughtNodeId);
			return;
		}

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
						return;
					}

					eng.updateNode(imageNode.id, {
						data: {
							prompt: input,
							imageUrl: data.dataUrl,
							status: 'done'
						}
					});
				} catch (e) {
					eng.updateNode(imageNode.id, {
						data: {
							prompt: input,
							status: 'error',
							error: e instanceof Error ? e.message : 'Unexpected error while generating image'
						}
					});
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
			if (!eng) return;
			const e = eng;
			function setThinkingDone() {
				e.updateNode(thoughtNodeId, { content: 'Done' });
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
	}
</script>

{#if error}
	<p class="error">{error}</p>
{/if}

{#if engine}
	<div class="chat-layout">
		<HeaderBar backHref={resolve('/demo')} {store} />
		<div class="canvas-wrap">
			<TraekCanvas
				{engine}
				config={DEFAULT_TRACK_ENGINE_CONFIG}
				{registry}
				actions={TOOL_OPTIONS}
				{resolveActions}
				initialScale={snapshot?.viewport?.scale}
				initialOffset={snapshot?.viewport
					? { x: snapshot.viewport.offsetX, y: snapshot.viewport.offsetY }
					: undefined}
				{onSendMessage}
				onRetry={handleRetry}
				tourDelay={60000}
				minimapMinNodes={5}
				breadcrumbMinNodes={3}
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

	.canvas-wrap {
		flex: 1;
		min-height: 0;
		padding-top: 56px;
	}

	@media (max-width: 768px) {
		.canvas-wrap {
			padding-top: 52px;
		}
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
