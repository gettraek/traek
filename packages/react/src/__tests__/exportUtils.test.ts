import { describe, it, expect } from 'vitest';
import { snapshotToJSON, snapshotToMarkdown } from '../persistence/exportUtils.js';
import type { ConversationSnapshot } from '@traek/core';

const emptySnapshot: ConversationSnapshot = {
	version: 1,
	createdAt: 1700000000000,
	title: 'Test Conversation',
	activeNodeId: null,
	nodes: []
};

const snapshotWithNodes: ConversationSnapshot = {
	version: 1,
	createdAt: 1700000000000,
	title: 'Chat',
	activeNodeId: 'n2',
	nodes: [
		{
			id: 'n1',
			parentIds: [],
			content: 'Hello, how are you?',
			role: 'user',
			type: 'TEXT',
			status: 'done',
			createdAt: 1700000000000,
			metadata: { x: 0, y: 0 }
		},
		{
			id: 'n2',
			parentIds: ['n1'],
			content: 'I am doing great, thank you!',
			role: 'assistant',
			type: 'TEXT',
			status: 'done',
			createdAt: 1700000001000,
			metadata: { x: 5, y: 10 }
		}
	]
};

describe('snapshotToJSON', () => {
	it('produces valid JSON', () => {
		const json = snapshotToJSON(emptySnapshot);
		const parsed = JSON.parse(json);
		expect(parsed.version).toBe(1);
		expect(parsed.title).toBe('Test Conversation');
	});

	it('pretty-prints with 2-space indent', () => {
		const json = snapshotToJSON(emptySnapshot);
		expect(json).toContain('\n  ');
	});
});

describe('snapshotToMarkdown', () => {
	it('includes the title', () => {
		const md = snapshotToMarkdown(emptySnapshot);
		expect(md).toContain('# Test Conversation');
	});

	it('handles empty nodes', () => {
		const md = snapshotToMarkdown(emptySnapshot);
		expect(md).toContain('No messages');
	});

	it('renders user and assistant messages', () => {
		const md = snapshotToMarkdown(snapshotWithNodes);
		expect(md).toContain('**User:**');
		expect(md).toContain('Hello, how are you?');
		expect(md).toContain('**Assistant:**');
		expect(md).toContain('I am doing great');
	});

	it('creates thread sections', () => {
		const md = snapshotToMarkdown(snapshotWithNodes);
		expect(md).toContain('## Thread 1:');
	});

	it('uses fallback title for untitled snapshot', () => {
		const s: ConversationSnapshot = { ...emptySnapshot, title: undefined };
		const md = snapshotToMarkdown(s);
		expect(md).toContain('# Untitled Conversation');
	});
});
