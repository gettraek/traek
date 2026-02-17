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
	});
});
