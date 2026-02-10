<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import {
		TraekEngine,
		type TraekEngineConfig,
		DEFAULT_TRACK_ENGINE_CONFIG,
		type MessageNode
	} from './TraekEngine.svelte';
	import TraekNodeWrapper from './TraekNodeWrapper.svelte';
	import TextNode from './TextNode.svelte';

	let {
		engine: engineProp,
		config: configProp,
		initialPlacementPadding = { left: 0, top: 0 },
		initialScale,
		initialOffset,
		onSendMessage,
		onNodesChanged,
		onViewportChange,
		showFps = false,
		initialOverlay
	}: {
		engine?: TraekEngine | null;
		config?: Partial<TraekEngineConfig>;
		initialPlacementPadding?: { left: number; top: number };
		/** Restore saved zoom (e.g. after reload). */
		initialScale?: number;
		/** Restore saved pan (e.g. after reload). */
		initialOffset?: { x: number; y: number };
		onSendMessage?: (input: string, userNode: MessageNode) => void;
		/** Called when node positions change (e.g. after drag ends). Use to persist layout. */
		onNodesChanged?: () => void;
		/** Called when viewport (scale/offset) changes. Use to persist for reload. */
		onViewportChange?: (viewport: { scale: number; offset: { x: number; y: number } }) => void;
		showFps?: boolean;
		/** Optional Svelte 5 snippet rendered as the initial intro overlay. */
		initialOverlay?: Snippet;
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

	$effect(() => {
		const id = engine.pendingFocusNodeId;
		if (!id) return;
		const node = engine.nodes.find((n: MessageNode) => n.id === id);
		if (node) centerOnNode(node);
		engine.clearPendingFocus();
	});

	// Canvas State (optional restore from saved viewport; use initial values only at mount)
	const initScale = initialScale ?? 1;
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
	let draggingNodeId = $state<string | null>(null);
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
	let focusAnimationId = 0;
	let fps = $state(0);
	let viewportResizeVersion = $state(0);

	// Initial load overlay: blurred veil that hides once the initial
	// canvas view is ready (no selection) or an initial focus has finished.
	let showIntroOverlay = $state(true);

	// Input State
	let userInput = $state('');

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
		const hasNodes = engine.nodes.length > 0;
		const hasActive = !!engine.activeNodeId;
		const hasPendingFocus = !!engine.pendingFocusNodeId;
		if (hasNodes && !hasActive && !hasPendingFocus) {
			showIntroOverlay = false;
		}
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
				const rect = el.getBoundingClientRect();
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
					const node = engine.nodes.find((n: MessageNode) => n.id === id);
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
	function centerOnNode(node: MessageNode) {
		const nodeId = node.id;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				const latest = engine.nodes.find((n: MessageNode) => n.id === nodeId);
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

	/** Find the nearest scrollable ancestor (overflow auto/scroll with scrollable content). */
	function findScrollable(el: Element): HTMLElement | null {
		let current: Element | null = el;
		while (current && current instanceof HTMLElement) {
			const style = getComputedStyle(current);
			const oy = style.overflowY;
			const ox = style.overflowX;
			const overflow = style.overflow;
			const canScrollY =
				(oy === 'auto' || oy === 'scroll' || overflow === 'auto' || overflow === 'scroll') &&
				current.scrollHeight > current.clientHeight;
			const canScrollX =
				(ox === 'auto' || ox === 'scroll' || overflow === 'auto' || overflow === 'scroll') &&
				current.scrollWidth > current.clientWidth;
			if (canScrollY || canScrollX) return current;
			current = current.parentElement;
		}
		return null;
	}

	/** True if the scrollable element can consume the wheel (has room to scroll in that direction). */
	function scrollableCanConsumeWheel(el: HTMLElement, deltaX: number, deltaY: number): boolean {
		const canScrollDown = el.scrollTop < el.scrollHeight - el.clientHeight - 1;
		const canScrollUp = el.scrollTop > 1;
		const canScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
		const canScrollLeft = el.scrollLeft > 1;
		if (Math.abs(deltaY) >= Math.abs(deltaX)) {
			return (deltaY > 0 && canScrollDown) || (deltaY < 0 && canScrollUp);
		}
		return (deltaX > 0 && canScrollRight) || (deltaX < 0 && canScrollLeft);
	}

	function handleWheel(e: WheelEvent) {
		// Let scrollable content (any node, active or not) consume the wheel
		const scrollable = findScrollable(e.target as Element);
		if (scrollable && scrollableCanConsumeWheel(scrollable, e.deltaX, e.deltaY)) {
			return;
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

	function handleMouseDown(e: MouseEvent) {
		if (e.button !== 0) return;
		if ((e.target as HTMLElement).closest('.floating-input-container')) return;
		const nodeEl = (e.target as HTMLElement).closest('[data-node-id]');
		if (nodeEl) {
			const id = nodeEl.getAttribute('data-node-id');
			if (id && engine && engine.activeNodeId === id) {
				const node = engine.nodes.find((n: MessageNode) => n.id === id);
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

	function sendMessage() {
		if (!userInput.trim()) return;

		const parentNode = engine.nodes.find((n: MessageNode) => n.id === engine.activeNodeId);
		let options: { x?: number; y?: number } = {};

		if (!parentNode) {
			const effectiveWidth = window.innerWidth - initialPlacementPadding.left;
			const centerX = initialPlacementPadding.left + effectiveWidth / 2;
			const xPx = (centerX - offset.x) / scale + config.rootNodeOffsetX;
			const yPx = (window.innerHeight / 2 - offset.y) / scale + config.rootNodeOffsetY;
			const step = config.gridStep;
			options = {
				x: Math.round(xPx / step),
				y: Math.round(yPx / step)
			};
		}

		const userNode = engine.addNode(userInput, 'user', options);
		const lastInput = userInput;
		userInput = '';
		centerOnNode(userNode);

		onSendMessage?.(lastInput, userNode);
	}

	const CONNECTION_CORNER_RADIUS = 12;

	/** Bezier factor for a 90° circular arc: 4/3 * (sqrt(2)-1) */
	const QUARTER_BEZIER = (4 * (Math.SQRT2 - 1)) / 3;

	/**
	 * Rectilinear path with rounded corners using cubic Bezier (no SVG arc).
	 * Vertical → horizontal → vertical; corners are quarter-circle Beziers.
	 */
	function pathVerticalHorizontalVertical(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		r: number
	): string {
		const midY = (y1 + y2) / 2;
		const dx = x2 - x1;
		const minR = Math.min(r, Math.abs(dx) / 2, Math.abs(y2 - y1) / 4);
		if (minR <= 0) return `M ${x1} ${y1} L ${x2} ${y2}`;
		const k = QUARTER_BEZIER;
		const t = minR * (1 - k);
		const goRight = dx >= 0;
		const r1 = goRight ? minR : -minR;
		const r2 = goRight ? -minR : minR;
		const a1x = x1;
		const a1y = midY - minR;
		const c1a = goRight ? `${x1} ${midY - t}` : `${x1} ${midY - t}`;
		const c1b = goRight ? `${x1 + t} ${midY}` : `${x1 - t} ${midY}`;
		const b1x = x1 + r1;
		const b1y = midY;
		const a2x = x2 + r2;
		const a2y = midY;
		const c2a = goRight ? `${x2 - t} ${midY}` : `${x2 + t} ${midY}`;
		const c2b = goRight ? `${x2} ${midY + t}` : `${x2} ${midY + t}`;
		const b2x = x2;
		const b2y = midY + minR;
		return `M ${x1} ${y1} L ${a1x} ${a1y} C ${c1a} ${c1b} ${b1x} ${b1y} L ${a2x} ${a2y} C ${c2a} ${c2b} ${b2x} ${b2y} L ${x2} ${y2}`;
	}

	/**
	 * Rectilinear path with rounded corners using cubic Bezier (no SVG arc).
	 * Horizontal → vertical → horizontal.
	 */
	function pathHorizontalVerticalHorizontal(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		r: number
	): string {
		const midX = (x1 + x2) / 2;
		const dy = y2 - y1;
		const minR = Math.min(r, Math.abs(dy) / 2, Math.abs(x2 - x1) / 4);
		if (minR <= 0) return `M ${x1} ${y1} L ${x2} ${y2}`;
		const k = QUARTER_BEZIER;
		const t = minR * (1 - k);
		const goDown = dy >= 0;
		const turnRight = x2 > midX;
		const r1 = goDown ? minR : -minR;
		const r2 = turnRight ? minR : -minR;
		const a1x = midX - (turnRight ? minR : -minR);
		const a1y = y1;
		const c1a = turnRight ? `${midX - t} ${y1}` : `${midX + t} ${y1}`;
		const c1b = goDown ? `${midX} ${y1 + t}` : `${midX} ${y1 - t}`;
		const b1x = midX;
		const b1y = y1 + r1;
		const a2x = midX;
		const a2y = y2 - (goDown ? minR : -minR);
		const c2a = goDown ? `${midX} ${y2 - t}` : `${midX} ${y2 + t}`;
		const c2b = turnRight ? `${midX + t} ${y2}` : `${midX - t} ${y2}`;
		const b2x = midX + r2;
		const b2y = y2;
		return `M ${x1} ${y1} L ${a1x} ${a1y} C ${c1a} ${c1b} ${b1x} ${b1y} L ${a2x} ${a2y} C ${c2a} ${c2b} ${b2x} ${b2y} L ${x2} ${y2}`;
	}

	/**
	 * Returns SVG path d for a rectilinear connection (horizontal/vertical segments
	 * with rounded corners). Prefers parent bottom → child top when child is below
	 * parent; otherwise uses the shortest edge-center pair and a square path.
	 */
	function getConnectionPath(
		parentX: number,
		parentY: number,
		parentW: number,
		parentH: number,
		childX: number,
		childY: number,
		childW: number,
		childH: number
	): string {
		const r = CONNECTION_CORNER_RADIUS;
		const parentBottomY = parentY + parentH;
		const childBelowParent = childY >= parentBottomY;
		if (childBelowParent) {
			const x1 = parentX + parentW / 2;
			const y1 = parentBottomY;
			const x2 = childX + childW / 2;
			const y2 = childY;
			return pathVerticalHorizontalVertical(x1, y1, x2, y2, r);
		}
		const edges = (
			left: number,
			top: number,
			w: number,
			h: number
		): { x: number; y: number; outX: number; outY: number }[] => {
			const cx = left + w / 2;
			const cy = top + h / 2;
			return [
				{ x: cx, y: top, outX: 0, outY: -1 },
				{ x: cx, y: top + h, outX: 0, outY: 1 },
				{ x: left, y: cy, outX: -1, outY: 0 },
				{ x: left + w, y: cy, outX: 1, outY: 0 }
			];
		};
		const parentEdges = edges(parentX, parentY, parentW, parentH);
		const childEdges = edges(childX, childY, childW, childH);
		let best = { dist: Infinity, i: 0, j: 0 };
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				const pe = parentEdges[i];
				const ce = childEdges[j];
				if (pe === undefined || ce === undefined) continue;
				const dx = ce.x - pe.x;
				const dy = ce.y - pe.y;
				const d = dx * dx + dy * dy;
				if (d < best.dist) {
					best = { dist: d, i, j };
				}
			}
		}
		const p = parentEdges[best.i];
		const c = childEdges[best.j];
		if (p === undefined || c === undefined) return 'M 0 0';
		const outVertical = p.outY !== 0;
		return outVertical
			? pathVerticalHorizontalVertical(p.x, p.y, c.x, c.y, r)
			: pathHorizontalVerticalHorizontal(p.x, p.y, c.x, c.y, r);
	}
</script>

{#if engine}
	<div
		bind:this={viewportEl}
		role="grid"
		tabindex="-1"
		class="viewport"
		class:dragging-canvas={isDragging || !!touchStartPan || !!pinchStart}
		class:grabbing={isDragging || draggingNodeId}
		style:background-position="{offset.x}px {offset.y}px"
		style:background-size="{config.gridStep * scale}px {config.gridStep * scale}px"
		style:background-image="radial-gradient(circle, #333 {Math.max(0.1, scale).toFixed(1)}px,
		transparent {Math.max(0.1, scale).toFixed(1)}px)"
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				engine.activeNodeId = null;
			}
		}}
		onwheel={handleWheel}
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseUp}
	>
		<div
			class="canvas-space"
			style:transform="translate({offset.x}px, {offset.y}px) scale({scale})"
		>
			<svg class="connections">
				<g transform="translate(25000, 25000)">
					{#each engine.nodes as node}
						{#if node.parentId}
							{@const parent = engine.nodes.find((n) => n.id === node.parentId)}
							{#if parent}
								{@const isThought = node.type === 'thought'}
								{@const step = config.gridStep}
								{@const parentX = (parent.metadata?.x ?? 0) * step}
								{@const parentY = (parent.metadata?.y ?? 0) * step}
								{@const parentH = parent.metadata?.height ?? config.nodeHeightDefault}
								{@const nodeX = (node.metadata?.x ?? 0) * step}
								{@const nodeY = (node.metadata?.y ?? 0) * step}
								{@const nodeH = node.metadata?.height ?? config.nodeHeightDefault}
								{#if !isThought}
									{@const pathD = getConnectionPath(
										parentX,
										parentY,
										config.nodeWidth,
										parentH,
										nodeX,
										nodeY,
										config.nodeWidth,
										nodeH
									)}
									{@const ancestorPath = engine.contextPath()}
									{@const isOnAncestorPath =
										ancestorPath.length >= 2 &&
										ancestorPath.some(
											(_, i) =>
												i < ancestorPath.length - 1 &&
												ancestorPath[i].id === parent.id &&
												ancestorPath[i + 1].id === node.id
										)}
									{#if !isOnAncestorPath}
										<!-- Non-marked connection -->
										<path class="connection" d={pathD} />
									{/if}
								{/if}
							{/if}
						{/if}
					{/each}

					{#each engine.nodes as node}
						{#if node.parentId}
							{@const parent = engine.nodes.find((n) => n.id === node.parentId)}
							{#if parent}
								{@const isThought = node.type === 'thought'}
								{@const step = config.gridStep}
								{@const parentX = (parent.metadata?.x ?? 0) * step}
								{@const parentY = (parent.metadata?.y ?? 0) * step}
								{@const parentH = parent.metadata?.height ?? config.nodeHeightDefault}
								{@const nodeX = (node.metadata?.x ?? 0) * step}
								{@const nodeY = (node.metadata?.y ?? 0) * step}
								{@const nodeH = node.metadata?.height ?? config.nodeHeightDefault}
								{#if !isThought}
									{@const pathD = getConnectionPath(
										parentX,
										parentY,
										config.nodeWidth,
										parentH,
										nodeX,
										nodeY,
										config.nodeWidth,
										nodeH
									)}
									{@const ancestorPath = engine.contextPath()}
									{@const isOnAncestorPath =
										ancestorPath.length >= 2 &&
										ancestorPath.some(
											(_, i) =>
												i < ancestorPath.length - 1 &&
												ancestorPath[i].id === parent.id &&
												ancestorPath[i + 1].id === node.id
										)}
									{#if isOnAncestorPath}
										<!-- Marked connection (always rendered on top) -->
										<path class="connection connection--highlight" d={pathD} />
									{/if}
								{/if}
							{/if}
						{/if}
					{/each}
				</g>
			</svg>

			{#each engine.nodes as node (node.id)}
				{@const isActive = engine.activeNodeId === node.id}
				{#if node.type === 'text'}
					<TextNode
						{node}
						{isActive}
						{engine}
						viewportRoot={viewportEl}
						gridStep={config.gridStep}
						nodeWidth={config.nodeWidth}
						{viewportResizeVersion}
					/>
				{:else if node.type === 'code'}
					<TraekNodeWrapper
						{node}
						{isActive}
						{engine}
						viewportRoot={viewportEl}
						gridStep={config.gridStep}
						nodeWidth={config.nodeWidth}
						{viewportResizeVersion}
					>
						<button
							class="node-card {node.role} {isActive ? 'active' : ''}"
							onclick={(e) => {
								e.stopPropagation();
								engine.branchFrom(node.id);
							}}
						>
							<div class="role-tag">{node.role}</div>
							<div class="node-card-content">{node.content}</div>
						</button>
					</TraekNodeWrapper>
				{/if}
			{/each}
		</div>

		{#if showIntroOverlay && initialOverlay}
			<div class="overlay-root" transition:fade>
				{@render initialOverlay()}
			</div>
		{/if}

		<div class="floating-input-container" transition:fade>
			<div class="context-info">
				{#if engine.activeNodeId}
					<span class="dot"></span> Reply linked to selected message
				{:else}
					<span class="dot gray"></span> New thread in center
				{/if}
			</div>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					sendMessage();
				}}
				class="input-wrapper"
			>
				<input bind:value={userInput} placeholder="Ask the expert..." spellcheck="false" />
				<button type="submit" disabled={!userInput.trim()} aria-label="Send message">
					<svg viewBox="0 0 24 24" width="18" height="18"
						><path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg
					>
				</button>
			</form>
		</div>

		<div class="stats">
			{#if showFps}
				<span class="stats-fps">{fps} FPS</span>
				<span class="stats-sep">|</span>
			{/if}
			{Math.round(scale * 100)}% | Context: {engine.contextPath().length} Nodes
		</div>
	</div>
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

		.node-card.active {
			border-color: var(--traek-node-active-border, #00d8ff);
			box-shadow: 0 0 20px var(--traek-node-active-glow, rgba(0, 216, 255, 0.15));
		}

		.node-card.user {
			border-top: 3px solid var(--traek-node-user-border-top, #00d8ff);
		}
		.node-card.assistant {
			border-top: 3px solid var(--traek-node-assistant-border-top, #ff3e00);
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

		.connection--highlight {
			stroke: var(--traek-connection-highlight, #00d8ff);
			stroke-width: 2.5;
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

		input {
			flex: 1;
			background: transparent;
			border: none;
			color: white;
			padding: 12px;
			outline: none;
			font-size: 16px;
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

		.overlay-root {
			position: absolute;
			inset: 0;
			z-index: 80;
			pointer-events: none;
			display: flex;
			align-items: center;
			justify-content: center;
		}
	}
</style>
