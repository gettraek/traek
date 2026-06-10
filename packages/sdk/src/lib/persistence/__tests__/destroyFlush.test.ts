// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { TraekEngine } from '../../TraekEngine.svelte';
import { ConversationStore } from '../ConversationStore.svelte';

const DEBOUNCE_MS = 100;

const { putSpy, closeSpy, fakeDb } = vi.hoisted(() => {
	const putSpy = vi.fn<(db: IDBDatabase, value: unknown) => Promise<void>>(async () => {});
	const closeSpy = vi.fn();
	const fakeDb = { close: closeSpy } as unknown as IDBDatabase;
	return { putSpy, closeSpy, fakeDb };
});

// Force the IndexedDB code path with a fake adapter so we can observe
// whether the flushed save still reaches the database after destroy().
vi.mock('../indexedDBAdapter', () => ({
	openDB: vi.fn(async () => fakeDb),
	get: vi.fn(async () => undefined),
	put: putSpy,
	deleteEntry: vi.fn(async () => {}),
	getAll: vi.fn(async () => []),
	getAllKeys: vi.fn(async () => []),
	getStorageEstimate: vi.fn(async () => null)
}));

/** Drain the microtask queue so promise-chained saves can settle. */
async function flushMicrotasks(turns = 40): Promise<void> {
	for (let i = 0; i < turns; i++) {
		await Promise.resolve();
	}
}

describe('ConversationStore destroy() with a pending auto-save (jsdom)', () => {
	beforeEach(() => {
		localStorage.clear();
		putSpy.mockClear();
		closeSpy.mockClear();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('keeps the db open until the flushed auto-save settles, then closes it', async () => {
		const store = new ConversationStore({ autoSaveDebounceMs: DEBOUNCE_MS });
		await store.init();
		const engine = new TraekEngine();

		store.enableAutoSave(engine, 'conv-1');
		flushSync();
		await flushMicrotasks();
		putSpy.mockClear();

		engine.addNode('pending content', 'user');
		flushSync();
		await flushMicrotasks();

		// Debounce has not elapsed — destroy() must flush through IndexedDB
		store.destroy();
		expect(store.isReady).toBe(false);
		await flushMicrotasks();

		// The flushed save went to the IndexedDB path, not localStorage
		expect(putSpy).toHaveBeenCalled();
		const saved = putSpy.mock.calls.at(-1)?.[1] as { id: string } | undefined;
		expect(saved?.id).toBe('conv-1');
		expect(localStorage.getItem('traek-conv-conv-1')).toBeNull();

		// The db was closed only after the save settled
		expect(closeSpy).toHaveBeenCalledTimes(1);
		expect(putSpy.mock.invocationCallOrder.at(-1)!).toBeLessThan(
			closeSpy.mock.invocationCallOrder[0]
		);
	});

	it('closes the db on destroy() when nothing is pending', async () => {
		const store = new ConversationStore({ autoSaveDebounceMs: DEBOUNCE_MS });
		await store.init();

		store.destroy();
		await flushMicrotasks();

		expect(closeSpy).toHaveBeenCalledTimes(1);
	});
});
