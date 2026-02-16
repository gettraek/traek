<script lang="ts">
	import type { Component } from 'svelte';
	import {
		type TraekEngine,
		type MessageNode,
		type Node,
		type CustomTraekNode,
		type NodeComponentMap
	} from '../TraekEngine.svelte';
	import TraekNodeWrapper from '../TraekNodeWrapper.svelte';
	import type { NodeTypeRegistry } from '../node-types/NodeTypeRegistry.svelte.js';
	import PositionIndicator from './PositionIndicator.svelte';
	import { SwipeNavigator } from './SwipeNavigator.svelte.js';
	import { getEnterTransform, getExitTransform, getTransitionDuration } from './transitions.js';
	import {
		DEFAULT_FOCUS_MODE_CONFIG,
		type FocusModeConfig,
		type SwipeDirection,
		type NavigationTarget
	} from './focusModeTypes.js';

	let {
		engine,
		componentMap = {},
		registry,
		focusConfig,
		onSendMessage,
		onRetry
	}: {
		engine: TraekEngine;
		componentMap?: NodeComponentMap;
		registry?: NodeTypeRegistry;
		focusConfig?: Partial<FocusModeConfig>;
		onSendMessage?: (input: string, userNode: MessageNode) => void;
		onRetry?: (nodeId: string) => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	const config: FocusModeConfig = { ...DEFAULT_FOCUS_MODE_CONFIG, ...focusConfig };

	// svelte-ignore state_referenced_locally
	let currentNodeId = $state<string | null>(engine.activeNodeId);
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	let lastVisitedChild = new Map<string, string>();
	let showInput = $state(false);
	let userInput = $state('');
	let containerEl = $state<HTMLElement | null>(null);

	// Transition state
	let transitionState = $state<'idle' | 'transitioning'>('idle');
	let outgoingNodeId = $state<string | null>(null);
	let incomingNodeId = $state<string | null>(null);
	let transitionDirection = $state<SwipeDirection | null>(null);

	// Sync with engine activeNodeId
	$effect(() => {
		const engineActive = engine.activeNodeId;
		if (engineActive && engineActive !== currentNodeId && transitionState === 'idle') {
			currentNodeId = engineActive;
		}
	});

	// Derived node info
	const currentNode = $derived(currentNodeId ? (engine.getNode(currentNodeId) ?? null) : null);
	const depth = $derived(currentNodeId ? engine.getDepth(currentNodeId) : 0);
	const maxDepth = $derived(engine.getMaxDepth());
	const siblingInfo = $derived(
		currentNodeId ? engine.getSiblingIndex(currentNodeId) : { index: 0, total: 1 }
	);
	const children = $derived(
		currentNodeId ? engine.getChildren(currentNodeId).filter((c) => c.type !== 'thought') : []
	);
	const isLeaf = $derived(children.length === 0);

	function navigateTo(target: NavigationTarget) {
		if (transitionState !== 'idle') return;

		// Record current as lastVisitedChild of parent
		if (currentNodeId) {
			const parent = engine.getParent(currentNodeId);
			if (parent) {
				lastVisitedChild.set(parent.id, currentNodeId);
			}
		}

		showInput = false;
		transitionState = 'transitioning';
		outgoingNodeId = currentNodeId;
		incomingNodeId = target.nodeId;
		transitionDirection = target.direction;

		const duration = getTransitionDuration(config.transitionDuration);

		if (duration === 0) {
			finishTransition(target.nodeId);
			return;
		}

		setTimeout(() => {
			finishTransition(target.nodeId);
		}, duration);
	}

	function finishTransition(targetId: string) {
		currentNodeId = targetId;
		engine.activeNodeId = targetId;
		transitionState = 'idle';
		outgoingNodeId = null;
		incomingNodeId = null;
		transitionDirection = null;
	}

	// SwipeNavigator
	const navigator = new SwipeNavigator(config, (result) => {
		if (!result.direction || !currentNodeId) return;

		switch (result.direction) {
			case 'up': {
				const parent = engine.getParent(currentNodeId);
				if (parent) {
					navigateTo({ nodeId: parent.id, direction: 'up' });
				}
				// Bounce if root (no parent) — handled by no-op
				break;
			}
			case 'down': {
				if (isLeaf) {
					showInput = true;
					break;
				}
				const firstChild = children[0];
				if (firstChild) {
					const hintId = lastVisitedChild.get(currentNodeId);
					const target = hintId
						? (children.find((c) => c.id === hintId) ?? firstChild)
						: firstChild;
					navigateTo({ nodeId: target.id, direction: 'down' });
				}
				break;
			}
			case 'left': {
				const siblings = engine.getSiblings(currentNodeId);
				const idx = siblings.findIndex((s) => s.id === currentNodeId);
				if (idx > 0) {
					navigateTo({ nodeId: siblings[idx - 1].id, direction: 'left' });
				}
				break;
			}
			case 'right': {
				const siblings = engine.getSiblings(currentNodeId);
				const idx = siblings.findIndex((s) => s.id === currentNodeId);
				if (idx < siblings.length - 1) {
					navigateTo({ nodeId: siblings[idx + 1].id, direction: 'right' });
				}
				break;
			}
		}
	});

	// Bind touch events
	$effect(() => {
		if (!containerEl) return;
		return navigator.bind(containerEl);
	});

	function resolveComponent(node: Node): Component<Record<string, unknown>> | undefined {
		const typeDef = registry?.get(node.type);
		const uiData = node as CustomTraekNode;
		return typeDef?.component ?? uiData?.component ?? componentMap[node.type];
	}

	function sendMessage() {
		if (!userInput.trim() || !currentNodeId) return;
		const userNode = engine.addNode(userInput, 'user');
		const input = userInput;
		userInput = '';
		showInput = false;

		// Navigate to new node
		navigateTo({ nodeId: userNode.id, direction: 'down' });
		onSendMessage?.(input, userNode);
	}

	// Keyboard handling for input
	function handleInputKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	const transitionDurationMs = getTransitionDuration(config.transitionDuration);
</script>

<div class="focus-mode" bind:this={containerEl}>
	<!-- Node display area -->
	<div class="focus-node-container">
		{#if transitionState === 'transitioning' && outgoingNodeId && transitionDirection}
			{@const outNode = engine.getNode(outgoingNodeId)}
			{#if outNode}
				{@const OutComponent = resolveComponent(outNode)}
				<div
					class="focus-node-slot exiting"
					style:transform={getExitTransform(transitionDirection)}
					style:transition="transform {transitionDurationMs}ms cubic-bezier(0.25, 0.8, 0.25, 1),
					opacity {transitionDurationMs}ms ease"
				>
					<div class="focus-node-inner">
						{#if OutComponent}
							<TraekNodeWrapper node={outNode} isActive={false} {engine} {onRetry}>
								<OutComponent node={outNode} {engine} isActive={false} />
							</TraekNodeWrapper>
						{/if}
					</div>
				</div>
			{/if}

			{@const inNode = incomingNodeId ? engine.getNode(incomingNodeId) : null}
			{#if inNode}
				{@const InComponent = resolveComponent(inNode)}
				<div
					class="focus-node-slot entering"
					style:--enter-from={getEnterTransform(transitionDirection)}
					style:transition="transform {transitionDurationMs}ms cubic-bezier(0.25, 0.8, 0.25, 1),
					opacity {transitionDurationMs}ms ease"
				>
					<div class="focus-node-inner">
						{#if InComponent}
							<TraekNodeWrapper node={inNode} isActive={true} {engine} {onRetry}>
								<InComponent node={inNode} {engine} isActive={true} />
							</TraekNodeWrapper>
						{/if}
					</div>
				</div>
			{/if}
		{:else if currentNode}
			{@const CurrentComponent = resolveComponent(currentNode)}
			<div class="focus-node-slot current">
				<div class="focus-node-inner">
					{#if CurrentComponent}
						<TraekNodeWrapper node={currentNode} isActive={true} {engine} {onRetry}>
							<CurrentComponent node={currentNode} {engine} isActive={true} />
						</TraekNodeWrapper>
					{:else if currentNode.type !== 'thought'}
						<div class="focus-fallback">
							<div class="focus-fallback-role">{currentNode.role}</div>
							<div class="focus-fallback-content">
								{(currentNode as MessageNode).content ?? 'No content'}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="focus-empty">
				<p>No messages yet. Swipe down or type below to start.</p>
			</div>
		{/if}
	</div>

	<!-- Overscroll indicator -->
	{#if navigator.overscrollY !== 0}
		<div
			class="overscroll-indicator"
			class:top={navigator.overscrollY > 0}
			class:bottom={navigator.overscrollY < 0}
			style:opacity={Math.min(1, Math.abs(navigator.overscrollY) / config.overscrollThreshold)}
		></div>
	{/if}

	<!-- Position indicator -->
	{#if currentNode}
		<div class="focus-position">
			<PositionIndicator
				{depth}
				{maxDepth}
				siblingIndex={siblingInfo.index}
				siblingTotal={siblingInfo.total}
				hasChildren={children.length > 0}
				childCount={children.length}
			/>
		</div>
	{/if}

	<!-- Input area (shown at leaf or when swipe-down on leaf) -->
	{#if showInput || (!currentNode && engine.nodes.length === 0)}
		<div class="focus-input-container">
			<form
				class="focus-input-wrapper"
				onsubmit={(e) => {
					e.preventDefault();
					sendMessage();
				}}
			>
				<textarea
					bind:value={userInput}
					placeholder="Type a message..."
					spellcheck="false"
					rows="1"
					oninput={(e) => {
						const target = e.currentTarget;
						target.style.height = 'auto';
						target.style.height = Math.min(target.scrollHeight, 120) + 'px';
					}}
					onkeydown={handleInputKeydown}
				></textarea>
				<button type="submit" disabled={!userInput.trim()} aria-label="Send message">
					<svg viewBox="0 0 24 24" width="18" height="18">
						<path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
					</svg>
				</button>
			</form>
		</div>
	{/if}
</div>

<style>
	.focus-mode {
		width: 100%;
		height: 100dvh;
		background-color: var(--traek-canvas-bg, #0b0b0b);
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		touch-action: none;
	}

	.focus-node-container {
		flex: 1;
		position: relative;
		overflow: hidden;
	}

	.focus-node-slot {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}

	.focus-node-slot.current {
		transform: translateX(0) translateY(0);
	}

	.focus-node-slot.exiting {
		z-index: 1;
	}

	.focus-node-slot.entering {
		z-index: 2;
		animation: slide-in var(--traek-focus-transition-duration, 180ms)
			cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
	}

	@keyframes slide-in {
		from {
			transform: var(--enter-from, translateX(100%));
		}
		to {
			transform: translateX(0) translateY(0);
		}
	}

	.focus-node-inner {
		padding: 16px;
		min-height: 100%;
	}

	/* Override absolute positioning from TraekNodeWrapper inside focus mode */
	.focus-node-inner :global(.message-node-wrapper) {
		position: relative !important;
		left: auto !important;
		top: auto !important;
		width: 100% !important;
		max-height: none !important;
	}

	.focus-fallback {
		padding: 20px;
		color: var(--traek-node-text, #dddddd);
	}

	.focus-fallback-role {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 1px;
		opacity: 0.5;
		margin-bottom: 8px;
	}

	.focus-fallback-content {
		font-size: 15px;
		line-height: 1.5;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.focus-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--traek-text-secondary, #888888);
		font-size: 15px;
		padding: 32px;
		text-align: center;
	}

	/* Overscroll indicator */
	.overscroll-indicator {
		position: absolute;
		left: 0;
		right: 0;
		height: 4px;
		background: var(--traek-input-dot, #00d8ff);
		z-index: 10;
		pointer-events: none;
	}

	.overscroll-indicator.top {
		top: 0;
	}

	.overscroll-indicator.bottom {
		bottom: 0;
	}

	/* Position indicator */
	.focus-position {
		position: absolute;
		top: 12px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 20;
	}

	/* Input */
	.focus-input-container {
		padding: 12px 16px;
		padding-bottom: max(12px, env(safe-area-inset-bottom));
		background: var(--traek-canvas-bg, #0b0b0b);
		border-top: 1px solid var(--traek-input-border, #444444);
	}

	.focus-input-wrapper {
		display: flex;
		background: var(--traek-input-bg, rgba(30, 30, 30, 0.8));
		border: 1px solid var(--traek-input-border, #444444);
		border-radius: 16px;
		padding: 8px 12px;
	}

	.focus-input-wrapper textarea {
		flex: 1;
		background: transparent;
		border: none;
		color: white;
		padding: 12px;
		outline: none;
		font-size: 16px;
		resize: none;
		overflow-y: auto;
		max-height: 120px;
		min-height: 38px;
		font-family: inherit;
		line-height: 1.4;
	}

	.focus-input-wrapper button {
		background: var(--traek-input-button-bg, #00d8ff);
		color: var(--traek-input-button-text, #000000);
		border: none;
		width: 44px;
		height: 44px;
		border-radius: 10px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.focus-input-wrapper button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	@media (prefers-reduced-motion: reduce) {
		.focus-node-slot.entering {
			animation: none;
			transform: translateX(0) translateY(0);
		}
		.focus-node-slot.exiting {
			transition: none !important;
		}
	}
</style>
