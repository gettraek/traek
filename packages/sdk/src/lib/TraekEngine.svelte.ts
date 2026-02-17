import type { Component } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import { conversationSnapshotSchema, type ConversationSnapshot } from '$lib/persistence/schemas';
import { searchNodes as searchNodesUtil } from '$lib/search/searchUtils';

export type NodeStatus = 'streaming' | 'done' | 'error';

export enum BasicNodeTypes {
	TEXT = 'text',
	CODE = 'code',
	THOUGHT = 'thought'
}

export interface Node {
	id: string;
	parentIds: string[];
	role: 'user' | 'assistant' | 'system';
	type: BasicNodeTypes | string;
	status?: NodeStatus;
	errorMessage?: string;
	createdAt?: number;
	metadata?: {
		x: number;
		y: number;
		height?: number;
		[key: string]: unknown;
	};
	data?: unknown;
}

/** Check whether adding an edge from parentId → childId would create a cycle. */
export function wouldCreateCycle(nodes: Node[], parentId: string, childId: string): boolean {
	// If parentId === childId, it's a self-loop
	if (parentId === childId) return true;
	// DFS from parentId upward: if we reach childId, it would create a cycle
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const visited = new Set<string>();
	const stack = [parentId];
	while (stack.length > 0) {
		const current = stack.pop()!;
		if (current === childId) return true;
		if (visited.has(current)) continue;
		visited.add(current);
		const node = nodes.find((n) => n.id === current);
		if (node) {
			for (const pid of node.parentIds) {
				stack.push(pid);
			}
		}
	}
	return false;
}

export type CustomTraekNode = Node & {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: Component<any>;
	props?: Record<string, unknown>;
};

/** Props every custom node component receives from the canvas. Use this to type your component's $props(). */
export type TraekNodeComponentProps = {
	node: Node;
	engine: TraekEngine;
	isActive: boolean;
};

/**
 * Map node.type (e.g. 'debugNode', 'image') to Svelte component for custom nodes.
 * Use with a union of your custom types for type-safe keys: NodeComponentMap<'debugNode' | 'image'>.
 */
export type NodeComponentMap<T extends string = string> = Partial<
	Record<T, Component<TraekNodeComponentProps & Record<string, unknown>>>
>;

export interface MessageNode extends Node {
	content: string;
}

/** Payload for bulk add; id optional (for saved projects). Parents must appear earlier in list or be already in engine. */
export interface AddNodePayload {
	id?: string;
	parentIds: string[];
	content: string;
	role: 'user' | 'assistant' | 'system';
	type?: MessageNode['type'];
	status?: NodeStatus;
	errorMessage?: string;
	createdAt?: number;
	metadata?: Partial<NonNullable<MessageNode['metadata']>>;
	data?: unknown;
}

export interface TraekEngineConfig {
	focusDurationMs: number;
	zoomSpeed: number;
	zoomLineModeBoost: number;
	scaleMin: number;
	scaleMax: number;
	nodeWidth: number;
	nodeHeightDefault: number;
	streamIntervalMs: number;
	rootNodeOffsetX: number;
	rootNodeOffsetY: number;
	layoutGapX: number;
	layoutGapY: number;
	heightChangeThreshold: number;
	/** Pixels per grid unit; positions (metadata.x, metadata.y) are in grid units. */
	gridStep: number;
}

export const DEFAULT_TRACK_ENGINE_CONFIG: TraekEngineConfig = {
	focusDurationMs: 280,
	zoomSpeed: 0.004,
	zoomLineModeBoost: 20,
	scaleMin: 0.05,
	scaleMax: 8,
	nodeWidth: 350,
	nodeHeightDefault: 100,
	streamIntervalMs: 30,
	rootNodeOffsetX: -175,
	rootNodeOffsetY: -50,
	layoutGapX: 35,
	layoutGapY: 50,
	heightChangeThreshold: 5,
	gridStep: 20
};

export class TraekEngine {
	nodes = $state<Node[]>([]);
	activeNodeId = $state<string | null>(null);
	/** Set of collapsed node IDs. When a node is collapsed, its descendants are hidden from view. */
	collapsedNodes = $state(new SvelteSet<string>());
	/** Search state: current query */
	searchQuery = $state<string>('');
	/** Search state: array of matching node IDs */
	searchMatches = $state<string[]>([]);
	/** Search state: current match index (0-based) */
	currentSearchIndex = $state<number>(0);
	private config: TraekEngineConfig;
	private pendingHeightLayoutRafId: number | null = null;
	/** Maps node ID → index in nodes array for O(1) lookup. */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	private nodeIndexMap = new Map<string, number>();
	/** Maps primary parent ID (or null for roots) → child node IDs. */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	private childrenIdMap = new Map<string | null, string[]>();

	/** Lifecycle callback: fired after a node is added. Wired by TraekCanvas when a registry is present. */
	public onNodeCreated?: (node: Node) => void;
	/** Lifecycle callback: fired before a node is removed. Wired by TraekCanvas when a registry is present. */
	public onNodeDeleting?: (node: Node) => void;
	/** Lifecycle callback: fired after node(s) are deleted. Provides count and a restore function for undo. */
	public onNodeDeleted?: (deletedCount: number, restore: () => void) => void;

	/** Buffer for last deleted nodes, enabling undo. */
	private lastDeletedBuffer: {
		nodes: Node[];
		activeNodeId: string | null;
		timestamp: number;
	} | null = null;
	private deleteUndoTimeoutId: ReturnType<typeof setTimeout> = 0 as unknown as ReturnType<
		typeof setTimeout
	>;

	constructor(config?: Partial<TraekEngineConfig>) {
		this.config = { ...DEFAULT_TRACK_ENGINE_CONFIG, ...config };
	}

	/** O(1) node lookup by ID. Returns the reactive proxy from the nodes array. */
	getNode(id: string): Node | undefined {
		const idx = this.nodeIndexMap.get(id);
		if (idx === undefined) return undefined;
		return this.nodes[idx];
	}

	/** Get children of a node by primary parent (for layout). Returns reactive proxies. */
	getChildren(parentId: string | null): Node[] {
		const ids = this.childrenIdMap.get(parentId);
		if (!ids || ids.length === 0) return [];
		const result: Node[] = [];
		for (const id of ids) {
			const idx = this.nodeIndexMap.get(id);
			if (idx !== undefined) result.push(this.nodes[idx]);
		}
		return result;
	}

	/** Rebuild nodeIndexMap from the nodes array. */
	private rebuildNodeIndexMap(): void {
		this.nodeIndexMap.clear();
		for (let i = 0; i < this.nodes.length; i++) {
			this.nodeIndexMap.set(this.nodes[i].id, i);
		}
	}

	/** Rebuild childrenIdMap from scratch. Used after bulk mutations. */
	private rebuildChildrenIdMap(): void {
		this.childrenIdMap.clear();
		for (const n of this.nodes) {
			this.addToChildrenIdMap(n.id, n.parentIds[0] ?? null);
		}
	}

	/** Add a node ID to childrenIdMap under its primary parent. */
	private addToChildrenIdMap(nodeId: string, primaryParentId: string | null): void {
		const list = this.childrenIdMap.get(primaryParentId) ?? [];
		list.push(nodeId);
		this.childrenIdMap.set(primaryParentId, list);
	}

	/** Remove a node ID from childrenIdMap. */
	private removeFromChildrenIdMap(nodeId: string, primaryParentId: string | null): void {
		const list = this.childrenIdMap.get(primaryParentId);
		if (list) {
			const idx = list.indexOf(nodeId);
			if (idx !== -1) list.splice(idx, 1);
			if (list.length === 0) this.childrenIdMap.delete(primaryParentId);
		}
	}

	/** Sync maps after a node is pushed to the end of the nodes array. */
	private syncMapsAfterPush(node: Node): void {
		this.nodeIndexMap.set(node.id, this.nodes.length - 1);
		this.addToChildrenIdMap(node.id, node.parentIds[0] ?? null);
	}

	/** Rebuild both maps from scratch. Call after bulk array reassignment. */
	private rebuildMaps(): void {
		this.rebuildNodeIndexMap();
		this.rebuildChildrenIdMap();
	}

	// Der "Context Path" - Gibt nur die relevanten Knoten für den aktuellen Branch zurück.
	// Follows the primary parent (first in parentIds) for a single linear path.
	contextPath = $derived(() => {
		if (!this.activeNodeId) return [];
		const path: Node[] = [];
		let current = this.getNode(this.activeNodeId);

		while (current) {
			path.unshift(current);
			const primaryParentId = current.parentIds[0];
			current = primaryParentId ? this.getNode(primaryParentId) : undefined;
		}
		return path;
	});

	/** Set by addNode when options.autofocus is true; canvas should center on this node and then clear. */
	public pendingFocusNodeId = $state<string | null>(null);

	addCustomNode(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		component: Component<any>,
		props?: Record<string, unknown>,
		role: 'user' | 'assistant' | 'system' = 'user',
		options: {
			type?: Node['type'];
			parentIds?: string[];
			autofocus?: boolean;
			x?: number;
			y?: number;
			data?: unknown;
			/** When true, skip layout for this add; call flushLayoutFromRoot() after a batch. */
			deferLayout?: boolean;
		} = {}
	) {
		const parentIds = options.parentIds ?? (this.activeNodeId ? [this.activeNodeId] : []);
		const hasExplicitPosition = options.x !== undefined || options.y !== undefined;
		const newNode: CustomTraekNode = {
			component,
			props,
			id: crypto.randomUUID(),
			parentIds,
			role,
			type: options.type ?? 'text',
			createdAt: Date.now(),
			metadata: {
				x: options.x ?? 0,
				y: options.y ?? 0,
				height: this.config.nodeHeightDefault,
				...(hasExplicitPosition && { manualPosition: true })
			},
			data: options.data
		};

		this.nodes.push(newNode);
		this.syncMapsAfterPush(newNode);
		// New node is active unless it's a thought (keep parent/current active so the main new node stays selected)
		if (options.type !== 'thought') {
			this.activeNodeId = newNode.id;
		}

		const primaryParentId = parentIds[0];
		if (primaryParentId && !options.deferLayout) {
			this.layoutChildren(primaryParentId);
		}

		this.onNodeCreated?.(newNode);

		if (options.autofocus && typeof window !== 'undefined') {
			requestAnimationFrame(() => {
				this.pendingFocusNodeId = newNode.id;
			});
		}

		return newNode;
	}

	addNode(
		content: string,
		role: 'user' | 'assistant' | 'system',
		options: {
			type?: Node['type'];
			parentIds?: string[];
			autofocus?: boolean;
			x?: number;
			y?: number;
			data?: unknown;
			/** When true, skip layout for this add; call flushLayoutFromRoot() after a batch. */
			deferLayout?: boolean;
		} = {}
	) {
		const parentIds = options.parentIds ?? (this.activeNodeId ? [this.activeNodeId] : []);
		const hasExplicitPosition = options.x !== undefined || options.y !== undefined;
		const newNode: MessageNode = {
			id: crypto.randomUUID(),
			parentIds,
			role,
			content,
			type: options.type ?? 'text',
			createdAt: Date.now(),
			metadata: {
				x: options.x ?? 0,
				y: options.y ?? 0,
				height: this.config.nodeHeightDefault,
				...(hasExplicitPosition && { manualPosition: true })
			},
			data: options.data
		};

		this.nodes.push(newNode);
		this.syncMapsAfterPush(newNode);
		// New node is active unless it's a thought (keep parent/current active so the main new node stays selected)
		if (options.type !== 'thought') {
			this.activeNodeId = newNode.id;
		}

		const primaryParentId = parentIds[0];
		if (primaryParentId && !options.deferLayout) {
			this.layoutChildren(primaryParentId);
		}

		this.onNodeCreated?.(newNode);

		if (options.autofocus && typeof window !== 'undefined') {
			requestAnimationFrame(() => {
				this.pendingFocusNodeId = newNode.id;
			});
		}

		return newNode;
	}

	/**
	 * Add many nodes at once (e.g. loading a saved project). Uses one layout pass.
	 * Payloads may include id for round-trip; parentId must reference an id in the same batch or an existing node.
	 * Order is normalized so parents are added before children.
	 */
	addNodes(payloads: AddNodePayload[]): MessageNode[] {
		if (payloads.length === 0) return [];

		const defaultH = this.config.nodeHeightDefault;
		const withIds = payloads.map((p) => ({
			...p,
			id: p.id ?? crypto.randomUUID()
		}));

		// Topological sort: ensure all parents are added before children
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const added = new Set<string>(this.nodes.map((n) => n.id));
		const sorted: typeof withIds = [];
		let prevSize = 0;
		while (sorted.length < withIds.length) {
			for (const p of withIds) {
				if (added.has(p.id!)) continue;
				const allParentsIn = p.parentIds.length === 0 || p.parentIds.every((pid) => added.has(pid));
				if (allParentsIn) {
					sorted.push(p);
					added.add(p.id!);
				}
			}
			if (sorted.length === prevSize) {
				const remaining = withIds.filter((p) => !added.has(p.id!));
				sorted.push(...remaining);
				break;
			}
			prevSize = sorted.length;
		}

		const newNodes: MessageNode[] = sorted.map((p) => {
			const hasExplicitPosition =
				typeof p.metadata?.x === 'number' || typeof p.metadata?.y === 'number';
			return {
				id: p.id!,
				parentIds: p.parentIds,
				role: p.role,
				content: p.content,
				type: p.type ?? 'text',
				status: p.status,
				errorMessage: p.errorMessage,
				createdAt: p.createdAt ?? Date.now(),
				metadata: {
					x: p.metadata?.x ?? 0,
					y: p.metadata?.y ?? 0,
					height: p.metadata?.height ?? defaultH,
					...p.metadata,
					...(hasExplicitPosition && { manualPosition: true })
				},
				data: p.data
			};
		});

		this.nodes = [...this.nodes, ...newNodes];
		this.rebuildMaps();
		for (const n of newNodes) {
			this.onNodeCreated?.(n);
		}
		const firstRoot = newNodes.find((n) => n.parentIds.length === 0);
		if (firstRoot) this.activeNodeId = firstRoot.id;

		this.flushLayoutFromRoot();
		return newNodes;
	}

	/** Focuses on a node and centers the canvas on it. */
	focusOnNode(nodeId: string) {
		if (this.nodeIndexMap.has(nodeId)) {
			this.pendingFocusNodeId = nodeId;
		}
	}

	/** Run layout from every root (no parents). Use after adding nodes with deferLayout. */
	flushLayoutFromRoot() {
		const roots = this.getChildren(null);
		const childrenMap = this.buildChildrenMap();
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const subtreeHeightCache = new Map<string, number>();
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const subtreeWidthCache = new Map<string, number>();
		for (const root of roots) {
			this.fillSubtreeHeightCache(root.id, childrenMap, subtreeHeightCache);
			this.fillSubtreeWidthCache(root.id, childrenMap, subtreeWidthCache);
		}
		for (const root of roots) {
			this.layoutChildrenWithCache(root.id, childrenMap, subtreeHeightCache, subtreeWidthCache);
		}
	}

	/**
	 * Build a map from parent id → children.
	 * For layout purposes, each node is assigned to its primary parent (first in parentIds).
	 * Nodes with no parents are keyed under null.
	 */
	private buildChildrenMap(): Map<string | null, Node[]> {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const map = new Map<string | null, Node[]>();
		for (const n of this.nodes) {
			const key = n.parentIds[0] ?? null;
			const list = map.get(key) ?? [];
			list.push(n);
			map.set(key, list);
		}
		return map;
	}

	private fillSubtreeHeightCache(
		nodeId: string,
		childrenMap: Map<string | null, Node[]>,
		cache: Map<string, number>
	): void {
		const children = childrenMap.get(nodeId) ?? [];
		const otherChildren = children.filter((c) => c.type !== 'thought');
		for (const c of otherChildren) this.fillSubtreeHeightCache(c.id, childrenMap, cache);
		const node = this.getNode(nodeId);
		if (!node) return;
		const step = this.config.gridStep;
		const defaultH = this.config.nodeHeightDefault;
		const gapYGrid = this.config.layoutGapY / step;
		const nodeHGrid = (node.metadata?.height ?? defaultH) / step;
		if (otherChildren.length === 0) {
			cache.set(nodeId, nodeHGrid);
			return;
		}
		const maxChildH = Math.max(0, ...otherChildren.map((c) => cache.get(c.id) ?? 0));
		cache.set(nodeId, nodeHGrid + gapYGrid + maxChildH);
	}

	private fillSubtreeWidthCache(
		nodeId: string,
		childrenMap: Map<string | null, Node[]>,
		cache: Map<string, number>
	): void {
		const children = childrenMap.get(nodeId) ?? [];
		const otherChildren = children.filter((c) => c.type !== 'thought');
		for (const c of otherChildren) this.fillSubtreeWidthCache(c.id, childrenMap, cache);
		const node = this.getNode(nodeId);
		if (!node) return;
		const step = this.config.gridStep;
		const nodeWidthGrid = this.config.nodeWidth / step;
		const gapXGrid = this.config.layoutGapX / step;
		if (otherChildren.length === 0) {
			cache.set(nodeId, nodeWidthGrid);
			return;
		}
		const total =
			otherChildren.reduce((sum, c) => sum + (cache.get(c.id) ?? 0) + gapXGrid, 0) - gapXGrid;
		cache.set(nodeId, total);
	}

	private layoutChildrenWithCache(
		parentId: string,
		childrenMap: Map<string | null, Node[]>,
		subtreeHeightCache: Map<string, number>,
		subtreeWidthCache: Map<string, number>
	): void {
		const parent = this.getNode(parentId);
		if (!parent) return;
		const children = childrenMap.get(parentId) ?? [];
		const otherChildren = children.filter((c) => c.type !== 'thought');
		if (otherChildren.length === 0) return;
		const step = this.config.gridStep;
		const gapXGrid = this.config.layoutGapX / step;
		const gapYGrid = this.config.layoutGapY / step;
		const defaultH = this.config.nodeHeightDefault;
		const nodeWidthGrid = this.config.nodeWidth / step;
		const parentX = parent.metadata?.x ?? 0;
		const parentY = parent.metadata?.y ?? 0;
		const parentHeightGrid = (parent.metadata?.height ?? defaultH) / step;
		const totalRowWidth =
			otherChildren.reduce(
				(sum, child) => sum + (subtreeWidthCache.get(child.id) ?? 0) + gapXGrid,
				0
			) - gapXGrid;
		const parentCenterX = parentX + nodeWidthGrid / 2;
		const childY = parentY + parentHeightGrid + gapYGrid;
		let currentX = parentCenterX - totalRowWidth / 2;
		for (const child of otherChildren) {
			if (!child.metadata) child.metadata = { x: 0, y: 0 };
			const childSubtreeW = subtreeWidthCache.get(child.id) ?? 0;
			const offsetInSlot = (childSubtreeW - nodeWidthGrid) / 2;
			if (!child.metadata.manualPosition) {
				child.metadata.x = Math.round(currentX + offsetInSlot);
				child.metadata.y = Math.round(childY);
			}
			this.layoutChildrenWithCache(child.id, childrenMap, subtreeHeightCache, subtreeWidthCache);
			currentX += childSubtreeW + gapXGrid;
		}
	}

	clearPendingFocus() {
		this.pendingFocusNodeId = null;
	}

	updateNode(nodeId: string, updates: Partial<MessageNode>) {
		const node = this.getNode(nodeId);
		if (node) {
			Object.assign(node, updates);
		}
	}

	updateNodeHeight(nodeId: string, height: number) {
		const node = this.getNode(nodeId);
		if (!node) return;
		if (!node.metadata) node.metadata = { x: 0, y: 0 };

		const currentHeight = node.metadata.height ?? this.config.nodeHeightDefault;
		if (Math.abs(currentHeight - height) < this.config.heightChangeThreshold) return;

		node.metadata.height = height;

		if (this.pendingHeightLayoutRafId == null) {
			this.pendingHeightLayoutRafId = requestAnimationFrame(() => {
				this.pendingHeightLayoutRafId = null;
				this.flushLayoutFromRoot();
			});
		}
	}

	deleteNode(nodeId: string) {
		const index = this.nodeIndexMap.get(nodeId);
		if (index !== undefined) {
			const node = this.nodes[index];
			if (node) {
				this.onNodeDeleting?.(node);
				this.storeDeletedBuffer([node]);
			}
			const primaryParentId = node?.parentIds[0] ?? null;
			this.nodes.splice(index, 1);
			this.nodeIndexMap.delete(nodeId);
			this.removeFromChildrenIdMap(nodeId, primaryParentId);
			this.rebuildNodeIndexMap();
			if (this.activeNodeId === nodeId) {
				this.activeNodeId = null;
			}
			this.onNodeDeleted?.(1, () => this.restoreDeleted());
		}
	}

	/** Count visible descendants of a node via BFS (excludes thought nodes). */
	getDescendantCount(nodeId: string): number {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const descendants = new Set<string>();
		const queue = [nodeId];
		while (queue.length > 0) {
			const currentId = queue.shift()!;
			const children = this.getChildren(currentId);
			for (const child of children) {
				if (!descendants.has(child.id)) {
					if (child.type !== 'thought') {
						descendants.add(child.id);
					}
					queue.push(child.id);
				}
			}
		}
		return descendants.size;
	}

	/**
	 * Get all descendant nodes via BFS (excludes thought nodes). Returns reactive proxies.
	 */
	getDescendants(nodeId: string): Node[] {
		const descendants: Node[] = [];
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const visited = new Set<string>();
		const queue = [nodeId];
		while (queue.length > 0) {
			const currentId = queue.shift()!;
			const children = this.getChildren(currentId);
			for (const child of children) {
				if (!visited.has(child.id)) {
					if (child.type !== 'thought') {
						visited.add(child.id);
						descendants.push(child);
					}
					queue.push(child.id);
				}
			}
		}
		return descendants;
	}

	/** Delete a node and all its descendants. Navigate to the deleted node's first parent if needed. */
	deleteNodeAndDescendants(nodeId: string) {
		// Collect all descendants via BFS
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const toDelete = new Set<string>([nodeId]);
		const queue = [nodeId];
		while (queue.length > 0) {
			const currentId = queue.shift()!;
			for (const n of this.nodes) {
				if (n.parentIds.includes(currentId) && !toDelete.has(n.id)) {
					toDelete.add(n.id);
					queue.push(n.id);
				}
			}
		}

		// Store deleted nodes for undo before firing callbacks
		const deletedNodes = this.nodes.filter((n) => toDelete.has(n.id));
		this.storeDeletedBuffer(deletedNodes);

		// Fire onNodeDeleting for each
		for (const id of toDelete) {
			const node = this.getNode(id);
			if (node) this.onNodeDeleting?.(node);
		}

		// Find the deleted node's first parent before removal (for navigation)
		const deletedNode = this.getNode(nodeId);
		const firstParentId = deletedNode?.parentIds[0] ?? null;

		// Clean up parentIds references on surviving nodes
		for (const n of this.nodes) {
			if (!toDelete.has(n.id)) {
				const filtered = n.parentIds.filter((pid) => !toDelete.has(pid));
				if (filtered.length !== n.parentIds.length) {
					n.parentIds = filtered;
				}
			}
		}

		// Remove all in one pass
		this.nodes = this.nodes.filter((n) => !toDelete.has(n.id));
		this.rebuildMaps();

		// Navigate if activeNodeId was deleted
		if (this.activeNodeId && toDelete.has(this.activeNodeId)) {
			if (firstParentId && this.nodeIndexMap.has(firstParentId)) {
				this.activeNodeId = firstParentId;
			} else {
				this.activeNodeId = null;
			}
		}

		this.flushLayoutFromRoot();

		const count = toDelete.size;
		this.onNodeDeleted?.(count, () => this.restoreDeleted());
	}

	/** Store deleted nodes in the undo buffer with a 30s expiry. */
	private storeDeletedBuffer(nodes: Node[]): void {
		clearTimeout(this.deleteUndoTimeoutId);
		this.lastDeletedBuffer = {
			nodes: nodes.map((n) => structuredClone($state.snapshot(n))),
			activeNodeId: this.activeNodeId,
			timestamp: Date.now()
		};
		this.deleteUndoTimeoutId = setTimeout(() => {
			this.lastDeletedBuffer = null;
		}, 30_000);
	}

	/** Restore the last deleted nodes if the undo buffer is still valid. */
	restoreDeleted(): boolean {
		if (!this.lastDeletedBuffer) return false;
		const elapsed = Date.now() - this.lastDeletedBuffer.timestamp;
		if (elapsed > 30_000) {
			this.lastDeletedBuffer = null;
			return false;
		}

		const { nodes: restoredNodes, activeNodeId } = this.lastDeletedBuffer;
		clearTimeout(this.deleteUndoTimeoutId);
		this.lastDeletedBuffer = null;

		// Re-add the nodes
		this.nodes = [...this.nodes, ...restoredNodes];
		this.rebuildMaps();

		// Restore active node
		if (activeNodeId && this.nodeIndexMap.has(activeNodeId)) {
			this.activeNodeId = activeNodeId;
		}

		this.flushLayoutFromRoot();
		return true;
	}

	/** Create a sibling copy of a node with the same parents, role, type, and content. */
	duplicateNode(nodeId: string): Node | null {
		const source = this.getNode(nodeId);
		if (!source) return null;

		const step = this.config.gridStep;
		const offsetGrid = this.config.layoutGapX / step;
		const sourceX = source.metadata?.x ?? 0;
		const sourceY = source.metadata?.y ?? 0;

		// Check if it's a MessageNode (has content)
		const sourceMsg = source as MessageNode;
		if (typeof sourceMsg.content === 'string') {
			const newNode = this.addNode(sourceMsg.content, source.role, {
				type: source.type,
				parentIds: [...source.parentIds],
				x: sourceX + offsetGrid,
				y: sourceY,
				data: source.data != null ? structuredClone(source.data) : undefined
			});
			// Clear manual position so layout can reposition it properly
			if (newNode.metadata) {
				delete newNode.metadata.manualPosition;
			}
			const primaryParentId = source.parentIds[0];
			if (primaryParentId) {
				this.layoutChildren(primaryParentId);
			}
			return newNode;
		}

		// Non-message node: create manually
		const newNode: Node = {
			id: crypto.randomUUID(),
			parentIds: [...source.parentIds],
			role: source.role,
			type: source.type,
			createdAt: Date.now(),
			metadata: {
				x: sourceX + offsetGrid,
				y: sourceY,
				height: source.metadata?.height ?? this.config.nodeHeightDefault
			},
			data: source.data != null ? structuredClone(source.data) : undefined
		};

		this.nodes.push(newNode);
		this.syncMapsAfterPush(newNode);
		this.activeNodeId = newNode.id;
		this.onNodeCreated?.(newNode);

		const primaryParentId = source.parentIds[0];
		if (primaryParentId) {
			this.layoutChildren(primaryParentId);
		}

		return newNode;
	}

	/** Move a node by (dx, dy) in canvas pixels; converts to grid and re-layouts subtree. */
	moveNodeAndDescendants(nodeId: string, dx: number, dy: number) {
		const node = this.getNode(nodeId);
		if (!node) return;
		if (!node.metadata) node.metadata = { x: 0, y: 0 };
		const step = this.config.gridStep;
		node.metadata.x = (node.metadata.x ?? 0) + dx / step;
		node.metadata.y = (node.metadata.y ?? 0) + dy / step;
		node.metadata.manualPosition = true;
		this.layoutChildren(nodeId);
	}

	/**
	 * Set a node's position from canvas pixel coordinates (e.g. drag).
	 * When snapThreshold (pixels) is set, snaps to grid when within that distance.
	 */
	setNodePosition(nodeId: string, xPx: number, yPx: number, snapThresholdPx?: number) {
		const node = this.getNode(nodeId);
		if (!node) return;
		if (!node.metadata) node.metadata = { x: 0, y: 0 };
		const step = this.config.gridStep;
		let xGrid = xPx / step;
		let yGrid = yPx / step;
		if (snapThresholdPx != null && snapThresholdPx > 0) {
			const thresholdGrid = snapThresholdPx / step;
			const snapX = Math.round(xGrid);
			const snapY = Math.round(yGrid);
			if (Math.abs(xGrid - snapX) <= thresholdGrid) xGrid = snapX;
			if (Math.abs(yGrid - snapY) <= thresholdGrid) yGrid = snapY;
		}
		node.metadata.x = xGrid;
		node.metadata.y = yGrid;
		node.metadata.manualPosition = true;
		this.layoutChildren(nodeId);
	}

	/** Snap a node's position to integer grid (e.g. on drop). Re-layouts subtree. */
	snapNodeToGrid(nodeId: string) {
		const node = this.getNode(nodeId);
		if (!node) return;
		if (!node.metadata) node.metadata = { x: 0, y: 0 };
		node.metadata.x = Math.round(node.metadata.x ?? 0);
		node.metadata.y = Math.round(node.metadata.y ?? 0);
		this.layoutChildren(nodeId);
	}

	/** Subtree width in grid units: width of the horizontal row of children. */
	private getSubtreeLayoutWidth(nodeId: string): number {
		if (!this.nodeIndexMap.has(nodeId)) return 0;
		const step = this.config.gridStep;
		const nodeWidthGrid = this.config.nodeWidth / step;
		const children = this.getChildren(nodeId).filter((c) => c.type !== 'thought');
		if (children.length === 0) return nodeWidthGrid;
		const gapXGrid = this.config.layoutGapX / step;
		const total =
			children.reduce((sum, c) => sum + this.getSubtreeLayoutWidth(c.id) + gapXGrid, 0) - gapXGrid;
		return total;
	}

	/** Subtree height in grid units: node on top, then gap, then row of children (max of their subtree heights). */
	private getSubtreeLayoutHeight(nodeId: string): number {
		const node = this.getNode(nodeId);
		if (!node) return 0;
		const step = this.config.gridStep;
		const defaultH = this.config.nodeHeightDefault;
		const gapYGrid = this.config.layoutGapY / step;
		const nodeHGrid = (node.metadata?.height ?? defaultH) / step;
		const children = this.getChildren(nodeId).filter((c) => c.type !== 'thought');
		if (children.length === 0) return nodeHGrid;
		const maxChildHeight = Math.max(0, ...children.map((c) => this.getSubtreeLayoutHeight(c.id)));
		return nodeHGrid + gapYGrid + maxChildHeight;
	}

	/**
	 * Layout: parent on top, children in a row below, siblings left/right.
	 * Children share the same Y (below parent); X is centered under parent and spread horizontally.
	 */
	layoutChildren(parentId: string) {
		const parent = this.getNode(parentId);
		if (!parent) return;

		const children = this.getChildren(parentId);
		if (children.length === 0) return;

		const step = this.config.gridStep;
		const gapXGrid = this.config.layoutGapX / step;
		const gapYGrid = this.config.layoutGapY / step;
		const defaultH = this.config.nodeHeightDefault;
		const nodeWidthGrid = this.config.nodeWidth / step;
		const parentX = parent.metadata?.x ?? 0;
		const parentY = parent.metadata?.y ?? 0;
		const parentHeightGrid = (parent.metadata?.height ?? defaultH) / step;

		const otherChildren = children.filter((c) => c.type !== 'thought');
		if (otherChildren.length === 0) return;

		const totalRowWidth =
			otherChildren.reduce(
				(sum, child) => sum + this.getSubtreeLayoutWidth(child.id) + gapXGrid,
				0
			) - gapXGrid;
		const parentCenterX = parentX + nodeWidthGrid / 2;
		const childY = parentY + parentHeightGrid + gapYGrid;
		let currentX = parentCenterX - totalRowWidth / 2;

		for (const child of otherChildren) {
			if (!child.metadata) child.metadata = { x: 0, y: 0 };
			const childSubtreeW = this.getSubtreeLayoutWidth(child.id);
			const offsetInSlot = (childSubtreeW - nodeWidthGrid) / 2;
			if (!child.metadata.manualPosition) {
				child.metadata.x = Math.round(currentX + offsetInSlot);
				child.metadata.y = Math.round(childY);
			}
			this.layoutChildren(child.id);
			currentX += childSubtreeW + gapXGrid;
		}
	}

	/**
	 * Returns an array of all ancestor node IDs reachable from the given node,
	 * traversing ALL parents (full DAG).
	 * The array includes the given node itself.
	 */
	getAncestorPath(nodeId: string): string[] {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const visited = new Set<string>();
		const stack = [nodeId];
		while (stack.length > 0) {
			const currentId = stack.pop()!;
			if (visited.has(currentId)) continue;
			visited.add(currentId);
			const node = this.getNode(currentId);
			if (node) {
				for (const pid of node.parentIds) {
					stack.push(pid);
				}
			}
		}
		return Array.from(visited);
	}

	/** Get the primary parent of a node (first in parentIds). Null for root or not found. */
	getParent(nodeId: string): Node | null {
		const node = this.getNode(nodeId);
		if (!node) return null;
		const primaryParentId = node.parentIds[0];
		if (!primaryParentId) return null;
		return this.getNode(primaryParentId) ?? null;
	}

	/** Get siblings of a node (children of the same primary parent). Filters thought nodes. Includes self. */
	getSiblings(nodeId: string): Node[] {
		const node = this.getNode(nodeId);
		if (!node) return [];
		const primaryParentId = node.parentIds[0] ?? null;
		const children = this.getChildren(primaryParentId);
		return children.filter((c) => c.type !== 'thought');
	}

	/** Get depth of a node following primary parent chain. Root = 0, not found = -1. */
	getDepth(nodeId: string): number {
		let depth = 0;
		let current = this.getNode(nodeId);
		if (!current) return -1;
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const visited = new Set<string>();
		while (current) {
			// Cycle detection
			if (visited.has(current.id)) {
				console.warn(`Cycle detected in getDepth from node ${nodeId}`);
				return depth;
			}
			visited.add(current.id);
			const primaryParentId = current.parentIds[0];
			if (!primaryParentId) return depth;
			current = this.getNode(primaryParentId);
			depth++;
		}
		return depth;
	}

	/** Get the maximum depth across all leaf nodes. -1 for empty tree. */
	getMaxDepth(): number {
		if (this.nodes.length === 0) return -1;
		let max = 0;
		for (const node of this.nodes) {
			if (node.type === 'thought') continue;
			const children = this.getChildren(node.id).filter((c) => c.type !== 'thought');
			if (children.length === 0) {
				const d = this.getDepth(node.id);
				if (d > max) max = d;
			}
		}
		return max;
	}

	/** Follow children downward from a node. Uses lastVisitedChildren hints, otherwise first child. Returns the leaf. */
	getActiveLeaf(nodeId: string, lastVisitedChildren?: Map<string, string>): Node | undefined {
		let current: Node | undefined = this.getNode(nodeId);
		if (!current) return undefined;
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const visited = new Set<string>();
		while (current) {
			// Cycle detection
			if (visited.has(current.id)) {
				console.warn(`Cycle detected in getActiveLeaf from node ${nodeId}`);
				return current;
			}
			visited.add(current.id);
			const kids: Node[] = this.getChildren(current.id).filter((c: Node) => c.type !== 'thought');
			if (kids.length === 0) return current;
			const hintId: string | undefined = lastVisitedChildren?.get(current.id);
			const hintChild: Node | undefined = hintId
				? kids.find((c: Node) => c.id === hintId)
				: undefined;
			current = hintChild ?? kids[0];
		}
		return current;
	}

	/** Get the index of a node among its siblings. Returns { index, total }. { -1, 0 } if not found. */
	getSiblingIndex(nodeId: string): { index: number; total: number } {
		const siblings = this.getSiblings(nodeId);
		if (siblings.length === 0) return { index: -1, total: 0 };
		const idx = siblings.findIndex((s) => s.id === nodeId);
		return { index: idx, total: siblings.length };
	}

	branchFrom(nodeId: string) {
		this.activeNodeId = nodeId;
	}

	/** Toggle collapse state of a node. When collapsed, descendants are hidden. */
	toggleCollapse(nodeId: string) {
		if (this.collapsedNodes.has(nodeId)) {
			this.collapsedNodes.delete(nodeId);
		} else {
			this.collapsedNodes.add(nodeId);
		}
	}

	/** Check if a node is collapsed. */
	isCollapsed(nodeId: string): boolean {
		return this.collapsedNodes.has(nodeId);
	}

	/**
	 * Count the number of visible descendants hidden by collapsing this node.
	 * Excludes thought nodes.
	 */
	getHiddenDescendantCount(nodeId: string): number {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const hidden = new Set<string>();
		const queue = [nodeId];
		while (queue.length > 0) {
			const currentId = queue.shift()!;
			const children = this.getChildren(currentId);
			for (const child of children) {
				if (!hidden.has(child.id) && child.type !== 'thought') {
					hidden.add(child.id);
					queue.push(child.id);
				}
			}
		}
		return hidden.size;
	}

	/**
	 * Check if a node should be hidden because one of its ancestors is collapsed.
	 * A node is hidden if any ancestor in its primary parent chain is collapsed.
	 */
	isInCollapsedSubtree(nodeId: string): boolean {
		let current = this.getNode(nodeId);
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const visited = new Set<string>();
		while (current) {
			if (visited.has(current.id)) return false;
			visited.add(current.id);
			const primaryParentId = current.parentIds[0];
			if (!primaryParentId) return false;
			if (this.collapsedNodes.has(primaryParentId)) return true;
			current = this.getNode(primaryParentId);
		}
		return false;
	}

	/**
	 * Add a parent connection to a node. Returns false if it would create a cycle.
	 */
	addConnection(parentId: string, childId: string): boolean {
		const child = this.getNode(childId);
		const parent = this.getNode(parentId);
		if (!child || !parent) return false;
		if (child.parentIds.includes(parentId)) return false;
		if (wouldCreateCycle(this.nodes, parentId, childId)) return false;
		const oldPrimary = child.parentIds[0] ?? null;
		child.parentIds = [...child.parentIds, parentId];
		const newPrimary = child.parentIds[0] ?? null;
		if (oldPrimary !== newPrimary) {
			this.removeFromChildrenIdMap(childId, oldPrimary);
			this.addToChildrenIdMap(childId, newPrimary);
		}
		this.flushLayoutFromRoot();
		return true;
	}

	/**
	 * Remove a parent connection from a node.
	 */
	removeConnection(parentId: string, childId: string): boolean {
		const child = this.getNode(childId);
		if (!child) return false;
		const idx = child.parentIds.indexOf(parentId);
		if (idx === -1) return false;
		const oldPrimary = child.parentIds[0] ?? null;
		child.parentIds = child.parentIds.filter((id) => id !== parentId);
		const newPrimary = child.parentIds[0] ?? null;
		if (oldPrimary !== newPrimary) {
			this.removeFromChildrenIdMap(childId, oldPrimary);
			this.addToChildrenIdMap(childId, newPrimary);
		}
		this.flushLayoutFromRoot();
		return true;
	}

	/**
	 * Search nodes by content query (case-insensitive).
	 * Updates searchQuery, searchMatches, and currentSearchIndex.
	 * Automatically expands collapsed subtrees containing matches.
	 */
	searchNodesMethod(query: string): void {
		this.searchQuery = query.trim();

		if (this.searchQuery === '') {
			this.searchMatches = [];
			this.currentSearchIndex = 0;
			return;
		}

		// Find all matching nodes
		const matches = searchNodesUtil(this.nodes, this.searchQuery);
		this.searchMatches = matches;
		this.currentSearchIndex = matches.length > 0 ? 0 : 0;

		// Auto-expand collapsed subtrees containing matches
		for (const matchId of matches) {
			this.expandAncestorsIfCollapsed(matchId);
		}

		// Focus on first match if available
		if (matches.length > 0) {
			this.focusOnNode(matches[0]);
		}
	}

	/**
	 * Navigate to the next search match.
	 */
	nextSearchMatch(): void {
		if (this.searchMatches.length === 0) return;

		this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchMatches.length;
		const nodeId = this.searchMatches[this.currentSearchIndex];
		if (nodeId) {
			this.focusOnNode(nodeId);
		}
	}

	/**
	 * Navigate to the previous search match.
	 */
	previousSearchMatch(): void {
		if (this.searchMatches.length === 0) return;

		this.currentSearchIndex =
			(this.currentSearchIndex - 1 + this.searchMatches.length) % this.searchMatches.length;
		const nodeId = this.searchMatches[this.currentSearchIndex];
		if (nodeId) {
			this.focusOnNode(nodeId);
		}
	}

	/**
	 * Clear search state.
	 */
	clearSearch(): void {
		this.searchQuery = '';
		this.searchMatches = [];
		this.currentSearchIndex = 0;
	}

	/**
	 * Expand all collapsed ancestors of a node so it becomes visible.
	 */
	private expandAncestorsIfCollapsed(nodeId: string): void {
		let current = this.getNode(nodeId);
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const visited = new Set<string>();

		while (current) {
			if (visited.has(current.id)) break;
			visited.add(current.id);

			const primaryParentId = current.parentIds[0];
			if (!primaryParentId) break;

			// If parent is collapsed, expand it
			if (this.collapsedNodes.has(primaryParentId)) {
				this.collapsedNodes.delete(primaryParentId);
			}

			current = this.getNode(primaryParentId);
		}
	}

	/**
	 * Add a tag to a node.
	 */
	addTag(nodeId: string, tag: string): void {
		const node = this.getNode(nodeId);
		if (!node) return;
		if (!node.metadata) node.metadata = { x: 0, y: 0 };

		const tags = (node.metadata.tags as string[]) ?? [];
		if (!tags.includes(tag)) {
			node.metadata.tags = [...tags, tag];
		}
	}

	/**
	 * Remove a tag from a node.
	 */
	removeTag(nodeId: string, tag: string): void {
		const node = this.getNode(nodeId);
		if (!node) return;
		if (!node.metadata) return;

		const tags = (node.metadata.tags as string[]) ?? [];
		node.metadata.tags = tags.filter((t) => t !== tag);
	}

	/**
	 * Get tags for a node.
	 */
	getTags(nodeId: string): string[] {
		const node = this.getNode(nodeId);
		if (!node || !node.metadata) return [];
		return (node.metadata.tags as string[]) ?? [];
	}

	/**
	 * Serialize the full engine state into a JSON-safe snapshot.
	 * Component references (from addCustomNode) are stripped — only node.type is stored.
	 */
	serialize(title?: string): import('./persistence/types.js').ConversationSnapshot {
		return {
			version: 1,
			createdAt: Date.now(),
			title,
			activeNodeId: this.activeNodeId,
			nodes: this.nodes.map((n) => ({
				id: n.id,
				parentIds: n.parentIds,
				content: (n as MessageNode).content ?? '',
				role: n.role,
				type: n.type,
				status: n.status,
				createdAt: n.createdAt ?? Date.now(),
				metadata: {
					x: n.metadata?.x ?? 0,
					y: n.metadata?.y ?? 0,
					...(n.metadata?.height != null ? { height: n.metadata.height } : {}),
					...(n.metadata?.tags != null &&
					Array.isArray(n.metadata.tags) &&
					n.metadata.tags.length > 0
						? { tags: n.metadata.tags as string[] }
						: {})
				},
				data: n.data
			}))
		};
	}

	/** Create an engine from a serialized snapshot. Validates input with Zod. */
	static fromSnapshot(
		snapshot: ConversationSnapshot,
		config?: Partial<TraekEngineConfig>
	): TraekEngine {
		const result = conversationSnapshotSchema.safeParse(snapshot);
		if (!result.success) {
			throw new Error(
				`Invalid snapshot: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`
			);
		}
		// Zod transform normalizes legacy parentId → parentIds, so validated is safe
		const validated = result.data;
		const engine = new TraekEngine({
			...validated.config,
			...config
		});
		if (validated.nodes.length > 0) {
			engine.addNodes(
				validated.nodes.map((n) => ({
					id: n.id,
					parentIds: n.parentIds,
					content: n.content,
					role: n.role,
					type: n.type,
					status: n.status,
					createdAt: n.createdAt,
					metadata: n.metadata,
					data: n.data
				}))
			);
		}
		if (validated.activeNodeId != null) {
			if (engine.getNode(validated.activeNodeId)) {
				engine.activeNodeId = validated.activeNodeId;
				engine.pendingFocusNodeId = validated.activeNodeId;
			}
		}
		return engine;
	}
}
