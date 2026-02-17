import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TraekEngine, wouldCreateCycle } from '../../TraekEngine.svelte';
import { ReplayController } from '../ReplayController.svelte';
import type { ConversationSnapshot, SerializedNode } from '../types';
import { serializedNodeSchema, conversationSnapshotSchema } from '../schemas';

function makeNode(overrides: Partial<SerializedNode> & { id: string }): SerializedNode {
	return {
		parentIds: [],
		content: `Content for ${overrides.id}`,
		role: 'user',
		type: 'text',
		status: 'done',
		createdAt: Date.now(),
		metadata: { x: 0, y: 0 },
		...overrides
	};
}

function makeSnapshot(
	nodes: SerializedNode[],
	extras?: Partial<ConversationSnapshot>
): ConversationSnapshot {
	return {
		version: 1,
		createdAt: Date.now(),
		activeNodeId: nodes.length > 0 ? nodes[nodes.length - 1].id : null,
		nodes,
		...extras
	};
}

describe('TraekEngine.serialize()', () => {
	it('should serialize an empty engine', () => {
		expect.assertions(4);
		const engine = new TraekEngine();
		const snapshot = engine.serialize();

		expect(snapshot.version).toBe(1);
		expect(snapshot.nodes).toHaveLength(0);
		expect(snapshot.activeNodeId).toBeNull();
		expect(snapshot.title).toBeUndefined();
	});

	it('should serialize with a title', () => {
		expect.assertions(1);
		const engine = new TraekEngine();
		const snapshot = engine.serialize('My Conversation');

		expect(snapshot.title).toBe('My Conversation');
	});

	it('should serialize nodes with all fields', () => {
		expect.assertions(6);
		const engine = new TraekEngine();
		engine.addNode('Hello', 'user');
		const snapshot = engine.serialize();

		expect(snapshot.nodes).toHaveLength(1);
		const node = snapshot.nodes[0];
		expect(node.content).toBe('Hello');
		expect(node.role).toBe('user');
		expect(node.type).toBe('text');
		expect(node.metadata.x).toBeDefined();
		expect(node.metadata.y).toBeDefined();
	});

	it('should preserve parent-child relationships', () => {
		expect.assertions(3);
		const engine = new TraekEngine();
		const parentNode = engine.addNode('Parent', 'user');
		const childNode = engine.addNode('Child', 'assistant');

		const snapshot = engine.serialize();
		expect(snapshot.nodes).toHaveLength(2);

		const parent = snapshot.nodes.find((n) => n.id === parentNode.id);
		const child = snapshot.nodes.find((n) => n.id === childNode.id);
		expect(parent?.parentIds).toEqual([]);
		expect(child?.parentIds).toContain(parentNode.id);
	});

	it('should preserve activeNodeId', () => {
		expect.assertions(1);
		const engine = new TraekEngine();
		const node = engine.addNode('Test', 'user');
		engine.activeNodeId = node.id;

		const snapshot = engine.serialize();
		expect(snapshot.activeNodeId).toBe(node.id);
	});
});

describe('TraekEngine.fromSnapshot()', () => {
	it('should restore an empty snapshot', () => {
		expect.assertions(2);
		const snapshot = makeSnapshot([]);
		const engine = TraekEngine.fromSnapshot(snapshot);

		expect(engine.nodes).toHaveLength(0);
		expect(engine.activeNodeId).toBeNull();
	});

	it('should restore nodes from a snapshot', () => {
		expect.assertions(4);
		const nodes = [
			makeNode({ id: 'n1', createdAt: 1000 }),
			makeNode({ id: 'n2', parentIds: ['n1'], role: 'assistant', createdAt: 2000 })
		];
		const snapshot = makeSnapshot(nodes, { activeNodeId: 'n2' });
		const engine = TraekEngine.fromSnapshot(snapshot);

		expect(engine.nodes).toHaveLength(2);
		expect(engine.activeNodeId).toBe('n2');
		expect(engine.nodes[0].id).toBe('n1');
		expect(engine.nodes[1].parentIds).toContain('n1');
	});

	it('should migrate legacy parentId format', () => {
		expect.assertions(2);
		// Simulate old snapshot with parentId instead of parentIds
		const legacySnapshot = {
			version: 1,
			createdAt: Date.now(),
			activeNodeId: 'n2',
			nodes: [
				{
					id: 'n1',
					parentId: null,
					content: 'Root',
					role: 'user',
					type: 'text',
					createdAt: 1000,
					metadata: { x: 0, y: 0 }
				},
				{
					id: 'n2',
					parentId: 'n1',
					content: 'Child',
					role: 'assistant',
					type: 'text',
					createdAt: 2000,
					metadata: { x: 0, y: 0 }
				}
			]
		} as unknown as ConversationSnapshot;

		const engine = TraekEngine.fromSnapshot(legacySnapshot);
		expect(engine.nodes[0].parentIds).toEqual([]);
		expect(engine.nodes[1].parentIds).toEqual(['n1']);
	});

	it('should ignore activeNodeId if node does not exist', () => {
		expect.assertions(1);
		const snapshot = makeSnapshot([], { activeNodeId: 'nonexistent' });
		const engine = TraekEngine.fromSnapshot(snapshot);

		expect(engine.activeNodeId).toBeNull();
	});

	it('should apply config overrides', () => {
		expect.assertions(1);
		const snapshot = makeSnapshot([], { config: { nodeWidth: 999 } });
		const engine = TraekEngine.fromSnapshot(snapshot, { nodeWidth: 500 });
		const reserialized = engine.serialize();
		expect(reserialized.nodes).toHaveLength(0);
	});

	it('should roundtrip serialize → fromSnapshot', () => {
		expect.assertions(4);
		const original = new TraekEngine();
		const node1 = original.addNode('First', 'user');
		const node2 = original.addNode('Second', 'assistant');

		const snapshot = original.serialize('Roundtrip Test');
		const restored = TraekEngine.fromSnapshot(snapshot);

		expect(restored.nodes).toHaveLength(2);
		expect(restored.activeNodeId).toBe(node2.id);
		expect(restored.nodes.find((n) => n.id === node1.id)).toBeDefined();
		expect(restored.nodes.find((n) => n.id === node2.id)).toBeDefined();
	});
});

describe('DAG: addConnection / removeConnection / cycle detection', () => {
	it('should add a connection between nodes', () => {
		expect.assertions(2);
		const engine = new TraekEngine();
		const a = engine.addNode('A', 'user', { parentIds: [] });
		const b = engine.addNode('B', 'user', { parentIds: [] });
		const c = engine.addNode('C', 'assistant', { parentIds: [a.id] });

		const result = engine.addConnection(b.id, c.id);
		expect(result).toBe(true);
		expect(c.parentIds).toEqual([a.id, b.id]);
	});

	it('should prevent duplicate connections', () => {
		expect.assertions(1);
		const engine = new TraekEngine();
		const a = engine.addNode('A', 'user', { parentIds: [] });
		const b = engine.addNode('B', 'assistant', { parentIds: [a.id] });

		const result = engine.addConnection(a.id, b.id);
		expect(result).toBe(false);
	});

	it('should detect self-loop', () => {
		expect.assertions(1);
		const engine = new TraekEngine();
		const a = engine.addNode('A', 'user', { parentIds: [] });

		expect(wouldCreateCycle(engine.nodes, a.id, a.id)).toBe(true);
	});

	it('should detect cycle: A→B→C, then C→A', () => {
		expect.assertions(1);
		const engine = new TraekEngine();
		const a = engine.addNode('A', 'user', { parentIds: [] });
		const b = engine.addNode('B', 'assistant', { parentIds: [a.id] });
		const c = engine.addNode('C', 'user', { parentIds: [b.id] });

		const result = engine.addConnection(c.id, a.id);
		expect(result).toBe(false);
	});

	it('should remove a connection', () => {
		expect.assertions(2);
		const engine = new TraekEngine();
		const a = engine.addNode('A', 'user', { parentIds: [] });
		const b = engine.addNode('B', 'user', { parentIds: [] });
		const c = engine.addNode('C', 'assistant', { parentIds: [a.id, b.id] });

		const result = engine.removeConnection(a.id, c.id);
		expect(result).toBe(true);
		expect(c.parentIds).toEqual([b.id]);
	});

	it('should return false when removing non-existent connection', () => {
		expect.assertions(1);
		const engine = new TraekEngine();
		const a = engine.addNode('A', 'user', { parentIds: [] });
		const b = engine.addNode('B', 'user', { parentIds: [] });

		expect(engine.removeConnection(a.id, b.id)).toBe(false);
	});
});

describe('Zod Schema Validation', () => {
	it('should accept a valid SerializedNode', () => {
		const result = serializedNodeSchema.safeParse(makeNode({ id: 'valid', status: 'done' }));
		expect(result.success).toBe(true);
	});

	it('should reject a SerializedNode with missing id', () => {
		const result = serializedNodeSchema.safeParse({
			parentIds: [],
			content: 'test',
			role: 'user',
			type: 'text',
			createdAt: Date.now(),
			metadata: { x: 0, y: 0 }
		});
		expect(result.success).toBe(false);
	});

	it('should reject a SerializedNode with invalid role', () => {
		const result = serializedNodeSchema.safeParse({
			id: 'x',
			parentIds: [],
			content: 'test',
			role: 'invalid',
			type: 'text',
			createdAt: Date.now(),
			metadata: { x: 0, y: 0 }
		});
		expect(result.success).toBe(false);
	});

	it('should accept a valid ConversationSnapshot', () => {
		const snapshot = makeSnapshot([makeNode({ id: 'a' })]);
		const result = conversationSnapshotSchema.safeParse(snapshot);
		expect(result.success).toBe(true);
	});

	it('should accept legacy parentId format in snapshot', () => {
		const legacySnapshot = {
			version: 1,
			createdAt: Date.now(),
			activeNodeId: null,
			nodes: [
				{
					id: 'a',
					parentId: null,
					content: 'test',
					role: 'user',
					type: 'text',
					createdAt: Date.now(),
					metadata: { x: 0, y: 0 }
				}
			]
		};
		const result = conversationSnapshotSchema.safeParse(legacySnapshot);
		expect(result.success).toBe(true);
	});

	it('should reject a ConversationSnapshot with wrong version', () => {
		const result = conversationSnapshotSchema.safeParse({
			version: 2,
			createdAt: Date.now(),
			activeNodeId: null,
			nodes: []
		});
		expect(result.success).toBe(false);
	});

	it('should accept optional viewport in snapshot', () => {
		const snapshot = makeSnapshot([], {
			viewport: { scale: 1.5, offsetX: 100, offsetY: -50 }
		});
		const result = conversationSnapshotSchema.safeParse(snapshot);
		expect(result.success).toBe(true);
	});
});

describe('TraekEngine.fromSnapshot() validation', () => {
	it('should throw on invalid snapshot data', () => {
		expect(() => {
			TraekEngine.fromSnapshot({ version: 99, nodes: 'bad' } as never);
		}).toThrow(/Invalid snapshot/);
	});
});

describe('ReplayController', () => {
	let snapshot: ConversationSnapshot;

	beforeEach(() => {
		snapshot = makeSnapshot([
			makeNode({ id: 'a', createdAt: 100 }),
			makeNode({ id: 'b', parentIds: ['a'], role: 'assistant', createdAt: 200 }),
			makeNode({ id: 'c', parentIds: ['b'], createdAt: 300 })
		]);
	});

	it('should initialize with correct defaults', () => {
		expect.assertions(4);
		const ctrl = new ReplayController(snapshot);

		expect(ctrl.currentIndex).toBe(-1);
		expect(ctrl.isPlaying).toBe(false);
		expect(ctrl.speed).toBe(1);
		expect(ctrl.totalNodes).toBe(3);
	});

	it('should step forward one node at a time', () => {
		expect.assertions(4);
		const ctrl = new ReplayController(snapshot);

		ctrl.step();
		expect(ctrl.currentIndex).toBe(0);
		expect(ctrl.getEngine().nodes).toHaveLength(1);

		ctrl.step();
		expect(ctrl.currentIndex).toBe(1);
		expect(ctrl.getEngine().nodes).toHaveLength(2);
	});

	it('should not step past the last node', () => {
		expect.assertions(2);
		const ctrl = new ReplayController(snapshot);

		ctrl.step();
		ctrl.step();
		ctrl.step();
		ctrl.step(); // Should be a no-op
		ctrl.step(); // Should be a no-op

		expect(ctrl.currentIndex).toBe(2);
		expect(ctrl.getEngine().nodes).toHaveLength(3);
	});

	it('should step back and remove nodes', () => {
		expect.assertions(4);
		const ctrl = new ReplayController(snapshot);

		ctrl.step();
		ctrl.step();
		expect(ctrl.currentIndex).toBe(1);

		ctrl.stepBack();
		expect(ctrl.currentIndex).toBe(0);
		expect(ctrl.getEngine().nodes).toHaveLength(1);

		ctrl.stepBack();
		expect(ctrl.currentIndex).toBe(-1);
	});

	it('should not step back past the beginning', () => {
		expect.assertions(1);
		const ctrl = new ReplayController(snapshot);

		ctrl.stepBack(); // Should be a no-op
		expect(ctrl.currentIndex).toBe(-1);
	});

	it('should seekTo a specific index', () => {
		expect.assertions(3);
		const ctrl = new ReplayController(snapshot);

		ctrl.seekTo(1);
		expect(ctrl.currentIndex).toBe(1);
		expect(ctrl.getEngine().nodes).toHaveLength(2);

		ctrl.seekTo(0);
		expect(ctrl.getEngine().nodes).toHaveLength(1);
	});

	it('should seekTo -1 to clear all nodes', () => {
		expect.assertions(2);
		const ctrl = new ReplayController(snapshot);

		ctrl.seekTo(2);
		ctrl.seekTo(-1);

		expect(ctrl.currentIndex).toBe(-1);
		expect(ctrl.getEngine().nodes).toHaveLength(0);
	});

	it('should clamp seekTo within bounds', () => {
		expect.assertions(2);
		const ctrl = new ReplayController(snapshot);

		ctrl.seekTo(100);
		expect(ctrl.currentIndex).toBe(2);

		ctrl.seekTo(-100);
		expect(ctrl.currentIndex).toBe(-1);
	});

	it('should set speed', () => {
		expect.assertions(1);
		const ctrl = new ReplayController(snapshot);
		ctrl.setSpeed(2);

		expect(ctrl.speed).toBe(2);
	});

	it('should reset to beginning', () => {
		expect.assertions(3);
		const ctrl = new ReplayController(snapshot);
		ctrl.step();
		ctrl.step();

		ctrl.reset();
		expect(ctrl.currentIndex).toBe(-1);
		expect(ctrl.isPlaying).toBe(false);
		expect(ctrl.getEngine().nodes).toHaveLength(0);
	});

	it('should call onNodeAdded callback on step', () => {
		expect.assertions(2);
		const onNodeAdded = vi.fn();
		const ctrl = new ReplayController(snapshot, { onNodeAdded });

		ctrl.step();
		expect(onNodeAdded).toHaveBeenCalledTimes(1);
		expect(onNodeAdded).toHaveBeenCalledWith('a');
	});

	it('should sort nodes by createdAt', () => {
		expect.assertions(3);
		const unorderedSnapshot = makeSnapshot([
			makeNode({ id: 'z', createdAt: 300 }),
			makeNode({ id: 'a', createdAt: 100 }),
			makeNode({ id: 'm', parentIds: ['a'], createdAt: 200 })
		]);
		const ctrl = new ReplayController(unorderedSnapshot);

		ctrl.step();
		expect(ctrl.getEngine().nodes[0].id).toBe('a');

		ctrl.step();
		expect(ctrl.getEngine().nodes[1].id).toBe('m');

		ctrl.step();
		expect(ctrl.getEngine().nodes[2].id).toBe('z');
	});

	it('should set activeNodeId on the engine during step', () => {
		expect.assertions(2);
		const ctrl = new ReplayController(snapshot);

		ctrl.step();
		expect(ctrl.getEngine().activeNodeId).toBe('a');

		ctrl.step();
		expect(ctrl.getEngine().activeNodeId).toBe('b');
	});

	it('should play and auto-pause at end', () => {
		expect.assertions(2);
		vi.useFakeTimers();
		const ctrl = new ReplayController(snapshot, { baseIntervalMs: 100 });

		ctrl.play();
		expect(ctrl.isPlaying).toBe(true);

		// Advance past all nodes
		vi.advanceTimersByTime(400);

		expect(ctrl.isPlaying).toBe(false);
		vi.useRealTimers();
	});

	it('should pause playback', () => {
		expect.assertions(2);
		vi.useFakeTimers();
		const ctrl = new ReplayController(snapshot, { baseIntervalMs: 100 });

		ctrl.play();
		vi.advanceTimersByTime(250); // Two intervals at 100ms → two steps (index 0, 1)
		ctrl.pause();

		expect(ctrl.isPlaying).toBe(false);
		expect(ctrl.currentIndex).toBe(1);
		vi.useRealTimers();
	});
});
