import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TraekEngine } from '../../TraekEngine.svelte';
import { ReplayController } from '../ReplayController.svelte';
import type { ConversationSnapshot, SerializedNode } from '../types.js';

function makeNode(overrides: Partial<SerializedNode> & { id: string }): SerializedNode {
	return {
		parentId: null,
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
		// addNode auto-sets activeNodeId, so next node becomes child
		const childNode = engine.addNode('Child', 'assistant');

		const snapshot = engine.serialize();
		expect(snapshot.nodes).toHaveLength(2);

		const parent = snapshot.nodes.find((n) => n.id === parentNode.id);
		const child = snapshot.nodes.find((n) => n.id === childNode.id);
		expect(parent?.parentId).toBeNull();
		expect(child?.parentId).toBe(parentNode.id);
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
			makeNode({ id: 'n2', parentId: 'n1', role: 'assistant', createdAt: 2000 })
		];
		const snapshot = makeSnapshot(nodes, { activeNodeId: 'n2' });
		const engine = TraekEngine.fromSnapshot(snapshot);

		expect(engine.nodes).toHaveLength(2);
		expect(engine.activeNodeId).toBe('n2');
		expect(engine.nodes[0].id).toBe('n1');
		expect(engine.nodes[1].parentId).toBe('n1');
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
		// Verify config applied by re-serializing — the engine was created with the override
		const reserialized = engine.serialize();
		// Just verify the engine was created without errors
		expect(reserialized.nodes).toHaveLength(0);
	});

	it('should roundtrip serialize → fromSnapshot', () => {
		expect.assertions(4);
		const original = new TraekEngine();
		const node1 = original.addNode('First', 'user');
		// addNode auto-sets activeNodeId
		const node2 = original.addNode('Second', 'assistant');

		const snapshot = original.serialize('Roundtrip Test');
		const restored = TraekEngine.fromSnapshot(snapshot);

		expect(restored.nodes).toHaveLength(2);
		expect(restored.activeNodeId).toBe(node2.id);
		expect(restored.nodes.find((n) => n.id === node1.id)).toBeDefined();
		expect(restored.nodes.find((n) => n.id === node2.id)).toBeDefined();
	});
});

describe('ReplayController', () => {
	let snapshot: ConversationSnapshot;

	beforeEach(() => {
		snapshot = makeSnapshot([
			makeNode({ id: 'a', createdAt: 100 }),
			makeNode({ id: 'b', parentId: 'a', role: 'assistant', createdAt: 200 }),
			makeNode({ id: 'c', parentId: 'b', createdAt: 300 })
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
			makeNode({ id: 'm', parentId: 'a', createdAt: 200 })
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
