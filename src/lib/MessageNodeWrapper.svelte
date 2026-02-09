<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import type { ChatEngine, MessageNode } from './ChatEngine.svelte';
	import Ghost from './Ghost.svelte';

	const LOG_CONTEXT = 'MessageNodeWrapper';
	const DEFAULT_PLACEHOLDER_HEIGHT = 100;

	let {
		node,
		isActive,
		engine,
		viewportRoot = null,
		gridStep = 20,
		nodeWidth = 350,
		viewportResizeVersion = 0,
		children
	}: {
		node: MessageNode;
		isActive: boolean;
		engine?: ChatEngine;
		viewportRoot?: HTMLElement | null;
		gridStep?: number;
		nodeWidth?: number;
		viewportResizeVersion?: number;
		children: import('svelte').Snippet;
	} = $props();

	let wrapper = $state<HTMLElement | null>(null);
	let isInView = $state(true);
	let isThoughtExpanded = $state(false);
	let expandedStepIndices = $state<Record<number, boolean>>({});
	let resizeObserver: ResizeObserver;
	let intersectionObserverRef: IntersectionObserver | null = null;

	function toggleStepExpand(i: number) {
		expandedStepIndices = {
			...expandedStepIndices,
			[i]: !expandedStepIndices[i]
		};
	}
	const placeholderHeight = $derived(node.metadata?.height ?? DEFAULT_PLACEHOLDER_HEIGHT);

	const thoughtChild = $derived(
		engine?.nodes.find((n) => n.parentId === node.id && n.type === 'thought') ?? null
	);
	const thoughtSteps = $derived((thoughtChild?.data as { steps?: string[] })?.steps ?? []);
	const thoughtPillLabel = $derived(
		thoughtChild?.content === 'Done'
			? 'Thinking completed'
			: thoughtSteps.length > 0
				? thoughtSteps[thoughtSteps.length - 1]
				: (thoughtChild?.content ?? 'Thought process')
	);

	$effect(() => {
		const _ = viewportResizeVersion;
		if (wrapper && intersectionObserverRef) {
			intersectionObserverRef.unobserve(wrapper);
			intersectionObserverRef.observe(wrapper);
		}
	});

	onMount(() => {
		if (!wrapper) return;

		intersectionObserverRef = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (!entry) return;
				const nowInView = entry.isIntersecting;
				if (nowInView !== isInView) {
					isInView = nowInView;
					if (nowInView) {
						console.log(LOG_CONTEXT, 'Card reappeared', {
							nodeId: node.id.slice(0, 4),
							height: node.metadata?.height
						});
					} else {
						console.log(LOG_CONTEXT, 'Card vanished (placeholder)', {
							nodeId: node.id.slice(0, 4),
							height: wrapper?.offsetHeight ?? node.metadata?.height
						});
					}
				}
			},
			{
				root: viewportRoot,
				rootMargin: '100px',
				threshold: 0
			}
		);
		intersectionObserverRef.observe(wrapper);

		if (engine) {
			resizeObserver = new ResizeObserver(() => {
				if (!wrapper) return;
				if (wrapper.classList.contains('message-node-wrapper--placeholder')) return;
				engine.updateNodeHeight(node.id, wrapper.offsetHeight);
			});
			resizeObserver.observe(wrapper);
		}

		return () => {
			intersectionObserverRef?.disconnect();
			resizeObserver?.disconnect();
		};
	});
</script>

<div
	bind:this={wrapper}
	data-node-id={node.id}
	class="message-node-wrapper {node.role} {isActive ? 'active' : ''} {!isInView
		? 'message-node-wrapper--placeholder'
		: ''}"
	style:left="{(node.metadata?.x ?? 0) * gridStep}px"
	style:top="{(node.metadata?.y ?? 0) * gridStep}px"
	style:width="{nodeWidth}px"
	style:height={!isInView ? `${placeholderHeight}px` : undefined}
>
	<button
		type="button"
		class="node-header"
		onclick={(e) => {
			e.stopPropagation();
			if (engine) engine.activeNodeId = node.id;
		}}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				if (engine) engine.activeNodeId = node.id;
			}
		}}
	>
		<span class="role-indicator">
			{node.role === 'user' ? '● User' : '◆ Assistant'}
			{#if node.status === 'streaming'}
				<span class="header-status header-status--streaming" role="status">
					<span class="header-status-spinner"></span>
					Processing…
				</span>
			{:else if node.status === 'error'}
				<span class="header-status header-status--error" role="alert">
					· Error{#if node.errorMessage}: {node.errorMessage}{/if}
				</span>
			{/if}
		</span>
		<span class="node-id">ID: {node.id.slice(0, 4)}</span>
	</button>
	{#if thoughtChild}
		<div class="thought-inline">
			<button
				type="button"
				class="thought-pill"
				class:thinking={thoughtChild.content === 'Thinking...'}
				onclick={() => (isThoughtExpanded = !isThoughtExpanded)}
				onkeydown={(e) => e.key === 'Enter' && (isThoughtExpanded = !isThoughtExpanded)}
			>
				<span class="thought-pill-icon" aria-hidden="true">
					<Ghost />
				</span>
				<span class="thought-pill-label">
					{thoughtPillLabel}
				</span>
				<span class="thought-chevron" class:expanded={isThoughtExpanded}>▼</span>
			</button>
			{#if isThoughtExpanded}
				<div class="thought-detail" transition:slide={{ duration: 180 }}>
					{#if thoughtSteps.length > 0}
						<ul class="thought-steps">
							{#each thoughtSteps as step, i}
								{@const isLast = i === thoughtSteps.length - 1}
								{@const inProgress = isLast && thoughtChild.content === 'Thinking...'}
								{@const stepExpanded = expandedStepIndices[i]}
								<li class="thought-step" class:active={inProgress}>
									<button
										type="button"
										class="thought-step-row"
										onclick={() => toggleStepExpand(i)}
										onkeydown={(e) => e.key === 'Enter' && toggleStepExpand(i)}
									>
										{#if inProgress}
											<span class="thought-spinner"></span>
										{:else}
											<span class="thought-step-status">✓</span>
										{/if}
										<span class="thought-step-text">{step}</span>
										<span
											class="thought-step-chevron"
											class:expanded={stepExpanded}
											aria-hidden="true">▼</span
										>
									</button>
									{#if stepExpanded}
										<div class="thought-step-detail">
											{step}
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					{:else}
						<div class="thought-simple">
							{#if thoughtChild.content === 'Thinking...'}
								<span class="thought-spinner"></span>
							{/if}
							{thoughtChild.content}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
	<div class="message-node-content">
		{@render children()}
	</div>
</div>

<style>
	.message-node-wrapper {
		position: absolute;
		display: flex;
		flex-direction: column;
		min-width: 0;
		max-height: 500px;
		background: rgba(22, 22, 22, 0.9);
		border: 1px solid #333;
		cursor: grab;
		border-radius: 14px;
		overflow: hidden;
		transition:
			transform 0.2s,
			border-color 0.2s,
			box-shadow 0.2s;
		backdrop-filter: blur(10px);
	}

	.message-node-wrapper.active {
		border-color: #00d8ff;
		box-shadow: 0 0 30px rgba(0, 216, 255, 0.15);
		transform: scale(1.02);
	}

	.message-node-wrapper--placeholder {
		pointer-events: none;
		visibility: hidden;
	}

	.node-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 14px;
		background: rgba(255, 255, 255, 0.03);
		border: none;
		border-bottom: 1px solid #222;
		font-family: 'Inter', sans-serif;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: #666;
		flex-shrink: 0;
		cursor: pointer;
		width: 100%;
		text-align: left;
	}

	.node-header:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.role-indicator {
		color: #888;
		user-select: none;
	}

	.message-node-wrapper.user .role-indicator {
		color: #00d8ff;
	}

	.message-node-wrapper.assistant .role-indicator {
		color: #ff3e00;
	}

	.node-id {
		color: #444;
		font-size: 9px;
	}

	.header-status {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-left: 6px;
		font-weight: 400;
		text-transform: none;
		letter-spacing: 0;
		opacity: 0.9;
	}

	.header-status--streaming {
		color: #00d8ff;
	}

	.header-status--error {
		color: #ff6b4a;
	}

	.header-status-spinner {
		width: 10px;
		height: 10px;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;
		animation: header-spin 0.8s linear infinite;
	}

	@keyframes header-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.thought-inline {
		flex-shrink: 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.thought-pill {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 6px 14px;
		background: rgba(255, 255, 255, 0.03);
		border: none;
		border-radius: 0;
		cursor: pointer;
		font: inherit;
		color: #888;
		transition:
			background 0.15s,
			color 0.15s;
	}

	.thought-pill:hover {
		background: rgba(255, 255, 255, 0.06);
		color: #aaa;
	}

	.thought-pill.thinking {
		animation: thought-pulse 1.8s ease-in-out infinite;
	}

	@keyframes thought-pulse {
		0%,
		100% {
			color: #aaa;
		}
		50% {
			color: #666;
		}
	}

	.thought-pill-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		opacity: 0.9;
	}
	.thought-pill-icon svg {
		display: block;
	}

	.thought-pill-label {
		flex: 1;
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.3px;
		text-align: left;
	}

	.thought-chevron {
		font-size: 8px;
		opacity: 0.5;
		transition: transform 0.2s;
	}

	.thought-chevron.expanded {
		transform: rotate(180deg);
	}

	.thought-detail {
		padding: 8px 14px 10px;
		background: rgba(0, 0, 0, 0.15);
	}

	.thought-steps {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.thought-step {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.thought-step-row {
		display: flex;
		align-items: flex-start;
		gap: 6px;
		font-size: 0.75rem;
		width: 100%;
		padding: 2px 0;
		color: #999;
		line-height: 1.35;
		background: none;
		border: none;
		cursor: pointer;
		font: inherit;
		text-align: left;
		transition: color 0.15s;
	}

	.thought-step-row:hover {
		color: #bbb;
	}

	.thought-step-status {
		color: #00dddd;
		flex-shrink: 0;
	}

	.thought-step-text {
		flex: 1;
		min-width: 0;
		font-size: 0.75rem;
	}

	.thought-step.active .thought-step-text {
		color: #bbb;
	}

	.thought-step-chevron {
		font-size: 8px;
		opacity: 0.5;
		flex-shrink: 0;
		transition: transform 0.2s;
	}

	.thought-step-chevron.expanded {
		transform: rotate(180deg);
	}

	.thought-step-detail {
		max-height: 60px;
		overflow-y: auto;
		padding: 6px 8px;
		margin-left: 20px;
		font-size: 10px;
		line-height: 1.4;
		color: #888;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.thought-step-detail::-webkit-scrollbar {
		width: 3px;
	}

	.thought-step-detail::-webkit-scrollbar-thumb {
		background: #444;
		border-radius: 3px;
	}

	.thought-spinner {
		width: 10px;
		height: 10px;
		border: 1.5px solid #555;
		border-top-color: transparent;
		border-radius: 50%;
		animation: thought-spin 1s linear infinite;
		display: inline-block;
		flex-shrink: 0;
	}

	.thought-simple {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		color: #999;
		font-style: italic;
	}

	@keyframes thought-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.message-node-content {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
		min-height: 0;
	}

	/* Child node cards are positioned by this wrapper, not by themselves */
	.message-node-content :global(.node-card) {
		position: static;
		left: auto;
		top: auto;
	}
</style>
