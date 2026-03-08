import { conversationSnapshotSchema, type ConversationSnapshot } from './schemas.js';
import { searchNodes as searchNodesUtil } from './search.js';
import type {
	Node,
	MessageNode,
	CustomTraekNode,
	AddNodePayload,
	TraekEngineConfig
} from './types.js';
import { DEFAULT_TRACK_ENGINE_CONFIG } from './types.js';
import { computeLayout, buildLayoutInput, type LayoutConfig } from './layout.js';

export type { ConversationSnapshot };

/** Check whether adding an edge from parentId → childId would create a cycle. */
export function wouldCreateCycle(nodes: Node[], parentId: string, childId: string): boolean {
	if (parentId === childId) return true;
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

type StateListener = () => void;

/**
 * Framework-agnostic core engine for Træk.
 *
 * Manages the conversation tree: nodes, spatial layout, navigation, search, tags.
 *
 * ## Reactivity
 *
 * Subscribe to state changes via `engine.subscribe(fn)`. The engine follows
 * the Svelte store contract — `fn` is called immediately with the current state,
 * and again on every subsequent mutation.
 *
 * Framework integration patterns:
 *
 * **Svelte 5** (`@traek/svelte` handles this automatically):
 * ```svelte
 * <script>
 *   let nodes = $state(engine.nodes)
 *   $effect(() => engine.subscribe(() => { nodes = engine.nodes }))
 * </script>
 * ```
 *
 * **React 18+** (`@traek/react` handles this automatically):
 * ```ts
 * const snapshot = useSyncExternalStore(
 *   engine.subscribe.bind(engine),
 *   () => engine.getSnapshot()
 * )
 * ```
 *
 * **Vue 3** (`@traek/vue` handles this automatically):
 * ```ts
 * const nodes = ref(engine.nodes)
 * onMounted(() => engine.subscribe(() => { nodes.value = [...engine.nodes] }))
 * ```
 */
export class TraekEngine {
	// ─── Public reactive state ────────────────────────────────────────────────
	nodes: Node[] = [];
	activeNodeId: string | null = null;
	/** Set of collapsed node IDs. When a node is collapsed, its descendants are hidden. */
	collapsedNodes: Set<string> = new Set();
	/** Current search query */
	searchQuery: string = '';
	/** Matching node IDs for current search */
	searchMatches: string[] = [];
	/** Current match index (0-based) */
	currentSearchIndex: number = 0;
	/** Set by addNode/focusOnNode; canvas centers on this node then clears it. */
	pendingFocusNodeId: string | null = null;

	// ─── Lifecycle hooks ──────────────────────────────────────────────────────
	/** Fired after a node is added. Wired by the canvas when a registry is present. */
	public onNodeCreated?: (node: Node) => void;
	/** Fired before a node is removed. */
	public onNodeDeleting?: (node: Node) => void;
	/** Fired after node(s) are deleted. Provides count and a restore function. */
	public onNodeDeleted?: (deletedCount: number, restore: () => void) => void;

	// ─── Private internals ────────────────────────────────────────────────────
	private config: TraekEngineConfig;
	private pendingHeightLayout = false;
	/** Maps node ID → index in nodes array for O(1) lookup. */
	private nodeIndexMap = new Map<string, number>();
	/** Maps primary parent ID (or null for roots) → child node IDs. */
	private childrenIdMap = new Map<string | null, string[]>();

	private lastDeletedBuffer: {
		nodes: Node[];
		activeNodeId: string | null;
		timestamp: number;
	} | null = null;
	private deleteUndoTimeoutId: ReturnType<typeof setTimeout> = 0 as unknown as ReturnType<
		typeof setTimeout
	>;

	private readonly _subscribers = new Set<StateListener>();

	constructor(config?: Partial<TraekEngineConfig>) {
		this.config = { ...DEFAULT_TRACK_ENGINE_CONFIG, ...config };
	}

	// ─── Subscription (framework-agnostic reactive interface) ─────────────────

	/**
	 * Subscribe to any engine state change.
	 *
	 * Follows the Svelte store contract: immediately calls `fn`, then again on
	 * every subsequent mutation. Returns an unsubscribe function.
	 *
	 * Compatible with:
	 * - Svelte: use `@traek/svelte` adapter
	 * - React: `useSyncExternalStore(engine.subscribe.bind(engine), () => engine.getSnapshot())`
	 * - Vue: manual subscription via `onMounted` / `onUnmounted`
	 * - Solid: `from(() => { ... engine.subscribe(...) })`
	 */
	subscribe(fn: StateListener): () => void {
		this._subscribers.add(fn);
		fn();
		return () => this._subscribers.delete(fn);
	}

	/**
	 * Returns a plain-object snapshot of all reactive state.
	 * Useful for React's `useSyncExternalStore` getSnapshot parameter.
	 */
	getSnapshot() {
		return {
			nodes: this.nodes,
			activeNodeId: this.activeNodeId,
			collapsedNodes: this.collapsedNodes,
			searchQuery: this.searchQuery,
			searchMatches: this.searchMatches,
			currentSearchIndex: this.currentSearchIndex,
			pendingFocusNodeId: this.pendingFocusNodeId
		};
	}

	private _notify(): void {
		for (const fn of this._subscribers) fn();
	}

	// ─── Derived state ────────────────────────────────────────────────────────

	/**
	 * The "context path": linear ancestor chain from root to the active node,
	 * following the primary parent (first parentIds entry) at each step.
	 */
	get contextPath(): Node[] {
		if (!this.activeNodeId) return [];
		const path: Node[] = [];
		let current = this.getNode(this.activeNodeId);
		while (current) {
			path.unshift(current);
			const primaryParentId = current.parentIds[0];
			current = primaryParentId ? this.getNode(primaryParentId) : undefined;
		}
		return path;
	}

	// ─── Internal map helpers ─────────────────────────────────────────────────

	/** O(1) node lookup by ID. */
	getNode(id: string): Node | undefined {
		const idx = this.nodeIndexMap.get(id);
		if (idx === undefined) return undefined;
		return this.nodes[idx];
	}

	/** Get children of a node by primary parent (for layout). */
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

	private rebuildNodeIndexMap(): void {
		this.nodeIndexMap.clear();
		for (let i = 0; i < this.nodes.length; i++) {
			this.nodeIndexMap.set(this.nodes[i].id, i);
		}
	}

	private rebuildChildrenIdMap(): void {
		this.childrenIdMap.clear();
		for (const n of this.nodes) {
			this.addToChildrenIdMap(n.id, n.parentIds[0] ?? null);
		}
	}

	private addToChildrenIdMap(nodeId: string, primaryParentId: string | null): void {
		const list = this.childrenIdMap.get(primaryParentId) ?? [];
		list.push(nodeId);
		this.childrenIdMap.set(primaryParentId, list);
	}

	private removeFromChildrenIdMap(nodeId: string, primaryParentId: string | null): void {
		const list = this.childrenIdMap.get(primaryParentId);
		if (list) {
			const idx = list.indexOf(nodeId);
			if (idx !== -1) list.splice(idx, 1);
			if (list.length === 0) this.childrenIdMap.delete(primaryParentId);
		}
	}

	private syncMapsAfterPush(node: Node): void {
		this.nodeIndexMap.set(node.id, this.nodes.length - 1);
		this.addToChildrenIdMap(node.id, node.parentIds[0] ?? null);
	}

	private rebuildMaps(): void {
		this.rebuildNodeIndexMap();
		this.rebuildChildrenIdMap();
	}

	// ─── Node creation ────────────────────────────────────────────────────────

	addCustomNode(
		component: unknown,
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
	): CustomTraekNode {
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
		if (options.type !== 'thought') {
			this.activeNodeId = newNode.id;
		}

		const primaryParentId = parentIds[0];
		if (primaryParentId && !options.deferLayout) {
			this.layoutChildren(primaryParentId);
		}

		this.onNodeCreated?.(newNode);

		if (options.autofocus) {
			queueMicrotask(() => {
				this.pendingFocusNodeId = newNode.id;
				this._notify();
			});
		}

		this._notify();
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
	): MessageNode {
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
		if (options.type !== 'thought') {
			this.activeNodeId = newNode.id;
		}

		const primaryParentId = parentIds[0];
		if (primaryParentId && !options.deferLayout) {
			this.layoutChildren(primaryParentId);
		}

		this.onNodeCreated?.(newNode);

		if (options.autofocus) {
			queueMicrotask(() => {
				this.pendingFocusNodeId = newNode.id;
				this._notify();
			});
		}

		this._notify();
		return newNode;
	}

	/**
	 * Add many nodes at once (e.g. loading a saved project). Uses one layout pass.
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
		this._notify();
		return newNodes;
	}

	// ─── Node updates ─────────────────────────────────────────────────────────

	updateNode(nodeId: string, updates: Partial<MessageNode>): void {
		const node = this.getNode(nodeId);
		if (node) {
			Object.assign(node, updates);
			this._notify();
		}
	}

	updateNodeHeight(nodeId: string, height: number): void {
		const node = this.getNode(nodeId);
		if (!node) return;
		if (!node.metadata) node.metadata = { x: 0, y: 0 };

		const currentHeight = node.metadata.height ?? this.config.nodeHeightDefault;
		if (Math.abs(currentHeight - height) < this.config.heightChangeThreshold) return;

		node.metadata.height = height;

		if (!this.pendingHeightLayout) {
			this.pendingHeightLayout = true;
			queueMicrotask(() => {
				this.pendingHeightLayout = false;
				this.flushLayoutFromRoot();
				this._notify();
			});
		}
	}

	// ─── Node deletion ────────────────────────────────────────────────────────

	deleteNode(nodeId: string): void {
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
			this._notify();
		}
	}

	/** Delete a node and all its descendants. Navigates to the deleted node's first parent. */
	deleteNodeAndDescendants(nodeId: string): void {
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

		const deletedNodes = this.nodes.filter((n) => toDelete.has(n.id));
		this.storeDeletedBuffer(deletedNodes);

		for (const id of toDelete) {
			const node = this.getNode(id);
			if (node) this.onNodeDeleting?.(node);
		}

		const deletedNode = this.getNode(nodeId);
		const firstParentId = deletedNode?.parentIds[0] ?? null;

		for (const n of this.nodes) {
			if (!toDelete.has(n.id)) {
				const filtered = n.parentIds.filter((pid) => !toDelete.has(pid));
				if (filtered.length !== n.parentIds.length) {
					n.parentIds = filtered;
				}
			}
		}

		this.nodes = this.nodes.filter((n) => !toDelete.has(n.id));
		this.rebuildMaps();

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
		this._notify();
	}

	/** Count visible descendants via BFS (excludes thought nodes). */
	getDescendantCount(nodeId: string): number {
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

	/** Get all descendant nodes via BFS (excludes thought nodes). */
	getDescendants(nodeId: string): Node[] {
		const descendants: Node[] = [];
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

	// ─── Undo buffer ──────────────────────────────────────────────────────────

	/**
	 * Clone a node for the undo buffer. Copies only serializable fields so we
	 * avoid DataCloneError from structuredClone (e.g. CustomTraekNode.component,
	 * or non-cloneable data/metadata).
	 */
	private cloneNodeForUndoBuffer(n: Node): Node {
		let metadata: Node['metadata'];
		if (n.metadata) {
			try {
				metadata = structuredClone(n.metadata);
			} catch {
				metadata = {
					x: n.metadata.x ?? 0,
					y: n.metadata.y ?? 0,
					...(n.metadata.height != null && { height: n.metadata.height })
				};
			}
		}
		let data: unknown;
		if (n.data != null) {
			try {
				data = structuredClone(n.data);
			} catch {
				data = undefined;
			}
		}
		const base: Node = {
			id: n.id,
			parentIds: [...n.parentIds],
			role: n.role,
			type: n.type,
			status: n.status,
			errorMessage: n.errorMessage,
			createdAt: n.createdAt,
			metadata,
			data
		};
		if ('content' in n && typeof (n as MessageNode).content === 'string') {
			(base as MessageNode).content = (n as MessageNode).content;
		}
		return base;
	}

	private storeDeletedBuffer(nodes: Node[]): void {
		clearTimeout(this.deleteUndoTimeoutId);
		this.lastDeletedBuffer = {
			nodes: nodes.map((n) => this.cloneNodeForUndoBuffer(n)),
			activeNodeId: this.activeNodeId,
			timestamp: Date.now()
		};
		this.deleteUndoTimeoutId = setTimeout(() => {
			this.lastDeletedBuffer = null;
		}, 30_000);
	}

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

		this.nodes = [...this.nodes, ...restoredNodes];
		this.rebuildMaps();

		if (activeNodeId && this.nodeIndexMap.has(activeNodeId)) {
			this.activeNodeId = activeNodeId;
		}

		this.flushLayoutFromRoot();
		this._notify();
		return true;
	}

	// ─── Duplicate ────────────────────────────────────────────────────────────

	duplicateNode(nodeId: string): Node | null {
		const source = this.getNode(nodeId);
		if (!source) return null;

		const step = this.config.gridStep;
		const offsetGrid = this.config.layoutGapX / step;
		const sourceX = source.metadata?.x ?? 0;
		const sourceY = source.metadata?.y ?? 0;

		const sourceMsg = source as MessageNode;
		if (typeof sourceMsg.content === 'string') {
			const newNode = this.addNode(sourceMsg.content, source.role, {
				type: source.type,
				parentIds: [...source.parentIds],
				x: sourceX + offsetGrid,
				y: sourceY,
				data: source.data != null ? structuredClone(source.data) : undefined
			});
			if (newNode.metadata) {
				delete newNode.metadata.manualPosition;
			}
			const primaryParentId = source.parentIds[0];
			if (primaryParentId) {
				this.layoutChildren(primaryParentId);
			}
			this._notify();
			return newNode;
		}

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

		this._notify();
		return newNode;
	}

	// ─── Positioning ──────────────────────────────────────────────────────────

	moveNodeAndDescendants(nodeId: string, dx: number, dy: number): void {
		const node = this.getNode(nodeId);
		if (!node) return;
		if (!node.metadata) node.metadata = { x: 0, y: 0 };
		const step = this.config.gridStep;
		node.metadata.x = (node.metadata.x ?? 0) + dx / step;
		node.metadata.y = (node.metadata.y ?? 0) + dy / step;
		node.metadata.manualPosition = true;
		this.layoutChildren(nodeId);
		this._notify();
	}

	setNodePosition(nodeId: string, xPx: number, yPx: number, snapThresholdPx?: number): void {
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
		this._notify();
	}

	snapNodeToGrid(nodeId: string): void {
		const node = this.getNode(nodeId);
		if (!node) return;
		if (!node.metadata) node.metadata = { x: 0, y: 0 };
		node.metadata.x = Math.round(node.metadata.x ?? 0);
		node.metadata.y = Math.round(node.metadata.y ?? 0);
		this.layoutChildren(nodeId);
		this._notify();
	}

	// ─── Layout algorithm ─────────────────────────────────────────────────────

	private getLayoutConfig(): LayoutConfig {
		const step = this.config.gridStep;
		return {
			nodeWidthGrid: this.config.nodeWidth / step,
			nodeHGrid: this.config.nodeHeightDefault / step,
			gapXGrid: this.config.layoutGapX / step,
			gapYGrid: this.config.layoutGapY / step
		};
	}

	/** Re-layout children of a single parent node. Delegates to flushLayoutFromRoot for simplicity. */
	layoutChildren(parentId: string): void {
		const parent = this.getNode(parentId);
		if (!parent) return;
		if (this.getChildren(parentId).length === 0) return;
		this.flushLayoutFromRoot();
	}

	/** Run layout from every root (no parents). Use after adding nodes with deferLayout. */
	flushLayoutFromRoot(): void {
		const input = buildLayoutInput(this.nodes, this.childrenIdMap, this.getLayoutConfig());
		const positions = computeLayout('tree-vertical', input);
		for (const { nodeId, x, y } of positions) {
			const node = this.getNode(nodeId);
			if (!node || node.metadata?.manualPosition) continue;
			if (!node.metadata) node.metadata = { x: 0, y: 0 };
			node.metadata.x = x;
			node.metadata.y = y;
		}
	}

	// ─── Focus / navigation ───────────────────────────────────────────────────

	focusOnNode(nodeId: string): void {
		if (this.nodeIndexMap.has(nodeId)) {
			this.pendingFocusNodeId = nodeId;
			this._notify();
		}
	}

	clearPendingFocus(): void {
		this.pendingFocusNodeId = null;
		this._notify();
	}

	branchFrom(nodeId: string): void {
		this.activeNodeId = nodeId;
		this._notify();
	}

	getParent(nodeId: string): Node | null {
		const node = this.getNode(nodeId);
		if (!node) return null;
		const primaryParentId = node.parentIds[0];
		if (!primaryParentId) return null;
		return this.getNode(primaryParentId) ?? null;
	}

	getSiblings(nodeId: string): Node[] {
		const node = this.getNode(nodeId);
		if (!node) return [];
		const primaryParentId = node.parentIds[0] ?? null;
		const children = this.getChildren(primaryParentId);
		return children.filter((c) => c.type !== 'thought');
	}

	getDepth(nodeId: string): number {
		let depth = 0;
		let current = this.getNode(nodeId);
		if (!current) return -1;
		const visited = new Set<string>();
		while (current) {
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

	getActiveLeaf(nodeId: string, lastVisitedChildren?: Map<string, string>): Node | undefined {
		let current: Node | undefined = this.getNode(nodeId);
		if (!current) return undefined;
		const visited = new Set<string>();
		while (current) {
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

	getSiblingIndex(nodeId: string): { index: number; total: number } {
		const siblings = this.getSiblings(nodeId);
		if (siblings.length === 0) return { index: -1, total: 0 };
		const idx = siblings.findIndex((s) => s.id === nodeId);
		return { index: idx, total: siblings.length };
	}

	getAncestorPath(nodeId: string): string[] {
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

	// ─── Collapse ─────────────────────────────────────────────────────────────

	toggleCollapse(nodeId: string): void {
		if (this.collapsedNodes.has(nodeId)) {
			this.collapsedNodes.delete(nodeId);
		} else {
			this.collapsedNodes.add(nodeId);
		}
		this._notify();
	}

	isCollapsed(nodeId: string): boolean {
		return this.collapsedNodes.has(nodeId);
	}

	getHiddenDescendantCount(nodeId: string): number {
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

	isInCollapsedSubtree(nodeId: string): boolean {
		let current = this.getNode(nodeId);
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

	// ─── DAG connections ──────────────────────────────────────────────────────

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
		this._notify();
		return true;
	}

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
		this._notify();
		return true;
	}

	// ─── Search ───────────────────────────────────────────────────────────────

	searchNodesMethod(query: string): void {
		this.searchQuery = query.trim();

		if (this.searchQuery === '') {
			this.searchMatches = [];
			this.currentSearchIndex = 0;
			this._notify();
			return;
		}

		const matches = searchNodesUtil(this.nodes, this.searchQuery);
		this.searchMatches = matches;
		this.currentSearchIndex = matches.length > 0 ? 0 : 0;

		for (const matchId of matches) {
			this.expandAncestorsIfCollapsed(matchId);
		}

		if (matches.length > 0) {
			this.pendingFocusNodeId = matches[0];
		}

		this._notify();
	}

	nextSearchMatch(): void {
		if (this.searchMatches.length === 0) return;
		this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchMatches.length;
		const nodeId = this.searchMatches[this.currentSearchIndex];
		if (nodeId) {
			this.pendingFocusNodeId = nodeId;
		}
		this._notify();
	}

	previousSearchMatch(): void {
		if (this.searchMatches.length === 0) return;
		this.currentSearchIndex =
			(this.currentSearchIndex - 1 + this.searchMatches.length) % this.searchMatches.length;
		const nodeId = this.searchMatches[this.currentSearchIndex];
		if (nodeId) {
			this.pendingFocusNodeId = nodeId;
		}
		this._notify();
	}

	clearSearch(): void {
		this.searchQuery = '';
		this.searchMatches = [];
		this.currentSearchIndex = 0;
		this._notify();
	}

	private expandAncestorsIfCollapsed(nodeId: string): void {
		let current = this.getNode(nodeId);
		const visited = new Set<string>();

		while (current) {
			if (visited.has(current.id)) break;
			visited.add(current.id);

			const primaryParentId = current.parentIds[0];
			if (!primaryParentId) break;

			if (this.collapsedNodes.has(primaryParentId)) {
				this.collapsedNodes.delete(primaryParentId);
			}

			current = this.getNode(primaryParentId);
		}
	}

	// ─── Tags ─────────────────────────────────────────────────────────────────

	addTag(nodeId: string, tag: string): void {
		const node = this.getNode(nodeId);
		if (!node) return;
		if (!node.metadata) node.metadata = { x: 0, y: 0 };
		const tags = (node.metadata.tags as string[]) ?? [];
		if (!tags.includes(tag)) {
			node.metadata.tags = [...tags, tag];
			this._notify();
		}
	}

	removeTag(nodeId: string, tag: string): void {
		const node = this.getNode(nodeId);
		if (!node) return;
		if (!node.metadata) return;
		const tags = (node.metadata.tags as string[]) ?? [];
		node.metadata.tags = tags.filter((t) => t !== tag);
		this._notify();
	}

	getTags(nodeId: string): string[] {
		const node = this.getNode(nodeId);
		if (!node || !node.metadata) return [];
		return (node.metadata.tags as string[]) ?? [];
	}

	// ─── Serialization ────────────────────────────────────────────────────────

	serialize(title?: string): ConversationSnapshot {
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
				engine._notify();
			}
		}
		return engine;
	}
}
