<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import {
		TraekEngine,
		type TraekEngineConfig,
		DEFAULT_TRACK_ENGINE_CONFIG,
		type MessageNode,
		type CustomTraekNode,
		type Node,
		type NodeComponentMap
	} from './TraekEngine.svelte';
	import TraekNodeWrapper from './TraekNodeWrapper.svelte';
	import type { ActionDefinition, ResolveActions } from './actions/types';
	import { ActionResolver } from './actions/ActionResolver.svelte';
	import ActionBadges from './actions/ActionBadges.svelte';
	import SlashCommandDropdown from './actions/SlashCommandDropdown.svelte';
	import type { NodeTypeRegistry } from './node-types/NodeTypeRegistry.svelte.js';
	import type { NodeTypeAction } from './node-types/types';
	import NodeToolbar from './NodeToolbar.svelte';
	import { createDefaultNodeActions } from './defaultNodeActions.js';
	import type { ConnectionDragState } from './canvas/connectionPath';
	import {
		findScrollable,
		scrollableCanConsumeWheel,
		ScrollBoundaryGuard
	} from './canvas/scrollUtils';
	import ConnectionLayer from './canvas/ConnectionLayer.svelte';
	import ToastContainer from './toast/ToastContainer.svelte';
	import { toastUndo } from './toast/toastStore.svelte';
	import FocusMode from './mobile/FocusMode.svelte';
	import type { FocusModeConfig } from './mobile/focusModeTypes.js';

	type InputActionsContext = {
		engine: TraekEngine;
		activeNode: Node | null;
		userInput: string;
		setUserInput: (value: string) => void;
		sendMessage: (options?: SendMessageOptions) => void;
		resolver: ActionResolver | null;
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
		// Optional slot to fully customize the bottom input UI
		// while still delegating message creation to the canvas.
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
		/** Map node.type -> component for custom nodes. Type as NodeComponentMap<'debugNode'|'image'> for key safety. */
		componentMap?: NodeComponentMap;
		initialPlacementPadding?: { left: number; top: number };
		/** Restore saved zoom (e.g. after reload). */
		initialScale?: number;
		/** Restore saved pan (e.g. after reload). */
		initialOffset?: { x: number; y: number };
		/**
		 * Called whenever the user submits the input.
		 * The third argument can be a single action or a list of actions.
		 * Handlers that ignore the third parameter remain valid.
		 */
		onSendMessage?: (input: string, userNode: MessageNode, action?: string | string[]) => void;
		/** Called when node positions change (e.g. after drag ends). Use to persist layout. */
		onNodesChanged?: () => void;
		/** Called when viewport (scale/offset) changes. Use to persist for reload. */
		onViewportChange?: (viewport: { scale: number; offset: { x: number; y: number } }) => void;
		showFps?: boolean;
		showStats?: boolean;
		/** Optional Svelte 5 snippet rendered as the initial intro overlay. */
		initialOverlay?: Snippet;
		/**
		 * Optional Svelte 5 snippet that replaces the default bottom input form.
		 * It receives a single context argument:
		 * { engine, activeNode, userInput, setUserInput, sendMessage, resolver }
		 */
		inputActions?: Snippet<[InputActionsContext]>;
		/** Action definitions for the smart action suggestion system. */
		actions?: ActionDefinition[];
		/** Async callback for stage-2 semantic action resolution (e.g. LLM). */
		resolveActions?: ResolveActions;
		/** Node type registry. When provided, replaces componentMap for node rendering and enables lifecycle hooks. */
		registry?: NodeTypeRegistry;
		/** Called when the user clicks Retry on an error-state node. */
		onRetry?: (nodeId: string) => void;
		/** Override the built-in default actions (duplicate, delete, retry, edit). */
		defaultNodeActions?: NodeTypeAction[];
		/** Per-node filter to customize which actions appear. */
		filterNodeActions?: (node: Node, actions: NodeTypeAction[]) => NodeTypeAction[];
		/** Called when the user clicks Edit on a user node. */
		onEditNode?: (nodeId: string) => void;
		/** Display mode: 'auto' detects viewport width, 'canvas' forces desktop, 'focus' forces mobile focus mode. */
		mode?: 'auto' | 'canvas' | 'focus';
		/** Viewport width breakpoint for auto mode (default 768). */
		mobileBreakpoint?: number;
		/** Configuration for focus mode (swipe thresholds, transition duration, etc.). */
		focusConfig?: Partial<FocusModeConfig>;
	} = $props();

	const config = $derived({
		...DEFAULT_TRACK_ENGINE_CONFIG,
		...configProp
	} satisfies TraekEngineConfig);

	let defaultEngine = $state<TraekEngine | null>(null);
	$effect(() => {
		if (engineProp == null && defaultEngine == null) {
			defaultEngine = new TraekEngine(config);
		}
	});
	const engine = $derived(engineProp ?? (defaultEngine as TraekEngine));

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

	// Wire registry lifecycle hooks into the engine
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

	$effect(() => {
		const id = engine.pendingFocusNodeId;
		if (!id) return;
		const node = engine.nodes.find((n: Node) => n.id === id);
		if (node) centerOnNode(node);
		engine.clearPendingFocus();
	});

	// Canvas State (optional restore from saved viewport; use initial values only at mount)
	// svelte-ignore state_referenced_locally
	const initScale = initialScale ?? 1;
	// svelte-ignore state_referenced_locally
	const initOffset = { x: initialOffset?.x ?? 0, y: initialOffset?.y ?? 0 };
	let scale = $state(initScale);
	let offset = $state(initOffset);
	let viewportChangeTimeoutId = 0;
	function notifyViewportChange() {
		onViewportChange?.({ scale, offset: { x: offset.x, y: offset.y } });
	}
	function scheduleViewportChange() {
		if (viewportChangeTimeoutId) clearTimeout(viewportChangeTimeoutId);
		viewportChangeTimeoutId = window.setTimeout(() => {
			viewportChangeTimeoutId = 0;
			notifyViewportChange();
		}, 300);
	}
	let isDragging = $state(false);
	let editingNodeId = $state<string | null>(null);
	let draggingNodeId = $state<string | null>(null);
	let connectionDrag = $state<ConnectionDragState | null>(null);
	let lastDropTargetEl: Element | null = null;
	let hoveredConnection = $state<{ parentId: string; childId: string } | null>(null);
	let hoveredNodeId = $state<string | null>(null);
	let dragStartMouse = $state<{ x: number; y: number } | null>(null);
	let dragStartNodePosition = $state<{ x: number; y: number } | null>(null);
	let touchStartPan = $state<{
		offsetX: number;
		offsetY: number;
		clientX: number;
		clientY: number;
	} | null>(null);
	let pinchStart = $state<{
		scale: number;
		offsetX: number;
		offsetY: number;
		centerClientX: number;
		centerClientY: number;
		distance: number;
	} | null>(null);
	let viewportEl = $state<HTMLElement | null>(null);
	const scrollGuard = new ScrollBoundaryGuard();
	let focusAnimationId = 0;
	let fps = $state(0);
	let viewportResizeVersion = $state(0);

	// Initial load overlay: blurred veil that hides once the initial
	// canvas view is ready (no selection) or an initial focus has finished.
	let showIntroOverlay = $state(true);

	// Input State
	let userInput = $state('');
	let sendFlash = $state(false);

	// Branch celebration tracking
	let celebratedBranches = $state(new Set<string>());
	let branchCelebration = $state<string | null>(null);

	// Action resolver lifecycle
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

	// Forward input changes to the resolver
	$effect(() => {
		const input = userInput;
		resolver?.onInputChange(input);
	});

	let slashDropdownRef: SlashCommandDropdown | null = $state(null);

	type SendMessageOptions = {
		/** Identifier for the selected tool / mode, e.g. "chat" | "image" | "audio". */
		action?: string;
		/** Multiple tools / modes to trigger for a single prompt. */
		actions?: string[];
		/**
		 * Optional arbitrary payload to store on the created user node.
		 * This is written to `node.data` and can be used by consumers to
		 * inspect which tool(s) were requested or to pass extra metadata.
		 */
		data?: unknown;
	};

	$effect(() => {
		const el = viewportEl;
		if (!el) return;
		let rafId = 0;
		const ro = new ResizeObserver(() => {
			if (rafId) cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(() => {
				rafId = 0;
				viewportResizeVersion += 1;
			});
		});
		ro.observe(el);
		return () => {
			if (rafId) cancelAnimationFrame(rafId);
			ro.disconnect();
		};
	});

	// Hide intro overlay as soon as:
	// - there are nodes AND
	//   - nothing is selected (no active node), or
	//   - a pending focus finished (handled in centerOnNode).
	$effect(() => {
		if (!engine || !showIntroOverlay) return;
		const hasActive = !!engine.activeNodeId;
		const hasPendingFocus = !!engine.pendingFocusNodeId;
		if (!hasActive && !hasPendingFocus) {
			showIntroOverlay = false;
		}
	});

	// Clear text selection when the active node changes (e.g. user clicked another node)
	$effect(() => {
		if (typeof window === 'undefined' || !engine) return;
		// Track activeNodeId to trigger effect on change
		void engine.activeNodeId;
		window.getSelection()?.removeAllRanges();
	});

	$effect(() => {
		const el = viewportEl;
		if (!el || !engine) return;

		function touchDistance(touches: TouchList): number {
			if (touches.length < 2) return 0;
			const a = touches[0];
			const b = touches[1];
			if (a == null || b == null) return 0;
			return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
		}

		function handleTouchStart(e: TouchEvent) {
			if (!el || !engine) return;
			if (e.touches.length === 2) {
				const t0 = e.touches[0];
				const t1 = e.touches[1];
				if (t0 == null || t1 == null) return;
				touchStartPan = null;
				const centerClientX = (t0.clientX + t1.clientX) / 2;
				const centerClientY = (t0.clientY + t1.clientY) / 2;
				pinchStart = {
					scale,
					offsetX: offset.x,
					offsetY: offset.y,
					centerClientX,
					centerClientY,
					distance: touchDistance(e.touches)
				};
				return;
			}
			if (e.touches.length !== 1) return;
			const single = e.touches[0];
			if (single == null) return;
			pinchStart = null;
			if ((e.target as HTMLElement).closest('.floating-input-container')) return;
			// Let scrollable content in any node consume touch (scroll); don't start pan
			if (findScrollable(e.target as Element)) return;
			const nodeEl = (e.target as HTMLElement).closest('[data-node-id]');
			if (nodeEl) {
				const id = nodeEl.getAttribute('data-node-id');
				if (id && engine.activeNodeId === id) {
					// Allow text selection / don't start node drag when touching node content
					if ((e.target as HTMLElement).closest('.message-node-content, .content-area')) return;
					const node = engine.nodes.find((n: Node) => n.id === id);
					if (node) {
						draggingNodeId = id;
						dragStartMouse = { x: single.clientX, y: single.clientY };
						const step = config.gridStep;
						dragStartNodePosition = {
							x: (node.metadata?.x ?? 0) * step,
							y: (node.metadata?.y ?? 0) * step
						};
						return;
					}
				}
			}
			touchStartPan = {
				offsetX: offset.x,
				offsetY: offset.y,
				clientX: single.clientX,
				clientY: single.clientY
			};
		}

		function handleTouchMove(e: TouchEvent) {
			if (!el) return;
			if (e.touches.length === 2 && pinchStart) {
				const t0 = e.touches[0];
				const t1 = e.touches[1];
				if (t0 == null || t1 == null) return;
				e.preventDefault();
				const dist = touchDistance(e.touches);
				if (dist < 1) return;
				const ratio = dist / pinchStart.distance;
				const newScale = Math.min(
					Math.max(config.scaleMin, pinchStart.scale * ratio),
					config.scaleMax
				);
				const rect = el.getBoundingClientRect();
				const centerInViewportX = (t0.clientX + t1.clientX) / 2 - rect.left;
				const centerInViewportY = (t0.clientY + t1.clientY) / 2 - rect.top;
				offset.x =
					centerInViewportX -
					(centerInViewportX - pinchStart.offsetX) * (newScale / pinchStart.scale);
				offset.y =
					centerInViewportY -
					(centerInViewportY - pinchStart.offsetY) * (newScale / pinchStart.scale);
				scale = newScale;
				clampOffset();
				return;
			}
			if (e.touches.length !== 1) return;
			const one = e.touches[0];
			if (one == null) return;
			if (draggingNodeId && engine && dragStartMouse && dragStartNodePosition) {
				e.preventDefault();
				const dxCanvas = (one.clientX - dragStartMouse.x) / scale;
				const dyCanvas = (one.clientY - dragStartMouse.y) / scale;
				engine.setNodePosition(
					draggingNodeId,
					dragStartNodePosition.x + dxCanvas,
					dragStartNodePosition.y + dyCanvas,
					10
				);
				return;
			}
			if (touchStartPan) {
				e.preventDefault();
				offset.x = touchStartPan.offsetX + (one.clientX - touchStartPan.clientX);
				offset.y = touchStartPan.offsetY + (one.clientY - touchStartPan.clientY);
				clampOffset();
			}
		}

		function handleTouchEnd(e: TouchEvent) {
			if (e.touches.length === 0) {
				if (draggingNodeId && engine) {
					engine.snapNodeToGrid(draggingNodeId);
					onNodesChanged?.();
				}
				notifyViewportChange();
				isDragging = false;
				draggingNodeId = null;
				dragStartMouse = null;
				dragStartNodePosition = null;
				touchStartPan = null;
				pinchStart = null;
				return;
			}
			if (e.touches.length === 1) {
				pinchStart = null;
			}
		}

		el.addEventListener('touchstart', handleTouchStart, { passive: true });
		el.addEventListener('touchmove', handleTouchMove, { passive: false });
		el.addEventListener('touchend', handleTouchEnd, { passive: true });
		el.addEventListener('touchcancel', handleTouchEnd, { passive: true });
		return () => {
			el.removeEventListener('touchstart', handleTouchStart);
			el.removeEventListener('touchmove', handleTouchMove);
			el.removeEventListener('touchend', handleTouchEnd);
			el.removeEventListener('touchcancel', handleTouchEnd);
		};
	});

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

	/** Clamp pan offset so the nodes' bounding box cannot be panned fully out of view. */
	function clampOffset() {
		if (!viewportEl || !engine) return;
		const laidOut = engine.nodes.filter((n) => n.type !== 'thought');
		if (laidOut.length === 0) return;
		const w = viewportEl.clientWidth;
		const h = viewportEl.clientHeight;
		if (w <= 0 || h <= 0) return;
		const defaultH = config.nodeHeightDefault;
		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;
		const step = config.gridStep;
		for (const node of laidOut) {
			const xPx = (node.metadata?.x ?? 0) * step;
			const yPx = (node.metadata?.y ?? 0) * step;
			const nodeH = node.metadata?.height ?? defaultH;
			minX = Math.min(minX, xPx);
			maxX = Math.max(maxX, xPx + config.nodeWidth);
			minY = Math.min(minY, yPx);
			maxY = Math.max(maxY, yPx + nodeH);
		}
		const minOffsetX = -maxX * scale;
		const maxOffsetX = w - minX * scale;
		const minOffsetY = -maxY * scale;
		const maxOffsetY = h - minY * scale;
		offset.x = Math.min(maxOffsetX, Math.max(minOffsetX, offset.x));
		offset.y = Math.min(maxOffsetY, Math.max(minOffsetY, offset.y));
	}

	function easeOutCubic(t: number): number {
		return 1 - (1 - t) ** 3;
	}

	/** Pan canvas so the given node is centered in the viewport, with a smooth transition. */
	function centerOnNode(node: Node) {
		const nodeId = node.id;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				const latest = engine.nodes.find((n: Node) => n.id === nodeId);
				if (!latest || !viewportEl) return;
				const w = viewportEl.clientWidth;
				const h = viewportEl.clientHeight;
				if (w <= 0 || h <= 0) return;
				const step = config.gridStep;
				const nodeX = (latest.metadata?.x ?? 0) * step;
				const nodeY = (latest.metadata?.y ?? 0) * step;
				const nodeW = config.nodeWidth;
				const nodeH = latest.metadata?.height ?? config.nodeHeightDefault;
				const centerX = nodeX + nodeW / 2;
				const centerY = nodeY + nodeH / 2;
				const targetX = w / 2 - centerX * scale;
				const targetY = h / 2 - centerY * scale;

				const startX = offset.x;
				const startY = offset.y;
				const startTime = performance.now();

				const tick = (now: number) => {
					const elapsed = now - startTime;
					const t = Math.min(elapsed / config.focusDurationMs, 1);
					const eased = easeOutCubic(t);
					offset.x = startX + (targetX - startX) * eased;
					offset.y = startY + (targetY - startY) * eased;
					if (t >= 1) {
						clampOffset();
						// Initial selection focus finished – hide intro overlay.
						if (showIntroOverlay) {
							showIntroOverlay = false;
						}
					}
					if (t < 1) {
						focusAnimationId = requestAnimationFrame(tick);
					}
				};
				cancelAnimationFrame(focusAnimationId);
				focusAnimationId = requestAnimationFrame(tick);
			});
		});
	}

	function handleWheel(e: WheelEvent) {
		// Let scrollable content (any node, active or not) consume the wheel
		const scrollable = findScrollable(e.target as Element);
		if (scrollable) {
			if (scrollableCanConsumeWheel(scrollable, e.deltaX, e.deltaY)) {
				scrollGuard.recordScrollInside();
				return;
			}
			// Container hit its boundary — suppress canvas movement during cooldown
			if (scrollGuard.shouldSuppressCanvasWheel()) {
				e.preventDefault();
				return;
			}
		}
		e.preventDefault();

		// Heuristic for Trackpad vs Mouse:
		// - Ctrl Key pressed = Pinch to Zoom (Standard)
		// - DeltaMode 0 (Pixel) + No Ctrl = Trackpad Pan (usually)
		// - DeltaMode 1 (Line) = Mouse Wheel Zoom (keeping "mouse is fine" behavior)

		if (e.ctrlKey || e.deltaMode === 1) {
			const zoomDelta = e.deltaMode === 1 ? e.deltaY * config.zoomLineModeBoost : e.deltaY;
			const newScale = Math.min(
				Math.max(config.scaleMin, scale + -zoomDelta * config.zoomSpeed),
				config.scaleMax
			);

			// Zoom towards mouse position: offset is relative to the viewport element,
			// so convert client coords to viewport-element-relative space.
			const viewport = e.currentTarget as HTMLElement;
			const rect = viewport.getBoundingClientRect();
			const mouseInViewportX = e.clientX - rect.left;
			const mouseInViewportY = e.clientY - rect.top;

			offset.x = mouseInViewportX - (mouseInViewportX - offset.x) * (newScale / scale);
			offset.y = mouseInViewportY - (mouseInViewportY - offset.y) * (newScale / scale);

			scale = newScale;
			clampOffset();
			scheduleViewportChange();
		} else {
			// PAN Logic (Trackpad Swipe)
			offset.x -= e.deltaX;
			offset.y -= e.deltaY;
			clampOffset();
			scheduleViewportChange();
		}
	}

	/** Compute port center in canvas-pixel coordinates (before transform). */
	function getPortCanvasPosition(
		nodeId: string,
		portType: 'input' | 'output'
	): { x: number; y: number } | null {
		const node = engine.nodes.find((n: Node) => n.id === nodeId);
		if (!node) return null;
		const step = config.gridStep;
		const x = (node.metadata?.x ?? 0) * step + config.nodeWidth / 2;
		const y =
			portType === 'input'
				? (node.metadata?.y ?? 0) * step
				: (node.metadata?.y ?? 0) * step + (node.metadata?.height ?? config.nodeHeightDefault);
		return { x, y };
	}

	/** Convert client (screen) coordinates to canvas-pixel coordinates. */
	function clientToCanvas(clientX: number, clientY: number): { x: number; y: number } {
		if (!viewportEl) return { x: 0, y: 0 };
		const rect = viewportEl.getBoundingClientRect();
		return {
			x: (clientX - rect.left - offset.x) / scale,
			y: (clientY - rect.top - offset.y) / scale
		};
	}

	function handleMouseDown(e: MouseEvent) {
		if (e.button !== 0) return;
		if ((e.target as HTMLElement).closest('.floating-input-container')) return;

		// Check for connection port click BEFORE node drag
		const portEl = (e.target as HTMLElement).closest('[data-port-type]');
		if (portEl) {
			const portNodeId = portEl.getAttribute('data-port-node-id');
			const portType = portEl.getAttribute('data-port-type') as 'input' | 'output';
			if (portNodeId && portType) {
				const pos = getPortCanvasPosition(portNodeId, portType);
				if (pos) {
					connectionDrag = {
						sourceNodeId: portNodeId,
						sourcePortType: portType,
						sourceX: pos.x,
						sourceY: pos.y,
						currentX: pos.x,
						currentY: pos.y,
						hoverTargetNodeId: null
					};
					e.preventDefault();
					e.stopPropagation();
					return;
				}
			}
		}

		const nodeEl = (e.target as HTMLElement).closest('[data-node-id]');
		if (nodeEl) {
			const id = nodeEl.getAttribute('data-node-id');
			if (id && engine && engine.activeNodeId === id) {
				// Allow text selection inside node content – don't start drag or preventDefault
				if ((e.target as HTMLElement).closest('.message-node-content, .content-area')) return;
				const node = engine.nodes.find((n: Node) => n.id === id);
				if (node) {
					draggingNodeId = id;
					dragStartMouse = { x: e.clientX, y: e.clientY };
					const step = config.gridStep;
					dragStartNodePosition = {
						x: (node.metadata?.x ?? 0) * step,
						y: (node.metadata?.y ?? 0) * step
					};
					e.preventDefault();
					return;
				}
			}
		}
		e.preventDefault();
		isDragging = true;
	}

	function handleMouseMove(e: MouseEvent) {
		// Connection drag: update rubber band position
		if (connectionDrag) {
			const canvasPos = clientToCanvas(e.clientX, e.clientY);
			connectionDrag.currentX = canvasPos.x;
			connectionDrag.currentY = canvasPos.y;

			// Find hover target port via elementFromPoint
			if (lastDropTargetEl) {
				lastDropTargetEl.classList.remove('port-drop-target');
				lastDropTargetEl = null;
			}
			const elUnder = document.elementFromPoint(e.clientX, e.clientY);
			const targetPort = elUnder?.closest?.('[data-port-type]');
			if (targetPort) {
				const targetNodeId = targetPort.getAttribute('data-port-node-id');
				const targetPortType = targetPort.getAttribute('data-port-type');
				// Valid: output→input or input→output, and not same node
				const isValidTarget =
					targetNodeId &&
					targetNodeId !== connectionDrag.sourceNodeId &&
					targetPortType !== connectionDrag.sourcePortType;
				if (isValidTarget) {
					connectionDrag.hoverTargetNodeId = targetNodeId;
					targetPort.classList.add('port-drop-target');
					lastDropTargetEl = targetPort;
				} else {
					connectionDrag.hoverTargetNodeId = null;
				}
			} else {
				connectionDrag.hoverTargetNodeId = null;
			}
			return;
		}

		if (draggingNodeId && engine && dragStartMouse && dragStartNodePosition) {
			const dxCanvas = (e.clientX - dragStartMouse.x) / scale;
			const dyCanvas = (e.clientY - dragStartMouse.y) / scale;
			engine.setNodePosition(
				draggingNodeId,
				dragStartNodePosition.x + dxCanvas,
				dragStartNodePosition.y + dyCanvas,
				10
			);
			return;
		}
		if (!isDragging) return;
		offset.x += e.movementX;
		offset.y += e.movementY;
		clampOffset();
	}

	function handleMouseUp() {
		// Connection drag: try to create connection
		if (connectionDrag) {
			if (lastDropTargetEl) {
				lastDropTargetEl.classList.remove('port-drop-target');
				lastDropTargetEl = null;
			}
			if (connectionDrag.hoverTargetNodeId && engine) {
				let parentId: string;
				let childId: string;
				if (connectionDrag.sourcePortType === 'output') {
					parentId = connectionDrag.sourceNodeId;
					childId = connectionDrag.hoverTargetNodeId;
				} else {
					parentId = connectionDrag.hoverTargetNodeId;
					childId = connectionDrag.sourceNodeId;
				}
				engine.addConnection(parentId, childId);
			}
			connectionDrag = null;
			return;
		}

		if (draggingNodeId && engine) {
			engine.snapNodeToGrid(draggingNodeId);
			onNodesChanged?.();
		}
		notifyViewportChange();
		isDragging = false;
		draggingNodeId = null;
		dragStartMouse = null;
		dragStartNodePosition = null;
		// Reset global cursor override from dragging.
		document.body.style.cursor = '';
	}

	function sendMessage(messageOptions?: SendMessageOptions) {
		if (!userInput.trim()) return;

		// Merge resolver-selected actions into the options
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
			const xPx = (centerX - offset.x) / scale + config.rootNodeOffsetX;
			const yPx = (window.innerHeight / 2 - offset.y) / scale + config.rootNodeOffsetY;
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
		centerOnNode(userNode);

		// Check if this created a branch (parent now has 2+ non-thought children)
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

		// 1. Start with defaults
		const defaults =
			defaultNodeActionsProp ??
			createDefaultNodeActions({
				onRetry,
				onEditNode: onEditNode ?? handleBuiltInEdit
			});

		// 2. Append type-specific actions from registry (deduplicate by id)
		const typeDef = registry?.get(activeNode.type);
		const typeActions = typeDef?.actions ?? [];
		const defaultIds = new Set(defaults.map((a) => a.id));
		const merged = [...defaults, ...typeActions.filter((a) => !defaultIds.has(a.id))];

		// 3. Role filter: retry only on assistant, edit only on user
		const filtered = merged.filter((a) => {
			if (a.id === 'retry' && activeNode.role !== 'assistant') return false;
			if (a.id === 'edit' && activeNode.role !== 'user') return false;
			return true;
		});

		// 4. Custom filter
		return filterNodeActionsProp ? filterNodeActionsProp(activeNode, filtered) : filtered;
	});
</script>

{#if engine}
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
			bind:this={viewportEl}
			role="grid"
			tabindex="-1"
			class="viewport"
			class:dragging-canvas={isDragging || !!touchStartPan || !!pinchStart}
			class:grabbing={isDragging || draggingNodeId}
			class:connection-drag-active={!!connectionDrag}
			style:background-position="{offset.x}px {offset.y}px"
			style:background-size="{config.gridStep * scale}px {config.gridStep * scale}px"
			style:background-image="radial-gradient(circle, var(--traek-canvas-dot, #333333) {Math.max(
				0.1,
				scale
			).toFixed(1)}px, transparent {Math.max(0.1, scale).toFixed(1)}px)"
			onkeydown={(e) => {
				if (e.key === 'Escape') {
					if (editingNodeId) {
						editingNodeId = null;
					} else {
						engine.activeNodeId = null;
					}
				}
			}}
			onwheel={handleWheel}
			onmousedown={handleMouseDown}
			onmousemove={handleMouseMove}
			onmouseup={handleMouseUp}
			onmouseleave={handleMouseUp}
		>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_mouse_events_have_key_events -->
			<div
				class="canvas-space"
				style:transform="translate({offset.x}px, {offset.y}px) scale({scale})"
				onmouseover={(e) => {
					const nodeEl = (e.target as HTMLElement).closest?.('[data-node-id]');
					hoveredNodeId = nodeEl ? nodeEl.getAttribute('data-node-id') : null;
				}}
				onmouseout={(e) => {
					const related = (e.relatedTarget as HTMLElement)?.closest?.('[data-node-id]');
					if (!related) hoveredNodeId = null;
				}}
			>
				<svg class="connections">
					<g transform="translate(25000, 25000)">
						<ConnectionLayer
							nodes={engine.nodes}
							{config}
							{activeAncestorIds}
							{hoveredNodeId}
							bind:hoveredConnection
							{connectionDrag}
							onDeleteConnection={(parentId, childId) => {
								engine.removeConnection(parentId, childId);
							}}
						/>
					</g>
				</svg>

				{#each engine.nodes as node (node.id)}
					{@const isActive = engine.activeNodeId === node.id}
					{@const typeDef = registry?.get(node.type)}
					{@const uiData = node as CustomTraekNode}
					{@const ResolvedComponent =
						typeDef?.component ?? uiData?.component ?? componentMap[node.type]}
					{#if ResolvedComponent}
						{#if typeDef?.selfWrapping}
							<!-- Self-wrapping registry component (e.g. TextNode) -->
							<ResolvedComponent
								{node}
								{isActive}
								{engine}
								viewportRoot={viewportEl}
								gridStep={config.gridStep}
								nodeWidth={config.nodeWidth}
								{viewportResizeVersion}
								{editingNodeId}
								onEditSave={handleEditSave}
								onEditCancel={handleEditCancel}
								onStartEdit={onEditNode ?? handleBuiltInEdit}
							/>
						{:else}
							<!-- Wrapped component (registry, node.component, or componentMap) -->
							<TraekNodeWrapper
								{node}
								{isActive}
								{engine}
								viewportRoot={viewportEl}
								gridStep={config.gridStep}
								nodeWidth={config.nodeWidth}
								{viewportResizeVersion}
								{onRetry}
							>
								<ResolvedComponent {node} {engine} {isActive} {...uiData?.props ?? {}} />
							</TraekNodeWrapper>
						{/if}
					{:else if node.type !== 'thought'}
						<!-- Fallback if no component found -->
						<TraekNodeWrapper
							{node}
							{isActive}
							{engine}
							viewportRoot={viewportEl}
							gridStep={config.gridStep}
							nodeWidth={config.nodeWidth}
							{viewportResizeVersion}
							{onRetry}
						>
							<div class="node-card error">
								<div class="role-tag">{node.type}</div>
								<div class="node-card-content">Missing component for {node.type} node.</div>
							</div>
						</TraekNodeWrapper>
					{/if}
				{/each}

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

			<div class="floating-input-container" transition:fade>
				{#if inputActions}
					{@render inputActions({
						engine,
						activeNode: engine.nodes.find((n) => n.id === engine.activeNodeId) ?? null,
						userInput,
						setUserInput: (value: string) => (userInput = value),
						sendMessage,
						resolver
					})}
				{:else}
					{#if branchCelebration}
						<div class="branch-celebration" transition:fade>
							<span class="celebration-icon">🌿</span>
							{branchCelebration}
						</div>
					{/if}
					<div class="context-info">
						{#if engine.activeNodeId}
							{@const ctxNode = engine.nodes.find((n) => n.id === engine.activeNodeId)}
							{@const childCount = ctxNode
								? engine.nodes.filter(
										(n) => n.parentIds.includes(ctxNode.id) && n.type !== 'thought'
									).length
								: 0}
							<span class="dot"></span>
							{#if childCount > 0}
								Branching from selected message
							{:else}
								Replying to selected message
							{/if}
						{:else}
							<span class="dot gray"></span> Starting a new conversation
						{/if}
					</div>
					{#if resolver && actionsProp}
						<ActionBadges
							actions={actionsProp}
							suggestedIds={resolver.suggestedIds}
							selectedIds={resolver.selectedIds}
							onToggle={(id) => resolver?.toggleAction(id)}
						/>
					{/if}
					<form
						onsubmit={(e) => {
							e.preventDefault();
							sendMessage();
						}}
						class="input-wrapper"
						class:send-flash={sendFlash}
					>
						{#if resolver && actionsProp && resolver.slashFilter !== null}
							<SlashCommandDropdown
								bind:this={slashDropdownRef}
								actions={actionsProp}
								filter={resolver.slashFilter}
								onSelect={(id) => {
									if (resolver) {
										userInput = resolver.selectSlashCommand(id, userInput);
									}
								}}
								onDismiss={() => {
									if (resolver) resolver.slashFilter = null;
								}}
							/>
						{/if}
						<textarea
							bind:value={userInput}
							placeholder="Ask the expert..."
							spellcheck="false"
							rows="1"
							oninput={(e) => {
								const target = e.currentTarget;
								target.style.height = 'auto';
								target.style.height = Math.min(target.scrollHeight, 120) + 'px';
							}}
							onkeydown={(e) => {
								if (resolver?.slashFilter !== null && slashDropdownRef) {
									slashDropdownRef.handleKeydown(e);
									return;
								}
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault();
									sendMessage();
								}
							}}
						></textarea>
						<button type="submit" disabled={!userInput.trim()} aria-label="Send message">
							<svg viewBox="0 0 24 24" width="18" height="18"
								><path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg
							>
						</button>
					</form>
				{/if}
			</div>

			{#if showStats}
				<div class="stats">
					{#if showFps}
						<span class="stats-fps">{fps} FPS</span>
						<span class="stats-sep">|</span>
					{/if}
					<span
						class="stats-zoom"
						onclick={() => {
							scale = 1;
							clampOffset();
							scheduleViewportChange();
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								scale = 1;
								clampOffset();
								scheduleViewportChange();
							}
						}}
						title="Reset zoom to 100%"
						role="button"
						tabindex="0">{Math.round(scale * 100)}%</span
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

		.node-card {
			position: absolute;
			width: 100%;
			min-height: 100px;
			background: var(--traek-node-bg, #161616);
			border: 1px solid var(--traek-node-border, #2a2a2a);
			border-radius: 12px;
			padding: 16px;
			color: var(--traek-node-text, #dddddd);
			transition:
				border-color 0.2s,
				box-shadow 0.2s,
				top 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
				left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
			cursor: pointer;
		}

		.role-tag {
			font-size: 10px;
			text-transform: uppercase;
			letter-spacing: 1px;
			margin-bottom: 8px;
			opacity: 0.5;
		}

		.node-card-content {
			font-size: 13px;
			line-height: 1.45;
			white-space: pre-wrap;
			word-break: break-word;
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

		/* FLOATING INPUT STYLES */
		.floating-input-container {
			position: fixed;
			bottom: 20px;
			left: 50%;
			transform: translateX(-50%);
			width: 100%;
			max-width: calc(min(600px, 100vw) - 3rem);
			z-index: 100;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 12px;
		}

		.input-wrapper {
			width: 100%;
			background: var(--traek-input-bg, rgba(30, 30, 30, 0.8));
			backdrop-filter: blur(20px);
			border: 1px solid var(--traek-input-border, #444444);
			border-radius: 16px;
			display: flex;
			padding: 8px 12px;
			box-shadow: 0 20px 40px var(--traek-input-shadow, rgba(0, 0, 0, 0.4));
		}

		.input-wrapper:focus-within {
			border-color: var(--traek-input-button-bg, #00d8ff);
		}

		textarea {
			flex: 1;
			background: transparent;
			border: none;
			color: var(--traek-input-text, #ffffff);
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

		button {
			background: var(--traek-input-button-bg, #00d8ff);
			color: var(--traek-input-button-text, #000000);
			border: none;
			width: 40px;
			height: 40px;
			border-radius: 10px;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: transform 0.1s;
		}

		button:hover:not(:disabled) {
			transform: scale(1.05);
		}
		button:disabled {
			opacity: 0.3;
			cursor: not-allowed;
		}

		@media (max-width: 768px) {
			button {
				width: 44px;
				height: 44px;
			}
		}

		.context-info {
			font-size: 12px;
			color: var(--traek-input-context-text, #888888);
			display: flex;
			align-items: center;
			gap: 6px;
			background: var(--traek-input-context-bg, rgba(0, 0, 0, 0.4));
			padding: 4px 12px;
			border-radius: 20px;
		}

		.dot {
			width: 8px;
			height: 8px;
			background: var(--traek-input-dot, #00d8ff);
			border-radius: 50%;
		}
		.dot.gray {
			background: var(--traek-input-dot-muted, #555555);
		}

		.branch-celebration {
			background: rgba(0, 216, 255, 0.12);
			border: 1px solid rgba(0, 216, 255, 0.3);
			color: var(--traek-input-button-bg, #00d8ff);
			padding: 8px 16px;
			border-radius: 20px;
			font-size: 13px;
			display: flex;
			align-items: center;
			gap: 8px;
			backdrop-filter: blur(10px);
		}

		.celebration-icon {
			font-size: 16px;
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

		@keyframes send-flash {
			0% {
				border-color: var(--traek-input-button-bg, #00d8ff);
			}
			100% {
				border-color: var(--traek-input-border, #444444);
			}
		}

		.input-wrapper.send-flash {
			animation: send-flash 300ms ease-out;
		}

		textarea:focus-visible {
			outline: none;
		}

		button:focus-visible {
			outline: 2px solid var(--traek-input-button-bg, #00d8ff);
			outline-offset: 2px;
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

		/* EMPTY STATE */
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

		/* Mobile touch target improvements */
		@media (max-width: 768px) {
			button {
				min-width: 44px;
				min-height: 44px;
			}
		}
	}
</style>
