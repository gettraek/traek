export interface Env {
	DB: D1Database;
	/** Optional salt for key hashing. Falls back to empty string if unset. */
	API_KEY_SALT?: string;
}

export interface AuthContext {
	workspaceId: string;
}

/** Row returned from the conversations table (no FTS join). */
export interface ConvRow {
	id: string;
	workspace_id: string;
	title: string;
	snapshot: string;
	tags: string;
	meta: string;
	created_at: string;
	updated_at: string;
}

/** Lightweight row (no snapshot). */
export type ConvListRow = Omit<ConvRow, 'snapshot'>;
