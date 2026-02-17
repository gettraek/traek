<script lang="ts">
	import { onMount } from 'svelte';
	import type { Component } from 'svelte';
	import {
		type TraekEngine,
		type MessageNode,
		type Node,
		type CustomTraekNode,
		type NodeComponentMap
	} from '../TraekEngine.svelte';
	import type { NodeTypeRegistry } from '../node-types/NodeTypeRegistry.svelte';
	import PositionIndicator from './PositionIndicator.svelte';
	import SwipeAffordances from './SwipeAffordances.svelte';
	import Toast from './Toast.svelte';
	import OnboardingOverlay from './OnboardingOverlay.svelte';
	import HomeButton from './HomeButton.svelte';
	import KeyboardCheatsheet from './KeyboardCheatsheet.svelte';
	import Breadcrumbs from './Breadcrumbs.svelte';
	import ChildSelector from './ChildSelector.svelte';
	import { SwipeNavigator } from './SwipeNavigator.svelte';
	import { slideIn, slideOut } from './transitions';
	import {
		DEFAULT_FOCUS_MODE_CONFIG,
		type FocusModeConfig,
		type SwipeDirection
	} from './focusModeTypes';
	import { hapticTap, hapticBoundary, hapticSelect } from './haptics';

	let {
		engine,
		componentMap = {},
		registry,
		focusConfig,
		disableOnboarding = false,
		onSendMessage
	}: {
		engine: TraekEngine;
		componentMap?: NodeComponentMap;
		registry?: NodeTypeRegistry;
		focusConfig?: Partial<FocusModeConfig>;
		disableOnboarding?: boolean;
		onSendMessage?: (input: string, userNode: MessageNode) => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	const config: FocusModeConfig = { ...DEFAULT_FOCUS_MODE_CONFIG, ...focusConfig };

	// svelte-ignore state_referenced_locally
	let currentNodeId = $state<string | null>(engine.activeNodeId);
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	let lastVisitedChild = new Map<string, string>();

	let userInput = $state('');
	let containerEl = $state<HTMLElement | null>(null);
	let textareaEl = $state<HTMLTextAreaElement | null>(null);

	// Direction of the last navigation — drives transition direction
	let lastDirection = $state<SwipeDirection>('up');

	// Onboarding state
	const ONBOARDING_SEEN_KEY = 'traek-focus-mode-onboarding-seen';
	let showOnboarding = $state(false);

	// Toast state
	let toastMessage = $state('');
	let showToast = $state(false);

	// Keyboard focus state
	let focusedElement = $state<'content' | 'input'>('content');

	// Input context expansion state (Item 2)
	let contextExpanded = $state(false);

	// Keyboard cheatsheet state (Item 7)
	let showKeyboardHelp = $state(false);

	// ChildSelector state (Item 9)
	let showChildSelector = $state(false);

	// Sync with engine activeNodeId
	$effect(() => {
		const engineActive = engine.activeNodeId;
		if (engineActive && engineActive !== currentNodeId) {
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
	const isAtRoot = $derived(depth === 0);

	// Swipe affordances states
	const canSwipeUp = $derived(!isLeaf);
	const canSwipeDown = $derived(!!currentNodeId && !!engine.getParent(currentNodeId));
	const canSwipeLeft = $derived(siblingInfo.index > 0);
	const canSwipeRight = $derived(siblingInfo.index < siblingInfo.total - 1);

	// Check onboarding on mount
	onMount(() => {
		if (disableOnboarding) return;
		if (typeof localStorage !== 'undefined') {
			const seen = localStorage.getItem(ONBOARDING_SEEN_KEY);
			if (!seen) {
				showOnboarding = true;
			}
		}
	});

	function completeOnboarding() {
		showOnboarding = false;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
		}
	}

	function navigateTo(nodeId: string, direction: SwipeDirection) {
		// Record current as lastVisitedChild of parent
		if (currentNodeId) {
			const parent = engine.getParent(currentNodeId);
			if (parent) {
				lastVisitedChild.set(parent.id, currentNodeId);
			}
		}

		// Haptic feedback on successful navigation
		hapticTap();

		lastDirection = direction;
		currentNodeId = nodeId;
		engine.activeNodeId = nodeId;
	}

	function showBoundaryToast(direction: SwipeDirection) {
		const messages = {
			up: 'Keine weiteren Antworten',
			down: 'Du bist am Anfang',
			left: 'Keine vorherige Alternative',
			right: 'Keine weitere Alternative'
		};

		// Haptic feedback for boundary
		hapticBoundary();

		toastMessage = messages[direction];
		showToast = true;
	}

	// SwipeNavigator
	// Swipe directions use natural scrolling: swipe down = go to parent (toward root),
	// swipe up = go to child (deeper into tree). This mirrors how content scrolling works —
	// pulling content down reveals what's above (parent), pushing up reveals what's below (child).
	const navigator = new SwipeNavigator(config, (result) => {
		if (!result.direction || !currentNodeId) return;

		switch (result.direction) {
			case 'down': {
				// Swipe down → navigate toward root (parent)
				const parent = engine.getParent(currentNodeId);
				if (parent) {
					navigateTo(parent.id, 'down');
				} else {
					showBoundaryToast('down');
				}
				break;
			}
			case 'up': {
				// Swipe up → navigate deeper (child)
				if (isLeaf) {
					showBoundaryToast('up');
					break;
				}

				// Item 9: Bei mehreren Kindern → ChildSelector anzeigen
				if (children.length > 1) {
					hapticSelect();
					showChildSelector = true;
					break;
				}

				const firstChild = children[0];
				if (firstChild) {
					const hintId = lastVisitedChild.get(currentNodeId);
					const target = hintId
						? (children.find((c) => c.id === hintId) ?? firstChild)
						: firstChild;
					navigateTo(target.id, 'up');
				}
				break;
			}
			case 'left': {
				const siblings = engine.getSiblings(currentNodeId);
				const idx = siblings.findIndex((s) => s.id === currentNodeId);
				if (idx > 0) {
					navigateTo(siblings[idx - 1].id, 'left');
				} else {
					showBoundaryToast('left');
				}
				break;
			}
			case 'right': {
				const siblings = engine.getSiblings(currentNodeId);
				const idx = siblings.findIndex((s) => s.id === currentNodeId);
				if (idx < siblings.length - 1) {
					navigateTo(siblings[idx + 1].id, 'right');
				} else {
					showBoundaryToast('right');
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

	// Keyboard navigation
	function handleKeydown(e: KeyboardEvent) {
		// Input hat eigene Keyboard-Logik
		if (focusedElement === 'input' || !currentNodeId) return;

		// Verhindere default Scroll-Verhalten
		if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home'].includes(e.key)) {
			e.preventDefault();
		}

		switch (e.key) {
			case 'ArrowDown': {
				// Navigate to parent (wie Swipe down)
				const parent = engine.getParent(currentNodeId);
				if (parent) {
					navigateTo(parent.id, 'down');
				} else {
					showBoundaryToast('down');
				}
				break;
			}
			case 'ArrowUp': {
				// Navigate to child (wie Swipe up)
				if (isLeaf) {
					showBoundaryToast('up');
					break;
				}
				const firstChild = children[0];
				if (firstChild) {
					const hintId = lastVisitedChild.get(currentNodeId);
					const target = hintId
						? (children.find((c) => c.id === hintId) ?? firstChild)
						: firstChild;
					navigateTo(target.id, 'up');
				}
				break;
			}
			case 'ArrowLeft': {
				// Navigate to previous sibling
				if (siblingInfo.index > 0) {
					const siblings = engine.getSiblings(currentNodeId);
					navigateTo(siblings[siblingInfo.index - 1].id, 'left');
				} else {
					showBoundaryToast('left');
				}
				break;
			}
			case 'ArrowRight': {
				// Navigate to next sibling
				if (siblingInfo.index < siblingInfo.total - 1) {
					const siblings = engine.getSiblings(currentNodeId);
					navigateTo(siblings[siblingInfo.index + 1].id, 'right');
				} else {
					showBoundaryToast('right');
				}
				break;
			}
			case 'Home': {
				// Navigate to root
				if (!isAtRoot) {
					const roots = engine.getChildren(null);
					const root = roots[0];
					if (root) {
						navigateTo(root.id, 'down');
					}
				}
				break;
			}
			case 'i': {
				// 'i' wie "input" — fokussiere Input-Feld
				focusedElement = 'input';
				textareaEl?.focus();
				break;
			}
			case '?': {
				// Item 7: Zeige Keyboard-Shortcuts Hilfe
				showKeyboardHelp = true;
				break;
			}
		}
	}

	// Container fokussierbar machen
	$effect(() => {
		if (containerEl && focusedElement === 'content') {
			containerEl.focus();
		}
	});

	function resolveComponent(node: Node): Component<Record<string, unknown>> | undefined {
		const typeDef = registry?.get(node.type);
		const uiData = node as CustomTraekNode;
		return typeDef?.component ?? uiData?.component ?? componentMap[node.type];
	}

	function sendMessage() {
		if (!userInput.trim()) return;
		const isEmptyTree = !currentNodeId && engine.nodes.length === 0;
		const userNode = isEmptyTree
			? engine.addNode(userInput, 'user', { parentIds: [] })
			: engine.addNode(userInput, 'user');
		const input = userInput;
		userInput = '';
		if (isEmptyTree) {
			currentNodeId = userNode.id;
			engine.activeNodeId = userNode.id;
		} else {
			navigateTo(userNode.id, 'down');
		}
		onSendMessage?.(input, userNode);
	}

	function handleInputKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		} else if (e.key === 'Escape') {
			focusedElement = 'content';
			containerEl?.focus();
		}
	}

	function goToRoot() {
		const roots = engine.getChildren(null);
		const root = roots[0];
		if (root && currentNodeId !== root.id) {
			navigateTo(root.id, 'down');
		}
	}

	// Item 9: ChildSelector Handler
	function selectChild(nodeId: string) {
		showChildSelector = false;
		navigateTo(nodeId, 'up');
	}

	const duration = config.transitionDuration;
</script>

<!-- Onboarding Overlay -->
{#if showOnboarding}
	<OnboardingOverlay onComplete={completeOnboarding} />
{/if}

<!-- Keyboard Cheatsheet (Item 7) -->
{#if showKeyboardHelp}
	<KeyboardCheatsheet onClose={() => (showKeyboardHelp = false)} />
{/if}

<!-- ChildSelector (Item 9) -->
{#if showChildSelector}
	<ChildSelector
		{children}
		onSelect={selectChild}
		onClose={() => {
			showChildSelector = false;
		}}
	/>
{/if}

<!-- Main Focus Mode -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="focus-mode"
	bind:this={containerEl}
	tabindex="0"
	role="application"
	aria-label="Focus Mode Navigation"
	onkeydown={handleKeydown}
	onfocus={() => {
		if (focusedElement !== 'input') focusedElement = 'content';
	}}
>
	<!-- Breadcrumbs (Item 8, optional via config) -->
	{#if config.showBreadcrumb && currentNode}
		<Breadcrumbs {engine} {currentNodeId} onNavigate={(nodeId) => navigateTo(nodeId, 'down')} />
	{/if}

	<!-- Node display area -->
	<div class="focus-node-container">
		<!-- Swipe Affordances -->
		<SwipeAffordances
			{canSwipeUp}
			{canSwipeDown}
			{canSwipeLeft}
			{canSwipeRight}
			isGestureActive={navigator.isGestureActive}
		/>

		{#key currentNodeId}
			{#if currentNode}
				{@const CurrentComponent = resolveComponent(currentNode)}
				<div
					class="focus-node-slot"
					in:slideIn={{ direction: lastDirection, duration }}
					out:slideOut={{ direction: lastDirection, duration }}
				>
					<div class="focus-node-inner">
						{#if CurrentComponent}
							<CurrentComponent node={currentNode} {engine} isActive={true} />
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
		{/key}
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

	<!-- Home Button (FAB) -->
	<HomeButton show={!isAtRoot} onclick={goToRoot} />

	<!-- Toast for Boundary Feedback -->
	<Toast message={toastMessage} show={showToast} onDismiss={() => (showToast = false)} />

	<!-- Input area -->
	<div class="focus-input-container">
		<!-- Input Context (Item 2: Clickable mit Toggle) -->
		{#if currentNode}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="input-context"
				class:expanded={contextExpanded}
				onclick={() => {
					contextExpanded = !contextExpanded;
				}}
				title="Klicke um die vollständige Nachricht zu sehen"
			>
				<span class="context-label">Antwortest auf:</span>
				<span class="context-preview">
					{currentNode.role === 'user' ? '👤' : '🤖'}
					{#if contextExpanded}
						{(currentNode as MessageNode).content ?? 'Nachricht'}
					{:else}
						{(currentNode as MessageNode).content?.slice(0, 50) ?? 'Nachricht'}
						{(currentNode as MessageNode).content &&
						(currentNode as MessageNode).content.length > 50
							? '...'
							: ''}
					{/if}
				</span>
				<span class="context-chevron" aria-hidden="true">
					{contextExpanded ? '▴' : '▾'}
				</span>
			</div>
		{/if}

		<form
			class="focus-input-wrapper"
			onsubmit={(e) => {
				e.preventDefault();
				sendMessage();
			}}
		>
			<textarea
				bind:this={textareaEl}
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
				onfocus={() => {
					focusedElement = 'input';
				}}
			></textarea>
			<button type="submit" disabled={!userInput.trim()} aria-label="Send message">
				<svg viewBox="0 0 24 24" width="18" height="18">
					<path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
				</svg>
			</button>
		</form>
	</div>
</div>

<style>
	.focus-mode {
		width: 100%;
		height: 100%;
		background-color: var(--traek-canvas-bg, #0b0b0b);
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		touch-action: pinch-zoom;
		outline: none;
	}

	.focus-mode:focus-visible {
		box-shadow: inset 0 0 0 2px var(--traek-input-dot, #00d8ff);
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

	.focus-node-inner {
		padding: 16px;
		min-height: 100%;
		box-sizing: border-box;
	}

	/* Override canvas-specific positioning from TraekNodeWrapper inside focus mode */
	.focus-node-inner :global(.message-node-wrapper) {
		position: relative !important;
		left: auto !important;
		top: auto !important;
		width: 100% !important;
		max-height: none !important;
		margin-top: 2.5rem;
	}

	/* Hide connection ports — not needed in single-node focus view */
	.focus-node-inner :global(.connection-port) {
		display: none !important;
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

	/* Input Context (Item 2: Clickable mit Expansion) */
	.input-context {
		display: flex;
		align-items: baseline;
		gap: 8px;
		padding: 8px 12px;
		font-size: 13px;
		color: var(--traek-input-context-text, #888888);
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		cursor: pointer;
		transition: all 0.3s ease;
		max-height: 40px;
		overflow: hidden;
	}

	.input-context:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.input-context.expanded {
		max-height: 200px;
		overflow-y: auto;
		align-items: flex-start;
		background: rgba(255, 255, 255, 0.05);
	}

	.context-label {
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		font-size: 11px;
		opacity: 0.7;
		flex-shrink: 0;
	}

	.context-preview {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--traek-node-text, #dddddd);
		transition: all 0.3s ease;
	}

	.input-context.expanded .context-preview {
		white-space: pre-wrap;
		word-break: break-word;
	}

	.context-chevron {
		margin-left: auto;
		flex-shrink: 0;
		font-size: 14px;
		opacity: 0.6;
		transition: opacity 0.2s ease;
	}

	.input-context:hover .context-chevron {
		opacity: 1;
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
		color: var(--traek-node-text, #dddddd);
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
</style>
