import { describe, it, expect } from 'vitest';
import { TraekEngine } from '../lib/TraekEngine.svelte';

describe('TraekEngine: color coding', () => {
	it('sets a color on a node', () => {
		const engine = new TraekEngine();
		engine.addNode('Hello', 'user');
		const nodeId = engine.nodes[0].id;

		engine.setNodeColor(nodeId, 'red');

		expect(engine.nodes[0].metadata?.color).toBe('red');
	});

	it('clears a color by setting null', () => {
		const engine = new TraekEngine();
		engine.addNode('Hello', 'user');
		const nodeId = engine.nodes[0].id;
		engine.setNodeColor(nodeId, 'blue');

		engine.setNodeColor(nodeId, null);

		expect(engine.nodes[0].metadata?.color).toBeNull();
	});

	it('sets color on entire branch', () => {
		const engine = new TraekEngine();
		engine.addNode('Root', 'user');
		const rootId = engine.nodes[0].id;
		engine.addNode('Child 1', 'assistant', { parentIds: [rootId] });
		engine.addNode('Child 2', 'user', { parentIds: [rootId] });

		engine.setNodeColorBranch(rootId, 'green');

		for (const node of engine.nodes) {
			expect(node.metadata?.color).toBe('green');
		}
	});

	it('returns null color for uncolored node', () => {
		const engine = new TraekEngine();
		engine.addNode('Hello', 'user');
		const nodeId = engine.nodes[0].id;
		expect(engine.getNodeColor(nodeId)).toBeNull();
	});
});
