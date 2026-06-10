/**
 * Reactive store for conversation persistence with IndexedDB + localStorage fallback.
 * Provides CRUD operations, auto-save, and export functionality.
 */

import { z } from 'zod';
import type { TraekEngine } from '../TraekEngine.svelte';
import type {
	ConversationSnapshot,
	StoredConversation,
	ConversationListItem,
	SaveState
} from './types';
import { UnsupportedSnapshotVersionError } from './types';
import {
	conversationSnapshotSchema,
	storedConversationSchema,
	snapshotVersionProbeSchema,
	CURRENT_SNAPSHOT_VERSION
} from './schemas';
import * as idb from './indexedDBAdapter';

export interface ConversationStoreOptions {
	dbName?: string;
	autoSaveDebounceMs?: number;
	maxConversations?: number;
}

const DEFAULT_OPTIONS: Required<ConversationStoreOptions> = {
	dbName: 'traek-conversations',
	autoSaveDebounceMs: 1000,
	maxConversations: 100
};

// LocalStorage keys for fallback
const LS_LIST_KEY = 'traek-conversations-list';
const LS_CONV_PREFIX = 'traek-conv-';

// Legacy demo-persistence keys for migration
const LEGACY_LIST_KEY = 'traek-demo-conversations';
const LEGACY_CONV_PREFIX = 'traek-demo-conv-';

/** Loose envelope used to detect the declared snapshot version before full validation. */
const storedVersionProbeSchema = z.looseObject({ snapshot: snapshotVersionProbeSchema });

/** Minimal shape needed to order conversations for pruning. */
const pruneEntrySchema = z.looseObject({ id: z.string(), updatedAt: z.number() });

const legacyMetaSchema = z.looseObject({
	id: z.string(),
	title: z.string(),
	updatedAt: z.number()
});

const legacyConversationSchema = z.looseObject({
	id: z.string(),
	title: z.string(),
	createdAt: z.number(),
	updatedAt: z.number(),
	nodes: z.array(
		z.looseObject({
			id: z.string(),
			parentIds: z.array(z.string()),
			content: z.string(),
			role: z.enum(['user', 'assistant', 'system']),
			type: z.string(),
			metadata: z
				.looseObject({ x: z.number(), y: z.number(), height: z.number().optional() })
				.optional()
		})
	),
	viewport: z.object({ scale: z.number(), offsetX: z.number(), offsetY: z.number() }).optional(),
	activeNodeId: z.string().nullable().optional()
});

export class ConversationStore {
	// Reactive state
	conversations = $state<ConversationListItem[]>([]);
	activeConversationId = $state<string | null>(null);
	saveState = $state<SaveState>('idle');
	lastSavedAt = $state<number | null>(null);
	isReady = $state(false);

	private db: IDBDatabase | null = null;
	private useIndexedDB = false;
	private options: Required<ConversationStoreOptions>;
	private autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
	private autoSaveUnsubscribe: (() => void) | null = null;
	private autoSaveEngine: TraekEngine | null = null;
	private autoSaveConversationId: string | null = null;
	private pagehideListener: (() => void) | null = null;
	private saveStateResetTimeout: ReturnType<typeof setTimeout> | null = null;
	private initPromise: Promise<void> | null = null;
	/** Serializes all write operations to prevent read-modify-write races. */
	private pendingWrite: Promise<unknown> = Promise.resolve();

	constructor(options: ConversationStoreOptions = {}) {
		this.options = { ...DEFAULT_OPTIONS, ...options };
	}

	/**
	 * Initialize the store: open database, load conversations, migrate legacy data.
	 * Concurrent calls share a single memoized promise.
	 */
	init(): Promise<void> {
		if (!this.initPromise) {
			this.initPromise = this.doInit().catch((err) => {
				// Allow retry after a failed init
				this.initPromise = null;
				throw err;
			});
		}
		return this.initPromise;
	}

	private async doInit(): Promise<void> {
		if (this.isReady) return;

		// Try IndexedDB first
		try {
			this.db = await idb.openDB(this.options.dbName);
			this.useIndexedDB = true;
		} catch (err) {
			console.warn(
				'[ConversationStore] IndexedDB not available, falling back to localStorage',
				err
			);
			this.useIndexedDB = false;
		}

		// Migrate legacy demo-persistence data
		await this.migrateLegacyData();

		// Load conversation list
		await this.refreshList();

		this.isReady = true;
	}

	/**
	 * Clean up resources. Flushes any pending auto-save first.
	 */
	destroy(): void {
		this.disableAutoSave();
		if (this.saveStateResetTimeout !== null) {
			clearTimeout(this.saveStateResetTimeout);
			this.saveStateResetTimeout = null;
		}
		if (this.db) {
			this.db.close();
			this.db = null;
		}
		this.isReady = false;
		this.initPromise = null;
	}

	// ===== CRUD Operations =====

	/**
	 * Create a new conversation.
	 * @returns The ID of the new conversation.
	 */
	create(title = 'New chat'): Promise<string> {
		return this.enqueueWrite(async () => {
			const id = crypto.randomUUID();
			const now = Date.now();

			const conversation: StoredConversation = {
				id,
				title,
				createdAt: now,
				updatedAt: now,
				snapshot: {
					version: 1,
					createdAt: now,
					title,
					activeNodeId: null,
					nodes: []
				}
			};

			await this.saveInternal(conversation);
			await this.pruneExcessConversations();
			await this.refreshList();

			return id;
		});
	}

	/**
	 * Load a conversation snapshot by ID.
	 *
	 * @returns The snapshot, or `null` when missing or corrupt.
	 * @throws {UnsupportedSnapshotVersionError} when the record declares a
	 *   snapshot version this build does not understand.
	 */
	async load(id: string): Promise<ConversationSnapshot | null> {
		const raw = await this.getStoredRaw(id);
		if (raw == null) return null;

		// Version dispatch: detect future/unsupported versions distinctly from corrupt data
		const probe = storedVersionProbeSchema.safeParse(raw);
		if (probe.success && probe.data.snapshot.version !== CURRENT_SNAPSHOT_VERSION) {
			console.warn(
				`[ConversationStore] Conversation ${id} uses unsupported snapshot version ` +
					`${probe.data.snapshot.version} (supported: ${CURRENT_SNAPSHOT_VERSION})`
			);
			throw new UnsupportedSnapshotVersionError(probe.data.snapshot.version);
		}

		// Validate with Zod
		const result = storedConversationSchema.safeParse(raw);
		if (!result.success) {
			console.error('[ConversationStore] Invalid stored conversation:', result.error);
			return null;
		}

		return result.data.snapshot;
	}

	/**
	 * Save a conversation snapshot.
	 */
	save(id: string, snapshot: ConversationSnapshot): Promise<void> {
		return this.enqueueWrite(async () => {
			// Validate snapshot
			const result = conversationSnapshotSchema.safeParse(snapshot);
			if (!result.success) {
				throw new Error(`Invalid snapshot: ${result.error.message}`);
			}

			// Load existing or create new
			const stored = this.parseStored(await this.getStoredRaw(id));

			const now = Date.now();
			const title = snapshot.title ?? (stored?.title || 'Untitled');

			const updated: StoredConversation = {
				id,
				title,
				createdAt: stored?.createdAt ?? now,
				updatedAt: now,
				snapshot: result.data
			};

			await this.saveInternal(updated);
			await this.pruneExcessConversations();
			await this.refreshList();

			this.lastSavedAt = now;
		});
	}

	/**
	 * Delete a conversation by ID.
	 */
	delete(id: string): Promise<void> {
		return this.enqueueWrite(async () => {
			await this.deleteInternal(id);
			await this.refreshList();

			if (this.activeConversationId === id) {
				this.activeConversationId = null;
			}
		});
	}

	/**
	 * Rename a conversation.
	 */
	rename(id: string, title: string): Promise<void> {
		return this.enqueueWrite(async () => {
			const stored = this.parseStored(await this.getStoredRaw(id));

			if (!stored) {
				throw new Error(`Conversation ${id} not found`);
			}

			stored.title = title;
			stored.updatedAt = Date.now();

			// Also update the snapshot title
			stored.snapshot.title = title;

			await this.saveInternal(stored);
			await this.refreshList();
		});
	}

	/**
	 * Duplicate a conversation.
	 * @returns The ID of the new conversation.
	 */
	async duplicate(id: string): Promise<string> {
		const snapshot = await this.load(id);
		if (!snapshot) {
			throw new Error(`Conversation ${id} not found`);
		}

		return this.enqueueWrite(async () => {
			const newId = crypto.randomUUID();
			const now = Date.now();

			const duplicated: StoredConversation = {
				id: newId,
				title: `${snapshot.title ?? 'Untitled'} (copy)`,
				createdAt: now,
				updatedAt: now,
				snapshot: {
					...snapshot,
					createdAt: now,
					title: `${snapshot.title ?? 'Untitled'} (copy)`
				}
			};

			await this.saveInternal(duplicated);
			await this.pruneExcessConversations();
			await this.refreshList();

			return newId;
		});
	}

	// ===== Auto-Save =====

	/**
	 * Enable auto-save for an engine instance.
	 * Watches the engine's mutation counter and debounces saves.
	 */
	enableAutoSave(engine: TraekEngine, conversationId: string): void {
		this.disableAutoSave();

		this.activeConversationId = conversationId;
		this.autoSaveEngine = engine;
		this.autoSaveConversationId = conversationId;

		// Use $effect to watch engine mutations
		this.autoSaveUnsubscribe = $effect.root(() => {
			$effect(() => {
				// Track the engine's mutation counter so in-place mutations
				// (streaming content, drags, status, tags) trigger saves —
				// plus array identity/length and activeNodeId as belt-and-braces.
				void engine.version;
				void engine.nodes.length;
				void engine.activeNodeId;

				this.scheduleAutoSave();
			});
		});

		// Flush pending debounced saves when the page is being hidden/unloaded
		if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
			this.pagehideListener = () => {
				void this.flushPendingAutoSave();
			};
			window.addEventListener('pagehide', this.pagehideListener);
		}
	}

	/**
	 * Disable auto-save. Any pending debounced save is flushed first
	 * so the latest state is not silently dropped.
	 */
	disableAutoSave(): void {
		void this.flushPendingAutoSave();

		if (this.autoSaveUnsubscribe) {
			this.autoSaveUnsubscribe();
			this.autoSaveUnsubscribe = null;
		}

		if (this.pagehideListener && typeof window !== 'undefined') {
			window.removeEventListener('pagehide', this.pagehideListener);
			this.pagehideListener = null;
		}

		this.autoSaveEngine = null;
		this.autoSaveConversationId = null;
		this.activeConversationId = null;
	}

	/**
	 * If a debounced auto-save is pending, run it immediately.
	 * Returns the save promise (resolved when nothing was pending).
	 */
	flushPendingAutoSave(): Promise<void> {
		if (this.autoSaveTimeout === null) return Promise.resolve();

		clearTimeout(this.autoSaveTimeout);
		this.autoSaveTimeout = null;

		if (this.autoSaveEngine && this.autoSaveConversationId) {
			return this.performAutoSave(this.autoSaveEngine, this.autoSaveConversationId);
		}
		return Promise.resolve();
	}

	private scheduleAutoSave(): void {
		// Debounce the save
		if (this.autoSaveTimeout !== null) {
			clearTimeout(this.autoSaveTimeout);
		}

		this.autoSaveTimeout = setTimeout(() => {
			this.autoSaveTimeout = null;
			if (this.autoSaveEngine && this.autoSaveConversationId) {
				void this.performAutoSave(this.autoSaveEngine, this.autoSaveConversationId);
			}
		}, this.options.autoSaveDebounceMs);
	}

	private async performAutoSave(engine: TraekEngine, conversationId: string): Promise<void> {
		this.setSaveState('saving');

		try {
			const snapshot = engine.serialize();
			await this.save(conversationId, snapshot);
			this.setSaveState('saved');
		} catch (err) {
			console.error('[ConversationStore] Auto-save failed:', err);
			this.setSaveState('error');
		}
	}

	private setSaveState(state: SaveState): void {
		this.saveState = state;

		// Auto-reset after timeout
		if (this.saveStateResetTimeout !== null) {
			clearTimeout(this.saveStateResetTimeout);
		}

		if (state === 'saved') {
			this.saveStateResetTimeout = setTimeout(() => {
				this.saveState = 'idle';
				this.saveStateResetTimeout = null;
			}, 2000);
		} else if (state === 'error') {
			this.saveStateResetTimeout = setTimeout(() => {
				this.saveState = 'idle';
				this.saveStateResetTimeout = null;
			}, 5000);
		}
	}

	// ===== List Operations =====

	/**
	 * Refresh the conversation list from storage.
	 */
	async listAll(): Promise<ConversationListItem[]> {
		await this.refreshList();
		return this.conversations;
	}

	private async refreshList(): Promise<void> {
		let raw: unknown[] = [];

		if (this.useIndexedDB && this.db) {
			raw = await idb.getAll<unknown>(this.db);
		} else {
			raw = this.getAllRawFromLocalStorage();
		}

		// Validate each record; skip invalid ones instead of throwing
		const valid: StoredConversation[] = [];
		for (const entry of raw) {
			const result = storedConversationSchema.safeParse(entry);
			if (result.success) {
				valid.push(result.data);
			} else {
				console.warn('[ConversationStore] Skipping invalid stored conversation:', result.error);
			}
		}

		// Convert to list items
		this.conversations = valid.map((conv) => this.toListItem(conv));
	}

	private toListItem(stored: StoredConversation): ConversationListItem {
		const nodeCount = stored.snapshot.nodes.length;
		const preview = this.extractPreview(stored.snapshot);

		return {
			id: stored.id,
			title: stored.title,
			createdAt: stored.createdAt,
			updatedAt: stored.updatedAt,
			nodeCount,
			preview
		};
	}

	private extractPreview(snapshot: ConversationSnapshot): string {
		// Find the first user message
		const userNode = snapshot.nodes.find((n) => n.role === 'user');
		if (userNode) {
			const content = userNode.content.trim();
			return content.length > 100 ? content.slice(0, 100) + '…' : content;
		}
		return 'No messages yet';
	}

	// ===== Export =====

	/**
	 * Export a conversation as JSON.
	 */
	async exportAsJSON(id: string): Promise<string> {
		const snapshot = await this.load(id);
		if (!snapshot) {
			throw new Error(`Conversation ${id} not found`);
		}
		return JSON.stringify(snapshot, null, 2);
	}

	/**
	 * Export a conversation as Markdown.
	 */
	async exportAsMarkdown(id: string): Promise<string> {
		const snapshot = await this.load(id);
		if (!snapshot) {
			throw new Error(`Conversation ${id} not found`);
		}

		// Import dynamically to avoid circular dependency
		const { snapshotToMarkdown } = await import('./exportUtils.js');
		return snapshotToMarkdown(snapshot);
	}

	// ===== Storage Utilities =====

	/**
	 * Get storage usage estimate.
	 */
	async getStorageUsage(): Promise<{ used: number; quota: number }> {
		const estimate = await idb.getStorageEstimate();
		if (estimate) {
			return estimate;
		}

		// Fallback: estimate localStorage usage
		if (typeof localStorage !== 'undefined') {
			let used = 0;
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key?.startsWith(LS_CONV_PREFIX)) {
					const value = localStorage.getItem(key);
					used += (key.length + (value?.length ?? 0)) * 2; // UTF-16 encoding
				}
			}
			return { used, quota: 5 * 1024 * 1024 }; // ~5MB localStorage limit
		}

		return { used: 0, quota: 0 };
	}

	// ===== Internal Storage Methods =====

	/** Chain a write operation so concurrent writes never interleave. */
	private enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
		const run = this.pendingWrite.then(fn, fn);
		// Keep the chain alive even when a write rejects
		this.pendingWrite = run.then(
			() => undefined,
			() => undefined
		);
		return run;
	}

	private async saveInternal(conversation: StoredConversation): Promise<void> {
		if (this.useIndexedDB && this.db) {
			await idb.put(this.db, conversation);
		} else {
			this.saveToLocalStorage(conversation);
		}
	}

	private async deleteInternal(id: string): Promise<void> {
		if (this.useIndexedDB && this.db) {
			await idb.deleteEntry(this.db, id);
		} else if (typeof localStorage !== 'undefined') {
			localStorage.removeItem(LS_CONV_PREFIX + id);
			this.removeFromLocalStorageList(id);
		}
	}

	/** Delete the oldest conversations when over the configured maximum. */
	private async pruneExcessConversations(): Promise<void> {
		const max = this.options.maxConversations;
		if (!Number.isFinite(max) || max <= 0) return;

		const entries: { id: string; updatedAt: number }[] = [];

		if (this.useIndexedDB && this.db) {
			const raw = await idb.getAll<unknown>(this.db);
			for (const entry of raw) {
				const result = pruneEntrySchema.safeParse(entry);
				if (result.success) entries.push(result.data);
			}
		} else {
			for (const entry of this.getAllRawFromLocalStorage()) {
				const result = pruneEntrySchema.safeParse(entry);
				if (result.success) entries.push(result.data);
			}
		}

		if (entries.length <= max) return;

		entries.sort((a, b) => b.updatedAt - a.updatedAt);
		const excess = entries.slice(max);
		for (const entry of excess) {
			await this.deleteInternal(entry.id);
			if (this.activeConversationId === entry.id) {
				this.activeConversationId = null;
			}
		}
	}

	private async getStoredRaw(id: string): Promise<unknown> {
		if (this.useIndexedDB && this.db) {
			return idb.get<unknown>(this.db, id);
		}
		return this.getRawFromLocalStorage(id);
	}

	private parseStored(raw: unknown): StoredConversation | undefined {
		if (raw == null) return undefined;
		const result = storedConversationSchema.safeParse(raw);
		return result.success ? result.data : undefined;
	}

	private getRawFromLocalStorage(id: string): unknown {
		if (typeof localStorage === 'undefined') return undefined;

		try {
			const raw = localStorage.getItem(LS_CONV_PREFIX + id);
			if (!raw) return undefined;
			return JSON.parse(raw) as unknown;
		} catch {
			return undefined;
		}
	}

	private saveToLocalStorage(conversation: StoredConversation): void {
		if (typeof localStorage === 'undefined') return;

		try {
			localStorage.setItem(LS_CONV_PREFIX + conversation.id, JSON.stringify(conversation));

			// Update list
			const list = this.getListFromLocalStorage();
			const idx = list.findIndex((c) => c.id === conversation.id);
			const item = this.toListItem(conversation);

			if (idx >= 0) {
				list[idx] = item;
			} else {
				list.push(item);
			}

			localStorage.setItem(LS_LIST_KEY, JSON.stringify(list));
		} catch (err) {
			// Rethrow (e.g. QuotaExceededError) so save() rejects and the
			// UI surfaces an error state instead of falsely showing "saved".
			console.error('[ConversationStore] localStorage save failed:', err);
			throw err instanceof Error ? err : new Error(String(err));
		}
	}

	private removeFromLocalStorageList(id: string): void {
		if (typeof localStorage === 'undefined') return;

		try {
			const list = this.getListFromLocalStorage().filter((c) => c.id !== id);
			localStorage.setItem(LS_LIST_KEY, JSON.stringify(list));
		} catch (err) {
			console.warn('[ConversationStore] Failed to prune localStorage list:', err);
		}
	}

	private getAllRawFromLocalStorage(): unknown[] {
		if (typeof localStorage === 'undefined') return [];

		const results: unknown[] = [];

		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith(LS_CONV_PREFIX)) {
				const id = key.slice(LS_CONV_PREFIX.length);
				const raw = this.getRawFromLocalStorage(id);
				if (raw != null) results.push(raw);
			}
		}

		// Sort by updatedAt descending (best effort on raw records)
		results.sort((a, b) => {
			const aTime =
				typeof (a as { updatedAt?: unknown })?.updatedAt === 'number'
					? (a as { updatedAt: number }).updatedAt
					: 0;
			const bTime =
				typeof (b as { updatedAt?: unknown })?.updatedAt === 'number'
					? (b as { updatedAt: number }).updatedAt
					: 0;
			return bTime - aTime;
		});

		return results;
	}

	private getListFromLocalStorage(): ConversationListItem[] {
		if (typeof localStorage === 'undefined') return [];

		try {
			const raw = localStorage.getItem(LS_LIST_KEY);
			if (!raw) return [];
			const parsed: unknown = JSON.parse(raw);
			if (!Array.isArray(parsed)) return [];
			// Validate per entry; drop corrupt items instead of failing the list
			return parsed
				.map((entry) => conversationListItemSchema.safeParse(entry))
				.filter((result) => result.success)
				.map((result) => result.data);
		} catch {
			return [];
		}
	}

	// ===== Migration =====

	/**
	 * Migrate data from demo-persistence.ts localStorage format.
	 * Each entry is migrated independently; one corrupt record does not
	 * abort the rest. Successfully migrated legacy keys are removed.
	 */
	private async migrateLegacyData(): Promise<void> {
		if (typeof localStorage === 'undefined') return;

		const legacyListRaw = localStorage.getItem(LEGACY_LIST_KEY);
		if (!legacyListRaw) return; // No legacy data

		console.log('[ConversationStore] Migrating legacy demo-persistence data...');

		let legacyList: z.infer<typeof legacyMetaSchema>[];
		try {
			const parsed = z.array(legacyMetaSchema).safeParse(JSON.parse(legacyListRaw));
			if (!parsed.success) {
				console.error('[ConversationStore] Legacy list is invalid, skipping migration');
				return;
			}
			legacyList = parsed.data;
		} catch (err) {
			console.error('[ConversationStore] Failed to parse legacy list:', err);
			return;
		}

		let migrated = 0;
		let failed = 0;

		for (const meta of legacyList) {
			try {
				const legacyConv = localStorage.getItem(LEGACY_CONV_PREFIX + meta.id);
				if (!legacyConv) continue;

				const parsed = legacyConversationSchema.safeParse(JSON.parse(legacyConv));
				if (!parsed.success) {
					failed++;
					console.warn(
						`[ConversationStore] Skipping invalid legacy conversation ${meta.id}:`,
						parsed.error
					);
					continue;
				}
				const legacy = parsed.data;

				// Convert to new format
				const snapshot: ConversationSnapshot = {
					version: 1,
					createdAt: legacy.createdAt,
					title: legacy.title,
					viewport: legacy.viewport,
					activeNodeId: legacy.activeNodeId ?? null,
					nodes: legacy.nodes.map((n) => ({
						id: n.id,
						parentIds: n.parentIds,
						content: n.content,
						role: n.role,
						type: n.type,
						status: 'done' as const,
						createdAt: legacy.createdAt,
						metadata: n.metadata ?? { x: 0, y: 0 }
					}))
				};

				const stored: StoredConversation = {
					id: legacy.id,
					title: legacy.title,
					createdAt: legacy.createdAt,
					updatedAt: legacy.updatedAt,
					snapshot
				};

				await this.saveInternal(stored);

				// Remove the legacy key only after a successful migration
				localStorage.removeItem(LEGACY_CONV_PREFIX + meta.id);
				migrated++;
			} catch (err) {
				failed++;
				console.error(`[ConversationStore] Failed to migrate conversation ${meta.id}:`, err);
			}
		}

		// Remove the legacy list key once nothing failed; otherwise keep it
		// so a later init can retry the remaining entries.
		if (failed === 0) {
			localStorage.removeItem(LEGACY_LIST_KEY);
		}

		console.log(
			`[ConversationStore] Migrated ${migrated} conversations` +
				(failed > 0 ? ` (${failed} failed)` : '')
		);
	}
}
