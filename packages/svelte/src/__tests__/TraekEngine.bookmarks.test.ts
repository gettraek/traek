import { describe, it, expect } from 'vitest';
import { TraekEngine } from '../lib/TraekEngine.svelte';

describe('TraekEngine: bookmarks', () => {
	it('bookmarks a node', () => {
		const engine = new TraekEngine();
		engine.addNode('Hello', 'user');
		const nodeId = engine.nodes[0].id;

		engine.bookmarkNode(nodeId, 'My bookmark');

		expect(engine.nodes[0].metadata?.bookmarked).toBe(true);
		expect(engine.nodes[0].metadata?.bookmarkLabel).toBe('My bookmark');
	});

	it('bookmarks a node without a label', () => {
		const engine = new TraekEngine();
		engine.addNode('Hello', 'user');
		const nodeId = engine.nodes[0].id;

		engine.bookmarkNode(nodeId);

		expect(engine.nodes[0].metadata?.bookmarked).toBe(true);
		expect(engine.nodes[0].metadata?.bookmarkLabel).toBeUndefined();
	});

	it('unbookmarks a node', () => {
		const engine = new TraekEngine();
		engine.addNode('Hello', 'user');
		const nodeId = engine.nodes[0].id;
		engine.bookmarkNode(nodeId, 'test');

		engine.unbookmarkNode(nodeId);

		expect(engine.nodes[0].metadata?.bookmarked).toBe(false);
	});

	it('getBookmarks returns only bookmarked nodes', () => {
		const engine = new TraekEngine();
		engine.addNode('A', 'user');
		engine.addNode('B', 'user');
		engine.addNode('C', 'user');
		const [a, b] = engine.nodes;
		engine.bookmarkNode(a.id, 'First');
		engine.bookmarkNode(b.id);

		const bookmarks = engine.getBookmarks();
		expect(bookmarks).toHaveLength(2);
		expect(bookmarks[0].node.id).toBe(a.id);
		expect(bookmarks[0].label).toBe('First');
	});

	it('getBookmarks returns empty array when no bookmarks', () => {
		const engine = new TraekEngine();
		engine.addNode('Hello', 'user');
		expect(engine.getBookmarks()).toHaveLength(0);
	});
});
