import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { TraekEngine } from '@traek/core';
import { ConversationStore } from './ConversationStore.js';
import type { ConversationStoreOptions, ConversationStoreState } from './ConversationStore.js';

/**
 * Create and manage a ConversationStore instance, initialized on mount.
 *
 * @example
 * ```tsx
 * function App() {
 *   const store = useConversationStore()
 *   // store.conversations, store.saveState, store.create(), etc.
 * }
 * ```
 */
export function useConversationStore(options?: ConversationStoreOptions): {
	state: ConversationStoreState;
	store: ConversationStore;
} {
	const storeRef = useRef<ConversationStore | null>(null);

	if (!storeRef.current) {
		storeRef.current = new ConversationStore(options);
	}

	const store = storeRef.current;

	const state = useSyncExternalStore(
		(cb) => store.subscribe(cb),
		() => store.getState(),
		() => store.getState()
	);

	useEffect(() => {
		store.init().catch((err) => {
			console.error('[useConversationStore] init failed:', err);
		});

		return () => {
			store.destroy();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return { state, store };
}

/**
 * Enable auto-save for a given engine + conversation ID.
 * Automatically disables on unmount or when conversationId changes.
 *
 * @example
 * ```tsx
 * function ChatView({ conversationId, engine, store }) {
 *   useAutoSave(store, engine, conversationId)
 *   // ...
 * }
 * ```
 */
export function useAutoSave(
	store: ConversationStore,
	engine: TraekEngine | undefined,
	conversationId: string | null
): void {
	const engineRef = useRef(engine);
	const convIdRef = useRef(conversationId);
	engineRef.current = engine;
	convIdRef.current = conversationId;

	useEffect(() => {
		if (!engine || !conversationId) {
			store.disableAutoSave();
			return;
		}

		store.enableAutoSave(engine, conversationId);

		return () => {
			store.disableAutoSave();
		};
	}, [store, engine, conversationId]);
}
