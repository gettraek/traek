/**
 * Lightweight IndexedDB adapter without external dependencies.
 * Provides async wrappers around IndexedDB's callback-based API.
 */

const DB_NAME = 'traek-conversations';
const DB_VERSION = 1;
const STORE_NAME = 'conversations';

/**
 * Open or create the IndexedDB database.
 */
export function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (typeof indexedDB === 'undefined') {
			reject(new Error('IndexedDB is not available in this environment'));
			return;
		}

		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;

			// Create object store if it doesn't exist
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
				// Indexes for sorting and searching
				store.createIndex('updatedAt', 'updatedAt', { unique: false });
				store.createIndex('title', 'title', { unique: false });
			}
		};
	});
}

/**
 * Get a single conversation by ID.
 */
export function get<T>(db: IDBDatabase, id: string): Promise<T | undefined> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readonly');
		const store = tx.objectStore(STORE_NAME);
		const request = store.get(id);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result as T | undefined);
	});
}

/**
 * Store or update a conversation.
 */
export function put<T>(db: IDBDatabase, value: T): Promise<void> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);
		const request = store.put(value);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
}

/**
 * Delete a conversation by ID.
 */
export function deleteEntry(db: IDBDatabase, id: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);
		const request = store.delete(id);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
}

/**
 * Get all conversations, sorted by updatedAt descending.
 */
export function getAll<T>(db: IDBDatabase): Promise<T[]> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readonly');
		const store = tx.objectStore(STORE_NAME);
		const index = store.index('updatedAt');
		const request = index.openCursor(null, 'prev'); // Descending order

		const results: T[] = [];

		request.onerror = () => reject(request.error);
		request.onsuccess = (event) => {
			const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
			if (cursor) {
				results.push(cursor.value as T);
				cursor.continue();
			} else {
				resolve(results);
			}
		};
	});
}

/**
 * Get all conversation IDs.
 */
export function getAllKeys(db: IDBDatabase): Promise<string[]> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readonly');
		const store = tx.objectStore(STORE_NAME);
		const request = store.getAllKeys();

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result as string[]);
	});
}

/**
 * Check if IndexedDB is available in the current environment.
 */
export function isIndexedDBAvailable(): boolean {
	if (typeof window === 'undefined') return false;
	if (typeof indexedDB === 'undefined') return false;

	// Some browsers (old Safari private mode) report indexedDB but operations fail
	try {
		const test = indexedDB.open('__traek_test__');
		test.onsuccess = () => {
			const db = test.result;
			db.close();
			indexedDB.deleteDatabase('__traek_test__');
		};
		return true;
	} catch {
		return false;
	}
}

/**
 * Get storage quota information (if available).
 */
export async function getStorageEstimate(): Promise<{ used: number; quota: number } | null> {
	if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
		return null;
	}

	try {
		const estimate = await navigator.storage.estimate();
		return {
			used: estimate.usage ?? 0,
			quota: estimate.quota ?? 0
		};
	} catch {
		return null;
	}
}
