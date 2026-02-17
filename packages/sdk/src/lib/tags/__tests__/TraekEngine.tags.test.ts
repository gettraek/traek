import { describe, it, expect, beforeEach } from 'vitest';
import { TraekEngine } from '../../TraekEngine.svelte';

describe('TraekEngine tag methods', () => {
	let engine: TraekEngine;
	let nodeId: string;

	beforeEach(() => {
		engine = new TraekEngine();
		const node = engine.addNode('Test message', 'user');
		nodeId = node.id;
	});

	describe('addTag', () => {
		it('should add a tag to a node', () => {
			engine.addTag(nodeId, 'important');
			const tags = engine.getTags(nodeId);
			expect(tags).toEqual(['important']);
		});

		it('should add multiple tags', () => {
			engine.addTag(nodeId, 'important');
			engine.addTag(nodeId, 'todo');
			const tags = engine.getTags(nodeId);
			expect(tags).toEqual(['important', 'todo']);
		});

		it('should not add duplicate tags', () => {
			engine.addTag(nodeId, 'important');
			engine.addTag(nodeId, 'important');
			const tags = engine.getTags(nodeId);
			expect(tags).toEqual(['important']);
		});

		it('should initialize metadata if not present', () => {
			const node = engine.getNode(nodeId);
			expect(node?.metadata).toBeDefined();
			engine.addTag(nodeId, 'important');
			expect(node?.metadata?.tags).toBeDefined();
		});

		it('should do nothing for non-existent node', () => {
			expect(() => engine.addTag('non-existent', 'tag')).not.toThrow();
		});
	});

	describe('removeTag', () => {
		it('should remove a tag from a node', () => {
			engine.addTag(nodeId, 'important');
			engine.addTag(nodeId, 'todo');
			engine.removeTag(nodeId, 'important');
			const tags = engine.getTags(nodeId);
			expect(tags).toEqual(['todo']);
		});

		it('should handle removing non-existent tag', () => {
			engine.addTag(nodeId, 'important');
			engine.removeTag(nodeId, 'non-existent');
			const tags = engine.getTags(nodeId);
			expect(tags).toEqual(['important']);
		});

		it('should do nothing for node without metadata', () => {
			const node = engine.addNode('Test', 'user');
			if (node.metadata) node.metadata.tags = undefined;
			expect(() => engine.removeTag(node.id, 'tag')).not.toThrow();
		});

		it('should do nothing for non-existent node', () => {
			expect(() => engine.removeTag('non-existent', 'tag')).not.toThrow();
		});
	});

	describe('getTags', () => {
		it('should return empty array for node without tags', () => {
			const tags = engine.getTags(nodeId);
			expect(tags).toEqual([]);
		});

		it('should return tags for node', () => {
			engine.addTag(nodeId, 'important');
			engine.addTag(nodeId, 'todo');
			const tags = engine.getTags(nodeId);
			expect(tags).toEqual(['important', 'todo']);
		});

		it('should return empty array for non-existent node', () => {
			const tags = engine.getTags('non-existent');
			expect(tags).toEqual([]);
		});
	});

	describe('tag persistence', () => {
		it('should persist tags in node metadata', () => {
			engine.addTag(nodeId, 'important');
			const node = engine.getNode(nodeId);
			expect(node?.metadata?.tags).toEqual(['important']);
		});

		it('should serialize tags in snapshot', () => {
			engine.addTag(nodeId, 'important');
			engine.addTag(nodeId, 'todo');
			const snapshot = engine.serialize();
			const nodeData = snapshot.nodes.find((n) => n.id === nodeId);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const tags = (nodeData?.metadata as any)?.tags as string[] | undefined;
			expect(tags).toEqual(['important', 'todo']);
		});

		it('should restore tags from snapshot', () => {
			engine.addTag(nodeId, 'important');
			const snapshot = engine.serialize();

			const newEngine = TraekEngine.fromSnapshot(snapshot);
			const tags = newEngine.getTags(nodeId);
			expect(tags).toEqual(['important']);
		});
	});
});
