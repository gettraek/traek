import { describe, it, expect } from 'vitest';
import { TraekEngine } from '../lib/TraekEngine.svelte';

describe('TraekEngine: bulk operations', () => {
	it('bulkSetColor sets color on multiple nodes', () => {
		const engine = new TraekEngine();
		engine.addNode('A', 'user');
		engine.addNode('B', 'user');
		const ids = engine.nodes.map((n) => n.id);

		engine.bulkSetColor(ids, 'blue');

		for (const node of engine.nodes) {
			expect(node.metadata?.color).toBe('blue');
		}
	});

	it('bulkAddTag adds tag to multiple nodes', () => {
		const engine = new TraekEngine();
		engine.addNode('A', 'user');
		engine.addNode('B', 'user');
		const ids = engine.nodes.map((n) => n.id);

		engine.bulkAddTag(ids, 'important');

		for (const node of engine.nodes) {
			expect(node.metadata?.tags).toContain('important');
		}
	});

	it('bulkRemoveTag removes tag from multiple nodes', () => {
		const engine = new TraekEngine();
		engine.addNode('A', 'user');
		engine.addNode('B', 'user');
		const ids = engine.nodes.map((n) => n.id);
		engine.bulkAddTag(ids, 'todo');

		engine.bulkRemoveTag(ids, 'todo');

		for (const node of engine.nodes) {
			expect(node.metadata?.tags ?? []).not.toContain('todo');
		}
	});

	it('bulkSetBookmark bookmarks multiple nodes', () => {
		const engine = new TraekEngine();
		engine.addNode('A', 'user');
		engine.addNode('B', 'user');
		const ids = engine.nodes.map((n) => n.id);

		engine.bulkSetBookmark(ids, true);

		for (const node of engine.nodes) {
			expect(node.metadata?.bookmarked).toBe(true);
		}
	});
});
