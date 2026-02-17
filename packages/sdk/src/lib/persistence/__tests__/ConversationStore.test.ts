import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationStore } from '../ConversationStore.svelte';
import type { ConversationSnapshot } from '../types';

// Mock localStorage for testing
const localStorageMock = (() => {
	let store: Record<string, string> = {};

	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
		get length() {
			return Object.keys(store).length;
		},
		key: (index: number) => Object.keys(store)[index] || null
	};
})();

global.localStorage = localStorageMock as Storage;

describe('ConversationStore', () => {
	beforeEach(() => {
		localStorageMock.clear();
	});

	describe('initialization', () => {
		it('should initialize successfully', async () => {
			const store = new ConversationStore();
			expect(store.isReady).toBe(false);

			await store.init();

			expect(store.isReady).toBe(true);
			expect(store.conversations).toEqual([]);
		});

		it('should start with empty conversations', async () => {
			const store = new ConversationStore();
			await store.init();

			expect(store.conversations).toHaveLength(0);
		});
	});

	describe('CRUD operations', () => {
		it('should create a new conversation', async () => {
			const store = new ConversationStore();
			await store.init();

			const id = await store.create('Test Chat');

			expect(id).toBeTruthy();
			expect(store.conversations).toHaveLength(1);
			expect(store.conversations[0].title).toBe('Test Chat');
			expect(store.conversations[0].nodeCount).toBe(0);
		});

		it('should load a conversation', async () => {
			const store = new ConversationStore();
			await store.init();

			const id = await store.create('Load Test');
			const loaded = await store.load(id);

			expect(loaded).toBeTruthy();
			expect(loaded?.title).toBe('Load Test');
			expect(loaded?.nodes).toEqual([]);
		});

		it('should save a conversation snapshot', async () => {
			const store = new ConversationStore();
			await store.init();

			const id = await store.create('Save Test');

			const snapshot: ConversationSnapshot = {
				version: 1,
				createdAt: Date.now(),
				title: 'Updated Title',
				activeNodeId: null,
				nodes: [
					{
						id: 'n1',
						parentIds: [],
						content: 'Hello',
						role: 'user',
						type: 'text',
						createdAt: Date.now(),
						metadata: { x: 0, y: 0 }
					}
				]
			};

			await store.save(id, snapshot);

			const loaded = await store.load(id);
			expect(loaded?.nodes).toHaveLength(1);
			expect(loaded?.nodes[0].content).toBe('Hello');

			// Check list item updated
			expect(store.conversations[0].nodeCount).toBe(1);
			expect(store.conversations[0].preview).toContain('Hello');
		});

		it('should delete a conversation', async () => {
			const store = new ConversationStore();
			await store.init();

			const id = await store.create('Delete Test');
			expect(store.conversations).toHaveLength(1);

			await store.delete(id);

			expect(store.conversations).toHaveLength(0);
			const loaded = await store.load(id);
			expect(loaded).toBeNull();
		});

		it('should rename a conversation', async () => {
			const store = new ConversationStore();
			await store.init();

			const id = await store.create('Original Name');
			await store.rename(id, 'New Name');

			expect(store.conversations[0].title).toBe('New Name');

			const loaded = await store.load(id);
			expect(loaded?.title).toBe('New Name');
		});

		it('should duplicate a conversation', async () => {
			const store = new ConversationStore();
			await store.init();

			const id = await store.create('Original');

			const snapshot: ConversationSnapshot = {
				version: 1,
				createdAt: Date.now(),
				title: 'Original',
				activeNodeId: null,
				nodes: [
					{
						id: 'n1',
						parentIds: [],
						content: 'Test content',
						role: 'user',
						type: 'text',
						createdAt: Date.now(),
						metadata: { x: 0, y: 0 }
					}
				]
			};

			await store.save(id, snapshot);

			const newId = await store.duplicate(id);

			expect(newId).not.toBe(id);
			expect(store.conversations).toHaveLength(2);

			const duplicated = await store.load(newId);
			expect(duplicated?.title).toContain('(copy)');
			expect(duplicated?.nodes).toHaveLength(1);
			expect(duplicated?.nodes[0].content).toBe('Test content');
		});
	});

	describe('list operations', () => {
		it('should list all conversations', async () => {
			const store = new ConversationStore();
			await store.init();

			await store.create('Chat 1');
			await store.create('Chat 2');
			await store.create('Chat 3');

			const list = await store.listAll();

			expect(list).toHaveLength(3);
		});

		it('should extract preview from first user message', async () => {
			const store = new ConversationStore();
			await store.init();

			const id = await store.create('Preview Test');

			const snapshot: ConversationSnapshot = {
				version: 1,
				createdAt: Date.now(),
				title: 'Preview Test',
				activeNodeId: null,
				nodes: [
					{
						id: 'n1',
						parentIds: [],
						content: 'This is a long message that should be truncated in the preview'.repeat(5),
						role: 'user',
						type: 'text',
						createdAt: Date.now(),
						metadata: { x: 0, y: 0 }
					}
				]
			};

			await store.save(id, snapshot);

			expect(store.conversations[0].preview.length).toBeLessThanOrEqual(101); // 100 + ellipsis
			expect(store.conversations[0].preview).toContain('This is a long message');
		});
	});

	describe('export', () => {
		it('should export conversation as JSON', async () => {
			const store = new ConversationStore();
			await store.init();

			const id = await store.create('Export Test');
			const json = await store.exportAsJSON(id);

			expect(json).toBeTruthy();
			const parsed = JSON.parse(json);
			expect(parsed.title).toBe('Export Test');
		});

		it('should export conversation as Markdown', async () => {
			const store = new ConversationStore();
			await store.init();

			const id = await store.create('Markdown Test');

			const snapshot: ConversationSnapshot = {
				version: 1,
				createdAt: Date.now(),
				title: 'Markdown Test',
				activeNodeId: null,
				nodes: [
					{
						id: 'n1',
						parentIds: [],
						content: 'Hello',
						role: 'user',
						type: 'text',
						createdAt: Date.now(),
						metadata: { x: 0, y: 0 }
					}
				]
			};

			await store.save(id, snapshot);

			const md = await store.exportAsMarkdown(id);

			expect(md).toContain('# Markdown Test');
			expect(md).toContain('Hello');
		});
	});

	describe('save state', () => {
		it('should initialize with idle state', async () => {
			const store = new ConversationStore();
			await store.init();

			expect(store.saveState).toBe('idle');
		});
	});
});
