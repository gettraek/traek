/**
 * Reactive store for conversation persistence with IndexedDB + localStorage fallback.
 * Provides CRUD operations, auto-save, and export functionality.
 */

import type { TraekEngine } from '../TraekEngine.svelte';
import type {
	ConversationSnapshot,
	StoredConversation,
	ConversationListItem,
	SaveState
} from './types';
import { conversationSnapshotSchema, storedConversationSchema } from './schemas';
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
	private autoSaveTimeout: number | null = null;
	private autoSaveUnsubscribe: (() => void) | null = null;
	private saveStateResetTimeout: number | null = null;

	constructor(options: ConversationStoreOptions = {}) {
		this.options = { ...DEFAULT_OPTIONS, ...options };
	}

	/**
	 * Initialize the store: open database, load conversations, migrate legacy data.
	 */
	async init(): Promise<void> {
		if (this.isReady) return;

		// Try IndexedDB first
		try {
			this.db = await idb.openDB();
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
	 * Clean up resources.
	 */
	destroy(): void {
		this.disableAutoSave();
		if (this.db) {
			this.db.close();
			this.db = null;
		}
		this.isReady = false;
	}

	// ===== CRUD Operations =====

	/**
	 * Create a new conversation.
	 * @returns The ID of the new conversation.
	 */
	async create(title = 'New chat'): Promise<string> {
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
		await this.refreshList();

		return id;
	}

	/**
	 * Load a conversation snapshot by ID.
	 */
	async load(id: string): Promise<ConversationSnapshot | null> {
		let stored: StoredConversation | undefined;

		if (this.useIndexedDB && this.db) {
			stored = await idb.get<StoredConversation>(this.db, id);
		} else {
			stored = this.getFromLocalStorage(id);
		}

		if (!stored) return null;

		// Validate with Zod
		const result = storedConversationSchema.safeParse(stored);
		if (!result.success) {
			console.error('[ConversationStore] Invalid stored conversation:', result.error);
			return null;
		}

		return result.data.snapshot;
	}

	/**
	 * Save a conversation snapshot.
	 */
	async save(id: string, snapshot: ConversationSnapshot): Promise<void> {
		// Validate snapshot
		const result = conversationSnapshotSchema.safeParse(snapshot);
		if (!result.success) {
			throw new Error(`Invalid snapshot: ${result.error.message}`);
		}

		// Load existing or create new
		let stored: StoredConversation | undefined;

		if (this.useIndexedDB && this.db) {
			stored = await idb.get<StoredConversation>(this.db, id);
		} else {
			stored = this.getFromLocalStorage(id);
		}

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
		await this.refreshList();

		this.lastSavedAt = now;
	}

	/**
	 * Delete a conversation by ID.
	 */
	async delete(id: string): Promise<void> {
		if (this.useIndexedDB && this.db) {
			await idb.deleteEntry(this.db, id);
		} else {
			if (typeof localStorage !== 'undefined') {
				localStorage.removeItem(LS_CONV_PREFIX + id);
			}
		}

		await this.refreshList();

		if (this.activeConversationId === id) {
			this.activeConversationId = null;
		}
	}

	/**
	 * Rename a conversation.
	 */
	async rename(id: string, title: string): Promise<void> {
		let stored: StoredConversation | undefined;

		if (this.useIndexedDB && this.db) {
			stored = await idb.get<StoredConversation>(this.db, id);
		} else {
			stored = this.getFromLocalStorage(id);
		}

		if (!stored) {
			throw new Error(`Conversation ${id} not found`);
		}

		stored.title = title;
		stored.updatedAt = Date.now();

		// Also update the snapshot title
		stored.snapshot.title = title;

		await this.saveInternal(stored);
		await this.refreshList();
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
		await this.refreshList();

		return newId;
	}

	// ===== Auto-Save =====

	/**
	 * Enable auto-save for an engine instance.
	 * Watches engine.nodes and debounces saves.
	 */
	enableAutoSave(engine: TraekEngine, conversationId: string): void {
		this.disableAutoSave();

		this.activeConversationId = conversationId;

		// Use $effect to watch engine.nodes
		this.autoSaveUnsubscribe = $effect.root(() => {
			$effect(() => {
				// Access reactive nodes to track changes
				const _nodes = engine.nodes;
				const _activeNodeId = engine.activeNodeId;

				// Debounce the save
				if (this.autoSaveTimeout !== null) {
					clearTimeout(this.autoSaveTimeout);
				}

				this.autoSaveTimeout = window.setTimeout(() => {
					this.autoSaveTimeout = null;
					this.performAutoSave(engine, conversationId);
				}, this.options.autoSaveDebounceMs);
			});
		});
	}

	/**
	 * Disable auto-save.
	 */
	disableAutoSave(): void {
		if (this.autoSaveTimeout !== null) {
			clearTimeout(this.autoSaveTimeout);
			this.autoSaveTimeout = null;
		}

		if (this.autoSaveUnsubscribe) {
			this.autoSaveUnsubscribe();
			this.autoSaveUnsubscribe = null;
		}

		this.activeConversationId = null;
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
			this.saveStateResetTimeout = window.setTimeout(() => {
				this.saveState = 'idle';
				this.saveStateResetTimeout = null;
			}, 2000);
		} else if (state === 'error') {
			this.saveStateResetTimeout = window.setTimeout(() => {
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
		let stored: StoredConversation[] = [];

		if (this.useIndexedDB && this.db) {
			stored = await idb.getAll<StoredConversation>(this.db);
		} else {
			stored = this.getAllFromLocalStorage();
		}

		// Convert to list items
		this.conversations = stored.map((conv) => this.toListItem(conv));
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

	private async saveInternal(conversation: StoredConversation): Promise<void> {
		if (this.useIndexedDB && this.db) {
			await idb.put(this.db, conversation);
		} else {
			this.saveToLocalStorage(conversation);
		}
	}

	private getFromLocalStorage(id: string): StoredConversation | undefined {
		if (typeof localStorage === 'undefined') return undefined;

		try {
			const raw = localStorage.getItem(LS_CONV_PREFIX + id);
			if (!raw) return undefined;
			return JSON.parse(raw) as StoredConversation;
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
			console.error('[ConversationStore] localStorage save failed:', err);
		}
	}

	private getAllFromLocalStorage(): StoredConversation[] {
		if (typeof localStorage === 'undefined') return [];

		const results: StoredConversation[] = [];

		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith(LS_CONV_PREFIX)) {
				const id = key.slice(LS_CONV_PREFIX.length);
				const stored = this.getFromLocalStorage(id);
				if (stored) results.push(stored);
			}
		}

		// Sort by updatedAt descending
		results.sort((a, b) => b.updatedAt - a.updatedAt);

		return results;
	}

	private getListFromLocalStorage(): ConversationListItem[] {
		if (typeof localStorage === 'undefined') return [];

		try {
			const raw = localStorage.getItem(LS_LIST_KEY);
			if (!raw) return [];
			return JSON.parse(raw) as ConversationListItem[];
		} catch {
			return [];
		}
	}

	// ===== Migration =====

	/**
	 * Migrate data from demo-persistence.ts localStorage format.
	 */
	private async migrateLegacyData(): Promise<void> {
		if (typeof localStorage === 'undefined') return;

		const legacyListRaw = localStorage.getItem(LEGACY_LIST_KEY);
		if (!legacyListRaw) return; // No legacy data

		console.log('[ConversationStore] Migrating legacy demo-persistence data...');

		try {
			interface LegacyMeta {
				id: string;
				title: string;
				updatedAt: number;
			}
			const legacyList = JSON.parse(legacyListRaw) as LegacyMeta[];

			for (const meta of legacyList) {
				const legacyConv = localStorage.getItem(LEGACY_CONV_PREFIX + meta.id);
				if (!legacyConv) continue;

				interface LegacyConv {
					id: string;
					title: string;
					createdAt: number;
					updatedAt: number;
					nodes: Array<{
						id: string;
						parentIds: string[];
						content: string;
						role: 'user' | 'assistant' | 'system';
						type: string;
						metadata?: { x: number; y: number; height?: number };
					}>;
					viewport?: { scale: number; offsetX: number; offsetY: number };
					activeNodeId?: string | null;
				}

				const legacy = JSON.parse(legacyConv) as LegacyConv;

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
			}

			// Clean up legacy keys
			localStorage.removeItem(LEGACY_LIST_KEY);
			for (const meta of legacyList) {
				localStorage.removeItem(LEGACY_CONV_PREFIX + meta.id);
			}

			console.log(`[ConversationStore] Migrated ${legacyList.length} conversations`);
		} catch (err) {
			console.error('[ConversationStore] Migration failed:', err);
		}
	}
}
