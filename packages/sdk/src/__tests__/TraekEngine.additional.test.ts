import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TraekEngine } from '../lib/TraekEngine.svelte';
import type { MessageNode } from '../lib/TraekEngine.svelte';

beforeEach(() => {
	globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
		return setTimeout(() => cb(performance.now()), 0) as unknown as number;
	};
	globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

describe('TraekEngine — additional coverage', () => {
	describe('undo / restore functionality', () => {
		it('should populate lastDeletedBuffer after deleteNode', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const node = engine.addNode('To delete', 'user');
			engine.deleteNode(node.id);
			expect(engine.nodes).toHaveLength(0);
			// Restore should succeed, proving buffer was populated
			const restored = engine.restoreDeleted();
			expect(restored).toBe(true);
		});

		it('should restore deleted node with correct content and role', () => {
			expect.assertions(4);
			const engine = new TraekEngine();
			const node = engine.addNode('Restore me', 'assistant') as MessageNode;
			const nodeId = node.id;
			engine.deleteNode(nodeId);
			engine.restoreDeleted();
			expect(engine.nodes).toHaveLength(1);
			const restored = engine.nodes[0] as MessageNode;
			expect(restored.id).toBe(nodeId);
			expect(restored.content).toBe('Restore me');
			expect(restored.role).toBe('assistant');
		});

		it('should restore deleted node with correct parent relationships', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			const child = engine.addNode('Child', 'assistant', { parentIds: [parent.id] });
			const childId = child.id;
			engine.deleteNode(childId);
			engine.restoreDeleted();
			const restored = engine.nodes.find((n) => n.id === childId);
			expect(restored).toBeDefined();
			expect(restored!.parentIds).toEqual([parent.id]);
		});

		it('should return false when restoreDeleted is called with empty buffer', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const result = engine.restoreDeleted();
			expect(result).toBe(false);
		});

		it('should not modify nodes when restoreDeleted is called with empty buffer', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			engine.addNode('Existing', 'user');
			engine.restoreDeleted();
			expect(engine.nodes).toHaveLength(1);
		});

		it('should auto-clear buffer after 30s timeout', () => {
			expect.assertions(2);
			vi.useFakeTimers();
			const engine = new TraekEngine();
			const node = engine.addNode('Ephemeral', 'user');
			engine.deleteNode(node.id);

			// Buffer exists immediately
			expect(engine.restoreDeleted()).toBe(true);

			// Delete again so the buffer is populated once more
			engine.deleteNode(engine.nodes[0].id);

			// Advance past 30s
			vi.advanceTimersByTime(31_000);
			expect(engine.restoreDeleted()).toBe(false);
		});

		it('should still restore before 30s elapses', () => {
			expect.assertions(1);
			vi.useFakeTimers();
			const engine = new TraekEngine();
			const node = engine.addNode('Timely', 'user');
			engine.deleteNode(node.id);

			vi.advanceTimersByTime(29_000);
			expect(engine.restoreDeleted()).toBe(true);
		});

		it('should fire onNodeDeleted callback with count and restore function on deleteNode', () => {
			expect.assertions(3);
			const engine = new TraekEngine();
			const callback = vi.fn();
			engine.onNodeDeleted = callback;
			const node = engine.addNode('Test', 'user');
			engine.deleteNode(node.id);
			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(1, expect.any(Function));
			// Calling the restore function should work
			const restoreFn = callback.mock.calls[0][1];
			restoreFn();
			expect(engine.nodes).toHaveLength(1);
		});

		it('should fire onNodeDeleted callback on deleteNodeAndDescendants with correct count', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const callback = vi.fn();
			engine.onNodeDeleted = callback;
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			engine.addNode('Child', 'assistant', { parentIds: [root.id] });
			engine.addNode('Grandchild', 'user', { parentIds: [engine.nodes[1].id] });
			engine.deleteNodeAndDescendants(root.id);
			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(3, expect.any(Function));
		});

		it('should restore all descendants after deleteNodeAndDescendants', () => {
			expect.assertions(3);
			const engine = new TraekEngine();
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			const child = engine.addNode('Child', 'assistant', { parentIds: [root.id] });
			engine.addNode('Grandchild', 'user', { parentIds: [child.id] });
			engine.deleteNodeAndDescendants(root.id);
			expect(engine.nodes).toHaveLength(0);
			engine.restoreDeleted();
			expect(engine.nodes).toHaveLength(3);
			const ids = engine.nodes.map((n) => n.id);
			expect(ids).toContain(root.id);
		});

		it('should restore activeNodeId after undo', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const node = engine.addNode('Active', 'user');
			expect(engine.activeNodeId).toBe(node.id);
			engine.deleteNode(node.id);
			engine.restoreDeleted();
			expect(engine.activeNodeId).toBe(node.id);
		});

		it('should clear buffer after successful restore', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const node = engine.addNode('Once', 'user');
			engine.deleteNode(node.id);
			expect(engine.restoreDeleted()).toBe(true);
			// Second call should fail since buffer was consumed
			expect(engine.restoreDeleted()).toBe(false);
		});

		it('should return false when elapsed time exceeds 30s', () => {
			expect.assertions(1);
			vi.useFakeTimers();
			const engine = new TraekEngine();
			const node = engine.addNode('Expired', 'user');
			engine.deleteNode(node.id);
			vi.advanceTimersByTime(30_001);
			expect(engine.restoreDeleted()).toBe(false);
		});
	});

	describe('getNode', () => {
		it('should return undefined for non-existent ID', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			expect(engine.getNode('does-not-exist')).toBeUndefined();
		});

		it('should return the correct node after add', () => {
			expect.assertions(3);
			const engine = new TraekEngine();
			const node = engine.addNode('Hello', 'user') as MessageNode;
			const found = engine.getNode(node.id) as MessageNode;
			expect(found).toBeDefined();
			expect(found.id).toBe(node.id);
			expect(found.content).toBe('Hello');
		});

		it('should return undefined after node is deleted', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const node = engine.addNode('Temporary', 'user');
			expect(engine.getNode(node.id)).toBeDefined();
			engine.deleteNode(node.id);
			expect(engine.getNode(node.id)).toBeUndefined();
		});

		it('should return correct node among many nodes', () => {
			expect.assertions(3);
			const engine = new TraekEngine();
			const a = engine.addNode('A', 'user', { parentIds: [] });
			const b = engine.addNode('B', 'assistant', { parentIds: [] });
			const c = engine.addNode('C', 'user', { parentIds: [] });
			expect(engine.getNode(a.id)?.id).toBe(a.id);
			expect(engine.getNode(b.id)?.id).toBe(b.id);
			expect(engine.getNode(c.id)?.id).toBe(c.id);
		});

		it('should reflect updates made via updateNode', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const node = engine.addNode('Original', 'user') as MessageNode;
			engine.updateNode(node.id, { content: 'Modified' });
			const found = engine.getNode(node.id) as MessageNode;
			expect(found.content).toBe('Modified');
		});
	});

	describe('getChildren', () => {
		it('should return correct children of a parent', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			const child1 = engine.addNode('Child1', 'assistant', { parentIds: [parent.id] });
			const child2 = engine.addNode('Child2', 'assistant', { parentIds: [parent.id] });
			const children = engine.getChildren(parent.id);
			expect(children).toHaveLength(2);
			const childIds = children.map((c) => c.id);
			expect(childIds).toEqual(expect.arrayContaining([child1.id, child2.id]));
		});

		it('should return empty array for leaf nodes', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			const leaf = engine.addNode('Leaf', 'user', { parentIds: [] });
			expect(engine.getChildren(leaf.id)).toEqual([]);
		});

		it('should update after adding a child', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			expect(engine.getChildren(parent.id)).toHaveLength(0);
			engine.addNode('Child', 'assistant', { parentIds: [parent.id] });
			expect(engine.getChildren(parent.id)).toHaveLength(1);
		});

		it('should update after deleting a child', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			const child = engine.addNode('Child', 'assistant', { parentIds: [parent.id] });
			expect(engine.getChildren(parent.id)).toHaveLength(1);
			engine.deleteNode(child.id);
			expect(engine.getChildren(parent.id)).toHaveLength(0);
		});

		it('should return root nodes when parentId is null', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const root1 = engine.addNode('Root1', 'user', { parentIds: [] });
			const root2 = engine.addNode('Root2', 'user', { parentIds: [] });
			engine.addNode('Child', 'assistant', { parentIds: [root1.id] });
			const roots = engine.getChildren(null);
			expect(roots).toHaveLength(2);
			const rootIds = roots.map((r) => r.id);
			expect(rootIds).toEqual(expect.arrayContaining([root1.id, root2.id]));
		});

		it('should not include grandchildren', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			const child = engine.addNode('Child', 'assistant', { parentIds: [parent.id] });
			const _grandchild = engine.addNode('Grandchild', 'user', { parentIds: [child.id] });
			const children = engine.getChildren(parent.id);
			expect(children).toHaveLength(1);
			expect(children[0].id).toBe(child.id);
		});

		it('should return empty array for non-existent parentId', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			expect(engine.getChildren('nonexistent')).toEqual([]);
		});
	});

	describe('addCustomNode', () => {
		it('should create a node with a component reference', () => {
			expect.assertions(3);
			const engine = new TraekEngine();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const MockComponent = {} as any;
			const node = engine.addCustomNode(MockComponent);
			expect(node).toBeDefined();
			expect(node.id).toBeDefined();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			expect((node as any).component).toBe(MockComponent);
		});

		it('should assign correct parentIds from activeNodeId', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const MockComponent = {} as any;
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			const custom = engine.addCustomNode(MockComponent, undefined, 'assistant');
			expect(custom.parentIds).toEqual([parent.id]);
		});

		it('should respect explicit parentIds', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const MockComponent = {} as any;
			const a = engine.addNode('A', 'user', { parentIds: [] });
			const b = engine.addNode('B', 'user', { parentIds: [] });
			const custom = engine.addCustomNode(MockComponent, undefined, 'user', {
				parentIds: [a.id, b.id]
			});
			expect(custom.parentIds).toEqual([a.id, b.id]);
		});

		it('should default type to text', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const MockComponent = {} as any;
			const node = engine.addCustomNode(MockComponent);
			expect(node.type).toBe('text');
		});

		it('should respect custom type', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const MockComponent = {} as any;
			const node = engine.addCustomNode(MockComponent, undefined, 'user', {
				type: 'debugNode'
			});
			expect(node.type).toBe('debugNode');
		});

		it('should set activeNodeId to the new node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const MockComponent = {} as any;
			const node = engine.addCustomNode(MockComponent);
			expect(engine.activeNodeId).toBe(node.id);
		});

		it('should not change activeNodeId for thought type', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const MockComponent = {} as any;
			const parent = engine.addNode('Parent', 'user');
			engine.addCustomNode(MockComponent, undefined, 'assistant', { type: 'thought' });
			expect(engine.activeNodeId).toBe(parent.id);
		});

		it('should pass props to the custom node', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const MockComponent = {} as any;
			const props = { label: 'test', count: 42 };
			const node = engine.addCustomNode(MockComponent, props);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			expect((node as any).props).toEqual({ label: 'test', count: 42 });
		});

		it('should fire onNodeCreated callback', () => {
			expect.assertions(2);
			const engine = new TraekEngine();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const MockComponent = {} as any;
			const callback = vi.fn();
			engine.onNodeCreated = callback;
			const node = engine.addCustomNode(MockComponent);
			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(node);
		});

		it('should add node to the nodes array', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const MockComponent = {} as any;
			engine.addCustomNode(MockComponent);
			expect(engine.nodes).toHaveLength(1);
		});

		it('should set explicit position and mark manualPosition', () => {
			expect.assertions(3);
			const engine = new TraekEngine();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const MockComponent = {} as any;
			const node = engine.addCustomNode(MockComponent, undefined, 'user', {
				x: 42,
				y: 84
			});
			expect(node.metadata?.x).toBe(42);
			expect(node.metadata?.y).toBe(84);
			expect(node.metadata?.manualPosition).toBe(true);
		});

		it('should store data payload', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const MockComponent = {} as any;
			const node = engine.addCustomNode(MockComponent, undefined, 'user', {
				data: { extra: 'info' }
			});
			expect(node.data).toEqual({ extra: 'info' });
		});

		it('should default role to user', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const MockComponent = {} as any;
			const node = engine.addCustomNode(MockComponent);
			expect(node.role).toBe('user');
		});

		it('should have empty parentIds when no activeNodeId and no explicit parentIds', () => {
			expect.assertions(1);
			const engine = new TraekEngine();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const MockComponent = {} as any;
			engine.activeNodeId = null;
			const node = engine.addCustomNode(MockComponent, undefined, 'user', { parentIds: [] });
			expect(node.parentIds).toEqual([]);
		});
	});
});
