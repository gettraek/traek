import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConversationStore } from '../persistence/ConversationStore.js';

// Mock IndexedDB to not be available so we fall back to localStorage
vi.mock('../persistence/indexedDBAdapter.js', () => ({
	openDB: vi.fn().mockRejectedValue(new Error('IndexedDB not available')),
	get: vi.fn(),
	put: vi.fn(),
	deleteEntry: vi.fn(),
	getAll: vi.fn().mockResolvedValue([]),
	getAllKeys: vi.fn().mockResolvedValue([]),
	isIndexedDBAvailable: vi.fn().mockReturnValue(false),
	getStorageEstimate: vi.fn().mockResolvedValue(null)
}));

// Minimal localStorage mock
function makeLocalStorage() {
	const store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		get length() {
			return Object.keys(store).length;
		},
		key: (i: number) => Object.keys(store)[i] ?? null,
		clear: () => {
			for (const k in store) delete store[k];
		}
	};
}

describe('ConversationStore', () => {
	let ls: ReturnType<typeof makeLocalStorage>;

	beforeEach(() => {
		ls = makeLocalStorage();
		Object.defineProperty(globalThis, 'localStorage', {
			value: ls,
			writable: true,
			configurable: true
		});
		Object.defineProperty(globalThis, 'crypto', {
			value: { randomUUID: () => Math.random().toString(36).slice(2) },
			writable: true,
			configurable: true
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('initializes and sets isReady to true', async () => {
		const store = new ConversationStore();
		expect(store.getState().isReady).toBe(false);
		await store.init();
		expect(store.getState().isReady).toBe(true);
		store.destroy();
	});

	it('create() adds a conversation', async () => {
		const store = new ConversationStore();
		await store.init();

		const id = await store.create('Test chat');
		const state = store.getState();

		expect(state.conversations).toHaveLength(1);
		expect(state.conversations[0]!.title).toBe('Test chat');
		expect(id).toBeTruthy();
		store.destroy();
	});

	it('load() returns the snapshot after save()', async () => {
		const store = new ConversationStore();
		await store.init();

		const id = await store.create('My conv');

		const snapshot = {
			version: 1 as const,
			createdAt: Date.now(),
			title: 'My conv',
			activeNodeId: null,
			nodes: []
		};

		await store.save(id, snapshot);
		const loaded = await store.load(id);

		expect(loaded).not.toBeNull();
		expect(loaded!.title).toBe('My conv');
		store.destroy();
	});

	it('delete() removes conversation', async () => {
		const store = new ConversationStore();
		await store.init();

		const id = await store.create('To delete');
		expect(store.getState().conversations).toHaveLength(1);

		await store.delete(id);
		expect(store.getState().conversations).toHaveLength(0);
		store.destroy();
	});

	it('rename() updates title', async () => {
		const store = new ConversationStore();
		await store.init();

		const id = await store.create('Old name');
		await store.rename(id, 'New name');

		const state = store.getState();
		expect(state.conversations[0]!.title).toBe('New name');
		store.destroy();
	});

	it('subscribe() notifies listeners on state change', async () => {
		const store = new ConversationStore();
		await store.init();

		const listener = vi.fn();
		const unsub = store.subscribe(listener);

		await store.create('Notify test');
		expect(listener).toHaveBeenCalled();

		unsub();
		store.destroy();
	});

	it('exportAsJSON() returns valid JSON string', async () => {
		const store = new ConversationStore();
		await store.init();

		const id = await store.create('Export me');
		const json = await store.exportAsJSON(id);

		const parsed = JSON.parse(json);
		expect(parsed.version).toBe(1);
		store.destroy();
	});

	it('exportAsMarkdown() returns markdown string', async () => {
		const store = new ConversationStore();
		await store.init();

		const id = await store.create('Markdown');
		const md = await store.exportAsMarkdown(id);

		expect(md).toContain('# Markdown');
		store.destroy();
	});

	it('duplicate() creates a copy', async () => {
		const store = new ConversationStore();
		await store.init();

		const id = await store.create('Original');
		const newId = await store.duplicate(id);

		expect(newId).not.toBe(id);
		expect(store.getState().conversations).toHaveLength(2);

		const title = store.getState().conversations.find((c) => c.id === newId)?.title;
		expect(title).toContain('copy');
		store.destroy();
	});

	it('destroy() clears listeners and marks not ready', async () => {
		const store = new ConversationStore();
		await store.init();

		const listener = vi.fn();
		store.subscribe(listener);
		store.destroy();

		expect(store.getState().isReady).toBe(false);
	});
});
