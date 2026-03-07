/**
 * Conversation persistence store with IndexedDB + localStorage fallback.
 * Framework-agnostic class with subscriber pattern for use with React hooks.
 */

import type { TraekEngine } from '@traek/core';
import type {
	ConversationSnapshot,
	StoredConversation,
	ConversationListItem,
	SaveState
} from '@traek/core';
import { conversationSnapshotSchema, storedConversationSchema } from '@traek/core';
import * as idb from './indexedDBAdapter.js';

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

const LS_LIST_KEY = 'traek-conversations-list';
const LS_CONV_PREFIX = 'traek-conv-';
const LEGACY_LIST_KEY = 'traek-demo-conversations';
const LEGACY_CONV_PREFIX = 'traek-demo-conv-';

export interface ConversationStoreState {
	conversations: ConversationListItem[];
	activeConversationId: string | null;
	saveState: SaveState;
	lastSavedAt: number | null;
	isReady: boolean;
}

type Listener = () => void;

export class ConversationStore {
	private state: ConversationStoreState = {
		conversations: [],
		activeConversationId: null,
		saveState: 'idle',
		lastSavedAt: null,
		isReady: false
	};

	private listeners = new Set<Listener>();
	private db: IDBDatabase | null = null;
	private useIndexedDB = false;
	private options: Required<ConversationStoreOptions>;
	private autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
	private autoSaveUnsubscribe: (() => void) | null = null;
	private saveStateResetTimeout: ReturnType<typeof setTimeout> | null = null;

	constructor(options: ConversationStoreOptions = {}) {
		this.options = { ...DEFAULT_OPTIONS, ...options };
	}

	subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	getState(): ConversationStoreState {
		return this.state;
	}

	private setState(partial: Partial<ConversationStoreState>): void {
		this.state = { ...this.state, ...partial };
		for (const l of this.listeners) l();
	}

	async init(): Promise<void> {
		if (this.state.isReady) return;

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

		await this.migrateLegacyData();
		await this.refreshList();
		this.setState({ isReady: true });
	}

	destroy(): void {
		this.disableAutoSave();
		if (this.db) {
			this.db.close();
			this.db = null;
		}
		this.setState({ isReady: false });
		this.listeners.clear();
	}

	// ===== CRUD =====

	async create(title = 'New chat'): Promise<string> {
		const id = crypto.randomUUID();
		const now = Date.now();

		const conversation: StoredConversation = {
			id,
			title,
			createdAt: now,
			updatedAt: now,
			snapshot: { version: 1, createdAt: now, title, activeNodeId: null, nodes: [] }
		};

		await this.saveInternal(conversation);
		await this.refreshList();
		return id;
	}

	async load(id: string): Promise<ConversationSnapshot | null> {
		let stored: StoredConversation | undefined;

		if (this.useIndexedDB && this.db) {
			stored = await idb.get<StoredConversation>(this.db, id);
		} else {
			stored = this.getFromLocalStorage(id);
		}

		if (!stored) return null;

		const result = storedConversationSchema.safeParse(stored);
		if (!result.success) {
			console.error('[ConversationStore] Invalid stored conversation:', result.error);
			return null;
		}

		return result.data.snapshot;
	}

	async save(id: string, snapshot: ConversationSnapshot): Promise<void> {
		const result = conversationSnapshotSchema.safeParse(snapshot);
		if (!result.success) {
			throw new Error(`Invalid snapshot: ${result.error.message}`);
		}

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
		this.setState({ lastSavedAt: now });
	}

	async delete(id: string): Promise<void> {
		if (this.useIndexedDB && this.db) {
			await idb.deleteEntry(this.db, id);
		} else if (typeof localStorage !== 'undefined') {
			localStorage.removeItem(LS_CONV_PREFIX + id);
		}

		await this.refreshList();

		if (this.state.activeConversationId === id) {
			this.setState({ activeConversationId: null });
		}
	}

	async rename(id: string, title: string): Promise<void> {
		let stored: StoredConversation | undefined;

		if (this.useIndexedDB && this.db) {
			stored = await idb.get<StoredConversation>(this.db, id);
		} else {
			stored = this.getFromLocalStorage(id);
		}

		if (!stored) throw new Error(`Conversation ${id} not found`);

		stored.title = title;
		stored.updatedAt = Date.now();
		stored.snapshot.title = title;

		await this.saveInternal(stored);
		await this.refreshList();
	}

	async duplicate(id: string): Promise<string> {
		const snapshot = await this.load(id);
		if (!snapshot) throw new Error(`Conversation ${id} not found`);

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

	enableAutoSave(engine: TraekEngine, conversationId: string): void {
		this.disableAutoSave();
		this.setState({ activeConversationId: conversationId });

		this.autoSaveUnsubscribe = engine.subscribe(() => {
			if (this.autoSaveTimeout !== null) clearTimeout(this.autoSaveTimeout);

			this.autoSaveTimeout = setTimeout(() => {
				this.autoSaveTimeout = null;
				this.performAutoSave(engine, conversationId);
			}, this.options.autoSaveDebounceMs);
		});
	}

	disableAutoSave(): void {
		if (this.autoSaveTimeout !== null) {
			clearTimeout(this.autoSaveTimeout);
			this.autoSaveTimeout = null;
		}

		if (this.autoSaveUnsubscribe) {
			this.autoSaveUnsubscribe();
			this.autoSaveUnsubscribe = null;
		}

		this.setState({ activeConversationId: null });
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

	private setSaveState(saveState: SaveState): void {
		this.setState({ saveState });

		if (this.saveStateResetTimeout !== null) clearTimeout(this.saveStateResetTimeout);

		const delay = saveState === 'saved' ? 2000 : saveState === 'error' ? 5000 : null;
		if (delay !== null) {
			this.saveStateResetTimeout = setTimeout(() => {
				this.setState({ saveState: 'idle' });
				this.saveStateResetTimeout = null;
			}, delay);
		}
	}

	// ===== List =====

	async listAll(): Promise<ConversationListItem[]> {
		await this.refreshList();
		return this.state.conversations;
	}

	async getStorageUsage(): Promise<{ used: number; quota: number }> {
		const estimate = await idb.getStorageEstimate();
		if (estimate) return estimate;

		if (typeof localStorage !== 'undefined') {
			let used = 0;
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key?.startsWith(LS_CONV_PREFIX)) {
					const value = localStorage.getItem(key);
					used += (key.length + (value?.length ?? 0)) * 2;
				}
			}
			return { used, quota: 5 * 1024 * 1024 };
		}

		return { used: 0, quota: 0 };
	}

	async exportAsJSON(id: string): Promise<string> {
		const snapshot = await this.load(id);
		if (!snapshot) throw new Error(`Conversation ${id} not found`);
		return JSON.stringify(snapshot, null, 2);
	}

	async exportAsMarkdown(id: string): Promise<string> {
		const snapshot = await this.load(id);
		if (!snapshot) throw new Error(`Conversation ${id} not found`);
		const { snapshotToMarkdown } = await import('./exportUtils.js');
		return snapshotToMarkdown(snapshot);
	}

	// ===== Internal =====

	private async refreshList(): Promise<void> {
		let stored: StoredConversation[] = [];

		if (this.useIndexedDB && this.db) {
			stored = await idb.getAll<StoredConversation>(this.db);
		} else {
			stored = this.getAllFromLocalStorage();
		}

		this.setState({ conversations: stored.map((c) => this.toListItem(c)) });
	}

	private toListItem(stored: StoredConversation): ConversationListItem {
		return {
			id: stored.id,
			title: stored.title,
			createdAt: stored.createdAt,
			updatedAt: stored.updatedAt,
			nodeCount: stored.snapshot.nodes.length,
			preview: this.extractPreview(stored.snapshot)
		};
	}

	private extractPreview(snapshot: ConversationSnapshot): string {
		const userNode = snapshot.nodes.find((n) => n.role === 'user');
		if (userNode) {
			const content = userNode.content.trim();
			return content.length > 100 ? content.slice(0, 100) + '…' : content;
		}
		return 'No messages yet';
	}

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

			const list = this.getListFromLocalStorage();
			const idx = list.findIndex((c) => c.id === conversation.id);
			const item = this.toListItem(conversation);

			if (idx >= 0) list[idx] = item;
			else list.push(item);

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

	private async migrateLegacyData(): Promise<void> {
		if (typeof localStorage === 'undefined') return;

		const legacyListRaw = localStorage.getItem(LEGACY_LIST_KEY);
		if (!legacyListRaw) return;

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

				await this.saveInternal({
					id: legacy.id,
					title: legacy.title,
					createdAt: legacy.createdAt,
					updatedAt: legacy.updatedAt,
					snapshot
				});
			}

			localStorage.removeItem(LEGACY_LIST_KEY);
			for (const meta of legacyList) localStorage.removeItem(LEGACY_CONV_PREFIX + meta.id);
		} catch (err) {
			console.error('[ConversationStore] Migration failed:', err);
		}
	}
}
