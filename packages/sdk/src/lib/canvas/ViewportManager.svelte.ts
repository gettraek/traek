import type { TraekEngineConfig } from '../TraekEngine.svelte';
import type { Node } from '../TraekEngine.svelte';

/**
 * Manages viewport state: scale, offset, centering animations, and clamping.
 */
export class ViewportManager {
	scale = $state(1);
	offset = $state({ x: 0, y: 0 });
	viewportEl = $state<HTMLElement | null>(null);
	viewportResizeVersion = $state(0);

	#focusAnimationId = 0;
	#viewportChangeTimeoutId = 0;
	#config: TraekEngineConfig;
	#onViewportChange?: (viewport: { scale: number; offset: { x: number; y: number } }) => void;

	constructor(
		config: TraekEngineConfig,
		initialScale?: number,
		initialOffset?: { x: number; y: number },
		onViewportChange?: (viewport: { scale: number; offset: { x: number; y: number } }) => void
	) {
		this.#config = config;
		this.#onViewportChange = onViewportChange;
		this.scale = initialScale ?? 1;
		this.offset = { x: initialOffset?.x ?? 0, y: initialOffset?.y ?? 0 };
	}

	/** Clamp pan offset so the nodes' bounding box cannot be panned fully out of view. */
	clampOffset(nodes: Node[]) {
		if (!this.viewportEl) return;
		const laidOut = nodes.filter((n) => n.type !== 'thought');
		if (laidOut.length === 0) return;
		const w = this.viewportEl.clientWidth;
		const h = this.viewportEl.clientHeight;
		if (w <= 0 || h <= 0) return;
		const defaultH = this.#config.nodeHeightDefault;
		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;
		const step = this.#config.gridStep;
		for (const node of laidOut) {
			const xPx = (node.metadata?.x ?? 0) * step;
			const yPx = (node.metadata?.y ?? 0) * step;
			const nodeH = node.metadata?.height ?? defaultH;
			minX = Math.min(minX, xPx);
			maxX = Math.max(maxX, xPx + this.#config.nodeWidth);
			minY = Math.min(minY, yPx);
			maxY = Math.max(maxY, yPx + nodeH);
		}
		const minOffsetX = -maxX * this.scale;
		const maxOffsetX = w - minX * this.scale;
		const minOffsetY = -maxY * this.scale;
		const maxOffsetY = h - minY * this.scale;
		this.offset.x = Math.min(maxOffsetX, Math.max(minOffsetX, this.offset.x));
		this.offset.y = Math.min(maxOffsetY, Math.max(minOffsetY, this.offset.y));
	}

	#easeOutCubic(t: number): number {
		return 1 - (1 - t) ** 3;
	}

	/** Pan canvas so the given node is centered in the viewport, with a smooth transition. */
	centerOnNode(node: Node, nodes: Node[], onComplete?: () => void) {
		const nodeId = node.id;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				const latest = nodes.find((n: Node) => n.id === nodeId);
				if (!latest || !this.viewportEl) return;
				const w = this.viewportEl.clientWidth;
				const h = this.viewportEl.clientHeight;
				if (w <= 0 || h <= 0) return;
				const step = this.#config.gridStep;
				const nodeX = (latest.metadata?.x ?? 0) * step;
				const nodeY = (latest.metadata?.y ?? 0) * step;
				const nodeW = this.#config.nodeWidth;
				const nodeH = latest.metadata?.height ?? this.#config.nodeHeightDefault;
				const centerX = nodeX + nodeW / 2;
				const centerY = nodeY + nodeH / 2;
				const targetX = w / 2 - centerX * this.scale;
				const targetY = h / 2 - centerY * this.scale;

				const startX = this.offset.x;
				const startY = this.offset.y;
				const startTime = performance.now();

				const tick = (now: number) => {
					const elapsed = now - startTime;
					const t = Math.min(elapsed / this.#config.focusDurationMs, 1);
					const eased = this.#easeOutCubic(t);
					this.offset.x = startX + (targetX - startX) * eased;
					this.offset.y = startY + (targetY - startY) * eased;
					if (t >= 1) {
						this.clampOffset(nodes);
						onComplete?.();
					}
					if (t < 1) {
						this.#focusAnimationId = requestAnimationFrame(tick);
					}
				};
				cancelAnimationFrame(this.#focusAnimationId);
				this.#focusAnimationId = requestAnimationFrame(tick);
			});
		});
	}

	notifyViewportChange() {
		this.#onViewportChange?.({ scale: this.scale, offset: { x: this.offset.x, y: this.offset.y } });
	}

	scheduleViewportChange() {
		if (this.#viewportChangeTimeoutId) clearTimeout(this.#viewportChangeTimeoutId);
		this.#viewportChangeTimeoutId = window.setTimeout(() => {
			this.#viewportChangeTimeoutId = 0;
			this.notifyViewportChange();
		}, 300);
	}

	/** Fit all nodes into view with optional padding. Centers and scales to show entire tree. */
	fitAll(nodes: Node[], padding: number = 50) {
		if (!this.viewportEl) return;
		const laidOut = nodes.filter((n) => n.type !== 'thought');
		if (laidOut.length === 0) return;

		const w = this.viewportEl.clientWidth;
		const h = this.viewportEl.clientHeight;
		if (w <= 0 || h <= 0) return;

		const defaultH = this.#config.nodeHeightDefault;
		const step = this.#config.gridStep;

		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;

		for (const node of laidOut) {
			const xPx = (node.metadata?.x ?? 0) * step;
			const yPx = (node.metadata?.y ?? 0) * step;
			const nodeH = node.metadata?.height ?? defaultH;
			minX = Math.min(minX, xPx);
			maxX = Math.max(maxX, xPx + this.#config.nodeWidth);
			minY = Math.min(minY, yPx);
			maxY = Math.max(maxY, yPx + nodeH);
		}

		const contentW = maxX - minX;
		const contentH = maxY - minY;

		// Calculate scale to fit with padding
		const scaleX = (w - padding * 2) / contentW;
		const scaleY = (h - padding * 2) / contentH;
		const targetScale = Math.min(scaleX, scaleY, this.#config.scaleMax);
		const clampedScale = Math.max(targetScale, this.#config.scaleMin);

		this.scale = clampedScale;

		// Center the content
		const centerX = minX + contentW / 2;
		const centerY = minY + contentH / 2;
		this.offset.x = w / 2 - centerX * this.scale;
		this.offset.y = h / 2 - centerY * this.scale;

		this.clampOffset(nodes);
		this.notifyViewportChange();
	}

	destroy() {
		cancelAnimationFrame(this.#focusAnimationId);
		if (this.#viewportChangeTimeoutId) clearTimeout(this.#viewportChangeTimeoutId);
	}
}
