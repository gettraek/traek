<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import type { TraekEngine, MessageNode, Node } from './TraekEngine.svelte.ts';
	import Ghost from './Ghost.svelte';

	const DEFAULT_PLACEHOLDER_HEIGHT = 100;

	let {
		node,
		isActive,
		engine,
		viewportRoot = null,
		gridStep = 20,
		nodeWidth = 350,
		viewportResizeVersion = 0,
		onRetry,
		children
	}: {
		node: Node;
		isActive: boolean;
		engine?: TraekEngine;
		viewportRoot?: HTMLElement | null;
		gridStep?: number;
		nodeWidth?: number;
		viewportResizeVersion?: number;
		onRetry?: (nodeId: string) => void;
		children: import('svelte').Snippet;
	} = $props();

	let wrapper = $state<HTMLElement | null>(null);
	let isInView = $state(true);
	let isThoughtExpanded = $state(false);
	let previousStatus = $state<string | undefined>(undefined);
	let showCompletePulse = $state(false);

	$effect(() => {
		if (previousStatus === 'streaming' && node.status === 'done') {
			showCompletePulse = true;
			setTimeout(() => {
				showCompletePulse = false;
			}, 300);
		}
		previousStatus = node.status;
	});
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
		(engine?.nodes.find(
			(n) => n.parentIds.includes(node.id) && n.type === 'thought'
		) as MessageNode) ?? null
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
	class="message-node-wrapper {node.role} {isActive ? 'active' : ''} {node.status === 'error'
		? 'error'
		: ''} {!isInView ? 'message-node-wrapper--placeholder' : ''} {showCompletePulse
		? 'stream-complete'
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
	</button>
	{#if node.status === 'error'}
		<div class="error-banner" role="alert">
			<svg
				class="error-banner-icon"
				width="16"
				height="16"
				viewBox="0 0 16 16"
				fill="none"
				aria-hidden="true"
			>
				<path
					d="M8 1L15 14H1L8 1Z"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linejoin="round"
				/>
				<path d="M8 6V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
				<circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
			</svg>
			<span class="error-banner-message">
				{node.errorMessage || 'An error occurred'}
			</span>
			<div class="error-banner-actions">
				{#if onRetry}
					<button
						type="button"
						class="error-banner-btn error-banner-retry"
						onclick={() => onRetry?.(node.id)}
					>
						Retry
					</button>
				{/if}
				<button
					type="button"
					class="error-banner-btn error-banner-dismiss"
					onclick={() => engine?.updateNode(node.id, { status: 'done', errorMessage: undefined })}
				>
					Dismiss
				</button>
			</div>
		</div>
	{/if}
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

	<!-- Connection ports -->
	<div
		class="connection-port connection-port--input"
		data-port-node-id={node.id}
		data-port-type="input"
	></div>
	<div
		class="connection-port connection-port--output"
		data-port-node-id={node.id}
		data-port-type="output"
	></div>
</div>

<style>
	@layer base {
		.message-node-wrapper {
			position: absolute;
			display: flex;
			flex-direction: column;
			min-width: 0;
			max-height: 500px;
			background: var(--traek-thought-panel-bg, rgba(22, 22, 22, 0.9));
			border: 1px solid var(--traek-thought-panel-border, #333333);
			border-radius: 14px;
			overflow: visible;
			transition:
				transform 0.2s,
				border-color 0.2s,
				box-shadow 0.2s;
			backdrop-filter: blur(10px);
		}

		@keyframes node-appear {
			from {
				opacity: 0;
				transform: scale(0.96);
			}
			to {
				opacity: 1;
				transform: scale(1);
			}
		}

		@keyframes stream-complete-pulse {
			0% {
				border-color: var(--traek-thought-tag-cyan, #00d8ff);
				box-shadow: 0 0 20px rgba(0, 216, 255, 0.4);
			}
			100% {
				border-color: var(--traek-thought-panel-border, #333333);
				box-shadow: none;
			}
		}

		.message-node-wrapper {
			animation: node-appear 250ms ease-out both;
		}

		.message-node-wrapper.stream-complete {
			animation: stream-complete-pulse 300ms ease-out;
		}

		@media (prefers-reduced-motion: reduce) {
			.message-node-wrapper {
				animation: none;
			}
			.message-node-wrapper.stream-complete {
				animation: none;
			}
		}

		.message-node-wrapper.active {
			border-color: var(--traek-thought-panel-border-active, #00d8ff);
			box-shadow: 0 0 30px var(--traek-thought-panel-glow, rgba(0, 216, 255, 0.15));
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
			background: var(--traek-thought-header-bg, rgba(255, 255, 255, 0.03));
			border: none;
			border-bottom: 1px solid var(--traek-thought-header-border, #222222);
			border-radius: 14px 14px 0 0;
			font-family: 'Inter', sans-serif;
			font-size: 10px;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			color: var(--traek-thought-header-muted, #666666);
			flex-shrink: 0;
			cursor: pointer;
			width: 100%;
			text-align: left;
		}

		.node-header:hover {
			background: rgba(255, 255, 255, 0.06);
		}

		.role-indicator {
			color: var(--traek-thought-header-accent, #888888);
			user-select: none;
			display: flex;
			align-items: center;
			gap: 6px;
		}

		.message-node-wrapper.user .role-indicator {
			color: var(--traek-thought-tag-cyan, #00d8ff);
		}

		.message-node-wrapper.assistant .role-indicator {
			color: var(--traek-thought-tag-orange, #ff3e00);
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
			color: var(--traek-thought-tag-cyan, #00d8ff);
		}

		.header-status--error {
			color: var(--traek-thought-tag-orange, #ff6b4a);
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
			border-bottom: 1px solid var(--traek-thought-divider, rgba(255, 255, 255, 0.06));
		}

		.thought-pill {
			display: flex;
			align-items: center;
			gap: 6px;
			width: 100%;
			padding: 6px 14px;
			background: var(--traek-thought-header-bg, rgba(255, 255, 255, 0.03));
			border: none;
			border-radius: 0;
			cursor: pointer;
			font: inherit;
			color: var(--traek-thought-row-muted-1, #888888);
			transition:
				background 0.15s,
				color 0.15s;
		}

		.thought-pill:hover {
			background: rgba(255, 255, 255, 0.06);
			color: var(--traek-thought-row-muted-2, #aaaaaa);
		}

		.thought-pill.thinking {
			animation: thought-pulse 1.8s ease-in-out infinite;
		}

		@keyframes thought-pulse {
			0%,
			100% {
				color: var(--traek-thought-row-muted-2, #aaaaaa);
			}
			50% {
				color: var(--traek-thought-row-muted-4, #666666);
			}
		}

		.thought-pill-icon {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			line-height: 1;
			opacity: 0.9;
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
			color: var(--traek-thought-row-muted-3, #999999);
			line-height: 1.35;
			background: none;
			border: none;
			cursor: pointer;
			font: inherit;
			text-align: left;
			transition: color 0.15s;
		}

		.thought-step-row:hover {
			color: var(--traek-thought-footer-muted, #bbbbbb);
		}

		.thought-step-status {
			color: var(--traek-thought-badge-cyan, #00dddd);
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
			color: var(--traek-thought-row-muted-1, #888888);
			background: var(--traek-thought-footer-bg, rgba(0, 0, 0, 0.2));
			border-radius: 6px;
			border: 1px solid var(--traek-thought-footer-border, rgba(255, 255, 255, 0.05));
		}

		.thought-step-detail::-webkit-scrollbar {
			width: 3px;
		}

		.thought-step-detail::-webkit-scrollbar-thumb {
			background: var(--traek-thought-toggle-bg, #444444);
			border-radius: 3px;
		}

		.thought-spinner {
			width: 10px;
			height: 10px;
			border: 1.5px solid var(--traek-thought-toggle-border, #555555);
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
			color: var(--traek-thought-row-muted-3, #999999);
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
			overflow: hidden;
			user-select: text;
			cursor: text;
			border-radius: 0 0 14px 14px;
		}

		/* Child node cards are positioned by this wrapper, not by themselves */
		.message-node-content :global(.node-card) {
			position: static;
			left: auto;
			top: auto;
		}

		/* Error state */
		.message-node-wrapper.error {
			border: 2px solid var(--traek-error-border, #ff3e00);
			box-shadow: 0 0 20px var(--traek-error-glow, rgba(255, 62, 0, 0.3));
		}

		.error-banner {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 12px;
			background: var(--traek-error-banner-bg, rgba(255, 62, 0, 0.1));
			border-radius: 8px;
			margin: 8px;
			font-size: 12px;
			color: var(--traek-error-text, #ff6b4a);
		}

		.error-banner-icon {
			flex-shrink: 0;
			color: var(--traek-error-text, #ff6b4a);
		}

		.error-banner-message {
			flex: 1;
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.error-banner-actions {
			display: flex;
			gap: 6px;
			flex-shrink: 0;
		}

		.error-banner-btn {
			padding: 3px 10px;
			border-radius: 4px;
			border: 1px solid;
			font-size: 11px;
			cursor: pointer;
			font: inherit;
			transition:
				background 0.15s,
				opacity 0.15s;
		}

		.error-banner-retry {
			background: var(--traek-error-border, #ff3e00);
			border-color: var(--traek-error-border, #ff3e00);
			color: #fff;
		}

		.error-banner-retry:hover {
			opacity: 0.85;
		}

		.error-banner-dismiss {
			background: transparent;
			border-color: var(--traek-error-text, #ff6b4a);
			color: var(--traek-error-text, #ff6b4a);
		}

		.error-banner-dismiss:hover {
			background: rgba(255, 62, 0, 0.1);
		}

		/* Connection ports */
		.connection-port {
			position: absolute;
			left: 50%;
			width: 12px;
			height: 12px;
			border-radius: 50%;
			background: var(--traek-thought-panel-border, #333333);
			border: 2px solid var(--traek-thought-panel-bg, rgba(22, 22, 22, 0.9));
			transform: translateX(-50%);
			cursor: crosshair;
			opacity: 0;
			transition:
				opacity 0.15s,
				transform 0.15s,
				background 0.15s,
				box-shadow 0.15s;
			z-index: 10;
			pointer-events: auto;
		}

		.connection-port--input {
			top: -6px;
		}

		.connection-port--output {
			bottom: -6px;
		}

		.message-node-wrapper:hover .connection-port,
		:global(.connection-drag-active) .connection-port {
			opacity: 1;
		}

		.connection-port:hover {
			transform: translateX(-50%) scale(1.4);
			background: var(--traek-thought-tag-cyan, #00d8ff);
			box-shadow: 0 0 8px var(--traek-thought-panel-glow, rgba(0, 216, 255, 0.4));
		}

		.connection-port:global(.port-drop-target) {
			transform: translateX(-50%) scale(1.6);
			background: var(--traek-thought-tag-cyan, #00d8ff);
			box-shadow: 0 0 16px var(--traek-thought-panel-glow, rgba(0, 216, 255, 0.6));
		}

		.node-header:focus-visible,
		.thought-pill:focus-visible,
		.error-banner-btn:focus-visible {
			outline: 2px solid var(--traek-input-button-bg, #00d8ff);
			outline-offset: 2px;
		}

		/* Mobile touch target improvements */
		@media (max-width: 768px) {
			.node-header {
				padding: 14px 14px;
				min-height: 44px;
			}

			.thought-pill {
				padding: 10px 14px;
				min-height: 44px;
			}
		}
	}
</style>
