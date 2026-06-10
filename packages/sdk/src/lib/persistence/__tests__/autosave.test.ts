// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { TraekEngine } from '../../TraekEngine.svelte';
import { ConversationStore } from '../ConversationStore.svelte';

const DEBOUNCE_MS = 100;

async function makeStore(): Promise<ConversationStore> {
	const store = new ConversationStore({ autoSaveDebounceMs: DEBOUNCE_MS });
	await store.init();
	return store;
}

/** Drain the microtask queue so promise-chained saves can settle (no timers involved). */
async function flushMicrotasks(turns = 20): Promise<void> {
	for (let i = 0; i < turns; i++) {
		await Promise.resolve();
	}
}

describe('ConversationStore auto-save (jsdom)', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('saves after the debounce when nodes are added', async () => {
		const store = await makeStore();
		const id = await store.create('Autosave');
		const engine = new TraekEngine();

		store.enableAutoSave(engine, id);
		flushSync();

		engine.addNode('hello', 'user');
		flushSync();

		await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);

		const loaded = await store.load(id);
		expect(loaded?.nodes).toHaveLength(1);
		expect(store.lastSavedAt).not.toBeNull();
		store.destroy();
	});

	it('tracks deep in-place mutations via engine.version', async () => {
		const store = await makeStore();
		const id = await store.create('Deep mutation');
		const engine = new TraekEngine();
		const node = engine.addNode('initial', 'user');

		store.enableAutoSave(engine, id);
		flushSync();
		await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);

		// In-place content mutation: nodes.length and activeNodeId unchanged,
		// only the engine version counter changes.
		engine.updateNode(node.id, { content: 'mutated in place' });
		flushSync();
		await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);

		const loaded = await store.load(id);
		expect(loaded?.nodes[0]?.content).toBe('mutated in place');
		store.destroy();
	});

	it('flushes a pending debounced save on disableAutoSave()', async () => {
		const store = await makeStore();
		const id = await store.create('Flush on disable');
		const engine = new TraekEngine();

		store.enableAutoSave(engine, id);
		flushSync();
		await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);

		engine.addNode('about to disable', 'user');
		flushSync();
		// Effects re-run on a microtask; drain so the debounced save is scheduled
		await flushMicrotasks();

		// Debounce has not elapsed — disable must flush instead of dropping
		store.disableAutoSave();
		await flushMicrotasks();

		const loaded = await store.load(id);
		expect(loaded?.nodes).toHaveLength(1);
		store.destroy();
	});

	it('flushes a pending debounced save on destroy()', async () => {
		const store = await makeStore();
		const id = await store.create('Flush on destroy');
		const engine = new TraekEngine();

		store.enableAutoSave(engine, id);
		flushSync();
		await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);

		engine.addNode('about to destroy', 'user');
		flushSync();
		await flushMicrotasks();

		store.destroy();
		await flushMicrotasks();

		const verify = new ConversationStore();
		await verify.init();
		const loaded = await verify.load(id);
		expect(loaded?.nodes).toHaveLength(1);
		verify.destroy();
	});

	it('flushes a pending debounced save on pagehide', async () => {
		const store = await makeStore();
		const id = await store.create('Flush on pagehide');
		const engine = new TraekEngine();

		store.enableAutoSave(engine, id);
		flushSync();
		await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);

		engine.addNode('hidden away', 'user');
		flushSync();
		await flushMicrotasks();

		window.dispatchEvent(new Event('pagehide'));
		await flushMicrotasks();

		const loaded = await store.load(id);
		expect(loaded?.nodes).toHaveLength(1);
		store.destroy();
	});

	it('removes the pagehide listener on disableAutoSave()', async () => {
		const store = await makeStore();
		const id = await store.create('Listener cleanup');
		const engine = new TraekEngine();
		const removeSpy = vi.spyOn(window, 'removeEventListener');

		store.enableAutoSave(engine, id);
		flushSync();
		store.disableAutoSave();

		expect(removeSpy).toHaveBeenCalledWith('pagehide', expect.any(Function));
		removeSpy.mockRestore();
		store.destroy();
	});

	it('sets saveState to error when localStorage save fails (quota)', async () => {
		const store = await makeStore();
		const id = await store.create('Quota');
		const engine = new TraekEngine();

		store.enableAutoSave(engine, id);
		flushSync();
		await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);

		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('quota exceeded', 'QuotaExceededError');
		});

		engine.addNode('too big', 'user');
		flushSync();
		await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);

		expect(store.saveState).toBe('error');

		setItemSpy.mockRestore();
		consoleError.mockRestore();
		store.destroy();
	});
});
