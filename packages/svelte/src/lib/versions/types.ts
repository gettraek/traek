import { z } from 'zod';
import { conversationSnapshotSchema } from '../persistence/schemas';

// ── VersionEntry ──────────────────────────────────────────────────────────────

export const versionEntrySchema = z.object({
	id: z.string(),
	conversationId: z.string(),
	label: z.string(),
	description: z.string().optional(),
	createdAt: z.number(),
	isAuto: z.boolean(),
	snapshot: conversationSnapshotSchema
});

export type VersionEntry = z.infer<typeof versionEntrySchema>;

// ── SnapshotDiff ──────────────────────────────────────────────────────────────

export interface SnapshotNodeChange {
	id: string;
	contentChanged: boolean;
	metadataChanged: boolean;
}

export interface SnapshotDiff {
	nodeCountBefore: number;
	nodeCountAfter: number;
	addedNodeIds: string[];
	removedNodeIds: string[];
	changedNodes: SnapshotNodeChange[];
}

// ── StorageAdapter ────────────────────────────────────────────────────────────

export interface StorageAdapter {
	save(entry: VersionEntry): Promise<void>;
	load(id: string): Promise<VersionEntry | null>;
	loadAll(conversationId: string): Promise<VersionEntry[]>;
	delete(id: string): Promise<void>;
}

// ── Options ───────────────────────────────────────────────────────────────────

export interface VersionHistoryOptions {
	/** Max number of auto-snapshots to retain per conversation (oldest pruned first). Default 20. */
	maxAutoSnapshots?: number;
	/** Max total versions (auto + manual) per conversation. Default 50. */
	maxVersions?: number;
}
