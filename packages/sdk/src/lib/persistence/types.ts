export type { SerializedNode, ConversationSnapshot } from './schemas';
export { serializedNodeSchema, conversationSnapshotSchema } from './schemas';

import type { ConversationSnapshot as ConversationSnapshotType } from './schemas';

/**
 * A conversation stored in IndexedDB with metadata.
 */
export interface StoredConversation {
	id: string;
	title: string;
	createdAt: number;
	updatedAt: number;
	snapshot: ConversationSnapshotType;
}

/**
 * Lightweight conversation metadata for list views.
 */
export interface ConversationListItem {
	id: string;
	title: string;
	createdAt: number;
	updatedAt: number;
	nodeCount: number;
	preview: string;
}

/**
 * Current save state of a conversation.
 */
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
