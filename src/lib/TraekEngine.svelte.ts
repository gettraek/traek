import { browser } from '$app/environment';
import type { SvelteComponent } from 'svelte';

export type NodeStatus = 'streaming' | 'done' | 'error';

export enum BasicNodeTypes {
	TEXT = 'text',
	CODE = 'code',
	THOUGHT = 'thought'
}

export interface Node {
	id: string;
	parentId: string | null;
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

export type CustomTraekNode = Node & {
	component: typeof SvelteComponent;
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
	Record<T, SvelteComponent<TraekNodeComponentProps & Record<string, unknown>>>
>;

export interface MessageNode extends Node {
	content: string;
}

/** Payload for bulk add; id optional (for saved projects). Parent must appear earlier in list or be already in engine. */
export interface AddNodePayload {
	id?: string;
	parentId: string | null;
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
	private config: TraekEngineConfig;
	private pendingHeightLayoutRafId: number | null = null;

	/** Lifecycle callback: fired after a node is added. Wired by TraekCanvas when a registry is present. */
	public onNodeCreated?: (node: Node) => void;
	/** Lifecycle callback: fired before a node is removed. Wired by TraekCanvas when a registry is present. */
	public onNodeDeleting?: (node: Node) => void;

	constructor(config?: Partial<TraekEngineConfig>) {
		this.config = { ...DEFAULT_TRACK_ENGINE_CONFIG, ...config };
	}

	// Der "Context Path" - Gibt nur die relevanten Knoten für den aktuellen Branch zurück
	contextPath = $derived(() => {
		if (!this.activeNodeId) return [];
		const path: Node[] = [];
		let current = this.nodes.find((n) => n.id === this.activeNodeId);

		while (current) {
			path.unshift(current);
			current = this.nodes.find((n) => n.id === current?.parentId);
		}
		return path;
	});

	/** Set by addNode when options.autofocus is true; canvas should center on this node and then clear. */
	public pendingFocusNodeId = $state<string | null>(null);

	addCustomNode(
		component: typeof SvelteComponent,
		props?: Record<string, unknown>,
		role: 'user' | 'assistant' | 'system' = 'user',
		options: {
			type?: Node['type'];
			parentId?: string | null;
			autofocus?: boolean;
			x?: number;
			y?: number;
			data?: unknown;
			/** When true, skip layout for this add; call flushLayoutFromRoot() after a batch. */
			deferLayout?: boolean;
		} = {}
	) {
		const parentId = options.parentId ?? this.activeNodeId;
		const hasExplicitPosition = options.x !== undefined || options.y !== undefined;
		const newNode: CustomTraekNode = {
			component,
			props,
			id: crypto.randomUUID(),
			parentId,
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
		// New node is active unless it's a thought (keep parent/current active so the main new node stays selected)
		if (options.type !== 'thought') {
			this.activeNodeId = newNode.id;
		}

		if (parentId && !options.deferLayout) {
			this.layoutChildren(parentId);
		}

		this.onNodeCreated?.(newNode);

		if (options.autofocus && browser) {
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
			parentId?: string | null;
			autofocus?: boolean;
			x?: number;
			y?: number;
			data?: unknown;
			/** When true, skip layout for this add; call flushLayoutFromRoot() after a batch. */
			deferLayout?: boolean;
		} = {}
	) {
		const parentId = options.parentId ?? this.activeNodeId;
		const hasExplicitPosition = options.x !== undefined || options.y !== undefined;
		const newNode: MessageNode = {
			id: crypto.randomUUID(),
			parentId,
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
		// New node is active unless it's a thought (keep parent/current active so the main new node stays selected)
		if (options.type !== 'thought') {
			this.activeNodeId = newNode.id;
		}

		if (parentId && !options.deferLayout) {
			this.layoutChildren(parentId);
		}

		this.onNodeCreated?.(newNode);

		if (options.autofocus && browser) {
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

		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const added = new Set<string>(this.nodes.map((n) => n.id));
		const sorted: typeof withIds = [];
		let prevSize = 0;
		while (sorted.length < withIds.length) {
			for (const p of withIds) {
				if (added.has(p.id!)) continue;
				const parentIn = p.parentId == null || added.has(p.parentId);
				if (parentIn) {
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
				parentId: p.parentId,
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
		for (const n of newNodes) {
			this.onNodeCreated?.(n);
		}
		const firstRoot = newNodes.find((n) => n.parentId == null);
		if (firstRoot) this.activeNodeId = firstRoot.id;

		this.flushLayoutFromRoot();
		return newNodes;
	}

	/** Focuses on a node and centers the canvas on it. */
	focusOnNode(nodeId: string) {
		const node = this.nodes.find((n) => n.id === nodeId);
		if (node) {
			this.pendingFocusNodeId = nodeId;
		}
	}

	/** Run layout from every root (parentId null). Use after adding nodes with deferLayout. */
	flushLayoutFromRoot() {
		const roots = this.nodes.filter((n) => n.parentId == null);
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

	private buildChildrenMap(): Map<string | null, Node[]> {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const map = new Map<string | null, Node[]>();
		for (const n of this.nodes) {
			const key = n.parentId;
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
		const node = this.nodes.find((n) => n.id === nodeId);
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
		const node = this.nodes.find((n) => n.id === nodeId);
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
		const parent = this.nodes.find((n) => n.id === parentId);
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
		const node = this.nodes.find((n) => n.id === nodeId);
		if (node) {
			Object.assign(node, updates);
		}
	}

	updateNodeHeight(nodeId: string, height: number) {
		const node = this.nodes.find((n) => n.id === nodeId);
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
		const index = this.nodes.findIndex((n) => n.id === nodeId);
		if (index !== -1) {
			const node = this.nodes[index];
			if (node) this.onNodeDeleting?.(node);
			this.nodes.splice(index, 1);
			if (this.activeNodeId === nodeId) {
				this.activeNodeId = null;
			}
		}
	}

	/** Move a node by (dx, dy) in canvas pixels; converts to grid and re-layouts subtree. */
	moveNodeAndDescendants(nodeId: string, dx: number, dy: number) {
		const node = this.nodes.find((n) => n.id === nodeId);
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
		const node = this.nodes.find((n) => n.id === nodeId);
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
		const node = this.nodes.find((n) => n.id === nodeId);
		if (!node) return;
		if (!node.metadata) node.metadata = { x: 0, y: 0 };
		node.metadata.x = Math.round(node.metadata.x ?? 0);
		node.metadata.y = Math.round(node.metadata.y ?? 0);
		this.layoutChildren(nodeId);
	}

	/** Subtree width in grid units: width of the horizontal row of children. */
	private getSubtreeLayoutWidth(nodeId: string): number {
		const node = this.nodes.find((n) => n.id === nodeId);
		if (!node) return 0;
		const step = this.config.gridStep;
		const nodeWidthGrid = this.config.nodeWidth / step;
		const children = this.nodes.filter((n) => n.parentId === nodeId && n.type !== 'thought');
		if (children.length === 0) return nodeWidthGrid;
		const gapXGrid = this.config.layoutGapX / step;
		const total =
			children.reduce((sum, c) => sum + this.getSubtreeLayoutWidth(c.id) + gapXGrid, 0) - gapXGrid;
		return total;
	}

	/** Subtree height in grid units: node on top, then gap, then row of children (max of their subtree heights). */
	private getSubtreeLayoutHeight(nodeId: string): number {
		const node = this.nodes.find((n) => n.id === nodeId);
		if (!node) return 0;
		const step = this.config.gridStep;
		const defaultH = this.config.nodeHeightDefault;
		const gapYGrid = this.config.layoutGapY / step;
		const nodeHGrid = (node.metadata?.height ?? defaultH) / step;
		const children = this.nodes.filter((n) => n.parentId === nodeId && n.type !== 'thought');
		if (children.length === 0) return nodeHGrid;
		const maxChildHeight = Math.max(0, ...children.map((c) => this.getSubtreeLayoutHeight(c.id)));
		return nodeHGrid + gapYGrid + maxChildHeight;
	}

	/**
	 * Layout: parent on top, children in a row below, siblings left/right.
	 * Children share the same Y (below parent); X is centered under parent and spread horizontally.
	 */
	layoutChildren(parentId: string) {
		const parent = this.nodes.find((n) => n.id === parentId);
		if (!parent) return;

		const children = this.nodes.filter((n) => n.parentId === parentId);
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

	branchFrom(nodeId: string) {
		this.activeNodeId = nodeId;
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
				parentId: n.parentId,
				content: (n as MessageNode).content ?? '',
				role: n.role,
				type: n.type,
				status: n.status,
				createdAt: n.createdAt ?? Date.now(),
				metadata: {
					x: n.metadata?.x ?? 0,
					y: n.metadata?.y ?? 0,
					...(n.metadata?.height != null ? { height: n.metadata.height } : {})
				},
				data: n.data
			}))
		};
	}

	/** Create an engine from a serialized snapshot. */
	static fromSnapshot(
		snapshot: import('./persistence/types.js').ConversationSnapshot,
		config?: Partial<TraekEngineConfig>
	): TraekEngine {
		const engine = new TraekEngine({
			...snapshot.config,
			...config
		});
		if (snapshot.nodes.length > 0) {
			engine.addNodes(
				snapshot.nodes.map((n) => ({
					id: n.id,
					parentId: n.parentId,
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
		if (snapshot.activeNodeId != null) {
			const exists = engine.nodes.some((n) => n.id === snapshot.activeNodeId);
			if (exists) {
				engine.activeNodeId = snapshot.activeNodeId;
			}
		}
		return engine;
	}
}
