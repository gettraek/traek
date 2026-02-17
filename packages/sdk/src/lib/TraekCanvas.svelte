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
	import { ViewportTracker } from './canvas/ViewportTracker.svelte';
	import { CanvasInteraction } from './canvas/CanvasInteraction.svelte';
	import NodeRenderer from './canvas/NodeRenderer.svelte';
	import InputForm from './canvas/InputForm.svelte';
	import { KeyboardNavigator } from './keyboard/KeyboardNavigator.svelte';
	import KeyboardHelpOverlay from './keyboard/KeyboardHelpOverlay.svelte';
	import FuzzySearchOverlay from './keyboard/FuzzySearchOverlay.svelte';
	import GhostPreview from './canvas/GhostPreview.svelte';
	import LiveRegion from './a11y/LiveRegion.svelte';
	import SearchBar from './search/SearchBar.svelte';
	import ZoomControls from './canvas/ZoomControls.svelte';
	import Minimap from './canvas/Minimap.svelte';
	import BranchCompare from './compare/BranchCompare.svelte';
	import DesktopTour from './onboarding/DesktopTour.svelte';
	import ThemePicker from './theme/ThemePicker.svelte';
	import { setTraekI18n } from './i18n/index';
	import type { PartialTraekTranslations } from './i18n/index';

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
		focusConfig,
		tourDelay = 0,
		minimapMinNodes = 0,
		breadcrumbMinNodes = 0,
		translations: translationsProp
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
		/** Milliseconds to delay before showing the desktop tour. Default: 0 (immediate). */
		tourDelay?: number;
		/** Minimum non-thought nodes required before the minimap appears. Default: 0 (always). */
		minimapMinNodes?: number;
		/** Minimum nodes required before the context breadcrumb appears. Default: 0 (always). */
		breadcrumbMinNodes?: number;
		/** Partial translation overrides. Deep-merged with English defaults. */
		translations?: PartialTraekTranslations;
	} = $props();

	const config = $derived({
		...DEFAULT_TRACK_ENGINE_CONFIG,
		...configProp
	} satisfies TraekEngineConfig);

	// Set up i18n context (set once at initialization — context cannot change after mount)

	const t = setTraekI18n(translationsProp);

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

	// Viewport tracker and visible nodes calculation
	const visibleNodeIds = $derived.by(() => {
		if (!viewport || !engine) return new Set<string>();
		const tracker = new ViewportTracker(config, 200);
		return tracker.getVisibleNodeIds(
			engine.nodes,
			engine.collapsedNodes,
			viewport.viewportEl,
			viewport.scale,
			viewport.offset
		);
	});

	// Keyboard navigator for desktop
	let keyboardNavigator = $state<KeyboardNavigator | null>(null);
	let liveRegionMessage = $state('');
	$effect(() => {
		if (!engine || resolvedMode !== 'canvas') return;
		keyboardNavigator = new KeyboardNavigator(engine, (message) => {
			liveRegionMessage = message;
		});
		return () => keyboardNavigator?.destroy();
	});

	// Auto-focus viewport so keyboard navigation works immediately.
	// Delay slightly so scoped CSS is applied before focus (avoids native focus ring flash).
	$effect(() => {
		if (viewport?.viewportEl && resolvedMode === 'canvas') {
			const el = viewport.viewportEl;
			const timer = setTimeout(() => el.focus({ preventScroll: true }), 50);
			return () => clearTimeout(timer);
		}
	});

	// Pan to keyboard-focused node when it changes
	$effect(() => {
		const focusedId = keyboardNavigator?.focusedNodeId;
		if (!focusedId || !engine || !viewport) return;
		const focusedNode = engine.getNode(focusedId);
		if (focusedNode) {
			viewport.centerOnNode(focusedNode, engine.nodes);
		}
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
			toastUndo(t.canvas.nodesDeleted(count), restore);
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
	let lastEditedNodeId = $state<string | null>(null);

	/** Node the user explicitly selected (click/Enter). Used for path highlight only — not set when activeNodeId is set by code (e.g. new node). */
	let userSelectedNodeId = $state<string | null>(null);
	$effect(() => {
		if (!engine?.activeNodeId) userSelectedNodeId = null;
	});

	// Branch celebration tracking
	let celebratedBranches = $state(new Set<string>());
	let branchCelebration = $state<string | null>(null);

	// Branch comparison
	let comparingNodeId = $state<string | null>(null);

	// Search state
	let showSearchBar = $state(false);

	// Desktop tour state (tourDelay < 0 disables the tour entirely)
	let showDesktopTour = $state(false);
	$effect(() => {
		if (tourDelay < 0 || typeof localStorage === 'undefined' || resolvedMode !== 'canvas') return;
		const tourCompleted = localStorage.getItem('traek-desktop-tour-completed');
		if (!tourCompleted) {
			if (tourDelay > 0) {
				const timer = setTimeout(() => {
					showDesktopTour = true;
				}, tourDelay);
				return () => clearTimeout(timer);
			} else {
				showDesktopTour = true;
			}
		}
	});

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

	// Global keyboard shortcut handler for search
	$effect(() => {
		if (typeof window === 'undefined') return;

		const handleKeydown = (e: KeyboardEvent) => {
			// Ctrl+F / Cmd+F to open search
			if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
				e.preventDefault();
				showSearchBar = true;
			}
		};

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	// Search handlers
	function handleSearchQuery(query: string) {
		engine.searchNodesMethod(query);
	}

	function handleSearchNext() {
		engine.nextSearchMatch();
	}

	function handleSearchPrevious() {
		engine.previousSearchMatch();
	}

	function handleSearchClose() {
		showSearchBar = false;
		engine.clearSearch();
	}

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
				branchCelebration = t.canvas.branchCelebration;
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

	const activeNodeIdForHighlight = $derived(userSelectedNodeId ?? engine?.activeNodeId ?? null);
	const activeAncestorIds = $derived(
		activeNodeIdForHighlight && engine
			? new Set(engine.getAncestorPath(activeNodeIdForHighlight))
			: null
	);

	function handleBuiltInEdit(nodeId: string) {
		editingNodeId = nodeId;
	}

	function handleEditSave(nodeId: string, content: string) {
		engine?.updateNode(nodeId, { content });
		editingNodeId = null;
		lastEditedNodeId = nodeId;

		// Mark descendant assistant nodes as outdated
		if (engine) {
			const descendants: Node[] = [];
			const queue = [nodeId];
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const visited = new Set<string>();

			while (queue.length > 0) {
				const currentId = queue.shift()!;
				if (visited.has(currentId)) continue;
				visited.add(currentId);

				const children = engine.getChildren(currentId);
				for (const child of children) {
					descendants.push(child);
					queue.push(child.id);
				}
			}

			descendants.forEach((desc: Node) => {
				if (desc.role === 'assistant' && desc.metadata) {
					desc.metadata.outdated = true;
				}
			});
		}

		onNodesChanged?.();
	}

	function handleEditCancel() {
		editingNodeId = null;
	}

	function handleRegenerate(nodeId: string) {
		const node = engine?.nodes.find((n) => n.id === nodeId);
		if (!node || node.type !== 'text' || !('content' in node)) return;

		const messageNode = node as MessageNode;
		const content = messageNode.content || '';

		// Clear the re-generate button by resetting lastEditedNodeId
		lastEditedNodeId = null;

		// Send message with the edited content
		onSendMessage?.(content, messageNode);
	}

	function handleCompare(nodeId: string) {
		comparingNodeId = nodeId;
	}

	const activeNodeActions = $derived.by(() => {
		if (!engine?.activeNodeId) return [];
		const activeNode = engine.nodes.find((n: Node) => n.id === engine.activeNodeId);
		if (!activeNode) return [];

		const defaults =
			defaultNodeActionsProp ??
			createDefaultNodeActions({
				onRetry,
				onEditNode: onEditNode ?? handleBuiltInEdit,
				onCompare: handleCompare,
				translations: t
			});

		const typeDef = registry?.get(activeNode.type);
		const typeActions = typeDef?.actions ?? [];
		const defaultIds = new Set(defaults.map((a) => a.id));
		const merged = [...defaults, ...typeActions.filter((a) => !defaultIds.has(a.id))];

		const filtered = merged.filter((a) => {
			if (a.id === 'retry' && activeNode.role !== 'assistant') return false;
			if (a.id === 'edit' && activeNode.role !== 'user') return false;
			if (a.id === 'compare') {
				const branchChildren = engine
					.getChildren(activeNode.id)
					.filter((c) => c.type !== 'thought');
				if (branchChildren.length < 2) return false;
			}
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
			disableOnboarding={tourDelay < 0}
			onSendMessage={(input, userNode) => onSendMessage?.(input, userNode)}
		/>
	{:else}
		<div
			bind:this={viewport.viewportEl}
			role="tree"
			aria-label={t.canvas.viewportAriaLabel}
			tabindex="0"
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
				// Handle keyboard navigation first
				if (keyboardNavigator?.handleKeyDown(e)) {
					return;
				}
				// Fallback to existing handlers
				if (e.key === 'Escape') {
					if (editingNodeId) {
						editingNodeId = null;
					} else {
						engine.activeNodeId = null;
					}
				}
			}}
			onwheel={interaction?.handleWheel}
			onmousedown={(e) => {
				interaction?.handleMouseDown(e);
				// Re-focus viewport after click so keyboard navigation keeps working
				viewport?.viewportEl?.focus({ preventScroll: true });
			}}
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
								focusedNodeId={keyboardNavigator?.focusedNodeId ?? null}
								activeNodeId={userSelectedNodeId}
								bind:hoveredConnection={interaction.hoveredConnection}
								connectionDrag={interaction.connectionDrag}
								collapsedNodes={engine.collapsedNodes}
								{visibleNodeIds}
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
					scale={viewport.scale}
					{visibleNodeIds}
					{editingNodeId}
					onEditSave={handleEditSave}
					onEditCancel={handleEditCancel}
					onEditNode={onEditNode ?? handleBuiltInEdit}
					{onRetry}
					onNodeActivated={(nodeId) => (userSelectedNodeId = nodeId)}
					focusedNodeId={keyboardNavigator?.focusedNodeId}
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

				{#if lastEditedNodeId}
					{@const editedNode = engine.nodes.find((n) => n.id === lastEditedNodeId)}
					{#if editedNode}
						{@const step = config.gridStep}
						<div
							class="regenerate-button-wrapper"
							style:left="{(editedNode.metadata?.x ?? 0) * step}px"
							style:top="{(editedNode.metadata?.y ?? 0) * step +
								(editedNode.metadata?.height ?? 100) +
								10}px"
						>
							<button
								type="button"
								class="regenerate-button"
								onclick={() => handleRegenerate(lastEditedNodeId!)}
							>
								<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
									<path
										d="M2 7a5 5 0 0 1 9-3M12 7a5 5 0 0 1-9 3M11 4v3h-3M3 10V7h3"
										stroke="currentColor"
										stroke-width="1.5"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
								{t.canvas.regenerateResponse}
							</button>
						</div>
					{/if}
				{/if}

				<!-- Ghost Preview -->
				<GhostPreview {engine} {config} {userInput} />
			</div>

			{#if engine.activeNodeId && engine.nodes.length >= breadcrumbMinNodes}
				<ContextBreadcrumb {engine} currentNodeId={engine.activeNodeId} />
			{/if}

			{#if engine.nodes.length === 0}
				<div class="empty-state">
					<div class="empty-state-content">
						<div class="empty-state-title">{t.canvas.emptyStateTitle}</div>
						<div class="empty-state-subtitle">{t.canvas.emptyStateSubtitle}</div>
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

			{#if showStats && showFps}
				<div class="stats">
					<span class="stats-fps">{fps} FPS</span>
				</div>
			{/if}

			<div class="top-right-controls">
				<ThemePicker compact={true} />
			</div>

			<ZoomControls {viewport} nodes={engine.nodes} {config} />
			{#if engine.nodes.filter((n) => n.type !== 'thought').length >= minimapMinNodes}
				<Minimap {viewport} nodes={engine.nodes} {config} />
			{/if}

			{#if showSearchBar}
				<SearchBar
					onClose={handleSearchClose}
					onSearch={handleSearchQuery}
					onNext={handleSearchNext}
					onPrevious={handleSearchPrevious}
					currentIndex={engine.currentSearchIndex}
					totalMatches={engine.searchMatches.length}
				/>
			{/if}

			<ToastContainer />

			<!-- Keyboard Help Overlay -->
			{#if keyboardNavigator?.showHelp}
				<KeyboardHelpOverlay
					onClose={() => keyboardNavigator && (keyboardNavigator.showHelp = false)}
				/>
			{/if}

			<!-- Fuzzy Search Overlay -->
			{#if keyboardNavigator?.showFuzzySearch}
				<FuzzySearchOverlay
					{engine}
					onClose={() => keyboardNavigator?.closeFuzzySearch()}
					onSelect={(nodeId) => keyboardNavigator?.navigateToNodeById(nodeId)}
				/>
			{/if}

			<!-- ARIA Live Region -->
			<LiveRegion bind:message={liveRegionMessage} politeness="polite" />

			<!-- Branch Comparison Overlay -->
			{#if comparingNodeId}
				<BranchCompare {engine} nodeId={comparingNodeId} onClose={() => (comparingNodeId = null)} />
			{/if}

			<!-- Desktop Tour -->
			{#if showDesktopTour}
				<DesktopTour onComplete={() => (showDesktopTour = false)} />
			{/if}
		</div>
	{/if}
{/if}

<style>
	@layer base;

	@layer base {
		.viewport {
			width: 100%;
			height: 100%;
			background-color: var(--traek-canvas-bg, #0b0b0b);
			overflow: hidden;
			position: relative;
			cursor: grab;
			outline: none;
		}
		.viewport:focus,
		.viewport:focus-visible {
			/* No visible focus ring on the viewport itself — keyboard focus is shown
			   on individual nodes via the .keyboard-focused class */
			box-shadow: none;
			outline: none;
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

		.regenerate-button-wrapper {
			position: absolute;
			z-index: 10;
			animation: fade-in 200ms ease-out;
		}

		.regenerate-button {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 8px 16px;
			background: var(--traek-input-button-bg, #00d8ff);
			color: var(--traek-input-button-text, #000000);
			border: none;
			border-radius: 8px;
			font-family: inherit;
			font-size: 12px;
			font-weight: 500;
			cursor: pointer;
			transition:
				opacity 0.15s,
				transform 0.15s;
			box-shadow: 0 4px 12px rgba(0, 216, 255, 0.3);
		}

		.regenerate-button:hover {
			opacity: 0.9;
			transform: translateY(-1px);
		}

		.regenerate-button:focus-visible {
			outline: 2px solid var(--traek-input-button-bg, #00d8ff);
			outline-offset: 2px;
		}

		@keyframes fade-in {
			from {
				opacity: 0;
				transform: translateY(-4px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}

		.top-right-controls {
			position: absolute;
			top: 20px;
			right: 20px;
			z-index: 50;
			display: flex;
			gap: 10px;
		}
	}
</style>
