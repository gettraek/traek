import type { TraekEngine, TraekEngineConfig, Node } from '../TraekEngine.svelte';
import type { ViewportManager } from './ViewportManager.svelte';
import type { ConnectionDragState } from './connectionPath';
import { findScrollable, scrollableCanConsumeWheel, ScrollBoundaryGuard } from './scrollUtils';

/**
 * Manages canvas interaction state: pan, zoom, node dragging, connection dragging, and touch gestures.
 */
export class CanvasInteraction {
	isDragging = $state(false);
	draggingNodeId = $state<string | null>(null);
	connectionDrag = $state<ConnectionDragState | null>(null);
	hoveredConnection = $state<{ parentId: string; childId: string } | null>(null);
	hoveredNodeId = $state<string | null>(null);

	#dragStartMouse = $state<{ x: number; y: number } | null>(null);
	#dragStartNodePosition = $state<{ x: number; y: number } | null>(null);
	#touchStartPan = $state<{
		offsetX: number;
		offsetY: number;
		clientX: number;
		clientY: number;
	} | null>(null);
	#pinchStart = $state<{
		scale: number;
		offsetX: number;
		offsetY: number;
		centerClientX: number;
		centerClientY: number;
		distance: number;
	} | null>(null);
	#lastDropTargetEl: Element | null = null;
	#scrollGuard = new ScrollBoundaryGuard();

	#viewport: ViewportManager;
	#engine: TraekEngine;
	#config: TraekEngineConfig;
	#onNodesChanged?: () => void;

	constructor(
		viewport: ViewportManager,
		engine: TraekEngine,
		config: TraekEngineConfig,
		onNodesChanged?: () => void
	) {
		this.#viewport = viewport;
		this.#engine = engine;
		this.#config = config;
		this.#onNodesChanged = onNodesChanged;
	}

	/** Compute port center in canvas-pixel coordinates (before transform). */
	#getPortCanvasPosition(
		nodeId: string,
		portType: 'input' | 'output'
	): { x: number; y: number } | null {
		const node = this.#engine.nodes.find((n: Node) => n.id === nodeId);
		if (!node) return null;
		const step = this.#config.gridStep;
		const x = (node.metadata?.x ?? 0) * step + this.#config.nodeWidth / 2;
		const y =
			portType === 'input'
				? (node.metadata?.y ?? 0) * step
				: (node.metadata?.y ?? 0) * step +
					(node.metadata?.height ?? this.#config.nodeHeightDefault);
		return { x, y };
	}

	/** Convert client (screen) coordinates to canvas-pixel coordinates. */
	#clientToCanvas(clientX: number, clientY: number): { x: number; y: number } {
		if (!this.#viewport.viewportEl) return { x: 0, y: 0 };
		const rect = this.#viewport.viewportEl.getBoundingClientRect();
		return {
			x: (clientX - rect.left - this.#viewport.offset.x) / this.#viewport.scale,
			y: (clientY - rect.top - this.#viewport.offset.y) / this.#viewport.scale
		};
	}

	#touchDistance(touches: TouchList): number {
		if (touches.length < 2) return 0;
		const a = touches[0];
		const b = touches[1];
		if (a == null || b == null) return 0;
		return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
	}

	handleMouseDown = (e: MouseEvent) => {
		if (e.button !== 0) return;
		if ((e.target as HTMLElement).closest('.floating-input-container')) return;

		// Check for connection port click BEFORE node drag
		const portEl = (e.target as HTMLElement).closest('[data-port-type]');
		if (portEl) {
			const portNodeId = portEl.getAttribute('data-port-node-id');
			const portType = portEl.getAttribute('data-port-type') as 'input' | 'output';
			if (portNodeId && portType) {
				const pos = this.#getPortCanvasPosition(portNodeId, portType);
				if (pos) {
					this.connectionDrag = {
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
			if (id && this.#engine.activeNodeId === id) {
				// Allow text selection inside node content – don't start drag or preventDefault
				if ((e.target as HTMLElement).closest('.message-node-content, .content-area')) return;
				const node = this.#engine.nodes.find((n: Node) => n.id === id);
				if (node) {
					this.draggingNodeId = id;
					this.#dragStartMouse = { x: e.clientX, y: e.clientY };
					const step = this.#config.gridStep;
					this.#dragStartNodePosition = {
						x: (node.metadata?.x ?? 0) * step,
						y: (node.metadata?.y ?? 0) * step
					};
					e.preventDefault();
					return;
				}
			}
		}
		e.preventDefault();
		this.isDragging = true;
	};

	handleMouseMove = (e: MouseEvent) => {
		// Connection drag: update rubber band position
		if (this.connectionDrag) {
			const canvasPos = this.#clientToCanvas(e.clientX, e.clientY);
			this.connectionDrag.currentX = canvasPos.x;
			this.connectionDrag.currentY = canvasPos.y;

			// Find hover target port via elementFromPoint
			if (this.#lastDropTargetEl) {
				this.#lastDropTargetEl.classList.remove('port-drop-target');
				this.#lastDropTargetEl = null;
			}
			const elUnder = document.elementFromPoint(e.clientX, e.clientY);
			const targetPort = elUnder?.closest?.('[data-port-type]');
			if (targetPort) {
				const targetNodeId = targetPort.getAttribute('data-port-node-id');
				const targetPortType = targetPort.getAttribute('data-port-type');
				// Valid: output→input or input→output, and not same node
				const isValidTarget =
					targetNodeId &&
					targetNodeId !== this.connectionDrag.sourceNodeId &&
					targetPortType !== this.connectionDrag.sourcePortType;
				if (isValidTarget) {
					this.connectionDrag.hoverTargetNodeId = targetNodeId;
					targetPort.classList.add('port-drop-target');
					this.#lastDropTargetEl = targetPort;
				} else {
					this.connectionDrag.hoverTargetNodeId = null;
				}
			} else {
				this.connectionDrag.hoverTargetNodeId = null;
			}
			return;
		}

		if (this.draggingNodeId && this.#dragStartMouse && this.#dragStartNodePosition) {
			const dxCanvas = (e.clientX - this.#dragStartMouse.x) / this.#viewport.scale;
			const dyCanvas = (e.clientY - this.#dragStartMouse.y) / this.#viewport.scale;
			this.#engine.setNodePosition(
				this.draggingNodeId,
				this.#dragStartNodePosition.x + dxCanvas,
				this.#dragStartNodePosition.y + dyCanvas,
				10
			);
			return;
		}
		if (!this.isDragging) return;
		this.#viewport.offset.x += e.movementX;
		this.#viewport.offset.y += e.movementY;
		this.#viewport.clampOffset(this.#engine.nodes);
	};

	handleMouseUp = () => {
		// Connection drag: try to create connection
		if (this.connectionDrag) {
			if (this.#lastDropTargetEl) {
				this.#lastDropTargetEl.classList.remove('port-drop-target');
				this.#lastDropTargetEl = null;
			}
			if (this.connectionDrag.hoverTargetNodeId) {
				let parentId: string;
				let childId: string;
				if (this.connectionDrag.sourcePortType === 'output') {
					parentId = this.connectionDrag.sourceNodeId;
					childId = this.connectionDrag.hoverTargetNodeId;
				} else {
					parentId = this.connectionDrag.hoverTargetNodeId;
					childId = this.connectionDrag.sourceNodeId;
				}
				this.#engine.addConnection(parentId, childId);
			}
			this.connectionDrag = null;
			return;
		}

		if (this.draggingNodeId) {
			this.#engine.snapNodeToGrid(this.draggingNodeId);
			this.#onNodesChanged?.();
		}
		this.#viewport.notifyViewportChange();
		this.isDragging = false;
		this.draggingNodeId = null;
		this.#dragStartMouse = null;
		this.#dragStartNodePosition = null;
		// Reset global cursor override from dragging.
		document.body.style.cursor = '';
	};

	handleTouchStart = (e: TouchEvent) => {
		if (!this.#viewport.viewportEl) return;
		if (e.touches.length === 2) {
			const t0 = e.touches[0];
			const t1 = e.touches[1];
			if (t0 == null || t1 == null) return;
			this.#touchStartPan = null;
			const centerClientX = (t0.clientX + t1.clientX) / 2;
			const centerClientY = (t0.clientY + t1.clientY) / 2;
			this.#pinchStart = {
				scale: this.#viewport.scale,
				offsetX: this.#viewport.offset.x,
				offsetY: this.#viewport.offset.y,
				centerClientX,
				centerClientY,
				distance: this.#touchDistance(e.touches)
			};
			return;
		}
		if (e.touches.length !== 1) return;
		const single = e.touches[0];
		if (single == null) return;
		this.#pinchStart = null;
		if ((e.target as HTMLElement).closest('.floating-input-container')) return;
		// Let scrollable content in any node consume touch (scroll); don't start pan
		if (findScrollable(e.target as Element)) return;
		const nodeEl = (e.target as HTMLElement).closest('[data-node-id]');
		if (nodeEl) {
			const id = nodeEl.getAttribute('data-node-id');
			if (id && this.#engine.activeNodeId === id) {
				// Allow text selection / don't start node drag when touching node content
				if ((e.target as HTMLElement).closest('.message-node-content, .content-area')) return;
				const node = this.#engine.nodes.find((n: Node) => n.id === id);
				if (node) {
					this.draggingNodeId = id;
					this.#dragStartMouse = { x: single.clientX, y: single.clientY };
					const step = this.#config.gridStep;
					this.#dragStartNodePosition = {
						x: (node.metadata?.x ?? 0) * step,
						y: (node.metadata?.y ?? 0) * step
					};
					return;
				}
			}
		}
		this.#touchStartPan = {
			offsetX: this.#viewport.offset.x,
			offsetY: this.#viewport.offset.y,
			clientX: single.clientX,
			clientY: single.clientY
		};
	};

	handleTouchMove = (e: TouchEvent) => {
		if (!this.#viewport.viewportEl) return;
		if (e.touches.length === 2 && this.#pinchStart) {
			const t0 = e.touches[0];
			const t1 = e.touches[1];
			if (t0 == null || t1 == null) return;
			e.preventDefault();
			const dist = this.#touchDistance(e.touches);
			if (dist < 1) return;
			const ratio = dist / this.#pinchStart.distance;
			const newScale = Math.min(
				Math.max(this.#config.scaleMin, this.#pinchStart.scale * ratio),
				this.#config.scaleMax
			);
			const rect = this.#viewport.viewportEl.getBoundingClientRect();
			const centerInViewportX = (t0.clientX + t1.clientX) / 2 - rect.left;
			const centerInViewportY = (t0.clientY + t1.clientY) / 2 - rect.top;
			this.#viewport.offset.x =
				centerInViewportX -
				(centerInViewportX - this.#pinchStart.offsetX) * (newScale / this.#pinchStart.scale);
			this.#viewport.offset.y =
				centerInViewportY -
				(centerInViewportY - this.#pinchStart.offsetY) * (newScale / this.#pinchStart.scale);
			this.#viewport.scale = newScale;
			this.#viewport.clampOffset(this.#engine.nodes);
			return;
		}
		if (e.touches.length !== 1) return;
		const one = e.touches[0];
		if (one == null) return;
		if (this.draggingNodeId && this.#dragStartMouse && this.#dragStartNodePosition) {
			e.preventDefault();
			const dxCanvas = (one.clientX - this.#dragStartMouse.x) / this.#viewport.scale;
			const dyCanvas = (one.clientY - this.#dragStartMouse.y) / this.#viewport.scale;
			this.#engine.setNodePosition(
				this.draggingNodeId,
				this.#dragStartNodePosition.x + dxCanvas,
				this.#dragStartNodePosition.y + dyCanvas,
				10
			);
			return;
		}
		if (this.#touchStartPan) {
			e.preventDefault();
			this.#viewport.offset.x =
				this.#touchStartPan.offsetX + (one.clientX - this.#touchStartPan.clientX);
			this.#viewport.offset.y =
				this.#touchStartPan.offsetY + (one.clientY - this.#touchStartPan.clientY);
			this.#viewport.clampOffset(this.#engine.nodes);
		}
	};

	handleTouchEnd = (e: TouchEvent) => {
		if (e.touches.length === 0) {
			if (this.draggingNodeId) {
				this.#engine.snapNodeToGrid(this.draggingNodeId);
				this.#onNodesChanged?.();
			}
			this.#viewport.notifyViewportChange();
			this.isDragging = false;
			this.draggingNodeId = null;
			this.#dragStartMouse = null;
			this.#dragStartNodePosition = null;
			this.#touchStartPan = null;
			this.#pinchStart = null;
			return;
		}
		if (e.touches.length === 1) {
			this.#pinchStart = null;
		}
	};

	handleWheel = (e: WheelEvent) => {
		// Let scrollable content (any node, active or not) consume the wheel
		const scrollable = findScrollable(e.target as Element);
		if (scrollable) {
			if (scrollableCanConsumeWheel(scrollable, e.deltaX, e.deltaY)) {
				this.#scrollGuard.recordScrollInside();
				return;
			}
			// Container hit its boundary — suppress canvas movement during cooldown
			if (this.#scrollGuard.shouldSuppressCanvasWheel()) {
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
			const zoomDelta = e.deltaMode === 1 ? e.deltaY * this.#config.zoomLineModeBoost : e.deltaY;
			const newScale = Math.min(
				Math.max(this.#config.scaleMin, this.#viewport.scale + -zoomDelta * this.#config.zoomSpeed),
				this.#config.scaleMax
			);

			// Zoom towards mouse position: offset is relative to the viewport element,
			// so convert client coords to viewport-element-relative space.
			const viewport = e.currentTarget as HTMLElement;
			const rect = viewport.getBoundingClientRect();
			const mouseInViewportX = e.clientX - rect.left;
			const mouseInViewportY = e.clientY - rect.top;

			this.#viewport.offset.x =
				mouseInViewportX -
				(mouseInViewportX - this.#viewport.offset.x) * (newScale / this.#viewport.scale);
			this.#viewport.offset.y =
				mouseInViewportY -
				(mouseInViewportY - this.#viewport.offset.y) * (newScale / this.#viewport.scale);

			this.#viewport.scale = newScale;
			this.#viewport.clampOffset(this.#engine.nodes);
			this.#viewport.scheduleViewportChange();
		} else {
			// PAN Logic (Trackpad Swipe)
			this.#viewport.offset.x -= e.deltaX;
			this.#viewport.offset.y -= e.deltaY;
			this.#viewport.clampOffset(this.#engine.nodes);
			this.#viewport.scheduleViewportChange();
		}
	};

	get isTouchPanning(): boolean {
		return !!this.#touchStartPan || !!this.#pinchStart;
	}
}
