import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TraekEngine } from '../lib/TraekEngine.svelte';

beforeEach(() => {
	globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
		return setTimeout(() => cb(performance.now()), 0) as unknown as number;
	};
	globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
});

afterEach(() => {
	vi.restoreAllMocks();
});

/**
 * Helper: build a linear chain of nodes.
 * Returns the engine and an array of node IDs in order [root, child1, child2, ...].
 */
function buildLinearChain(length: number): { engine: TraekEngine; ids: string[] } {
	const engine = new TraekEngine();
	const ids: string[] = [];
	for (let i = 0; i < length; i++) {
		const role = i % 2 === 0 ? 'user' : 'assistant';
		const node = engine.addNode(`Message ${i}`, role as 'user' | 'assistant');
		ids.push(node.id);
	}
	return { engine, ids };
}

/**
 * Helper: build a tree with branching.
 *
 * Structure:
 *   root (user)
 *     ├── child-a (assistant)
 *     │     └── grandchild-a (user)
 *     └── child-b (assistant)
 *           └── grandchild-b (user)
 */
function buildBranchingTree(): {
	engine: TraekEngine;
	root: string;
	childA: string;
	childB: string;
	grandchildA: string;
	grandchildB: string;
} {
	const engine = new TraekEngine();
	const root = engine.addNode('Root', 'user', { parentIds: [] });

	engine.activeNodeId = root.id;
	const childA = engine.addNode('Child A', 'assistant');

	engine.activeNodeId = root.id;
	const childB = engine.addNode('Child B', 'assistant');

	engine.activeNodeId = childA.id;
	const grandchildA = engine.addNode('Grandchild A', 'user');

	engine.activeNodeId = childB.id;
	const grandchildB = engine.addNode('Grandchild B', 'user');

	return {
		engine,
		root: root.id,
		childA: childA.id,
		childB: childB.id,
		grandchildA: grandchildA.id,
		grandchildB: grandchildB.id
	};
}

describe('TraekEngine traversal methods', () => {
	describe('getParent', () => {
		it('should return null for root node', () => {
			expect.assertions(1);
			const { engine, ids } = buildLinearChain(1);
			expect(engine.getParent(ids[0])).toBeNull();
		});

		it('should return parent for child node', () => {
			expect.assertions(2);
			const { engine, ids } = buildLinearChain(3);
			const parent = engine.getParent(ids[1]);
			expect(parent).not.toBeNull();
			expect(parent!.id).toBe(ids[0]);
		});

		it('should return null for non-existent node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			expect(engine.getParent('nonexistent')).toBeNull();
		});
	});

	describe('getSiblings', () => {
		it('should return single-element array for only child', () => {
			expect.assertions(2);
			const { engine, ids } = buildLinearChain(2);
			const siblings = engine.getSiblings(ids[1]);
			expect(siblings).toHaveLength(1);
			expect(siblings[0].id).toBe(ids[1]);
		});

		it('should return all siblings including self', () => {
			expect.assertions(3);
			const { engine, childA, childB } = buildBranchingTree();
			const siblings = engine.getSiblings(childA);
			expect(siblings).toHaveLength(2);
			expect(siblings.map((s) => s.id)).toContain(childA);
			expect(siblings.map((s) => s.id)).toContain(childB);
		});

		it('should filter out thought nodes', () => {
			expect.assertions(2);
			const { engine, root, childA } = buildBranchingTree();
			// Add a thought node under root
			engine.activeNodeId = root;
			engine.addNode('Thinking...', 'assistant', { type: 'thought', parentIds: [root] });
			const siblings = engine.getSiblings(childA);
			// Should not include thought
			expect(siblings.every((s) => s.type !== 'thought')).toBe(true);
			expect(siblings).toHaveLength(2);
		});

		it('should return empty array for non-existent node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			expect(engine.getSiblings('nonexistent')).toEqual([]);
		});

		it('should return root siblings (nodes with no parent)', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			const b = engine.addNode('B', 'user', { parentIds: [] });
			const siblings = engine.getSiblings(a.id);
			expect(siblings.map((s) => s.id)).toEqual([a.id, b.id]);
		});
	});

	describe('getDepth', () => {
		it('should return 0 for root node', () => {
			expect.assertions(1);
			const { engine, ids } = buildLinearChain(1);
			expect(engine.getDepth(ids[0])).toBe(0);
		});

		it('should return correct depth for chain', () => {
			expect.assertions(3);
			const { engine, ids } = buildLinearChain(4);
			expect(engine.getDepth(ids[0])).toBe(0);
			expect(engine.getDepth(ids[1])).toBe(1);
			expect(engine.getDepth(ids[3])).toBe(3);
		});

		it('should return -1 for non-existent node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			expect(engine.getDepth('nonexistent')).toBe(-1);
		});

		it('should return correct depth in branching tree', () => {
			expect.assertions(2);
			const { engine, grandchildA, grandchildB } = buildBranchingTree();
			expect(engine.getDepth(grandchildA)).toBe(2);
			expect(engine.getDepth(grandchildB)).toBe(2);
		});
	});

	describe('getMaxDepth', () => {
		it('should return -1 for empty tree', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			expect(engine.getMaxDepth()).toBe(-1);
		});

		it('should return 0 for single node', () => {
			expect.assertions(1);
			const { engine } = buildLinearChain(1);
			expect(engine.getMaxDepth()).toBe(0);
		});

		it('should return correct max depth for chain', () => {
			expect.assertions(1);
			const { engine } = buildLinearChain(5);
			expect(engine.getMaxDepth()).toBe(4);
		});

		it('should return correct max depth for branching tree', () => {
			expect.assertions(1);
			const { engine } = buildBranchingTree();
			// root(0) -> child(1) -> grandchild(2)
			expect(engine.getMaxDepth()).toBe(2);
		});

		it('should ignore thought nodes when calculating max depth', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			engine.activeNodeId = root.id;
			// Add only thought nodes - should return 0 (root depth)
			engine.addNode('Thought 1', 'assistant', { type: 'thought', parentIds: [root.id] });
			engine.addNode('Thought 2', 'assistant', { type: 'thought', parentIds: [root.id] });
			expect(engine.getMaxDepth()).toBe(0);
		});

		it('should handle tree with thought nodes interspersed', () => {
			expect.assertions(1);
			const { engine, root, childA } = buildBranchingTree();
			// Add thought nodes at various levels
			engine.addNode('Thought at root', 'assistant', { type: 'thought', parentIds: [root] });
			engine.addNode('Thought at child', 'assistant', { type: 'thought', parentIds: [childA] });
			// Max depth should still be 2 (grandchild level)
			expect(engine.getMaxDepth()).toBe(2);
		});
	});

	describe('getActiveLeaf', () => {
		it('should return the node itself if it is a leaf', () => {
			expect.assertions(2);
			const { engine, ids } = buildLinearChain(1);
			const leaf = engine.getActiveLeaf(ids[0]);
			expect(leaf).toBeDefined();
			expect(leaf?.id).toBe(ids[0]);
		});

		it('should follow first child down to leaf', () => {
			expect.assertions(2);
			const { engine, ids } = buildLinearChain(4);
			const leaf = engine.getActiveLeaf(ids[0]);
			expect(leaf).toBeDefined();
			expect(leaf?.id).toBe(ids[3]);
		});

		it('should respect lastVisitedChildren hints', () => {
			expect.assertions(2);
			const { engine, root, childB, grandchildB } = buildBranchingTree();
			const hints = new Map<string, string>();
			hints.set(root, childB);
			const leaf = engine.getActiveLeaf(root, hints);
			expect(leaf).toBeDefined();
			expect(leaf?.id).toBe(grandchildB);
		});

		it('should fall back to first child if hint is invalid', () => {
			expect.assertions(2);
			const { engine, root, grandchildA } = buildBranchingTree();
			const hints = new Map<string, string>();
			hints.set(root, 'nonexistent-id');
			const leaf = engine.getActiveLeaf(root, hints);
			expect(leaf).toBeDefined();
			expect(leaf?.id).toBe(grandchildA);
		});

		it('should follow multiple levels of lastVisitedChildren hints', () => {
			expect.assertions(2);
			// Build tree: root -> childB -> grandchildB -> greatGrandchild
			const { engine, root, childB, grandchildB } = buildBranchingTree();
			engine.activeNodeId = grandchildB;
			const greatGrandchild = engine.addNode('Great Grandchild', 'assistant');

			const hints = new Map<string, string>();
			hints.set(root, childB);
			hints.set(childB, grandchildB);
			hints.set(grandchildB, greatGrandchild.id);

			const leaf = engine.getActiveLeaf(root, hints);
			expect(leaf).toBeDefined();
			expect(leaf?.id).toBe(greatGrandchild.id);
		});

		it('should filter out thought nodes when traversing', () => {
			expect.assertions(2);
			const { engine, root, childA, grandchildA } = buildBranchingTree();
			// Add thought node between childA and grandchildA
			engine.activeNodeId = childA;
			engine.addNode('Thinking...', 'assistant', { type: 'thought', parentIds: [childA] });

			// Should skip thought and reach grandchildA
			const leaf = engine.getActiveLeaf(root);
			expect(leaf).toBeDefined();
			expect(leaf?.id).toBe(grandchildA);
		});

		it('should return undefined for non-existent node', () => {
			expect.assertions(1);
			const { engine } = buildLinearChain(1);
			const leaf = engine.getActiveLeaf('non-existent-id');
			expect(leaf).toBeUndefined();
		});
	});

	describe('getSiblingIndex', () => {
		it('should return correct index and total', () => {
			expect.assertions(2);
			const { engine, childA, childB } = buildBranchingTree();
			const infoA = engine.getSiblingIndex(childA);
			const infoB = engine.getSiblingIndex(childB);
			expect(infoA).toEqual({ index: 0, total: 2 });
			expect(infoB).toEqual({ index: 1, total: 2 });
		});

		it('should return { -1, 0 } for non-existent node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			expect(engine.getSiblingIndex('nonexistent')).toEqual({ index: -1, total: 0 });
		});

		it('should return { 0, 1 } for only child', () => {
			expect.assertions(1);
			const { engine, ids } = buildLinearChain(2);
			expect(engine.getSiblingIndex(ids[1])).toEqual({ index: 0, total: 1 });
		});
	});

	describe('multi-parent nodes', () => {
		it('should use first parent in parentIds for getParent', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			const b = engine.addNode('B', 'user', { parentIds: [] });
			// Node with two parents
			const child = engine.addNode('Child', 'assistant', { parentIds: [a.id, b.id] });

			const parent = engine.getParent(child.id);
			expect(parent).not.toBeNull();
			expect(parent!.id).toBe(a.id); // First parent
		});

		it('should use first parent for getSiblings', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			const b = engine.addNode('B', 'user', { parentIds: [] });
			// Two children of A
			const child1 = engine.addNode('Child 1', 'assistant', { parentIds: [a.id] });
			// Multi-parent child (first parent is A)
			const child2 = engine.addNode('Child 2', 'assistant', { parentIds: [a.id, b.id] });

			const siblings = engine.getSiblings(child2.id);
			// Should include both children of A
			expect(siblings.map((s) => s.id)).toEqual([child1.id, child2.id]);
		});

		it('should calculate depth using first parent chain', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			engine.activeNodeId = root.id;
			const child = engine.addNode('Child', 'assistant');

			// Add alternate path (longer)
			const alt = engine.addNode('Alt', 'user', { parentIds: [] });
			engine.activeNodeId = alt.id;
			const altChild = engine.addNode('Alt Child', 'assistant');

			// Multi-parent node: first parent is child (depth 2), second is altChild (depth 2)
			const multiParent = engine.addNode('Multi', 'user', { parentIds: [child.id, altChild.id] });

			// Depth should follow first parent (root -> child -> multiParent = depth 2)
			expect(engine.getDepth(multiParent.id)).toBe(2);
		});
	});
});
