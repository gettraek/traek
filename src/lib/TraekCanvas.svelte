<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import {
		TraekEngine,
		type TraekEngineConfig,
		DEFAULT_TRACK_ENGINE_CONFIG,
		type MessageNode,
		type Node,
		type NodeComponentMap
	} from './TraekEngine.svelte';
	import type { ActionDefinition, ResolveActions } from './actions/types';
	import { ActionResolver } from './actions/ActionResolver.svelte';
	import SlashCommandDropdown from './actions/SlashCommandDropdown.svelte';
	import type { NodeTypeRegistry } from './node-types/NodeTypeRegistry.svelte.js';
	import type { NodeTypeAction } from './node-types/types';
	import NodeToolbar from './NodeToolbar.svelte';
	import { createDefaultNodeActions } from './defaultNodeActions.js';
	import ConnectionLayer from './canvas/ConnectionLayer.svelte';
	import ContextBreadcrumb from './canvas/ContextBreadcrumb.svelte';
	import ToastContainer from './toast/ToastContainer.svelte';
	import { toastUndo } from './toast/toastStore.svelte';
	import FocusMode from './mobile/FocusMode.svelte';
	import type { FocusModeConfig } from './mobile/focusModeTypes.js';
	import { ViewportManager } from './canvas/ViewportManager.svelte';
	import { CanvasInteraction } from './canvas/CanvasInteraction.svelte';
	import NodeRenderer from './canvas/NodeRenderer.svelte';
	import InputForm from './canvas/InputForm.svelte';

	type InputActionsContext = {
		engine: TraekEngine;
		activeNode: Node | null;
		userInput: string;
		setUserInput: (value: string) => void;
		sendMessage: (options?: SendMessageOptions) => void;
		resolver: ActionResolver | null;
	};

	type SendMessageOptions = {
		action?: string;
		actions?: string[];
		data?: unknown;
	};

	let {
		engine: engineProp,
		config: configProp,
		componentMap = {},
		initialPlacementPadding = { left: 0, top: 0 },
		initialScale,
		initialOffset,
		onSendMessage,
		onNodesChanged,
		onViewportChange,
		showFps = false,
		showStats = true,
		initialOverlay,
		inputActions,
		actions: actionsProp,
		resolveActions: resolveActionsProp,
		registry,
		onRetry,
		defaultNodeActions: defaultNodeActionsProp,
		filterNodeActions: filterNodeActionsProp,
		onEditNode,
		mode = 'auto',
		mobileBreakpoint = 768,
		focusConfig
	}: {
		engine?: TraekEngine | null;
		config?: Partial<TraekEngineConfig>;
		componentMap?: NodeComponentMap;
		initialPlacementPadding?: { left: number; top: number };
		initialScale?: number;
		initialOffset?: { x: number; y: number };
		onSendMessage?: (input: string, userNode: MessageNode, action?: string | string[]) => void;
		onNodesChanged?: () => void;
		onViewportChange?: (viewport: { scale: number; offset: { x: number; y: number } }) => void;
		showFps?: boolean;
		showStats?: boolean;
		initialOverlay?: Snippet;
		inputActions?: Snippet<[InputActionsContext]>;
		actions?: ActionDefinition[];
		resolveActions?: ResolveActions;
		registry?: NodeTypeRegistry;
		onRetry?: (nodeId: string) => void;
		defaultNodeActions?: NodeTypeAction[];
		filterNodeActions?: (node: Node, actions: NodeTypeAction[]) => NodeTypeAction[];
		onEditNode?: (nodeId: string) => void;
		mode?: 'auto' | 'canvas' | 'focus';
		mobileBreakpoint?: number;
		focusConfig?: Partial<FocusModeConfig>;
	} = $props();

	const config = $derived({
		...DEFAULT_TRACK_ENGINE_CONFIG,
		...configProp
	} satisfies TraekEngineConfig);

	// Engine initialization
	let defaultEngine = $state<TraekEngine | null>(null);
	$effect(() => {
		if (engineProp == null && defaultEngine == null) {
			defaultEngine = new TraekEngine(config);
		}
	});
	const engine = $derived(engineProp ?? (defaultEngine as TraekEngine));

	// Viewport manager
	let viewport = $state<ViewportManager | null>(null);
	$effect(() => {
		if (!engine) return;
		viewport = new ViewportManager(config, initialScale, initialOffset, onViewportChange);
		return () => viewport?.destroy();
	});

	// Canvas interaction manager
	let interaction = $state<CanvasInteraction | null>(null);
	$effect(() => {
		if (!engine || !viewport) return;
		interaction = new CanvasInteraction(viewport, engine, config, onNodesChanged);
	});

	// Viewport-based mode detection
	let viewportWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 1024);
	$effect(() => {
		if (typeof window === 'undefined') return;
		const onResize = () => {
			viewportWidth = window.innerWidth;
		};
		window.addEventListener('resize', onResize);
		window.addEventListener('orientationchange', onResize);
		return () => {
			window.removeEventListener('resize', onResize);
			window.removeEventListener('orientationchange', onResize);
		};
	});
	const resolvedMode = $derived(
		mode === 'auto' ? (viewportWidth < mobileBreakpoint ? 'focus' : 'canvas') : mode
	);

	// Wire registry lifecycle hooks
	$effect(() => {
		if (!engine || !registry) return;
		engine.onNodeCreated = (node) => {
			const def = registry.get(node.type);
			def?.onCreate?.(node, engine);
		};
		engine.onNodeDeleting = (node) => {
			const def = registry.get(node.type);
			def?.onDestroy?.(node, engine);
		};
		return () => {
			engine.onNodeCreated = undefined;
			engine.onNodeDeleting = undefined;
		};
	});

	// Wire delete-undo toast
	$effect(() => {
		if (!engine) return;
		engine.onNodeDeleted = (count, restore) => {
			toastUndo(`${count} node${count > 1 ? 's' : ''} deleted`, restore);
		};
		return () => {
			engine.onNodeDeleted = undefined;
		};
	});

	// Pending focus handler
	$effect(() => {
		const id = engine.pendingFocusNodeId;
		if (!id || !viewport) return;
		const node = engine.nodes.find((n: Node) => n.id === id);
		if (node) {
			viewport.centerOnNode(node, engine.nodes, () => {
				if (showIntroOverlay) showIntroOverlay = false;
			});
		}
		engine.clearPendingFocus();
	});

	// Viewport resize observer
	$effect(() => {
		const el = viewport?.viewportEl;
		if (!el) return;
		let rafId = 0;
		const ro = new ResizeObserver(() => {
			if (rafId) cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(() => {
				rafId = 0;
				if (viewport) viewport.viewportResizeVersion += 1;
			});
		});
		ro.observe(el);
		return () => {
			if (rafId) cancelAnimationFrame(rafId);
			ro.disconnect();
		};
	});

	// Touch event handlers
	$effect(() => {
		const el = viewport?.viewportEl;
		const inter = interaction;
		if (!el || !inter) return;
		el.addEventListener('touchstart', inter.handleTouchStart, { passive: true });
		el.addEventListener('touchmove', inter.handleTouchMove, { passive: false });
		el.addEventListener('touchend', inter.handleTouchEnd, { passive: true });
		el.addEventListener('touchcancel', inter.handleTouchEnd, { passive: true });
		return () => {
			el.removeEventListener('touchstart', inter.handleTouchStart);
			el.removeEventListener('touchmove', inter.handleTouchMove);
			el.removeEventListener('touchend', inter.handleTouchEnd);
			el.removeEventListener('touchcancel', inter.handleTouchEnd);
		};
	});

	// Initial overlay state
	let showIntroOverlay = $state(true);
	$effect(() => {
		if (!engine || !showIntroOverlay) return;
		const hasActive = !!engine.activeNodeId;
		const hasPendingFocus = !!engine.pendingFocusNodeId;
		if (!hasActive && !hasPendingFocus) {
			showIntroOverlay = false;
		}
	});

	// Clear text selection when active node changes
	$effect(() => {
		if (typeof window === 'undefined' || !engine) return;
		void engine.activeNodeId;
		window.getSelection()?.removeAllRanges();
	});

	// Input state
	let userInput = $state('');
	let sendFlash = $state(false);
	let editingNodeId = $state<string | null>(null);

	// Branch celebration tracking
	let celebratedBranches = $state(new Set<string>());
	let branchCelebration = $state<string | null>(null);

	// Action resolver
	let resolver = $state<ActionResolver | null>(null);
	$effect(() => {
		if (actionsProp && actionsProp.length > 0) {
			const r = new ActionResolver(actionsProp, resolveActionsProp);
			resolver = r;
			return () => r.destroy();
		} else {
			resolver = null;
		}
	});

	$effect(() => {
		const input = userInput;
		resolver?.onInputChange(input);
	});

	let slashDropdownRef: SlashCommandDropdown | null = $state(null);

	// FPS counter
	let fps = $state(0);
	$effect(() => {
		if (!showFps) return;
		let frameCount = 0;
		let lastTime = performance.now();
		let rafId = 0;
		const tick = () => {
			frameCount += 1;
			const now = performance.now();
			const elapsed = now - lastTime;
			if (elapsed >= 1000) {
				fps = Math.round((frameCount * 1000) / elapsed);
				frameCount = 0;
				lastTime = now;
			}
			rafId = requestAnimationFrame(tick);
		};
		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	});

	function sendMessage(messageOptions?: SendMessageOptions) {
		if (!userInput.trim() || !viewport) return;

		const resolverActions = resolver?.selectedIds ?? [];
		const explicitActions = messageOptions?.actions ?? [];
		const explicitAction = messageOptions?.action;
		const allActions = [
			...new Set([
				...resolverActions,
				...explicitActions,
				...(explicitAction ? [explicitAction] : [])
			])
		];

		const parentNode = engine.nodes.find((n: Node) => n.id === engine.activeNodeId);
		let position: { x?: number; y?: number } = {};

		if (!parentNode) {
			const effectiveWidth = window.innerWidth - initialPlacementPadding.left;
			const centerX = initialPlacementPadding.left + effectiveWidth / 2;
			const xPx = (centerX - viewport.offset.x) / viewport.scale + config.rootNodeOffsetX;
			const yPx =
				(window.innerHeight / 2 - viewport.offset.y) / viewport.scale + config.rootNodeOffsetY;
			const step = config.gridStep;
			position = {
				x: Math.round(xPx / step),
				y: Math.round(yPx / step)
			};
		}

		const userNode = engine.addNode(userInput, 'user', {
			...position,
			data: messageOptions?.data ?? (allActions.length > 0 ? { actions: allActions } : undefined)
		});
		const lastInput = userInput;
		userInput = '';
		resolver?.reset();
		viewport.centerOnNode(userNode, engine.nodes);

		// Check if this created a branch
		if (parentNode) {
			const siblings = engine.nodes.filter(
				(n) => n.parentIds.includes(parentNode.id) && n.type !== 'thought'
			);
			if (siblings.length === 2 && !celebratedBranches.has(parentNode.id)) {
				celebratedBranches = new Set([...celebratedBranches, parentNode.id]);
				branchCelebration = 'You created a branch! Explore different directions.';
				setTimeout(() => {
					branchCelebration = null;
				}, 4000);
			}
		}

		const actionArg = allActions.length > 0 ? allActions : undefined;

		sendFlash = true;
		setTimeout(() => {
			sendFlash = false;
		}, 300);

		onSendMessage?.(lastInput, userNode, actionArg);
	}

	const activeAncestorIds = $derived(
		engine?.activeNodeId ? new Set(engine.getAncestorPath(engine.activeNodeId)) : null
	);

	function handleBuiltInEdit(nodeId: string) {
		editingNodeId = nodeId;
	}

	function handleEditSave(nodeId: string, content: string) {
		engine?.updateNode(nodeId, { content });
		editingNodeId = null;
		onNodesChanged?.();
	}

	function handleEditCancel() {
		editingNodeId = null;
	}

	const activeNodeActions = $derived.by(() => {
		if (!engine?.activeNodeId) return [];
		const activeNode = engine.nodes.find((n: Node) => n.id === engine.activeNodeId);
		if (!activeNode) return [];

		const defaults =
			defaultNodeActionsProp ??
			createDefaultNodeActions({
				onRetry,
				onEditNode: onEditNode ?? handleBuiltInEdit
			});

		const typeDef = registry?.get(activeNode.type);
		const typeActions = typeDef?.actions ?? [];
		const defaultIds = new Set(defaults.map((a) => a.id));
		const merged = [...defaults, ...typeActions.filter((a) => !defaultIds.has(a.id))];

		const filtered = merged.filter((a) => {
			if (a.id === 'retry' && activeNode.role !== 'assistant') return false;
			if (a.id === 'edit' && activeNode.role !== 'user') return false;
			return true;
		});

		return filterNodeActionsProp ? filterNodeActionsProp(activeNode, filtered) : filtered;
	});
</script>

{#if engine && viewport}
	{#if resolvedMode === 'focus'}
		<FocusMode
			{engine}
			{componentMap}
			{registry}
			{focusConfig}
			onSendMessage={(input, userNode) => onSendMessage?.(input, userNode)}
			{onRetry}
		/>
	{:else}
		<div
			bind:this={viewport.viewportEl}
			role="grid"
			tabindex="-1"
			class="viewport"
			class:dragging-canvas={interaction?.isDragging || interaction?.isTouchPanning}
			class:grabbing={interaction?.isDragging || interaction?.draggingNodeId}
			class:connection-drag-active={!!interaction?.connectionDrag}
			style:background-position="{viewport.offset.x}px {viewport.offset.y}px"
			style:background-size="{config.gridStep * viewport.scale}px {config.gridStep *
				viewport.scale}px"
			style:background-image="radial-gradient(circle, var(--traek-canvas-dot, #333333) {Math.max(
				0.1,
				viewport.scale
			).toFixed(1)}px, transparent {Math.max(0.1, viewport.scale).toFixed(1)}px)"
			onkeydown={(e) => {
				if (e.key === 'Escape') {
					if (editingNodeId) {
						editingNodeId = null;
					} else {
						engine.activeNodeId = null;
					}
				}
			}}
			onwheel={interaction?.handleWheel}
			onmousedown={interaction?.handleMouseDown}
			onmousemove={interaction?.handleMouseMove}
			onmouseup={interaction?.handleMouseUp}
			onmouseleave={interaction?.handleMouseUp}
		>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_mouse_events_have_key_events -->
			<div
				class="canvas-space"
				style:transform="translate({viewport.offset.x}px, {viewport.offset.y}px) scale({viewport.scale})"
				onmouseover={(e) => {
					if (!interaction) return;
					const nodeEl = (e.target as HTMLElement).closest?.('[data-node-id]');
					interaction.hoveredNodeId = nodeEl ? nodeEl.getAttribute('data-node-id') : null;
				}}
				onmouseout={(e) => {
					if (!interaction) return;
					const related = (e.relatedTarget as HTMLElement)?.closest?.('[data-node-id]');
					if (!related) interaction.hoveredNodeId = null;
				}}
			>
				<svg class="connections">
					<g transform="translate(25000, 25000)">
						{#if interaction}
							<ConnectionLayer
								nodes={engine.nodes}
								{config}
								{activeAncestorIds}
								hoveredNodeId={interaction.hoveredNodeId}
								bind:hoveredConnection={interaction.hoveredConnection}
								connectionDrag={interaction.connectionDrag}
								collapsedNodes={engine.collapsedNodes}
								onDeleteConnection={(parentId, childId) => {
									engine.removeConnection(parentId, childId);
								}}
							/>
						{/if}
					</g>
				</svg>

				<NodeRenderer
					{engine}
					{config}
					{componentMap}
					{registry}
					viewportEl={viewport.viewportEl}
					viewportResizeVersion={viewport.viewportResizeVersion}
					{editingNodeId}
					onEditSave={handleEditSave}
					onEditCancel={handleEditCancel}
					onEditNode={onEditNode ?? handleBuiltInEdit}
					{onRetry}
				/>

				{#if engine.activeNodeId && activeNodeActions.length > 0}
					{@const activeNode = engine.nodes.find((n) => n.id === engine.activeNodeId)}
					{#if activeNode}
						{@const step = config.gridStep}
						<NodeToolbar
							actions={activeNodeActions}
							node={activeNode}
							{engine}
							x={(activeNode.metadata?.x ?? 0) * step}
							y={(activeNode.metadata?.y ?? 0) * step - 40}
							nodeWidth={config.nodeWidth}
						/>
					{/if}
				{/if}
			</div>

			{#if engine.activeNodeId}
				<ContextBreadcrumb {engine} currentNodeId={engine.activeNodeId} />
			{/if}

			{#if engine.nodes.length === 0}
				<div class="empty-state">
					<div class="empty-state-content">
						<div class="empty-state-title">Start a conversation</div>
						<div class="empty-state-subtitle">Type a message below to begin</div>
						<svg class="empty-state-arrow" width="24" height="48" viewBox="0 0 24 48" fill="none">
							<path
								d="M12 0L12 42M12 42L6 36M12 42L18 36"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</div>
				</div>
			{/if}

			{#if showIntroOverlay && initialOverlay}
				<div class="overlay-root" transition:fade>
					{@render initialOverlay()}
				</div>
			{/if}

			{#if inputActions}
				<div class="floating-input-container" transition:fade>
					{@render inputActions({
						engine,
						activeNode: engine.nodes.find((n) => n.id === engine.activeNodeId) ?? null,
						userInput,
						setUserInput: (value: string) => (userInput = value),
						sendMessage,
						resolver
					})}
				</div>
			{:else}
				<InputForm
					{engine}
					bind:userInput
					bind:sendFlash
					{branchCelebration}
					{resolver}
					actions={actionsProp}
					onSubmit={sendMessage}
					bind:slashDropdownRef
				/>
			{/if}

			{#if showStats}
				<div class="stats">
					{#if showFps}
						<span class="stats-fps">{fps} FPS</span>
						<span class="stats-sep">|</span>
					{/if}
					<span
						class="stats-zoom"
						onclick={() => {
							if (!viewport) return;
							viewport.scale = 1;
							viewport.clampOffset(engine.nodes);
							viewport.scheduleViewportChange();
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter' && viewport) {
								viewport.scale = 1;
								viewport.clampOffset(engine.nodes);
								viewport.scheduleViewportChange();
							}
						}}
						title="Reset zoom to 100%"
						role="button"
						tabindex="0">{Math.round(viewport.scale * 100)}%</span
					>
				</div>
			{/if}

			<ToastContainer />
		</div>
	{/if}
{/if}

<style>
	@layer base;

	@layer base {
		.viewport {
			width: 100%;
			height: 100vh;
			background-color: var(--traek-canvas-bg, #0b0b0b);
			overflow: hidden;
			position: relative;
			cursor: grab;
		}
		.viewport.grabbing {
			cursor: grabbing;
		}

		.viewport.dragging-canvas {
			user-select: none;
		}

		.canvas-space {
			position: absolute;
			top: 0;
			left: 0;
			transform-origin: 0 0;
		}

		.connections {
			position: absolute;
			left: -25000px;
			top: -25000px;
			width: 50000px;
			height: 50000px;
			pointer-events: none;
			stroke: var(--traek-connection-stroke, #333333);
			stroke-width: 1.5;
			fill: none;
			overflow: visible;
		}

		.viewport.connection-drag-active {
			cursor: crosshair;
		}

		.stats {
			position: absolute;
			top: 20px;
			right: 20px;
			color: var(--traek-stats-text, #555555);
			font-family: monospace;
		}

		.stats-sep {
			margin: 0 6px;
		}

		.stats-zoom {
			cursor: pointer;
			border-radius: 4px;
			padding: 2px 4px;
			transition: color 0.15s;
		}

		.stats-zoom:hover {
			color: var(--traek-input-button-bg, #00d8ff);
		}

		.stats-zoom:focus-visible {
			outline: 2px solid var(--traek-input-button-bg, #00d8ff);
			outline-offset: 2px;
		}

		.overlay-root {
			position: absolute;
			inset: 0;
			z-index: 80;
			pointer-events: none;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.empty-state {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			pointer-events: none;
		}

		.empty-state-content {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 16px;
		}

		.empty-state-title {
			font-size: 28px;
			font-weight: 600;
			color: var(--traek-empty-state-color, var(--traek-text-secondary, #888888));
			letter-spacing: -0.5px;
		}

		.empty-state-subtitle {
			font-size: 14px;
			color: var(--traek-empty-state-color, var(--traek-text-secondary, #888888));
			opacity: 0.7;
		}

		.empty-state-arrow {
			margin-top: 8px;
			color: var(--traek-empty-state-color, var(--traek-text-secondary, #888888));
			opacity: 0.5;
			animation: empty-state-bounce 2s ease-in-out infinite;
		}

		@keyframes empty-state-bounce {
			0%,
			100% {
				transform: translateY(0);
			}
			50% {
				transform: translateY(8px);
			}
		}

		.floating-input-container {
			position: fixed;
			bottom: 20px;
			left: 50%;
			transform: translateX(-50%);
			width: 100%;
			max-width: calc(min(600px, 100vw) - 3rem);
			z-index: 100;
		}
	}
</style>
