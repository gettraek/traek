import { describe, it, expect } from 'vitest';
import { snapshotToJSON, snapshotToMarkdown } from '../exportUtils';
import type { ConversationSnapshot } from '../types';

describe('exportUtils', () => {
	describe('snapshotToJSON', () => {
		it('should export a snapshot as pretty-printed JSON', () => {
			const snapshot: ConversationSnapshot = {
				version: 1,
				createdAt: 1234567890,
				title: 'Test Conversation',
				activeNodeId: null,
				nodes: [
					{
						id: '1',
						parentIds: [],
						content: 'Hello',
						role: 'user',
						type: 'text',
						createdAt: 1234567890,
						metadata: { x: 0, y: 0 }
					}
				]
			};

			const json = snapshotToJSON(snapshot);
			expect(json).toContain('"version": 1');
			expect(json).toContain('"title": "Test Conversation"');
			expect(json).toContain('"content": "Hello"');

			// Should be parseable
			const parsed = JSON.parse(json);
			expect(parsed).toEqual(snapshot);
		});
	});

	describe('snapshotToMarkdown', () => {
		it('should export a simple conversation as Markdown', () => {
			const snapshot: ConversationSnapshot = {
				version: 1,
				createdAt: 1234567890,
				title: 'Test Chat',
				activeNodeId: null,
				nodes: [
					{
						id: '1',
						parentIds: [],
						content: 'Hello',
						role: 'user',
						type: 'text',
						createdAt: 1234567890,
						metadata: { x: 0, y: 0 }
					},
					{
						id: '2',
						parentIds: ['1'],
						content: 'Hi there!',
						role: 'assistant',
						type: 'text',
						createdAt: 1234567891,
						metadata: { x: 0, y: 100 }
					}
				]
			};

			const md = snapshotToMarkdown(snapshot);

			expect(md).toContain('# Test Chat');
			expect(md).toContain('**User:**');
			expect(md).toContain('Hello');
			expect(md).toContain('**Assistant:**');
			expect(md).toContain('Hi there!');
			expect(md).toContain('## Thread');
		});

		it('should handle empty conversations', () => {
			const snapshot: ConversationSnapshot = {
				version: 1,
				createdAt: 1234567890,
				title: 'Empty',
				activeNodeId: null,
				nodes: []
			};

			const md = snapshotToMarkdown(snapshot);

			expect(md).toContain('# Empty');
			expect(md).toContain('(No messages)');
		});

		it('should handle branching conversations', () => {
			const snapshot: ConversationSnapshot = {
				version: 1,
				createdAt: 1234567890,
				title: 'Branching',
				activeNodeId: null,
				nodes: [
					{
						id: '1',
						parentIds: [],
						content: 'Root',
						role: 'user',
						type: 'text',
						createdAt: 1234567890,
						metadata: { x: 0, y: 0 }
					},
					{
						id: '2a',
						parentIds: ['1'],
						content: 'Branch A',
						role: 'assistant',
						type: 'text',
						createdAt: 1234567891,
						metadata: { x: -100, y: 100 }
					},
					{
						id: '2b',
						parentIds: ['1'],
						content: 'Branch B',
						role: 'assistant',
						type: 'text',
						createdAt: 1234567892,
						metadata: { x: 100, y: 100 }
					}
				]
			};

			const md = snapshotToMarkdown(snapshot);

			expect(md).toContain('Root');
			expect(md).toContain('Branch A');
			expect(md).toContain('Branch B');
			expect(md).toContain('## Thread 1');
			expect(md).toContain('## Thread 2');
		});

		it('should terminate on cyclic parent links instead of recursing forever', () => {
			const snapshot: ConversationSnapshot = {
				version: 1,
				createdAt: 1234567890,
				title: 'Cyclic',
				activeNodeId: null,
				nodes: [
					{
						id: 'root',
						parentIds: [],
						content: 'Root',
						role: 'user',
						type: 'text',
						createdAt: 1,
						metadata: { x: 0, y: 0 }
					},
					{
						id: 'a',
						parentIds: ['root', 'b'],
						content: 'Node A',
						role: 'assistant',
						type: 'text',
						createdAt: 2,
						metadata: { x: 0, y: 0 }
					},
					{
						id: 'b',
						parentIds: ['a'],
						content: 'Node B',
						role: 'user',
						type: 'text',
						createdAt: 3,
						metadata: { x: 0, y: 0 }
					}
				]
			};

			const md = snapshotToMarkdown(snapshot);
			expect(md).toContain('Root');
			expect(md).toContain('Node A');
			expect(md).toContain('Node B');
		});

		it('should cap the number of extracted threads for DAG fan-out', () => {
			// Chain of diamonds: each diamond doubles the number of root→leaf
			// paths. 12 diamonds → 4096 paths, well beyond the 1000 cap.
			const nodes: ConversationSnapshot['nodes'] = [];
			const makeNode = (id: string, parentIds: string[]) => {
				nodes.push({
					id,
					parentIds,
					content: id,
					role: 'user',
					type: 'text',
					createdAt: nodes.length,
					metadata: { x: 0, y: 0 }
				});
			};

			makeNode('top-0', []);
			for (let i = 0; i < 12; i++) {
				makeNode(`l-${i}`, [`top-${i}`]);
				makeNode(`r-${i}`, [`top-${i}`]);
				makeNode(`top-${i + 1}`, [`l-${i}`, `r-${i}`]);
			}

			const snapshot: ConversationSnapshot = {
				version: 1,
				createdAt: 1234567890,
				title: 'Fan-out',
				activeNodeId: null,
				nodes
			};

			const md = snapshotToMarkdown(snapshot);
			const threadCount = (md.match(/^## Thread /gm) ?? []).length;
			expect(threadCount).toBeLessThanOrEqual(1000);
			expect(threadCount).toBeGreaterThan(0);
		});

		it('should sanitize titles so they cannot inject extra headings', () => {
			const snapshot: ConversationSnapshot = {
				version: 1,
				createdAt: 1234567890,
				title: '# Fake heading\n## Injected',
				activeNodeId: null,
				nodes: []
			};

			const md = snapshotToMarkdown(snapshot);
			const lines = md.split('\n');
			// The escaped/flattened title lives on a single heading line
			expect(lines[0]).toBe('# \\# Fake heading ## Injected');
			expect(md).not.toContain('\n## Injected');
		});
	});
});
