import { versionEntrySchema, type VersionEntry, type StorageAdapter } from '../types';

const DB_NAME = 'traek-versions';
const DB_VERSION = 1;
const STORE_NAME = 'versions';

function openVersionDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (typeof indexedDB === 'undefined') {
			reject(new Error('IndexedDB not available'));
			return;
		}
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onerror = () => reject(req.error);
		req.onsuccess = () => resolve(req.result);
		req.onupgradeneeded = (ev) => {
			const db = (ev.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
				store.createIndex('conversationId', 'conversationId', { unique: false });
				store.createIndex('createdAt', 'createdAt', { unique: false });
			}
		};
	});
}

/**
 * IndexedDB-backed storage adapter for version snapshots.
 * Each entry is stored with a `conversationId` index for efficient lookup.
 */
export class IndexedDBVersionAdapter implements StorageAdapter {
	private db: IDBDatabase | null = null;

	private async getDB(): Promise<IDBDatabase> {
		if (!this.db) this.db = await openVersionDB();
		return this.db;
	}

	async save(entry: VersionEntry): Promise<void> {
		const db = await this.getDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const req = tx.objectStore(STORE_NAME).put(entry);
			req.onerror = () => reject(req.error);
			req.onsuccess = () => resolve();
		});
	}

	async load(id: string): Promise<VersionEntry | null> {
		const db = await this.getDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const req = tx.objectStore(STORE_NAME).get(id);
			req.onerror = () => reject(req.error);
			req.onsuccess = () => {
				if (!req.result) {
					resolve(null);
					return;
				}
				const parsed = versionEntrySchema.safeParse(req.result);
				resolve(parsed.success ? parsed.data : null);
			};
		});
	}

	async loadAll(conversationId: string): Promise<VersionEntry[]> {
		const db = await this.getDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const index = tx.objectStore(STORE_NAME).index('conversationId');
			const req = index.getAll(conversationId);
			req.onerror = () => reject(req.error);
			req.onsuccess = () => {
				const entries = (req.result as VersionEntry[]).sort((a, b) => b.createdAt - a.createdAt);
				resolve(entries);
			};
		});
	}

	async delete(id: string): Promise<void> {
		const db = await this.getDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const req = tx.objectStore(STORE_NAME).delete(id);
			req.onerror = () => reject(req.error);
			req.onsuccess = () => resolve();
		});
	}
}
