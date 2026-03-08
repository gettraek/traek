import { versionEntrySchema, type VersionEntry, type StorageAdapter } from '../types';

const LS_PREFIX = 'traek-version-';
const LS_INDEX_PREFIX = 'traek-version-index-';

/**
 * localStorage-based storage adapter for version snapshots.
 * Stores each entry as a separate key. Maintains a per-conversation index.
 */
export class LocalStorageAdapter implements StorageAdapter {
	async save(entry: VersionEntry): Promise<void> {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(LS_PREFIX + entry.id, JSON.stringify(entry));

		const index = this.loadIndex(entry.conversationId);
		if (!index.includes(entry.id)) {
			index.push(entry.id);
			this.saveIndex(entry.conversationId, index);
		}
	}

	async load(id: string): Promise<VersionEntry | null> {
		if (typeof localStorage === 'undefined') return null;
		try {
			const raw = localStorage.getItem(LS_PREFIX + id);
			if (!raw) return null;
			const result = versionEntrySchema.safeParse(JSON.parse(raw));
			return result.success ? result.data : null;
		} catch {
			return null;
		}
	}

	async loadAll(conversationId: string): Promise<VersionEntry[]> {
		if (typeof localStorage === 'undefined') return [];
		const index = this.loadIndex(conversationId);
		const entries: VersionEntry[] = [];
		for (const id of index) {
			const entry = await this.load(id);
			if (entry) entries.push(entry);
		}
		return entries.sort((a, b) => b.createdAt - a.createdAt);
	}

	async delete(id: string): Promise<void> {
		if (typeof localStorage === 'undefined') return;
		const raw = localStorage.getItem(LS_PREFIX + id);
		if (!raw) return;
		try {
			const entry = JSON.parse(raw) as { conversationId?: string };
			if (entry.conversationId) {
				const index = this.loadIndex(entry.conversationId).filter((i) => i !== id);
				this.saveIndex(entry.conversationId, index);
			}
		} catch {
			// ignore parse errors during cleanup
		}
		localStorage.removeItem(LS_PREFIX + id);
	}

	private loadIndex(conversationId: string): string[] {
		try {
			const raw = localStorage.getItem(LS_INDEX_PREFIX + conversationId);
			return raw ? (JSON.parse(raw) as string[]) : [];
		} catch {
			return [];
		}
	}

	private saveIndex(conversationId: string, index: string[]): void {
		localStorage.setItem(LS_INDEX_PREFIX + conversationId, JSON.stringify(index));
	}
}
