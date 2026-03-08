import type { ConversationSnapshot } from '../persistence/schemas';
import type { StorageAdapter, VersionEntry, VersionHistoryOptions, SnapshotDiff } from './types';
import { snapshotDiff } from './snapshotDiff';
import { versionEntrySchema } from './types';

const DEFAULT_OPTIONS: Required<VersionHistoryOptions> = {
	maxAutoSnapshots: 20,
	maxVersions: 50
};

/**
 * Manages named version snapshots for canvas conversations.
 * Works with any StorageAdapter (MemoryAdapter, LocalStorageAdapter, IndexedDBVersionAdapter).
 */
export class VersionHistoryManager {
	private adapter: StorageAdapter;
	private options: Required<VersionHistoryOptions>;
	private lastTimestamp = 0;

	constructor(adapter: StorageAdapter, options: VersionHistoryOptions = {}) {
		this.adapter = adapter;
		this.options = { ...DEFAULT_OPTIONS, ...options };
	}

	/** Returns a monotonically increasing timestamp to ensure stable sort order. */
	private now(): number {
		const ts = Date.now();
		this.lastTimestamp = ts > this.lastTimestamp ? ts : this.lastTimestamp + 1;
		return this.lastTimestamp;
	}

	/** Save a manual (named) version snapshot. */
	async saveVersion(
		conversationId: string,
		snapshot: ConversationSnapshot,
		label: string,
		description?: string
	): Promise<VersionEntry> {
		const entry: VersionEntry = {
			id: crypto.randomUUID(),
			conversationId,
			label,
			description,
			createdAt: this.now(),
			isAuto: false,
			snapshot
		};
		await this.adapter.save(entry);
		await this.enforceMaxVersions(conversationId);
		return entry;
	}

	/** Save an auto-generated snapshot (e.g. on interval). Pruned when maxAutoSnapshots is exceeded. */
	async saveAutoSnapshot(
		conversationId: string,
		snapshot: ConversationSnapshot,
		label?: string
	): Promise<VersionEntry> {
		const entry: VersionEntry = {
			id: crypto.randomUUID(),
			conversationId,
			label: label ?? `Auto-save ${new Date().toLocaleTimeString()}`,
			createdAt: this.now(),
			isAuto: true,
			snapshot
		};
		await this.adapter.save(entry);
		await this.pruneAutoSnapshots(conversationId);
		await this.enforceMaxVersions(conversationId);
		return entry;
	}

	/** List all versions for a conversation, sorted newest first. */
	async listVersions(conversationId: string): Promise<VersionEntry[]> {
		return this.adapter.loadAll(conversationId);
	}

	/** Get a single version by ID. */
	async getVersion(id: string): Promise<VersionEntry | null> {
		return this.adapter.load(id);
	}

	/** Delete a version by ID. */
	async deleteVersion(id: string): Promise<void> {
		return this.adapter.delete(id);
	}

	/** Export a version as a JSON string. */
	async exportVersion(id: string): Promise<string> {
		const entry = await this.adapter.load(id);
		if (!entry) throw new Error(`Version ${id} not found`);
		return JSON.stringify(entry, null, 2);
	}

	/**
	 * Import a version from a JSON string.
	 * Assigns a new ID to avoid conflicts and links to the given conversationId.
	 */
	async importVersion(conversationId: string, json: string): Promise<VersionEntry> {
		const parsed = versionEntrySchema.parse(JSON.parse(json));
		const entry: VersionEntry = {
			...parsed,
			id: crypto.randomUUID(),
			conversationId,
			createdAt: this.now()
		};
		await this.adapter.save(entry);
		return entry;
	}

	/** Diff two versions. Returns a SnapshotDiff. */
	async diffVersions(beforeId: string, afterId: string): Promise<SnapshotDiff> {
		const [before, after] = await Promise.all([
			this.adapter.load(beforeId),
			this.adapter.load(afterId)
		]);
		if (!before) throw new Error(`Version ${beforeId} not found`);
		if (!after) throw new Error(`Version ${afterId} not found`);
		return snapshotDiff(before.snapshot, after.snapshot);
	}

	private async pruneAutoSnapshots(conversationId: string): Promise<void> {
		const all = await this.adapter.loadAll(conversationId);
		const autoOnly = all.filter((e) => e.isAuto);
		if (autoOnly.length > this.options.maxAutoSnapshots) {
			const toDelete = autoOnly.slice(this.options.maxAutoSnapshots);
			await Promise.all(toDelete.map((e) => this.adapter.delete(e.id)));
		}
	}

	private async enforceMaxVersions(conversationId: string): Promise<void> {
		const all = await this.adapter.loadAll(conversationId);
		if (all.length > this.options.maxVersions) {
			const toDelete = all.slice(this.options.maxVersions);
			await Promise.all(toDelete.map((e) => this.adapter.delete(e.id)));
		}
	}
}
