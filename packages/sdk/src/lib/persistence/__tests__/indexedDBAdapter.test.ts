import { describe, it, expect, vi } from 'vitest';
import { put, deleteEntry, openDB } from '../indexedDBAdapter';

interface FakeTx {
	oncomplete: (() => void) | null;
	onabort: (() => void) | null;
	onerror: (() => void) | null;
	error: DOMException | Error | null;
	objectStore: () => { put: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
}

function makeFakeDb(): {
	db: IDBDatabase;
	tx: FakeTx;
	store: { put: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
} {
	const store = { put: vi.fn(), delete: vi.fn() };
	const tx: FakeTx = {
		oncomplete: null,
		onabort: null,
		onerror: null,
		error: null,
		objectStore: () => store
	};
	const db = {
		transaction: vi.fn(() => tx)
	} as unknown as IDBDatabase;
	return { db, tx, store };
}

describe('indexedDBAdapter transaction semantics', () => {
	describe('put()', () => {
		it('resolves only when the transaction completes', async () => {
			expect.assertions(3);
			const { db, tx, store } = makeFakeDb();
			let settled = false;

			const promise = put(db, { id: 'a' }).then(() => {
				settled = true;
			});

			// The request was issued but the transaction has not completed yet
			expect(store.put).toHaveBeenCalledWith({ id: 'a' });
			await Promise.resolve();
			expect(settled).toBe(false);

			tx.oncomplete?.();
			await promise;
			expect(settled).toBe(true);
		});

		it('rejects when the transaction aborts (e.g. quota exceeded)', async () => {
			expect.assertions(1);
			const { db, tx } = makeFakeDb();
			tx.error = new Error('QuotaExceededError');

			const promise = put(db, { id: 'a' });
			tx.onabort?.();

			await expect(promise).rejects.toThrow('QuotaExceededError');
		});

		it('rejects with a fallback error when the abort has no tx.error', async () => {
			expect.assertions(1);
			const { db, tx } = makeFakeDb();

			const promise = put(db, { id: 'a' });
			tx.onabort?.();

			await expect(promise).rejects.toThrow(/aborted/i);
		});

		it('rejects when the transaction errors', async () => {
			expect.assertions(1);
			const { db, tx } = makeFakeDb();
			tx.error = new Error('boom');

			const promise = put(db, { id: 'a' });
			tx.onerror?.();

			await expect(promise).rejects.toThrow('boom');
		});
	});

	describe('deleteEntry()', () => {
		it('resolves only when the transaction completes', async () => {
			expect.assertions(3);
			const { db, tx, store } = makeFakeDb();
			let settled = false;

			const promise = deleteEntry(db, 'a').then(() => {
				settled = true;
			});

			expect(store.delete).toHaveBeenCalledWith('a');
			await Promise.resolve();
			expect(settled).toBe(false);

			tx.oncomplete?.();
			await promise;
			expect(settled).toBe(true);
		});

		it('rejects when the transaction aborts', async () => {
			expect.assertions(1);
			const { db, tx } = makeFakeDb();
			tx.error = new Error('abort reason');

			const promise = deleteEntry(db, 'a');
			tx.onabort?.();

			await expect(promise).rejects.toThrow('abort reason');
		});

		it('rejects when the transaction errors', async () => {
			expect.assertions(1);
			const { db, tx } = makeFakeDb();

			const promise = deleteEntry(db, 'a');
			tx.onerror?.();

			await expect(promise).rejects.toThrow(/failed/i);
		});
	});

	describe('openDB()', () => {
		it('rejects when IndexedDB is unavailable', async () => {
			expect.assertions(1);
			// Node test environment has no indexedDB global
			await expect(openDB('any-name')).rejects.toThrow(/not available/i);
		});
	});
});
