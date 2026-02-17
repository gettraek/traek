import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	TraekEngine,
	wouldCreateCycle,
	type MessageNode,
	type Node
} from '../lib/TraekEngine.svelte';

beforeEach(() => {
	globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
		return setTimeout(() => cb(performance.now()), 0) as unknown as number;
	};
	globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('TraekEngine', () => {
	describe('constructor', () => {
		it('should create engine with default state', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			expect(engine.nodes).toEqual([]);
			expect(engine.activeNodeId).toBeNull();
		});
	});

	describe('addNode', () => {
		it('should create node with correct defaults', () => {
			expect.assertions(5);
			const engine = new TraekEngine();
			const node = engine.addNode('Hello', 'user') as MessageNode;
			expect(node.content).toBe('Hello');
			expect(node.role).toBe('user');
			expect(node.type).toBe('text');
			expect(node.id).toBeDefined();
			expect(node.parentIds).toEqual([]);
		});

		it('should set activeNodeId to new node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const node = engine.addNode('Hello', 'user');
			expect(engine.activeNodeId).toBe(node.id);
		});

		it('should assign parentIds from activeNodeId', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const parent = engine.addNode('Parent', 'user');
			const child = engine.addNode('Child', 'assistant');
			expect(child.parentIds).toEqual([parent.id]);
		});

		it('should respect explicit parentIds', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			const b = engine.addNode('B', 'user', { parentIds: [] });
			const c = engine.addNode('C', 'assistant', { parentIds: [a.id, b.id] });
			expect(c.parentIds).toEqual([a.id, b.id]);
		});

		it('should handle root nodes with no parent', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			expect(root.parentIds).toEqual([]);
		});

		it('should default type to text', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const node = engine.addNode('Hello', 'user');
			expect(node.type).toBe('text');
		});

		it('should respect custom type', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const node = engine.addNode('code', 'user', { type: 'code' });
			expect(node.type).toBe('code');
		});

		it('should not change activeNodeId for thought nodes', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const parent = engine.addNode('Parent', 'user');
			engine.addNode('Thinking...', 'assistant', { type: 'thought' });
			expect(engine.activeNodeId).toBe(parent.id);
		});

		it('should skip layout when deferLayout is true', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			const child = engine.addNode('Child', 'assistant', {
				parentIds: [parent.id],
				deferLayout: true
			});
			expect(child.metadata?.x).toBe(0);
			expect(child.metadata?.y).toBe(0);
		});

		it('should set explicit position and mark manualPosition', () => {
			expect.assertions(3);
			const engine = new TraekEngine();
			const node = engine.addNode('Test', 'user', { x: 10, y: 20 });
			expect(node.metadata?.x).toBe(10);
			expect(node.metadata?.y).toBe(20);
			expect(node.metadata?.manualPosition).toBe(true);
		});

		it('should fire onNodeCreated callback', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const callback = vi.fn();
			engine.onNodeCreated = callback;
			const node = engine.addNode('Hello', 'user');
			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(node);
		});

		it('should set createdAt timestamp', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const before = Date.now();
			const node = engine.addNode('Hello', 'user');
			expect(node.createdAt).toBeGreaterThanOrEqual(before);
		});

		it('should store data payload', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const data = { custom: 'value' };
			const node = engine.addNode('Test', 'user', { data });
			expect(node.data).toEqual({ custom: 'value' });
		});

		it('should add node to engine nodes array', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			engine.addNode('Hello', 'user');
			expect(engine.nodes).toHaveLength(1);
		});
	});

	describe('addNodes', () => {
		it('should add multiple nodes at once', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const nodes = engine.addNodes([
				{ parentIds: [], content: 'A', role: 'user' },
				{ parentIds: [], content: 'B', role: 'user' }
			]);
			expect(nodes).toHaveLength(2);
		});

		it('should return empty array for empty input', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const nodes = engine.addNodes([]);
			expect(nodes).toHaveLength(0);
		});

		it('should preserve provided IDs', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const nodes = engine.addNodes([
				{ id: 'custom-1', parentIds: [], content: 'A', role: 'user' },
				{ id: 'custom-2', parentIds: ['custom-1'], content: 'B', role: 'assistant' }
			]);
			expect(nodes[0].id).toBe('custom-1');
			expect(nodes[1].id).toBe('custom-2');
		});

		it('should handle parent references within batch', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const nodes = engine.addNodes([
				{ id: 'p1', parentIds: [], content: 'Parent', role: 'user' },
				{ id: 'c1', parentIds: ['p1'], content: 'Child', role: 'assistant' }
			]);
			expect(nodes[1].parentIds).toEqual(['p1']);
		});

		it('should topologically sort to ensure parents before children', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const nodes = engine.addNodes([
				{ id: 'child', parentIds: ['parent'], content: 'Child', role: 'assistant' },
				{ id: 'parent', parentIds: [], content: 'Parent', role: 'user' }
			]);
			expect(nodes[0].id).toBe('parent');
			expect(nodes[1].id).toBe('child');
		});

		it('should set activeNodeId to first root', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			engine.addNodes([
				{ id: 'root1', parentIds: [], content: 'Root 1', role: 'user' },
				{ id: 'child1', parentIds: ['root1'], content: 'Child', role: 'assistant' }
			]);
			expect(engine.activeNodeId).toBe('root1');
		});

		it('should fire onNodeCreated for each node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const callback = vi.fn();
			engine.onNodeCreated = callback;
			engine.addNodes([
				{ id: 'a', parentIds: [], content: 'A', role: 'user' },
				{ id: 'b', parentIds: ['a'], content: 'B', role: 'assistant' }
			]);
			expect(callback).toHaveBeenCalledTimes(2);
		});

		it('should default type to text', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const nodes = engine.addNodes([{ parentIds: [], content: 'A', role: 'user' }]);
			expect(nodes[0].type).toBe('text');
		});

		it('should handle explicit metadata positions', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const nodes = engine.addNodes([
				{
					id: 'a',
					parentIds: [],
					content: 'A',
					role: 'user',
					metadata: { x: 5, y: 10 }
				}
			]);
			expect(nodes[0].metadata?.x).toBe(5);
			expect(nodes[0].metadata?.y).toBe(10);
		});

		it('should generate IDs when not provided', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const nodes = engine.addNodes([{ parentIds: [], content: 'A', role: 'user' }]);
			expect(nodes[0].id).toBeDefined();
		});
	});

	describe('deleteNode', () => {
		it('should remove the node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const node = engine.addNode('Test', 'user');
			engine.deleteNode(node.id);
			expect(engine.nodes).toHaveLength(0);
		});

		it('should clear activeNodeId if deleted node was active', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const node = engine.addNode('Test', 'user');
			engine.deleteNode(node.id);
			expect(engine.activeNodeId).toBeNull();
		});

		it('should not clear activeNodeId if another node was active', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			const b = engine.addNode('B', 'user', { parentIds: [] });
			engine.activeNodeId = a.id;
			engine.deleteNode(b.id);
			expect(engine.activeNodeId).toBe(a.id);
		});

		it('should fire onNodeDeleting callback', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const callback = vi.fn();
			engine.onNodeDeleting = callback;
			const node = engine.addNode('Test', 'user');
			engine.deleteNode(node.id);
			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(node);
		});

		it('should be a no-op for nonexistent node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			engine.addNode('Test', 'user');
			engine.deleteNode('nonexistent');
			expect(engine.nodes).toHaveLength(1);
		});
	});

	describe('deleteNodeAndDescendants', () => {
		it('should remove node and all descendants', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			const child = engine.addNode('Child', 'assistant', { parentIds: [root.id] });
			engine.addNode('Grandchild', 'user', { parentIds: [child.id] });
			engine.deleteNodeAndDescendants(root.id);
			expect(engine.nodes).toHaveLength(0);
		});

		it('should navigate to first parent of deleted node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			const child = engine.addNode('Child', 'assistant', { parentIds: [root.id] });
			const grandchild = engine.addNode('Grandchild', 'user', { parentIds: [child.id] });
			engine.activeNodeId = grandchild.id;
			engine.deleteNodeAndDescendants(child.id);
			expect(engine.activeNodeId).toBe(root.id);
		});

		it('should set activeNodeId to null if no parent exists', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			engine.activeNodeId = root.id;
			engine.deleteNodeAndDescendants(root.id);
			expect(engine.activeNodeId).toBeNull();
		});

		it('should also delete nodes that reference deleted node as parent', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			const b = engine.addNode('B', 'user', { parentIds: [] });
			// C has both A and B as parents — still considered descendant of A
			engine.addNode('C', 'assistant', { parentIds: [a.id, b.id] });
			engine.deleteNodeAndDescendants(a.id);
			// C is deleted because it's a descendant of A (parentIds includes A)
			expect(engine.nodes).toHaveLength(1);
			expect(engine.nodes[0].id).toBe(b.id);
		});

		it('should fire onNodeDeleting for each deleted node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const callback = vi.fn();
			engine.onNodeDeleting = callback;
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			engine.addNode('Child', 'assistant', { parentIds: [root.id] });
			engine.deleteNodeAndDescendants(root.id);
			expect(callback).toHaveBeenCalledTimes(2);
		});

		it('should handle complex tree with multiple branches', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			const a = engine.addNode('A', 'assistant', { parentIds: [root.id] });
			engine.addNode('B', 'assistant', { parentIds: [root.id] });
			engine.addNode('A-child', 'user', { parentIds: [a.id] });
			engine.addNode('B-child', 'user', { parentIds: [engine.nodes[2].id] });
			engine.deleteNodeAndDescendants(a.id);
			expect(engine.nodes).toHaveLength(3);
			expect(engine.nodes.every((n) => n.id !== a.id)).toBe(true);
		});

		it('should only delete the targeted subtree', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			const kept = engine.addNode('Kept', 'assistant', { parentIds: [root.id] });
			const deleted = engine.addNode('Deleted', 'assistant', { parentIds: [root.id] });
			engine.addNode('Deleted-child', 'user', { parentIds: [deleted.id] });
			engine.deleteNodeAndDescendants(deleted.id);
			expect(engine.nodes).toHaveLength(2);
			expect(engine.nodes.some((n) => n.id === kept.id)).toBe(true);
		});
	});

	describe('duplicateNode', () => {
		it('should create a sibling copy with same parents, role, type, content', () => {
			expect.assertions(4);
			const engine = new TraekEngine();
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			const original = engine.addNode('Original', 'assistant', {
				parentIds: [parent.id]
			}) as MessageNode;
			const copy = engine.duplicateNode(original.id) as MessageNode;
			expect(copy).not.toBeNull();
			expect(copy.content).toBe('Original');
			expect(copy.role).toBe('assistant');
			expect(copy.parentIds).toEqual([parent.id]);
		});

		it('should return null for nonexistent node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const result = engine.duplicateNode('nonexistent');
			expect(result).toBeNull();
		});

		it('should clear manualPosition on duplicate', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const node = engine.addNode('Test', 'user', { x: 10, y: 20 });
			const copy = engine.duplicateNode(node.id);
			expect(copy?.metadata?.manualPosition).toBeUndefined();
		});

		it('should set activeNodeId to the new node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			engine.addNode('Test', 'user');
			const copy = engine.duplicateNode(engine.nodes[0].id);
			expect(engine.activeNodeId).toBe(copy?.id);
		});

		it('should create a different ID for the copy', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const node = engine.addNode('Test', 'user');
			const copy = engine.duplicateNode(node.id);
			expect(copy?.id).not.toBe(node.id);
		});

		it('should duplicate data payload via structuredClone', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const data = { nested: { value: 42 } };
			const node = engine.addNode('Test', 'user', { data });
			const copy = engine.duplicateNode(node.id);
			expect(copy?.data).toEqual({ nested: { value: 42 } });
			expect(copy?.data).not.toBe(node.data);
		});
	});

	describe('updateNode', () => {
		it('should merge updates into existing node', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const node = engine.addNode('Original', 'user') as MessageNode;
			engine.updateNode(node.id, { content: 'Updated', status: 'done' });
			const updated = engine.nodes.find((n) => n.id === node.id) as MessageNode;
			expect(updated.content).toBe('Updated');
			expect(updated.status).toBe('done');
		});

		it('should be a no-op for nonexistent ID', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			engine.addNode('Test', 'user');
			engine.updateNode('nonexistent', { content: 'Updated' });
			expect(engine.nodes).toHaveLength(1);
		});

		it('should preserve existing fields', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const node = engine.addNode('Original', 'user') as MessageNode;
			engine.updateNode(node.id, { status: 'done' });
			const updated = engine.nodes.find((n) => n.id === node.id) as MessageNode;
			expect(updated.content).toBe('Original');
			expect(updated.role).toBe('user');
		});
	});

	describe('updateNodeHeight', () => {
		it('should update metadata.height', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const node = engine.addNode('Test', 'user');
			engine.updateNodeHeight(node.id, 200);
			expect(node.metadata?.height).toBe(200);
		});

		it('should ignore changes below threshold', () => {
			expect.assertions(1);
			const engine = new TraekEngine({ heightChangeThreshold: 5 });
			const node = engine.addNode('Test', 'user');
			const originalHeight = node.metadata?.height;
			engine.updateNodeHeight(node.id, (originalHeight ?? 100) + 2);
			expect(node.metadata?.height).toBe(originalHeight);
		});

		it('should trigger layout via requestAnimationFrame', () => {
			expect.assertions(1);
			const rafSpy = vi.fn((cb: FrameRequestCallback) => {
				return setTimeout(() => cb(performance.now()), 0) as unknown as number;
			});
			globalThis.requestAnimationFrame = rafSpy;
			const engine = new TraekEngine();
			engine.addNode('Test', 'user');
			engine.updateNodeHeight(engine.nodes[0].id, 500);
			expect(rafSpy).toHaveBeenCalledTimes(1);
		});

		it('should be a no-op for nonexistent node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			engine.updateNodeHeight('nonexistent', 200);
			expect(engine.nodes).toHaveLength(0);
		});

		it('should batch multiple height updates into one RAF', () => {
			expect.assertions(1);
			const rafSpy = vi.fn((cb: FrameRequestCallback) => {
				return setTimeout(() => cb(performance.now()), 0) as unknown as number;
			});
			globalThis.requestAnimationFrame = rafSpy;
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			const b = engine.addNode('B', 'user', { parentIds: [] });
			engine.updateNodeHeight(a.id, 500);
			engine.updateNodeHeight(b.id, 600);
			expect(rafSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe('layoutChildren', () => {
		it('should position children below parent', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			const child = engine.addNode('Child', 'assistant', { parentIds: [parent.id] });
			const parentY = parent.metadata?.y ?? 0;
			const childY = child.metadata?.y ?? 0;
			expect(childY).toBeGreaterThan(parentY);
		});

		it('should center single child under parent', () => {
			expect.assertions(1);
			const engine = new TraekEngine({ nodeWidth: 350, gridStep: 20 });
			const parent = engine.addNode('Parent', 'user', { parentIds: [], x: 0, y: 0 });
			if (parent.metadata) delete parent.metadata.manualPosition;
			const child = engine.addNode('Child', 'assistant', { parentIds: [parent.id] });
			const nodeWidthGrid = 350 / 20;
			const parentCenterX = (parent.metadata?.x ?? 0) + nodeWidthGrid / 2;
			const childCenterX = (child.metadata?.x ?? 0) + nodeWidthGrid / 2;
			expect(Math.abs(parentCenterX - childCenterX)).toBeLessThan(1);
		});

		it('should spread multiple children horizontally', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			engine.activeNodeId = parent.id;
			const child1 = engine.addNode('Child1', 'assistant', { parentIds: [parent.id] });
			const child2 = engine.addNode('Child2', 'assistant', { parentIds: [parent.id] });
			const x1 = child1.metadata?.x ?? 0;
			const x2 = child2.metadata?.x ?? 0;
			expect(x1).not.toBe(x2);
		});

		it('should skip thought nodes in layout', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			const thought = engine.addNode('Thinking', 'assistant', {
				parentIds: [parent.id],
				type: 'thought'
			});
			expect(thought.metadata?.x).toBe(0);
		});

		it('should respect manualPosition flag', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			const child = engine.addNode('Child', 'assistant', {
				parentIds: [parent.id],
				x: 100,
				y: 200
			});
			engine.layoutChildren(parent.id);
			expect(child.metadata?.x).toBe(100);
			expect(child.metadata?.y).toBe(200);
		});

		it('should be a no-op for nonexistent parent', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			engine.layoutChildren('nonexistent');
			expect(engine.nodes).toHaveLength(0);
		});

		it('should be a no-op when parent has no children', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const node = engine.addNode('Test', 'user', { parentIds: [] });
			const originalX = node.metadata?.x;
			engine.layoutChildren(node.id);
			expect(node.metadata?.x).toBe(originalX);
		});

		it('should place all non-thought children at same Y', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			const c1 = engine.addNode('C1', 'assistant', { parentIds: [parent.id] });
			const c2 = engine.addNode('C2', 'assistant', { parentIds: [parent.id] });
			expect(c1.metadata?.y).toBe(c2.metadata?.y);
		});
	});

	describe('flushLayoutFromRoot', () => {
		it('should layout all root subtrees', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const root1 = engine.addNode('Root1', 'user', { parentIds: [], deferLayout: true });
			const child1 = engine.addNode('Child1', 'assistant', {
				parentIds: [root1.id],
				deferLayout: true
			});
			engine.flushLayoutFromRoot();
			const rootY = root1.metadata?.y ?? 0;
			const childY = child1.metadata?.y ?? 0;
			expect(childY).toBeGreaterThan(rootY);
			expect(engine.nodes).toHaveLength(2);
		});

		it('should handle multiple independent root trees', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const r1 = engine.addNode('R1', 'user', { parentIds: [], deferLayout: true });
			const c1 = engine.addNode('C1', 'assistant', {
				parentIds: [r1.id],
				deferLayout: true
			});
			const r2 = engine.addNode('R2', 'user', { parentIds: [], deferLayout: true });
			const c2 = engine.addNode('C2', 'assistant', {
				parentIds: [r2.id],
				deferLayout: true
			});
			engine.flushLayoutFromRoot();
			expect((c1.metadata?.y ?? 0) > (r1.metadata?.y ?? 0)).toBe(true);
			expect((c2.metadata?.y ?? 0) > (r2.metadata?.y ?? 0)).toBe(true);
		});
	});

	describe('getAncestorPath', () => {
		it('should include the node itself', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const node = engine.addNode('Test', 'user', { parentIds: [] });
			const path = engine.getAncestorPath(node.id);
			expect(path).toContain(node.id);
		});

		it('should return all ancestors in DAG', () => {
			expect.assertions(3);
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			const b = engine.addNode('B', 'user', { parentIds: [] });
			const c = engine.addNode('C', 'assistant', { parentIds: [a.id, b.id] });
			const path = engine.getAncestorPath(c.id);
			expect(path).toContain(a.id);
			expect(path).toContain(b.id);
			expect(path).toContain(c.id);
		});

		it('should traverse full DAG with multiple levels', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			const b = engine.addNode('B', 'assistant', { parentIds: [a.id] });
			const c = engine.addNode('C', 'user', { parentIds: [b.id] });
			const d = engine.addNode('D', 'assistant', { parentIds: [c.id] });
			const path = engine.getAncestorPath(d.id);
			expect(path).toHaveLength(4);
		});

		it('should handle node with no ancestors', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			const path = engine.getAncestorPath(root.id);
			expect(path).toEqual([root.id]);
		});

		it('should handle diamond DAG without duplicates', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			const b = engine.addNode('B', 'assistant', { parentIds: [a.id] });
			const c = engine.addNode('C', 'assistant', { parentIds: [a.id] });
			const d = engine.addNode('D', 'user', { parentIds: [b.id, c.id] });
			const path = engine.getAncestorPath(d.id);
			// Should be {d, b, c, a} = 4 unique IDs
			expect(path).toHaveLength(4);
		});
	});

	describe('getDescendantCount', () => {
		it('should count visible descendants', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			engine.addNode('A', 'assistant', { parentIds: [root.id] });
			engine.addNode('B', 'assistant', { parentIds: [root.id] });
			expect(engine.getDescendantCount(root.id)).toBe(2);
		});

		it('should exclude thought nodes', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			engine.addNode('A', 'assistant', { parentIds: [root.id] });
			engine.addNode('Thought', 'assistant', { parentIds: [root.id], type: 'thought' });
			expect(engine.getDescendantCount(root.id)).toBe(1);
		});

		it('should count nested descendants', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			const child = engine.addNode('Child', 'assistant', { parentIds: [root.id] });
			engine.addNode('Grandchild', 'user', { parentIds: [child.id] });
			expect(engine.getDescendantCount(root.id)).toBe(2);
		});

		it('should return 0 for leaf node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const node = engine.addNode('Leaf', 'user', { parentIds: [] });
			expect(engine.getDescendantCount(node.id)).toBe(0);
		});
	});

	describe('branchFrom', () => {
		it('should set activeNodeId', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			engine.addNode('B', 'user', { parentIds: [] });
			engine.branchFrom(a.id);
			expect(engine.activeNodeId).toBe(a.id);
		});
	});

	describe('contextPath', () => {
		it('should return empty array when no activeNodeId', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			expect(engine.contextPath()).toEqual([]);
		});

		it('should return linear path following primary parents', () => {
			expect.assertions(3);
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			const b = engine.addNode('B', 'assistant', { parentIds: [a.id] });
			const c = engine.addNode('C', 'user', { parentIds: [b.id] });
			engine.activeNodeId = c.id;
			const path = engine.contextPath();
			expect(path).toHaveLength(3);
			expect(path[0].id).toBe(a.id);
			expect(path[2].id).toBe(c.id);
		});

		it('should only follow primary parent in DAG', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			engine.addNode('B', 'user', { parentIds: [] });
			const c = engine.addNode('C', 'assistant', { parentIds: [a.id] });
			engine.activeNodeId = c.id;
			const path = engine.contextPath();
			expect(path).toHaveLength(2);
			expect(path[0].id).toBe(a.id);
		});
	});

	describe('moveNodeAndDescendants', () => {
		it('should move node by delta in grid units', () => {
			expect.assertions(2);
			const engine = new TraekEngine({ gridStep: 20 });
			const node = engine.addNode('Test', 'user', { parentIds: [] });
			const origX = node.metadata?.x ?? 0;
			const origY = node.metadata?.y ?? 0;
			engine.moveNodeAndDescendants(node.id, 40, 60);
			expect(node.metadata?.x).toBe(origX + 2);
			expect(node.metadata?.y).toBe(origY + 3);
		});

		it('should set manualPosition flag', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const node = engine.addNode('Test', 'user', { parentIds: [] });
			engine.moveNodeAndDescendants(node.id, 10, 10);
			expect(node.metadata?.manualPosition).toBe(true);
		});

		it('should be a no-op for nonexistent node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			engine.moveNodeAndDescendants('nonexistent', 10, 10);
			expect(engine.nodes).toHaveLength(0);
		});
	});

	describe('setNodePosition', () => {
		it('should set absolute position in grid units', () => {
			expect.assertions(2);
			const engine = new TraekEngine({ gridStep: 20 });
			const node = engine.addNode('Test', 'user', { parentIds: [] });
			engine.setNodePosition(node.id, 100, 200);
			expect(node.metadata?.x).toBe(5);
			expect(node.metadata?.y).toBe(10);
		});

		it('should snap when within threshold', () => {
			expect.assertions(2);
			const engine = new TraekEngine({ gridStep: 20 });
			const node = engine.addNode('Test', 'user', { parentIds: [] });
			// 41px / 20 = 2.05, threshold 5px = 0.25 grid, |2.05-2|=0.05 < 0.25 → snaps
			engine.setNodePosition(node.id, 41, 41, 5);
			expect(node.metadata?.x).toBe(2);
			expect(node.metadata?.y).toBe(2);
		});

		it('should not snap when outside threshold', () => {
			expect.assertions(2);
			const engine = new TraekEngine({ gridStep: 20 });
			const node = engine.addNode('Test', 'user', { parentIds: [] });
			// 45px / 20 = 2.25, threshold 1px = 0.05 grid, |2.25-2|=0.25 > 0.05 → no snap
			engine.setNodePosition(node.id, 45, 45, 1);
			expect(node.metadata?.x).toBe(2.25);
			expect(node.metadata?.y).toBe(2.25);
		});

		it('should set manualPosition flag', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const node = engine.addNode('Test', 'user', { parentIds: [] });
			engine.setNodePosition(node.id, 100, 200);
			expect(node.metadata?.manualPosition).toBe(true);
		});

		it('should be a no-op for nonexistent node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			engine.setNodePosition('nonexistent', 100, 200);
			expect(engine.nodes).toHaveLength(0);
		});
	});

	describe('snapNodeToGrid', () => {
		it('should round position to integer grid', () => {
			expect.assertions(2);
			const engine = new TraekEngine({ gridStep: 20 });
			const node = engine.addNode('Test', 'user', { parentIds: [] });
			engine.setNodePosition(node.id, 45, 55); // 2.25, 2.75
			engine.snapNodeToGrid(node.id);
			expect(node.metadata?.x).toBe(2);
			expect(node.metadata?.y).toBe(3);
		});

		it('should be a no-op for nonexistent node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			engine.snapNodeToGrid('nonexistent');
			expect(engine.nodes).toHaveLength(0);
		});

		it('should keep already-integer positions unchanged', () => {
			expect.assertions(2);
			const engine = new TraekEngine({ gridStep: 20 });
			const node = engine.addNode('Test', 'user', { parentIds: [] });
			engine.setNodePosition(node.id, 60, 80); // 3.0, 4.0
			engine.snapNodeToGrid(node.id);
			expect(node.metadata?.x).toBe(3);
			expect(node.metadata?.y).toBe(4);
		});
	});

	describe('focusOnNode', () => {
		it('should set pendingFocusNodeId for existing node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const node = engine.addNode('Test', 'user');
			engine.focusOnNode(node.id);
			expect(engine.pendingFocusNodeId).toBe(node.id);
		});

		it('should not set pendingFocusNodeId for nonexistent node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			engine.focusOnNode('nonexistent');
			expect(engine.pendingFocusNodeId).toBeNull();
		});
	});

	describe('clearPendingFocus', () => {
		it('should clear pendingFocusNodeId', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const node = engine.addNode('Test', 'user');
			engine.focusOnNode(node.id);
			engine.clearPendingFocus();
			expect(engine.pendingFocusNodeId).toBeNull();
		});
	});

	describe('addConnection edge cases', () => {
		it('should return false for nonexistent parent', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			expect(engine.addConnection('nonexistent', a.id)).toBe(false);
		});

		it('should return false for nonexistent child', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			expect(engine.addConnection(a.id, 'nonexistent')).toBe(false);
		});
	});

	describe('removeConnection edge cases', () => {
		it('should return false for nonexistent child', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			expect(engine.removeConnection('any', 'nonexistent')).toBe(false);
		});
	});

	describe('wouldCreateCycle', () => {
		it('should detect diamond-shaped cycle', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			const b = engine.addNode('B', 'assistant', { parentIds: [a.id] });
			const c = engine.addNode('C', 'assistant', { parentIds: [a.id] });
			const d = engine.addNode('D', 'user', { parentIds: [b.id, c.id] });
			expect(wouldCreateCycle(engine.nodes, d.id, a.id)).toBe(true);
		});

		it('should allow valid DAG connections', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			const b = engine.addNode('B', 'assistant', { parentIds: [a.id] });
			const c = engine.addNode('C', 'user', { parentIds: [] });
			expect(wouldCreateCycle(engine.nodes, c.id, b.id)).toBe(false);
		});

		it('should detect longer cycle paths', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			const b = engine.addNode('B', 'assistant', { parentIds: [a.id] });
			const c = engine.addNode('C', 'user', { parentIds: [b.id] });
			const d = engine.addNode('D', 'assistant', { parentIds: [c.id] });
			const e = engine.addNode('E', 'user', { parentIds: [d.id] });
			expect(wouldCreateCycle(engine.nodes, e.id, a.id)).toBe(true);
		});

		it('should detect self-loop via standalone function', () => {
			expect.assertions(1);
			const nodes: Node[] = [
				{
					id: 'x',
					parentIds: [],
					role: 'user',
					type: 'text',
					metadata: { x: 0, y: 0 }
				}
			];
			expect(wouldCreateCycle(nodes, 'x', 'x')).toBe(true);
		});

		it('should handle disconnected nodes', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			const b = engine.addNode('B', 'user', { parentIds: [] });
			expect(wouldCreateCycle(engine.nodes, a.id, b.id)).toBe(false);
		});
	});

	describe('serialize additional coverage', () => {
		it('should strip metadata to x, y, height only', () => {
			expect.assertions(3);
			const engine = new TraekEngine();
			engine.addNode('Test', 'user', { x: 5, y: 10 });
			const snapshot = engine.serialize();
			const serialized = snapshot.nodes[0];
			expect(serialized.metadata.x).toBe(5);
			expect(serialized.metadata.y).toBe(10);
			expect(serialized.metadata.height).toBe(100);
		});

		it('should preserve data payload in serialization', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			engine.addNode('Test', 'user', { data: { custom: 42 } });
			const snapshot = engine.serialize();
			expect(snapshot.nodes[0].data).toEqual({ custom: 42 });
		});

		it('should set version to 1', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const snapshot = engine.serialize();
			expect(snapshot.version).toBe(1);
		});
	});

	describe('fromSnapshot additional coverage', () => {
		it('should throw on completely invalid data', () => {
			expect.assertions(1);
			expect(() => {
				TraekEngine.fromSnapshot({ broken: true } as never);
			}).toThrow(/Invalid snapshot/);
		});

		it('should accept config overrides', () => {
			expect.assertions(1);
			const snapshot = {
				version: 1,
				createdAt: Date.now(),
				activeNodeId: null,
				nodes: []
			};
			const engine = TraekEngine.fromSnapshot(
				snapshot as import('../lib/persistence/types.js').ConversationSnapshot,
				{ nodeWidth: 500 }
			);
			expect(engine.nodes).toHaveLength(0);
		});
	});
});
