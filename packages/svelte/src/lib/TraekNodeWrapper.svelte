<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import type { TraekEngine, MessageNode, Node } from './TraekEngine.svelte';
	import Ghost from './Ghost.svelte';
	import { getDetailLevel } from './canvas/AdaptiveRenderer.svelte';
	import TagBadges from './tags/TagBadges.svelte';
	import { detailLevelTransition } from './transitions';
	import NodeSkeleton from './canvas/NodeSkeleton.svelte';
	import Icon from './icons/Icon.svelte';
	import BookmarkBadge from './canvas/BookmarkBadge.svelte';
	import ColorPicker from './canvas/ColorPicker.svelte';

	const DEFAULT_PLACEHOLDER_HEIGHT = 100;

	let {
		node,
		isActive,
		isFocused = false,
		engine,
		viewportRoot = null,
		gridStep = 20,
		nodeWidth = 350,
		viewportResizeVersion = 0,
		scale = 1,
		onRetry,
		onResume,
		onAuthRequired,
		onNodeActivated,
		isSearchMatch = false,
		isCurrentMatch = false,
		isSearchDimmed = false,
		isSelected = false,
		dropTargetClass = null,
		ariaLevel = undefined,
		ariaSetsize = undefined,
		ariaPosinset = undefined,
		ariaExpanded = undefined,
		children
	}: {
		node: Node;
		isActive: boolean;
		isFocused?: boolean;
		engine?: TraekEngine;
		viewportRoot?: HTMLElement | null;
		gridStep?: number;
		nodeWidth?: number;
		viewportResizeVersion?: number;
		scale?: number;
		onRetry?: (nodeId: string) => void;
		/** Called when a streaming interruption should be resumed from partial content. */
		onResume?: (nodeId: string) => void;
		/** Called when auth has expired and the user needs to re-authenticate. */
		onAuthRequired?: () => void;
		/** Called when the user explicitly selects this node (click or Enter/Space on header). */
		onNodeActivated?: (nodeId: string) => void;
		isSearchMatch?: boolean;
		isCurrentMatch?: boolean;
		isSearchDimmed?: boolean;
		/** Whether this node is in the multi-select set. */
		isSelected?: boolean;
		/** CSS class for drop target state: 'drop-target-valid' | 'drop-target-invalid' | null */
		dropTargetClass?: string | null;
		/** ARIA tree semantics (per ARIA Tree Widget pattern) */
		ariaLevel?: number;
		ariaSetsize?: number;
		ariaPosinset?: number;
		ariaExpanded?: boolean;
		children: import('svelte').Snippet;
	} = $props();

	let wrapper = $state<HTMLElement | null>(null);
	let isInView = $state(true);
	let isThoughtExpanded = $state(false);
	let showNodeColorPicker = $state(false);
	let previousStatus = $state<string | undefined>(undefined);
	let showCompletePulse = $state(false);

	// ── Error classification ───────────────────────────────────────────────
	interface NodeErrorData {
		errorCode?:
			| 'rate_limit'
			| 'auth_expired'
			| 'server_error'
			| 'network'
			| 'stream_interrupted'
			| 'context_limit';
		retryAfter?: number;
		httpStatus?: number;
	}

	const errorData = $derived.by<NodeErrorData | null>(() => {
		if (node.status !== 'error') return null;
		const d = node.data as NodeErrorData | null | undefined;
		return d ?? null;
	});

	const errorCode = $derived(errorData?.errorCode ?? 'server_error');
	const isRateLimit = $derived(errorCode === 'rate_limit');
	const isAuthExpired = $derived(errorCode === 'auth_expired');
	const isStreamInterrupted = $derived(errorCode === 'stream_interrupted');
	const isContextLimit = $derived(errorCode === 'context_limit');
	const isWarnColor = $derived(isRateLimit || isStreamInterrupted || isContextLimit);

	let rateLimitCountdown = $state(0);

	$effect(() => {
		if (node.status === 'error' && isRateLimit && errorData?.retryAfter) {
			rateLimitCountdown = errorData.retryAfter;
			const id = setInterval(() => {
				rateLimitCountdown -= 1;
				if (rateLimitCountdown <= 0) {
					clearInterval(id);
					onRetry?.(node.id);
				}
			}, 1000);
			return () => clearInterval(id);
		}
	});
	// ── /Error classification ──────────────────────────────────────────────

	const detailLevel = $derived(getDetailLevel(scale));
	const firstLine = $derived.by(() => {
		if (node.type !== 'text' || !('content' in node)) return '';
		const content = (node as MessageNode).content;
		if (!content) return '';
		const lines = content.split('\n');
		return lines[0] || '';
	});

	$effect(() => {
		if (previousStatus === 'streaming' && node.status === 'done') {
			showCompletePulse = true;
			setTimeout(() => {
				showCompletePulse = false;
			}, 600);
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

	// Collapse & branch info
	// Use direct filtering over nodes array for reactivity instead of getChildren
	const nodeChildren = $derived(
		engine?.nodes.filter((n) => n.parentIds[0] === node.id && n.type !== 'thought') ?? []
	);
	const hasChildren = $derived(nodeChildren.length > 0);
	const hasBranches = $derived(nodeChildren.length > 1);
	const isCollapsed = $derived(engine?.isCollapsed(node.id) ?? false);
	const hiddenCount = $derived(
		isCollapsed && engine ? engine.getHiddenDescendantCount(node.id) : 0
	);
	const isOutdated = $derived(node.metadata?.outdated === true);
	const nodeColor = $derived((node.metadata?.color as string | null) ?? null);
	const isBookmarked = $derived(node.metadata?.bookmarked === true);
	const bookmarkLabel = $derived(node.metadata?.bookmarkLabel as string | undefined);

	$effect(() => {
		// Track viewportResizeVersion to trigger effect on change
		void viewportResizeVersion;
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
	role="treeitem"
	aria-selected={isActive}
	tabindex={isFocused ? 0 : -1}
	aria-level={ariaLevel}
	aria-setsize={ariaSetsize}
	aria-posinset={ariaPosinset}
	aria-expanded={ariaExpanded}
	class="message-node-wrapper {node.role} {isActive ? 'active' : ''} {isFocused
		? 'keyboard-focused'
		: ''} {node.status === 'error' ? 'error' : ''} {!isInView
		? 'message-node-wrapper--placeholder'
		: ''} {showCompletePulse ? 'stream-complete' : ''} {isOutdated
		? 'outdated'
		: ''} detail-{detailLevel} {isSearchMatch ? 'search-match' : ''} {isCurrentMatch
		? 'search-current'
		: ''} {isSearchDimmed ? 'search-dimmed' : ''} {isSelected
		? 'multi-selected'
		: ''} {dropTargetClass ?? ''}"
	style:left="{(node.metadata?.x ?? 0) * gridStep}px"
	style:top="{(node.metadata?.y ?? 0) * gridStep}px"
	style:width="{nodeWidth}px"
	style:height={!isInView ? `${placeholderHeight}px` : undefined}
	style:--node-accent={nodeColor ? `var(--traek-color-${nodeColor})` : null}
>
	<div class="node-header-container">
		<button
			type="button"
			class="node-header"
			onclick={(e) => {
				e.stopPropagation();
				if (engine) engine.activeNodeId = node.id;
				onNodeActivated?.(node.id);
			}}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					if (engine) engine.activeNodeId = node.id;
					onNodeActivated?.(node.id);
				}
			}}
		>
			<span class="role-indicator">
				{node.role === 'user' ? '● User' : '◆ Assistant'}
				{#if isOutdated}
					<span
						class="header-status header-status--outdated"
						title="This reply was based on a previous version of the message above."
						aria-label="Outdated: this reply was based on a previous version of the message above."
					>
						· Outdated
					</span>
				{:else if node.status === 'streaming'}
					<span class="header-status header-status--streaming" role="status" aria-live="polite">
						<span class="typing-dots" aria-hidden="true">
							<span class="typing-dot"></span>
							<span class="typing-dot"></span>
							<span class="typing-dot"></span>
						</span>
						Generating
					</span>
				{:else if node.status === 'error'}
					<span class="header-status header-status--error" role="alert">
						· Error{#if node.errorMessage}: {node.errorMessage}{/if}
					</span>
				{/if}
			</span>
		</button>
		{#if hasChildren && engine}
			<button
				type="button"
				class="collapse-toggle"
				onclick={(e) => {
					e.stopPropagation();
					engine.toggleCollapse(node.id);
				}}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						e.stopPropagation();
						engine.toggleCollapse(node.id);
					}
				}}
				aria-label={isCollapsed ? 'Expand subtree' : 'Collapse subtree'}
				aria-expanded={!isCollapsed}
			>
				<Icon
					name={isCollapsed ? 'expand' : 'collapse'}
					size={14}
					strokeWidth={2}
					class="collapse-icon"
					aria-hidden={true}
				/>
			</button>
		{/if}
		<TagBadges {node} {engine} />
	</div>
	{#if isCollapsed && hiddenCount > 0}
		<div class="hidden-count-badge">
			{hiddenCount} hidden
		</div>
	{/if}
	{#if node.status === 'error'}
		<div
			class="error-banner"
			class:error-banner--warn={isWarnColor}
			class:error-banner--auth={isAuthExpired}
			role="alert"
		>
			<svg
				class="error-banner-icon"
				width="16"
				height="16"
				viewBox="0 0 16 16"
				fill="none"
				aria-hidden="true"
			>
				{#if isRateLimit}
					<circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5" />
					<path
						d="M8 4.5V8l2.5 2"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
				{:else if isAuthExpired}
					<rect
						x="3"
						y="7"
						width="10"
						height="7.5"
						rx="1.5"
						stroke="currentColor"
						stroke-width="1.5"
					/>
					<path
						d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
				{:else if isStreamInterrupted}
					<path
						d="M2 8h3l2-4 2 8 2-4h3"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				{:else if isContextLimit}
					<path
						d="M8 2v9M5 8l3 3 3-3"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<line
						x1="3"
						y1="14"
						x2="13"
						y2="14"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
				{:else}
					<path
						d="M8 1L15 14H1L8 1Z"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linejoin="round"
					/>
					<path d="M8 6V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
					<circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
				{/if}
			</svg>

			<div class="error-banner-body">
				<span class="error-banner-message">
					{#if isRateLimit}
						Rate limited — retrying in <span aria-live="polite" aria-atomic="true"
							>{rateLimitCountdown}s</span
						>
					{:else if isAuthExpired}
						Session expired
					{:else if isStreamInterrupted}
						Stream interrupted
					{:else if isContextLimit}
						Context limit reached
					{:else}
						{node.errorMessage || 'An error occurred'}
					{/if}
				</span>

				{#if isRateLimit && errorData?.retryAfter}
					<div class="error-rate-limit-bar" aria-hidden="true">
						<div
							class="error-rate-limit-fill"
							style:width="{((errorData.retryAfter - rateLimitCountdown) / errorData.retryAfter) *
								100}%"
						></div>
					</div>
				{/if}

				{#if isAuthExpired}
					<span class="error-banner-hint">Your session has ended. Reconnect to continue.</span>
				{:else if isStreamInterrupted}
					<span class="error-banner-hint">Response was cut off mid-generation.</span>
				{:else if isContextLimit}
					<span class="error-banner-hint">Branch from an earlier node to continue.</span>
				{/if}
			</div>

			<div class="error-banner-actions">
				{#if isStreamInterrupted && onResume}
					<button
						type="button"
						class="error-banner-btn error-banner-secondary"
						onclick={() => onResume?.(node.id)}
					>
						Resume
					</button>
				{/if}
				{#if isAuthExpired}
					<button
						type="button"
						class="error-banner-btn error-banner-primary"
						onclick={() => onAuthRequired?.()}
					>
						Reconnect
					</button>
				{:else if onRetry && !isContextLimit}
					<button
						type="button"
						class="error-banner-btn error-banner-primary"
						onclick={() => onRetry?.(node.id)}
					>
						{isRateLimit ? 'Retry now' : 'Retry'}
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
							{#each thoughtSteps as step, i (i)}
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
	{#key detailLevel}
		{#if detailLevel === 'full' || detailLevel === 'compact'}
			<div class="message-node-content" transition:detailLevelTransition>
				{#if detailLevel === 'compact'}
					<div class="compact-text">{firstLine}</div>
				{:else if node.status === 'streaming' && !('content' in node && (node as import('./TraekEngine.svelte').MessageNode).content)}
					<NodeSkeleton lines={3} />
				{:else}
					{@render children()}
				{/if}
			</div>
		{:else if detailLevel === 'minimal'}
			<div class="minimal-content" transition:detailLevelTransition>
				<span class="minimal-role-icon">{node.role === 'user' ? '●' : '◆'}</span>
			</div>
		{/if}
	{/key}

	{#if hasBranches && !isCollapsed}
		<div class="branch-badge">
			{nodeChildren.length} branches
		</div>
	{/if}

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

	{#if isActive && engine}
		<div class="node-quick-actions">
			<button
				class="node-quick-btn"
				class:bookmarked={isBookmarked}
				onclick={() => {
					if (isBookmarked) engine?.unbookmarkNode(node.id);
					else engine?.bookmarkNode(node.id);
				}}
				title={isBookmarked ? 'Remove bookmark' : 'Bookmark this node'}
				aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this node'}
			>
				{isBookmarked ? '★' : '☆'}
			</button>
			<button
				class="node-quick-btn"
				onclick={() => {
					showNodeColorPicker = !showNodeColorPicker;
				}}
				title="Set node color"
				aria-label="Set node color"
			>
				●
			</button>
		</div>
		{#if showNodeColorPicker}
			<div class="node-color-popover">
				<ColorPicker
					value={nodeColor as import('./TraekEngine.svelte').NodeColor | null}
					onchange={(c) => {
						engine?.setNodeColor(node.id, c);
						showNodeColorPicker = false;
					}}
				/>
			</div>
		{/if}
	{/if}

	{#if isBookmarked}
		<BookmarkBadge label={bookmarkLabel} />
	{/if}
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
				box-shadow 0.2s,
				opacity 0.2s,
				width 0.2s,
				height 0.2s,
				border-radius 0.2s;
			backdrop-filter: blur(10px);
		}

		/* Color accent: colored top border when --node-accent is set */
		.message-node-wrapper:has(> .node-header-container) {
			border-top-color: var(--node-accent, var(--traek-thought-panel-border, #333333));
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
				box-shadow: 0 0 32px rgba(0, 216, 255, 0.6);
			}
			70% {
				border-color: var(--traek-thought-tag-cyan, #00d8ff);
				box-shadow: 0 0 20px rgba(0, 216, 255, 0.3);
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
			animation: stream-complete-pulse 600ms ease-out;
		}

		@media (prefers-reduced-motion: reduce) {
			.message-node-wrapper {
				animation: none;
			}
			.message-node-wrapper.stream-complete {
				animation: none;
			}
			.message-node-wrapper.keyboard-focused {
				outline: 2px solid var(--traek-keyboard-focus-ring, #ff9500);
			}
		}

		.message-node-wrapper.active {
			border-color: var(--traek-thought-panel-border-active, #00d8ff);
			box-shadow:
				0 0 0 1px var(--traek-thought-panel-border-active, #00d8ff),
				0 0 40px var(--traek-thought-panel-glow, rgba(0, 216, 255, 0.25));
			transform: scale(1.02);
		}

		/* Keyboard focus ring - distinct from active state */
		.message-node-wrapper.keyboard-focused {
			outline: 3px solid var(--traek-keyboard-focus-ring, #ff9500);
			outline-offset: 2px;
		}

		/* Both active and keyboard-focused */
		.message-node-wrapper.active.keyboard-focused {
			outline: 3px solid var(--traek-keyboard-focus-ring, #ff9500);
			outline-offset: 2px;
		}

		.message-node-wrapper--placeholder {
			pointer-events: none;
			visibility: hidden;
		}

		/* Multi-select highlight */
		.message-node-wrapper.multi-selected {
			outline: 2px solid var(--traek-node-active-border, #00d8ff);
			outline-offset: 3px;
			box-shadow: 0 0 0 4px rgba(0, 216, 255, 0.15);
		}

		/* Drop target indicators */
		.message-node-wrapper.drop-target-valid {
			outline: 2px dashed #22c55e;
			outline-offset: 3px;
			box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.2);
			transition: box-shadow 0.1s ease;
		}

		.message-node-wrapper.drop-target-invalid {
			outline: 2px dashed #ef4444;
			outline-offset: 3px;
			box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.15);
			transition: box-shadow 0.1s ease;
		}

		/* Search highlighting */
		.message-node-wrapper.search-dimmed {
			opacity: 0.25;
			transition: opacity 0.2s ease;
		}

		.message-node-wrapper.search-match {
			opacity: 1;
			outline: 2px solid var(--traek-search-match-border, #facc15);
			outline-offset: 2px;
			transition:
				opacity 0.2s ease,
				outline 0.2s ease;
		}

		.message-node-wrapper.search-current {
			opacity: 1;
			outline: 2px solid var(--traek-search-current-border, #f97316);
			outline-offset: 2px;
			box-shadow: 0 0 0 4px var(--traek-search-current-glow, rgba(249, 115, 22, 0.25));
			transition:
				opacity 0.2s ease,
				outline 0.2s ease,
				box-shadow 0.2s ease;
		}

		.node-header-container {
			position: relative;
			display: flex;
			align-items: center;
			background: var(--traek-thought-header-bg, rgba(255, 255, 255, 0.03));
			border-bottom: 1px solid var(--traek-thought-header-border, #222222);
			border-radius: 14px 14px 0 0;
			flex-shrink: 0;
		}

		.node-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 10px 14px;
			background: transparent;
			border: none;
			font-family: 'Inter', sans-serif;
			font-size: 10px;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			color: var(--traek-thought-header-muted, #666666);
			flex-shrink: 0;
			cursor: pointer;
			flex: 1;
			text-align: left;
		}

		.node-header:hover {
			background: rgba(255, 255, 255, 0.06);
		}

		/* All node headers show grab cursor — dragging works on any node */
		.message-node-wrapper .node-header {
			cursor: grab;
		}

		.message-node-wrapper .node-header:active {
			cursor: grabbing;
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

		.header-status--outdated {
			color: var(--traek-thought-row-muted-4, #666666);
			text-decoration: line-through;
			opacity: 0.7;
		}

		.typing-dots {
			display: inline-flex;
			align-items: center;
			gap: 3px;
			height: 10px;
		}

		.typing-dot {
			width: 4px;
			height: 4px;
			border-radius: 50%;
			background: currentColor;
			animation: typing-bounce 1.2s ease-in-out infinite;
		}

		.typing-dot:nth-child(2) {
			animation-delay: 0.18s;
		}

		.typing-dot:nth-child(3) {
			animation-delay: 0.36s;
		}

		@keyframes typing-bounce {
			0%,
			80%,
			100% {
				transform: scale(0.6);
				opacity: 0.4;
			}
			40% {
				transform: scale(1);
				opacity: 1;
			}
		}

		@media (prefers-reduced-motion: reduce) {
			.typing-dot {
				animation: none;
				opacity: 0.7;
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

		/* Outdated state */
		.message-node-wrapper.outdated {
			opacity: 0.6;
			filter: grayscale(0.3);
		}

		.message-node-wrapper.outdated .message-node-content {
			text-decoration: line-through;
			text-decoration-color: var(--traek-thought-row-muted-4, #666666);
			text-decoration-thickness: 1px;
		}

		/* ── Error banner ────────────────────────────────────────────────── */
		.error-banner {
			display: flex;
			align-items: flex-start;
			gap: 8px;
			padding: 10px 12px;
			background: var(--traek-error-bg, rgba(239, 68, 68, 0.08));
			border: 1px solid var(--traek-error-border-color, rgba(239, 68, 68, 0.25));
			border-radius: 8px;
			margin: 8px;
			font-size: 12px;
			color: var(--traek-error-text, #ef4444);
		}

		/* Amber variant: rate-limit, stream-interrupted, context-limit */
		.error-banner--warn {
			background: var(--traek-warn-bg, rgba(245, 158, 11, 0.08));
			border-color: var(--traek-warn-border, rgba(245, 158, 11, 0.25));
			color: var(--traek-warn-text, #f59e0b);
		}

		/* Orange variant: auth expired */
		.error-banner--auth {
			background: rgba(255, 62, 0, 0.08);
			border-color: rgba(255, 62, 0, 0.25);
			color: var(--traek-error-text, #ff6b4a);
		}

		.error-banner-icon {
			flex-shrink: 0;
			margin-top: 1px;
			color: currentColor;
		}

		.error-banner-body {
			flex: 1;
			min-width: 0;
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		.error-banner-message {
			font-weight: 500;
			line-height: 1.3;
		}

		.error-banner-hint {
			font-size: 11px;
			opacity: 0.75;
			line-height: 1.4;
		}

		/* Rate-limit countdown progress bar */
		.error-rate-limit-bar {
			height: 2px;
			background: rgba(255, 255, 255, 0.1);
			border-radius: 1px;
			overflow: hidden;
			margin-top: 4px;
		}

		.error-rate-limit-fill {
			height: 100%;
			background: currentColor;
			border-radius: 1px;
			transition: width 1s linear;
		}

		.error-banner-actions {
			display: flex;
			gap: 4px;
			flex-shrink: 0;
			align-items: flex-start;
			flex-wrap: wrap;
		}

		.error-banner-btn {
			padding: 4px 10px;
			border-radius: 4px;
			border: 1px solid;
			font-size: 11px;
			cursor: pointer;
			font: inherit;
			white-space: nowrap;
			min-height: 28px;
			transition:
				background 0.15s,
				opacity 0.15s;
		}

		.error-banner-btn:focus-visible {
			outline: 2px solid currentColor;
			outline-offset: 2px;
		}

		/* Primary action: red/orange/amber based on parent variant */
		.error-banner-primary {
			background: currentColor;
			border-color: currentColor;
			color: #000;
			font-weight: 500;
		}

		.error-banner-primary:hover {
			opacity: 0.85;
		}

		/* Secondary action (e.g. Resume for stream-interrupted) */
		.error-banner-secondary {
			background: transparent;
			border-color: currentColor;
			color: currentColor;
		}

		.error-banner-secondary:hover {
			background: rgba(255, 255, 255, 0.06);
		}

		.error-banner-dismiss {
			background: transparent;
			border-color: rgba(255, 255, 255, 0.15);
			color: rgba(255, 255, 255, 0.45);
		}

		.error-banner-dismiss:hover {
			background: rgba(255, 255, 255, 0.06);
			color: rgba(255, 255, 255, 0.65);
		}
		/* ── /Error banner ───────────────────────────────────────────────── */

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

		/* Tablet: 44px touch targets on interactive node chrome */
		@media (max-width: 1024px) and (min-width: 769px) {
			.node-header {
				min-height: 44px;
			}

			.thought-pill {
				min-height: 44px;
			}
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

		/* Collapse toggle button */
		.collapse-toggle {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 22px;
			height: 22px;
			padding: 0;
			margin: 0 10px 0 0;
			background: var(--traek-thought-toggle-bg, #444444);
			border: 1px solid var(--traek-thought-toggle-border, #555555);
			border-radius: 4px;
			color: var(--traek-thought-header-accent, #888888);
			cursor: pointer;
			transition:
				background var(--traek-duration-fast, 120ms) ease,
				color var(--traek-duration-fast, 120ms) ease,
				border-color var(--traek-duration-fast, 120ms) ease,
				transform var(--traek-duration-fast, 120ms) ease;
			flex-shrink: 0;
		}

		.collapse-toggle :global(.collapse-icon) {
			transition: transform var(--traek-duration-normal, 220ms) ease;
			display: block;
		}

		.collapse-toggle:hover {
			background: var(--traek-thought-toggle-border, #555555);
			color: var(--traek-thought-row-muted-2, #aaaaaa);
			border-color: var(--traek-node-active-border, rgba(0, 216, 255, 0.4));
			transform: scale(1.08);
		}

		.collapse-toggle:active {
			transform: scale(0.95);
		}

		.collapse-toggle:focus-visible {
			outline: 2px solid var(--traek-input-button-bg, #00d8ff);
			outline-offset: 2px;
		}

		@media (prefers-reduced-motion: reduce) {
			.collapse-toggle {
				transition: none;
			}
			.collapse-toggle :global(.collapse-icon) {
				transition: none;
			}
		}

		/* Hidden count badge */
		.hidden-count-badge {
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 4px 10px;
			background: var(--traek-thought-footer-bg, rgba(0, 0, 0, 0.2));
			border-top: 1px solid var(--traek-thought-divider, rgba(255, 255, 255, 0.06));
			font-size: 10px;
			font-weight: 500;
			letter-spacing: 0.3px;
			color: var(--traek-thought-row-muted-3, #999999);
			text-transform: uppercase;
			user-select: none;
			animation: fade-in 200ms ease-out;
		}

		@keyframes fade-in {
			from {
				opacity: 0;
			}
			to {
				opacity: 1;
			}
		}

		/* Branch badge */
		.branch-badge {
			position: absolute;
			bottom: -10px;
			left: 50%;
			transform: translateX(-50%);
			padding: 3px 8px;
			background: var(--traek-thought-toggle-bg, #444444);
			border: 1px solid var(--traek-thought-toggle-border, #555555);
			border-radius: 10px;
			font-size: 9px;
			font-weight: 600;
			letter-spacing: 0.4px;
			color: var(--traek-thought-badge-cyan, #00dddd);
			text-transform: uppercase;
			white-space: nowrap;
			user-select: none;
			pointer-events: none;
			z-index: 5;
			animation: fade-in 200ms ease-out;
		}

		/* Adaptive detail levels */
		.compact-text {
			padding: 16px;
			font-size: 14px;
			line-height: 1.4;
			color: var(--traek-textnode-text, #dddddd);
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.minimal-content {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100%;
			height: 60px;
		}

		.minimal-role-icon {
			font-size: 24px;
			opacity: 0.8;
		}

		.message-node-wrapper.user .minimal-role-icon {
			color: var(--traek-thought-tag-cyan, #00d8ff);
		}

		.message-node-wrapper.assistant .minimal-role-icon {
			color: var(--traek-thought-tag-orange, #ff3e00);
		}

		/* Dot level: small colored circle */
		.detail-dot {
			width: 12px !important;
			height: 12px !important;
			min-height: 12px;
			max-height: 12px;
			border-radius: 50%;
			overflow: hidden;
			backdrop-filter: none;
		}

		.detail-dot .node-header-container,
		.detail-dot .thought-inline,
		.detail-dot .error-banner,
		.detail-dot .hidden-count-badge,
		.detail-dot .branch-badge,
		.detail-dot .connection-port,
		.detail-dot .collapse-toggle {
			display: none;
		}

		.detail-dot.user {
			background: var(--traek-thought-tag-cyan, #00d8ff);
			border-color: var(--traek-thought-tag-cyan, #00d8ff);
		}

		.detail-dot.assistant {
			background: var(--traek-thought-tag-orange, #ff3e00);
			border-color: var(--traek-thought-tag-orange, #ff3e00);
		}

		/* Minimal level: hide certain UI elements */
		.detail-minimal .thought-inline,
		.detail-minimal .error-banner,
		.detail-minimal .branch-badge,
		.detail-minimal .connection-port {
			display: none;
		}

		.detail-minimal {
			max-height: 80px;
		}

		/* Compact level: hide thought details and complex UI */
		.detail-compact .thought-inline {
			display: none;
		}

		.detail-compact {
			max-height: 100px;
		}

		/* Content container for smooth transitions */
		.message-node-content,
		.minimal-content {
			will-change: transform, opacity;
		}

		/* Respect prefers-reduced-motion */
		@media (prefers-reduced-motion: reduce) {
			.message-node-wrapper {
				transition:
					transform 0.2s,
					border-color 0.2s,
					box-shadow 0.2s;
			}
		}

		/* Node quick actions bar (bookmark + color) */
		.node-quick-actions {
			position: absolute;
			top: -32px;
			right: 8px;
			display: flex;
			gap: 4px;
			z-index: 20;
		}

		.node-quick-btn {
			width: 26px;
			height: 26px;
			border-radius: 6px;
			border: 1px solid rgba(255, 255, 255, 0.15);
			background: var(--traek-node-bg, #1e1e2e);
			color: rgba(255, 255, 255, 0.7);
			cursor: pointer;
			font-size: 13px;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 0;
		}

		.node-quick-btn:hover {
			background: rgba(255, 255, 255, 0.1);
			color: white;
		}

		.node-quick-btn.bookmarked {
			color: var(--traek-color-yellow, #eab308);
		}

		.node-color-popover {
			position: absolute;
			top: 0;
			right: 40px;
			background: var(--traek-node-bg, #1e1e2e);
			border: 1px solid rgba(255, 255, 255, 0.15);
			border-radius: 8px;
			box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
			z-index: 30;
		}
	}
</style>
