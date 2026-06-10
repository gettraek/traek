/**
 * Lightweight IndexedDB adapter without external dependencies.
 * Provides async wrappers around IndexedDB's callback-based API.
 */

const DEFAULT_DB_NAME = 'traek-conversations';
const DB_VERSION = 1;
const STORE_NAME = 'conversations';

/**
 * Open or create the IndexedDB database.
 */
export function openDB(dbName: string = DEFAULT_DB_NAME): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (typeof indexedDB === 'undefined') {
			reject(new Error('IndexedDB is not available in this environment'));
			return;
		}

		const request = indexedDB.open(dbName, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onblocked = () =>
			reject(
				new Error(
					`IndexedDB open blocked for "${dbName}" — another tab is holding an older version`
				)
			);
		request.onsuccess = () => {
			const db = request.result;
			// Close gracefully when another tab/window requests a version upgrade
			db.onversionchange = () => db.close();
			resolve(db);
		};

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
 * Resolves only when the transaction completes, so quota-related
 * aborts surface as rejections instead of silent data loss.
 */
export function put<T>(db: IDBDatabase, value: T): Promise<void> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');

		tx.oncomplete = () => resolve();
		tx.onabort = () => reject(tx.error ?? new Error('IndexedDB write transaction aborted'));
		tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write transaction failed'));

		tx.objectStore(STORE_NAME).put(value);
	});
}

/**
 * Delete a conversation by ID.
 * Resolves only when the transaction completes.
 */
export function deleteEntry(db: IDBDatabase, id: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');

		tx.oncomplete = () => resolve();
		tx.onabort = () => reject(tx.error ?? new Error('IndexedDB delete transaction aborted'));
		tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete transaction failed'));

		tx.objectStore(STORE_NAME).delete(id);
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
