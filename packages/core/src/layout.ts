import type { Node } from './types.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type LayoutMode =
	| 'tree-vertical' // Default: children below parent
	| 'tree-horizontal' // Children to the right of parent
	| 'compact' // Tight spacing, minimize whitespace
	| 'force-directed' // Spring simulation
	| 'mind-map' // Radial tree from center root
	| 'timeline' // Linear x-axis by tree depth, y by sibling order
	| 'radial'; // Concentric rings by depth

export interface NodePosition {
	nodeId: string;
	x: number; // grid units
	y: number; // grid units
}

export interface LayoutConfig {
	nodeWidthGrid: number; // nodeWidth / gridStep
	nodeHGrid: number; // nodeHeightDefault / gridStep
	gapXGrid: number; // layoutGapX / gridStep
	gapYGrid: number; // layoutGapY / gridStep
}

export interface LayoutInput {
	nodes: Node[];
	/** parentId (or null for roots) → child node IDs */
	childrenMap: Map<string | null, string[]>;
	nodeMap: Map<string, Node>;
	config: LayoutConfig;
}

export const LAYOUT_MODE_LABELS: Record<LayoutMode, string> = {
	'tree-vertical': 'Tree (Vertical)',
	'tree-horizontal': 'Tree (Horizontal)',
	compact: 'Compact',
	'force-directed': 'Force-Directed',
	'mind-map': 'Mind Map',
	timeline: 'Timeline',
	radial: 'Radial'
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLayoutNodes(input: LayoutInput): Node[] {
	return input.nodes.filter((n) => n.type !== 'thought');
}

function getRoots(input: LayoutInput): Node[] {
	return getLayoutNodes(input).filter((n) => !n.parentIds[0] || !input.nodeMap.has(n.parentIds[0]));
}

function getChildren(nodeId: string, input: LayoutInput): Node[] {
	const ids = input.childrenMap.get(nodeId) ?? [];
	return ids
		.map((id) => input.nodeMap.get(id))
		.filter((n): n is Node => !!n && n.type !== 'thought');
}

function subtreeWidth(nodeId: string, input: LayoutInput): number {
	const { nodeWidthGrid, gapXGrid } = input.config;
	const children = getChildren(nodeId, input);
	if (children.length === 0) return nodeWidthGrid;
	const total =
		children.reduce((sum, c) => sum + subtreeWidth(c.id, input) + gapXGrid, 0) - gapXGrid;
	return Math.max(total, nodeWidthGrid);
}

// ── Tree Vertical ─────────────────────────────────────────────────────────────

function treeVertical(input: LayoutInput): NodePosition[] {
	const positions: NodePosition[] = [];
	const { nodeWidthGrid, nodeHGrid, gapXGrid, gapYGrid } = input.config;

	function placeSubtree(nodeId: string, x: number, y: number): void {
		positions.push({ nodeId, x: Math.round(x), y: Math.round(y) });
		const children = getChildren(nodeId, input);
		if (children.length === 0) return;

		const totalW =
			children.reduce((sum, c) => sum + subtreeWidth(c.id, input) + gapXGrid, 0) - gapXGrid;
		const startX = x + nodeWidthGrid / 2 - totalW / 2;
		let cx = startX;
		const cy = y + nodeHGrid + gapYGrid;

		for (const child of children) {
			const sw = subtreeWidth(child.id, input);
			const slotCenterX = cx + sw / 2;
			placeSubtree(child.id, slotCenterX - nodeWidthGrid / 2, cy);
			cx += sw + gapXGrid;
		}
	}

	let rootX = 0;
	for (const root of getRoots(input)) {
		placeSubtree(root.id, rootX, 0);
		rootX += subtreeWidth(root.id, input) + gapXGrid * 3;
	}
	return positions;
}

// ── Tree Horizontal ───────────────────────────────────────────────────────────
// Rotates 90°: parent left, children to the right

function treeHorizontal(input: LayoutInput): NodePosition[] {
	const positions: NodePosition[] = [];
	const { nodeWidthGrid, nodeHGrid, gapXGrid, gapYGrid } = input.config;

	function subtreeH(nodeId: string): number {
		const children = getChildren(nodeId, input);
		if (children.length === 0) return nodeHGrid;
		return children.reduce((sum, c) => sum + subtreeH(c.id) + gapXGrid, 0) - gapXGrid;
	}

	function placeSubtree(nodeId: string, x: number, y: number): void {
		positions.push({ nodeId, x: Math.round(x), y: Math.round(y) });
		const children = getChildren(nodeId, input);
		if (children.length === 0) return;

		const totalH = children.reduce((sum, c) => sum + subtreeH(c.id) + gapXGrid, 0) - gapXGrid;
		const startY = y + nodeHGrid / 2 - totalH / 2;
		const cx = x + nodeWidthGrid + gapYGrid;
		let cy = startY;

		for (const child of children) {
			const sh = subtreeH(child.id);
			const slotCenterY = cy + sh / 2;
			placeSubtree(child.id, cx, slotCenterY - nodeHGrid / 2);
			cy += sh + gapXGrid;
		}
	}

	let rootY = 0;
	for (const root of getRoots(input)) {
		placeSubtree(root.id, 0, rootY);
		rootY += subtreeH(root.id) + gapYGrid * 3;
	}
	return positions;
}

// ── Compact ───────────────────────────────────────────────────────────────────
// Same as tree-vertical but with tighter gaps (half spacing)

function compact(input: LayoutInput): NodePosition[] {
	const compactInput: LayoutInput = {
		...input,
		config: {
			...input.config,
			gapXGrid: Math.max(1, Math.round(input.config.gapXGrid / 2)),
			gapYGrid: Math.max(1, Math.round(input.config.gapYGrid / 2))
		}
	};
	return treeVertical(compactInput);
}

// ── Force-Directed ────────────────────────────────────────────────────────────
// Simple Fruchterman-Reingold spring simulation (15 iterations)

function forceDirected(input: LayoutInput): NodePosition[] {
	const nodes = getLayoutNodes(input);
	if (nodes.length === 0) return [];

	const { nodeWidthGrid, gapXGrid } = input.config;
	const idealDist = nodeWidthGrid + gapXGrid;

	const pos = new Map<string, { x: number; y: number }>(
		nodes.map((n) => [n.id, { x: n.metadata?.x ?? 0, y: n.metadata?.y ?? 0 }])
	);

	const edges: [string, string][] = [];
	for (const n of nodes) {
		const parentId = n.parentIds[0];
		if (parentId && pos.has(parentId)) {
			edges.push([parentId, n.id]);
		}
	}

	const iterations = 15;
	const k = idealDist;
	const area = Math.max(10, nodes.length) * k * k;
	let temperature = Math.sqrt(area) / 2;
	const cooling = temperature / (iterations + 1);

	for (let iter = 0; iter < iterations; iter++) {
		const disp = new Map<string, { dx: number; dy: number }>(
			nodes.map((n) => [n.id, { dx: 0, dy: 0 }])
		);

		for (let i = 0; i < nodes.length; i++) {
			for (let j = i + 1; j < nodes.length; j++) {
				const u = nodes[i].id;
				const v = nodes[j].id;
				const pu = pos.get(u)!;
				const pv = pos.get(v)!;
				const dx = pu.x - pv.x || 0.01;
				const dy = pu.y - pv.y || 0.01;
				const dist = Math.max(0.1, Math.sqrt(dx * dx + dy * dy));
				const repulse = (k * k) / dist;
				const du = disp.get(u)!;
				const dv = disp.get(v)!;
				du.dx += (dx / dist) * repulse;
				du.dy += (dy / dist) * repulse;
				dv.dx -= (dx / dist) * repulse;
				dv.dy -= (dy / dist) * repulse;
			}
		}

		for (const [u, v] of edges) {
			const pu = pos.get(u);
			const pv = pos.get(v);
			if (!pu || !pv) continue;
			const dx = pu.x - pv.x;
			const dy = pu.y - pv.y;
			const dist = Math.max(0.1, Math.sqrt(dx * dx + dy * dy));
			const attract = (dist * dist) / k;
			const du = disp.get(u)!;
			const dv = disp.get(v)!;
			du.dx -= (dx / dist) * attract;
			du.dy -= (dy / dist) * attract;
			dv.dx += (dx / dist) * attract;
			dv.dy += (dy / dist) * attract;
		}

		for (const n of nodes) {
			const p = pos.get(n.id)!;
			const d = disp.get(n.id)!;
			const dispLen = Math.max(0.1, Math.sqrt(d.dx * d.dx + d.dy * d.dy));
			p.x += (d.dx / dispLen) * Math.min(dispLen, temperature);
			p.y += (d.dy / dispLen) * Math.min(dispLen, temperature);
		}

		temperature -= cooling;
	}

	return Array.from(pos.entries()).map(([nodeId, p]) => ({
		nodeId,
		x: Math.round(p.x),
		y: Math.round(p.y)
	}));
}

// ── Mind Map ──────────────────────────────────────────────────────────────────
// Radial tree: root at center, children on expanding arcs

function mindMap(input: LayoutInput): NodePosition[] {
	const positions: NodePosition[] = [];
	const { nodeWidthGrid, nodeHGrid } = input.config;
	const nodes = getLayoutNodes(input);
	if (nodes.length === 0) return [];

	const roots = getRoots(input);
	const totalDepth = (nodeId: string): number => {
		const children = getChildren(nodeId, input);
		if (children.length === 0) return 1;
		return 1 + Math.max(...children.map((c) => totalDepth(c.id)));
	};

	const RADIUS_PER_DEPTH = nodeWidthGrid + 8;

	function placeRadial(
		nodeId: string,
		cx: number,
		cy: number,
		angleStart: number,
		angleEnd: number,
		depth: number
	): void {
		const angle = (angleStart + angleEnd) / 2;
		const radius = depth * RADIUS_PER_DEPTH;
		const x = depth === 0 ? cx : cx + Math.cos(angle) * radius - nodeWidthGrid / 2;
		const y = depth === 0 ? cy : cy + Math.sin(angle) * radius - nodeHGrid / 2;
		positions.push({ nodeId, x: Math.round(x), y: Math.round(y) });

		const children = getChildren(nodeId, input);
		if (children.length === 0) return;

		const span = angleEnd - angleStart;
		let a = angleStart;
		for (const child of children) {
			const slice = span / children.length;
			placeRadial(child.id, cx, cy, a, a + slice, depth + 1);
			a += slice;
		}
	}

	let cx = 0;
	for (const root of roots) {
		placeRadial(root.id, cx, 0, -Math.PI, Math.PI, 0);
		cx += (totalDepth(root.id) + 2) * RADIUS_PER_DEPTH * 2;
	}
	return positions;
}

// ── Timeline ──────────────────────────────────────────────────────────────────
// X = tree depth (left to right), Y = sibling index within depth level

function timeline(input: LayoutInput): NodePosition[] {
	const positions: NodePosition[] = [];
	const { nodeWidthGrid, nodeHGrid, gapXGrid, gapYGrid } = input.config;
	const nodes = getLayoutNodes(input);

	const depth = new Map<string, number>();
	const queue: { id: string; d: number }[] = getRoots(input).map((n) => ({ id: n.id, d: 0 }));
	while (queue.length > 0) {
		const { id, d } = queue.shift()!;
		depth.set(id, d);
		for (const child of getChildren(id, input)) {
			if (!depth.has(child.id)) queue.push({ id: child.id, d: d + 1 });
		}
	}

	const byDepth = new Map<number, string[]>();
	for (const n of nodes) {
		const d = depth.get(n.id) ?? 0;
		const arr = byDepth.get(d) ?? [];
		arr.push(n.id);
		byDepth.set(d, arr);
	}

	const colW = nodeWidthGrid + gapXGrid;
	const rowH = nodeHGrid + gapYGrid;
	for (const [d, ids] of byDepth) {
		ids.forEach((id, i) => {
			positions.push({ nodeId: id, x: Math.round(d * colW), y: Math.round(i * rowH) });
		});
	}

	return positions;
}

// ── Radial ────────────────────────────────────────────────────────────────────
// Concentric rings: depth 0 at center, each depth on a wider ring

function radial(input: LayoutInput): NodePosition[] {
	const positions: NodePosition[] = [];
	const { nodeWidthGrid, nodeHGrid } = input.config;
	const nodes = getLayoutNodes(input);
	if (nodes.length === 0) return [];

	const depth = new Map<string, number>();
	const queue: { id: string; d: number }[] = getRoots(input).map((n) => ({ id: n.id, d: 0 }));
	while (queue.length > 0) {
		const { id, d } = queue.shift()!;
		depth.set(id, d);
		for (const child of getChildren(id, input)) {
			if (!depth.has(child.id)) queue.push({ id: child.id, d: d + 1 });
		}
	}

	const byDepth = new Map<number, string[]>();
	for (const n of nodes) {
		const d = depth.get(n.id) ?? 0;
		const arr = byDepth.get(d) ?? [];
		arr.push(n.id);
		byDepth.set(d, arr);
	}

	const cx = 0;
	const cy = 0;
	const RING_RADIUS = nodeWidthGrid + 10;

	for (const [d, ids] of byDepth) {
		if (d === 0) {
			ids.forEach((id) =>
				positions.push({
					nodeId: id,
					x: Math.round(cx - nodeWidthGrid / 2),
					y: Math.round(cy - nodeHGrid / 2)
				})
			);
			continue;
		}
		const radius = d * RING_RADIUS;
		ids.forEach((id, i) => {
			const angle = (2 * Math.PI * i) / ids.length - Math.PI / 2;
			positions.push({
				nodeId: id,
				x: Math.round(cx + Math.cos(angle) * radius - nodeWidthGrid / 2),
				y: Math.round(cy + Math.sin(angle) * radius - nodeHGrid / 2)
			});
		});
	}

	return positions;
}

// ── Main Dispatcher ───────────────────────────────────────────────────────────

export function computeLayout(mode: LayoutMode, input: LayoutInput): NodePosition[] {
	switch (mode) {
		case 'tree-vertical':
			return treeVertical(input);
		case 'tree-horizontal':
			return treeHorizontal(input);
		case 'compact':
			return compact(input);
		case 'force-directed':
			return forceDirected(input);
		case 'mind-map':
			return mindMap(input);
		case 'timeline':
			return timeline(input);
		case 'radial':
			return radial(input);
		default:
			return treeVertical(input);
	}
}

/**
 * Build a LayoutInput from a flat nodes array and a children-ID map.
 * Convenience helper for engine internals.
 */
export function buildLayoutInput(
	nodes: Node[],
	childrenIdMap: Map<string | null, string[]>,
	config: LayoutConfig
): LayoutInput {
	const nodeMap = new Map<string, Node>();
	const childrenMap = new Map<string | null, string[]>();

	for (const n of nodes) {
		nodeMap.set(n.id, n);
	}

	for (const [parentId, childIds] of childrenIdMap) {
		childrenMap.set(parentId, [...childIds]);
	}

	return { nodes, childrenMap, nodeMap, config };
}
