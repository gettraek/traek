import type { Node, TraekEngineConfig } from '../TraekEngine.svelte';

/**
 * Viewport bounds in canvas pixel coordinates.
 */
export interface ViewportBounds {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
}

/**
 * Tracks which nodes are visible in the viewport + buffer zone.
 * Used for DOM virtualization to render only visible nodes.
 */
export class ViewportTracker {
	/** Buffer zone in pixels around viewport (e.g. 200px) */
	public bufferPx: number;

	private config: TraekEngineConfig;

	/**
	 * Memoized node map keyed on the nodes array identity + length.
	 * The map values are live node references, so position/height mutations on
	 * existing nodes do not invalidate the cache. Identity + length alone can go
	 * stale (e.g. delete-then-add via splice+push keeps identity and restores
	 * length), so the cache is additionally expired once per animation frame —
	 * same pattern as ViewportManager's #getContentBounds.
	 */

	private nodeMapCache: Map<string, Node> | null = null;
	private nodeMapCacheNodes: Node[] | null = null;
	private nodeMapCacheLength = -1;
	private nodeMapInvalidateRafId = 0;

	constructor(config: TraekEngineConfig, bufferPx: number = 200) {
		this.config = config;
		this.bufferPx = bufferPx;
	}

	/**
	 * Calculate viewport bounds in canvas pixel coordinates.
	 * Takes into account scale and offset.
	 */
	getViewportBounds(
		viewportEl: HTMLElement | null,
		scale: number,
		offset: { x: number; y: number }
	): ViewportBounds | null {
		if (!viewportEl) return null;

		const w = viewportEl.clientWidth;
		const h = viewportEl.clientHeight;
		if (w <= 0 || h <= 0) return null;

		// Convert viewport screen coords to canvas coords
		// Canvas coords = (screen - offset) / scale
		const minX = (0 - offset.x) / scale - this.bufferPx;
		const maxX = (w - offset.x) / scale + this.bufferPx;
		const minY = (0 - offset.y) / scale - this.bufferPx;
		const maxY = (h - offset.y) / scale + this.bufferPx;

		return { minX, maxX, minY, maxY };
	}

	/**
	 * Check if a node is within the viewport bounds.
	 * Node position is in grid units, height is in pixels.
	 */
	isNodeInViewport(node: Node, bounds: ViewportBounds): boolean {
		const step = this.config.gridStep;
		const nodePxX = (node.metadata?.x ?? 0) * step;
		const nodePxY = (node.metadata?.y ?? 0) * step;
		const nodeWidth = this.config.nodeWidth;
		const nodeHeight = node.metadata?.height ?? this.config.nodeHeightDefault;

		// AABB (axis-aligned bounding box) intersection test
		const nodeRight = nodePxX + nodeWidth;
		const nodeBottom = nodePxY + nodeHeight;

		return !(
			nodeRight < bounds.minX ||
			nodePxX > bounds.maxX ||
			nodeBottom < bounds.minY ||
			nodePxY > bounds.maxY
		);
	}

	/**
	 * Get all visible node IDs in the viewport + buffer.
	 * Respects collapsed nodes (does not include hidden descendants).
	 */
	getVisibleNodeIds(
		nodes: Node[],
		collapsedNodes: Set<string>,
		viewportEl: HTMLElement | null,
		scale: number,
		offset: { x: number; y: number }
	): Set<string> {
		const bounds = this.getViewportBounds(viewportEl, scale, offset);
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		if (!bounds) return new Set();

		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const visible = new Set<string>();
		// Skip the full ancestor walk entirely when nothing is collapsed
		const collapsedCache =
			collapsedNodes.size > 0 ? this.buildCollapsedCache(nodes, collapsedNodes) : null;

		for (const node of nodes) {
			// Skip thought nodes and collapsed descendants
			if (node.type === 'thought') continue;
			if (collapsedCache?.get(node.id)) continue;

			if (this.isNodeInViewport(node, bounds)) {
				visible.add(node.id);
			}
		}

		return visible;
	}

	/** Get (or rebuild) the memoized id → node map for the given nodes array. */
	private getNodeMap(nodes: Node[]): Map<string, Node> {
		if (
			this.nodeMapCache &&
			this.nodeMapCacheNodes === nodes &&
			this.nodeMapCacheLength === nodes.length
		) {
			return this.nodeMapCache;
		}
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const map = new Map(nodes.map((n) => [n.id, n]));
		this.nodeMapCache = map;
		this.nodeMapCacheNodes = nodes;
		this.nodeMapCacheLength = nodes.length;
		// In-place delete-then-add can keep array identity and restore length, so
		// expire the cache on the next animation frame (at most one rebuild per frame).
		// In non-browser environments (tests) requestAnimationFrame may be missing;
		// there the memo simply behaves as before.
		if (typeof requestAnimationFrame === 'function' && !this.nodeMapInvalidateRafId) {
			this.nodeMapInvalidateRafId = requestAnimationFrame(() => {
				this.nodeMapInvalidateRafId = 0;
				this.nodeMapCache = null;
				this.nodeMapCacheNodes = null;
				this.nodeMapCacheLength = -1;
			});
		}
		return map;
	}

	/**
	 * Build a cache of which nodes are in collapsed subtrees.
	 * A node is hidden if any ancestor in its primary parent chain is collapsed.
	 */
	private buildCollapsedCache(nodes: Node[], collapsedNodes: Set<string>): Map<string, boolean> {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const cache = new Map<string, boolean>();
		const nodeMap = this.getNodeMap(nodes);

		for (const node of nodes) {
			cache.set(node.id, this.isInCollapsedSubtree(node.id, nodeMap, collapsedNodes));
		}

		return cache;
	}

	/**
	 * Check if a node should be hidden because one of its ancestors is collapsed.
	 */
	private isInCollapsedSubtree(
		nodeId: string,
		nodeMap: Map<string, Node>,
		collapsedNodes: Set<string>
	): boolean {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const visited = new Set<string>();
		let current = nodeMap.get(nodeId);

		while (current) {
			if (visited.has(current.id)) return false;
			visited.add(current.id);

			const primaryParentId = current.parentIds[0];
			if (!primaryParentId) return false;
			if (collapsedNodes.has(primaryParentId)) return true;

			current = nodeMap.get(primaryParentId);
		}

		return false;
	}
}
