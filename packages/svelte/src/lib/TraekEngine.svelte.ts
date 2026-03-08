import type { Component } from 'svelte';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import {
	conversationSnapshotSchema,
	type ConversationSnapshot as LocalConversationSnapshot
} from '$lib/persistence/schemas';
import { searchNodes as searchNodesUtil, type SearchFilters } from '$lib/search/searchUtils';
import { HistoryManager, type EngineSnapshot } from '$lib/history/HistoryManager';
import { computeLayout, buildLayoutInput } from '@traek/core';
import type { LayoutMode, LayoutConfig } from '@traek/core';
export type { LayoutMode } from '@traek/core';

// Shared types and utilities from the framework-agnostic core package.
// Re-exported here so that consumers of @traek/svelte don't need to
// depend on @traek/core separately.
export { wouldCreateCycle, BasicNodeTypes, DEFAULT_TRACK_ENGINE_CONFIG } from '@traek/core';
export type {
	Node,
	MessageNode,
	AddNodePayload,
	NodeStatus,
	TraekEngineConfig,
	ConversationSnapshot,
	NodeColor,
	CustomTag
} from '@traek/core';

// Internal imports for use in this file
import {
	wouldCreateCycle,
	DEFAULT_TRACK_ENGINE_CONFIG,
	type Node,
	type MessageNode,
	type AddNodePayload,
	type TraekEngineConfig,
	type ConversationSnapshot,
	type CustomTag,
	type NodeColor
} from '@traek/core';
import { listBuiltinTags } from '$lib/tags/tagUtils';
import type { Annotation } from './annotations/types';

/** Props every custom node component receives from the canvas. Use this to type your component's $props(). */
export type TraekNodeComponentProps = {
	node: Node;
	engine: TraekEngine;
	isActive: boolean;
};

/**
 * A Svelte-specific node that renders a Svelte component on the canvas.
 * For the framework-agnostic equivalent, see CustomTraekNode in @traek/core.
 */
export type CustomTraekNode = Node & {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: Component<any>;
	props?: Record<string, unknown>;
};

/**
 * Map node.type (e.g. 'debugNode', 'image') to a Svelte component for custom nodes.
 * Use with a union of your custom types for type-safe keys: NodeComponentMap<'debugNode' | 'image'>.
 */
export type NodeComponentMap<T extends string = string> = Partial<
	Record<T, Component<TraekNodeComponentProps & Record<string, unknown>>>
>;

export class TraekEngine {
	nodes = $state<Node[]>([]);
	activeNodeId = $state<string | null>(null);
	/** Set of collapsed node IDs. When a node is collapsed, its descendants are hidden from view. */
	collapsedNodes = $state(new SvelteSet<string>());
	/** Search state: current query */
	searchQuery = $state<string>('');
	/** Search state: active filters */
	searchFilters = $state<SearchFilters>({});
	/** Search state: array of matching node IDs */
	searchMatches = $state<string[]>([]);
	/** Search state: current match index (0-based) */
	currentSearchIndex = $state<number>(0);
	/** Whether there is an undoable operation in the undo stack. */
	canUndo = $state<boolean>(false);
	/** Whether there is a redoable operation in the redo stack. */
	canRedo = $state<boolean>(false);
	/** Registry of user-defined custom tags. */
	customTags = $state(new SvelteMap<string, CustomTag>());
	/** Current auto-layout mode. 'tree-vertical' matches existing default behavior. */
	layoutMode = $state<LayoutMode>('tree-vertical');
	/** Duration for animated layout transitions (ms). Set to 0 to disable. */
	layoutTransitionMs = $state(300);
	/** Current theme mode: 'dark', 'light', or 'system' (follows OS preference). */
	themeMode = $state<'dark' | 'light' | 'system'>('system');
	/** All canvas annotations (sticky notes, markers, pins). */
	annotations = $state<Annotation[]>([]);
	private config: TraekEngineConfig;

	private historyManager = new HistoryManager();
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
			/** When true, skip pushing to undo stack (for internal/bulk operations). */
			skipHistory?: boolean;
		} = {}
	) {
		if (!options.skipHistory && options.type !== 'thought') this.captureForUndo();
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

	/**
	 * Set the theme mode. Updates engine state; the ThemeToggle component
	 * reads this to apply the actual CSS variables.
	 */
	setThemeMode(mode: 'dark' | 'light' | 'system'): void {
		this.themeMode = mode;
	}

	/**
	 * Apply a named auto-layout algorithm to reposition all nodes.
	 * Nodes with `metadata.manualPosition === true` are preserved.
	 * @param mode Layout algorithm to use (defaults to current layoutMode)
	 * @param force If true, override manualPosition (useful for "reset layout")
	 * @param animate If true, tween node positions over layoutTransitionMs
	 */
	applyLayout(mode: LayoutMode = this.layoutMode, force = false, animate = true): void {
		this.layoutMode = mode;

		const layoutInput = buildLayoutInput(this.nodes, this.childrenIdMap, this.getLayoutConfig());
		const positions = computeLayout(mode, layoutInput);

		if (!animate || this.layoutTransitionMs <= 0 || typeof requestAnimationFrame === 'undefined') {
			// Immediate apply
			for (const { nodeId, x, y } of positions) {
				const node = this.getNode(nodeId);
				if (!node) continue;
				if (!force && node.metadata?.manualPosition) continue;
				node.metadata = { ...(node.metadata ?? { x: 0, y: 0 }), x, y };
			}
			return;
		}

		// Animated apply: tween from current to target over layoutTransitionMs
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const startPositions = new Map(
			positions.map(({ nodeId }) => {
				const node = this.getNode(nodeId);
				return [nodeId, { x: node?.metadata?.x ?? 0, y: node?.metadata?.y ?? 0 }];
			})
		);
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const targetPositions = new Map(positions.map(({ nodeId, x, y }) => [nodeId, { x, y }]));

		const startTime = performance.now();
		const duration = this.layoutTransitionMs;

		const tick = (now: number) => {
			const elapsed = now - startTime;
			const t = Math.min(1, elapsed / duration);
			// Ease-in-out cubic
			const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

			for (const { nodeId } of positions) {
				const node = this.getNode(nodeId);
				if (!node) continue;
				if (!force && node.metadata?.manualPosition) continue;
				const start = startPositions.get(nodeId)!;
				const target = targetPositions.get(nodeId)!;
				node.metadata = {
					...(node.metadata ?? { x: 0, y: 0 }),
					x: Math.round(start.x + (target.x - start.x) * eased),
					y: Math.round(start.y + (target.y - start.y) * eased)
				};
			}

			if (t < 1) {
				requestAnimationFrame(tick);
			}
		};

		requestAnimationFrame(tick);
	}

	private getLayoutConfig(): LayoutConfig {
		const step = this.config.gridStep;
		return {
			nodeWidthGrid: Math.round(this.config.nodeWidth / step),
			nodeHGrid: Math.round(this.config.nodeHeightDefault / step),
			gapXGrid: Math.round(this.config.layoutGapX / step),
			gapYGrid: Math.round(this.config.layoutGapY / step)
		};
	}

	/** Run layout from every root (no parents). Use after adding nodes with deferLayout. */
	flushLayoutFromRoot() {
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

	clearPendingFocus() {
		this.pendingFocusNodeId = null;
	}

	updateNode(
		nodeId: string,
		updates: Partial<MessageNode>,
		options: { skipHistory?: boolean } = {}
	) {
		const node = this.getNode(nodeId);
		if (node) {
			// Capture undo for content edits, but NOT for streaming updates
			if (!options.skipHistory && 'content' in updates && node.status !== 'streaming') {
				this.captureForUndo();
			}
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
				this.captureForUndo();
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
		this.captureForUndo();
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
			nodes: nodes.map((n) => $state.snapshot(n) as Node),
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

		this.captureForUndo();
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
				data:
					source.data != null ? ($state.snapshot(source.data) as typeof source.data) : undefined,
				skipHistory: true
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
			data: source.data != null ? ($state.snapshot(source.data) as typeof source.data) : undefined
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

	/** Re-layout children of a single parent node. Delegates to flushLayoutFromRoot. */
	layoutChildren(parentId: string) {
		const parent = this.getNode(parentId);
		if (!parent) return;
		if (this.getChildren(parentId).length === 0) return;
		this.flushLayoutFromRoot();
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
	 * Reparent a node: replaces all its current parents with a single new parent.
	 * Returns false if the operation would create a cycle or is otherwise invalid.
	 */
	reparentNode(nodeId: string, newParentId: string): boolean {
		if (nodeId === newParentId) return false;
		if (wouldCreateCycle(this.nodes, newParentId, nodeId)) return false;
		const node = this.getNode(nodeId);
		const newParent = this.getNode(newParentId);
		if (!node || !newParent) return false;
		if (node.parentIds.length === 1 && node.parentIds[0] === newParentId) return false;

		this.captureForUndo();

		// Remove all existing parent connections
		const oldParents = [...node.parentIds];
		for (const oldParentId of oldParents) {
			const oldPrimary = node.parentIds[0] ?? null;
			node.parentIds = node.parentIds.filter((id) => id !== oldParentId);
			const newPrimary = node.parentIds[0] ?? null;
			if (oldPrimary !== newPrimary) {
				this.removeFromChildrenIdMap(nodeId, oldPrimary);
				this.addToChildrenIdMap(nodeId, newPrimary);
			}
		}

		// Add new parent
		node.parentIds = [newParentId];
		this.removeFromChildrenIdMap(nodeId, null);
		this.addToChildrenIdMap(nodeId, newParentId);

		this.flushLayoutFromRoot();
		return true;
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
	 * Search nodes by content query (case-insensitive), with optional role/status filters.
	 * Updates searchQuery, searchFilters, searchMatches, and currentSearchIndex.
	 * Automatically expands collapsed subtrees containing matches.
	 */
	searchNodesMethod(query: string, filters?: SearchFilters): void {
		this.searchQuery = query.trim();
		if (filters !== undefined) this.searchFilters = filters;

		if (this.searchQuery === '') {
			this.searchMatches = [];
			this.currentSearchIndex = 0;
			return;
		}

		// Find all matching nodes
		const matches = searchNodesUtil(this.nodes, this.searchQuery, this.searchFilters);
		this.searchMatches = matches;
		this.currentSearchIndex = 0;

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
	 * Re-run current search with existing query and filters.
	 * Used to update results when nodes change during streaming.
	 */
	refreshSearch(): void {
		if (!this.searchQuery) return;
		const matches = searchNodesUtil(this.nodes, this.searchQuery, this.searchFilters);
		this.searchMatches = matches;
		// Keep current index in bounds
		if (this.currentSearchIndex >= matches.length) {
			this.currentSearchIndex = Math.max(0, matches.length - 1);
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
		this.searchFilters = {};
		this.searchMatches = [];
		this.currentSearchIndex = 0;
	}

	// ─── Undo / Redo ────────────────────────────────────────────────────────────

	/** Capture a deep-clone snapshot of current state and push it onto the undo stack. */
	captureForUndo(): void {
		const snapshot: EngineSnapshot = {
			nodes: this.nodes.map((n) => $state.snapshot(n) as Node),
			activeNodeId: this.activeNodeId,
			annotations: $state.snapshot(this.annotations) as Annotation[]
		};
		this.historyManager.push(snapshot);
		this.canUndo = this.historyManager.canUndo;
		this.canRedo = this.historyManager.canRedo;
	}

	/**
	 * Undo the last undoable operation.
	 * Restores engine state to the snapshot before that operation.
	 */
	undo(): boolean {
		const current: EngineSnapshot = {
			nodes: this.nodes.map((n) => $state.snapshot(n) as Node),
			activeNodeId: this.activeNodeId,
			annotations: $state.snapshot(this.annotations) as Annotation[]
		};
		const prev = this.historyManager.undo(current);
		if (!prev) return false;
		this.nodes = prev.nodes;
		this.rebuildMaps();
		this.activeNodeId = prev.activeNodeId;
		if (prev.annotations !== undefined) this.annotations = prev.annotations;
		this.flushLayoutFromRoot();
		this.canUndo = this.historyManager.canUndo;
		this.canRedo = this.historyManager.canRedo;
		return true;
	}

	/**
	 * Redo the last undone operation.
	 */
	redo(): boolean {
		const current: EngineSnapshot = {
			nodes: this.nodes.map((n) => $state.snapshot(n) as Node),
			activeNodeId: this.activeNodeId,
			annotations: $state.snapshot(this.annotations) as Annotation[]
		};
		const next = this.historyManager.redo(current);
		if (!next) return false;
		this.nodes = next.nodes;
		this.rebuildMaps();
		this.activeNodeId = next.activeNodeId;
		if (next.annotations !== undefined) this.annotations = next.annotations;
		this.flushLayoutFromRoot();
		this.canUndo = this.historyManager.canUndo;
		this.canRedo = this.historyManager.canRedo;
		return true;
	}

	/** Clear the undo/redo history (e.g. after loading a new conversation). */
	clearHistory(): void {
		this.historyManager.clear();
		this.canUndo = false;
		this.canRedo = false;
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

	// ── Color coding ──────────────────────────────────────────────────────────

	/** Get the color for a node, or null if unset. */
	getNodeColor(nodeId: string): NodeColor | null {
		const node = this.getNode(nodeId);
		return (node?.metadata?.color as NodeColor) ?? null;
	}

	/** Set or clear the color for a single node. */
	setNodeColor(nodeId: string, color: NodeColor | null): void {
		const node = this.getNode(nodeId);
		if (!node) return;
		node.metadata = { ...(node.metadata ?? { x: 0, y: 0 }), color };
	}

	/** Set or clear the color for a node and all its descendants. */
	setNodeColorBranch(nodeId: string, color: NodeColor | null): void {
		const node = this.getNode(nodeId);
		if (!node) return;
		this.setNodeColor(nodeId, color);
		const children = this.childrenIdMap.get(nodeId) ?? [];
		for (const childId of children) {
			this.setNodeColorBranch(childId, color);
		}
	}

	// ── Bookmarks ─────────────────────────────────────────────────────────────

	/** Bookmark a node with an optional display label. */
	bookmarkNode(nodeId: string, label?: string): void {
		const node = this.getNode(nodeId);
		if (!node) return;
		node.metadata = {
			...(node.metadata ?? { x: 0, y: 0 }),
			bookmarked: true,
			...(label !== undefined ? { bookmarkLabel: label } : {})
		};
	}

	/** Remove the bookmark from a node. */
	unbookmarkNode(nodeId: string): void {
		const node = this.getNode(nodeId);
		if (!node) return;
		node.metadata = {
			...(node.metadata ?? { x: 0, y: 0 }),
			bookmarked: false,
			bookmarkLabel: undefined
		};
	}

	/** Get all bookmarked nodes, sorted by canvas y then x position. */
	getBookmarks(): { node: Node; label?: string }[] {
		return this.nodes
			.filter((n) => n.metadata?.bookmarked === true)
			.sort((a, b) => {
				const ay = a.metadata?.y ?? 0;
				const by = b.metadata?.y ?? 0;
				if (ay !== by) return ay - by;
				return (a.metadata?.x ?? 0) - (b.metadata?.x ?? 0);
			})
			.map((node) => ({
				node,
				label: node.metadata?.bookmarkLabel as string | undefined
			}));
	}

	// ── Custom tags ───────────────────────────────────────────────────────────

	/** Create a custom tag and store it in the registry. Returns the new tag. */
	createCustomTag(label: string, color: string): CustomTag {
		const slug = label
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
			.substring(0, 40);
		const finalSlug = this.customTags.has(slug) ? `${slug}-${Date.now()}` : slug;
		const tag: CustomTag = { slug: finalSlug, label, color };
		this.customTags.set(finalSlug, tag);
		return tag;
	}

	/** Remove a custom tag from the registry. */
	deleteCustomTag(slug: string): void {
		this.customTags.delete(slug);
	}

	/** Get all tags (predefined + custom) as a unified list. */
	listAllTags(): Array<{
		slug: string;
		label: string;
		color: string;
		bgColor: string;
		isCustom?: boolean;
	}> {
		const builtin = listBuiltinTags();
		const custom = Array.from(this.customTags.values()).map((t) => ({
			slug: t.slug,
			label: t.label,
			color: t.color,
			bgColor: `${t.color}26`,
			isCustom: true as const
		}));
		return [...builtin, ...custom];
	}

	// ── Bulk operations ───────────────────────────────────────────────────────

	/** Set color on multiple nodes at once. */
	bulkSetColor(nodeIds: string[], color: NodeColor | null): void {
		for (const id of nodeIds) this.setNodeColor(id, color);
	}

	/** Add a tag to multiple nodes at once. */
	bulkAddTag(nodeIds: string[], tag: string): void {
		for (const id of nodeIds) this.addTag(id, tag);
	}

	/** Remove a tag from multiple nodes at once. */
	bulkRemoveTag(nodeIds: string[], tag: string): void {
		for (const id of nodeIds) this.removeTag(id, tag);
	}

	/** Set bookmark state on multiple nodes at once. */
	bulkSetBookmark(nodeIds: string[], bookmarked: boolean): void {
		for (const id of nodeIds) {
			if (bookmarked) this.bookmarkNode(id);
			else this.unbookmarkNode(id);
		}
	}

	/**
	 * Serialize the full engine state into a JSON-safe snapshot.
	 * Component references (from addCustomNode) are stripped — only node.type is stored.
	 */
	serialize(title?: string): import('./persistence/types.js').ConversationSnapshot {
		return {
			version: 2,
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
			})),
			customTags: Array.from(this.customTags.values()),
			annotations:
				this.annotations.length > 0
					? ($state.snapshot(this.annotations) as Annotation[])
					: undefined
		};
	}

	/** Load a serialized snapshot into this engine instance. Validates input with Zod. */
	fromSnapshot(snapshot: LocalConversationSnapshot): void {
		const result = conversationSnapshotSchema.safeParse(snapshot);
		if (!result.success) {
			throw new Error(
				`Invalid snapshot: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`
			);
		}
		const validated = result.data;
		// Reset all node state
		this.nodes = [];
		this.nodeIndexMap.clear();
		this.childrenIdMap.clear();
		this.activeNodeId = null;
		this.pendingFocusNodeId = null;
		if (validated.nodes.length > 0) {
			this.addNodes(
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
			if (this.getNode(validated.activeNodeId)) {
				this.activeNodeId = validated.activeNodeId;
				this.pendingFocusNodeId = validated.activeNodeId;
			}
		}
		// Restore custom tags (v2+); v1 snapshots have none
		this.customTags.clear();
		if (validated.customTags) {
			for (const tag of validated.customTags) {
				this.customTags.set(tag.slug, tag);
			}
		}
		// Restore annotations (optional field, backward-compatible)
		this.annotations = validated.annotations ? [...validated.annotations] : [];
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
		if (validated.annotations) {
			engine.annotations = [...validated.annotations];
		}
		return engine;
	}

	/** Add a new annotation to the canvas. Supports undo. */
	addAnnotation(annotation: Annotation): void {
		this.captureForUndo();
		this.annotations = [...this.annotations, annotation];
	}

	/** Update an existing annotation by ID. Supports undo. */
	updateAnnotation(id: string, update: Partial<Annotation>): void {
		const idx = this.annotations.findIndex((a) => a.id === id);
		if (idx === -1) return;
		this.captureForUndo();
		const next = [...this.annotations];
		next[idx] = { ...next[idx], ...update } as Annotation;
		this.annotations = next;
	}

	/** Delete an annotation by ID. Supports undo. */
	deleteAnnotation(id: string): void {
		const idx = this.annotations.findIndex((a) => a.id === id);
		if (idx === -1) return;
		this.captureForUndo();
		this.annotations = this.annotations.filter((a) => a.id !== id);
	}

	/** Remove all annotations. Supports undo. */
	clearAnnotations(): void {
		if (this.annotations.length === 0) return;
		this.captureForUndo();
		this.annotations = [];
	}
}
