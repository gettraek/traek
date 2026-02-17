import { z } from 'zod';

const nodeStatusSchema = z.enum(['streaming', 'done', 'error']);

export const serializedNodeSchema = z.object({
	id: z.string(),
	parentIds: z.array(z.string()),
	content: z.string(),
	role: z.enum(['user', 'assistant', 'system']),
	type: z.string(),
	status: nodeStatusSchema.optional(),
	createdAt: z.number(),
	metadata: z.object({
		x: z.number(),
		y: z.number(),
		height: z.number().optional(),
		tags: z.array(z.string()).optional()
	}),
	data: z.unknown().optional()
});

/**
 * Legacy schema that accepts old snapshots with `parentId: string | null` per node.
 * Used by fromSnapshot() to migrate old data. Transforms parentId → parentIds.
 */
const legacySerializedNodeSchema = z
	.object({
		id: z.string(),
		parentId: z.string().nullable(),
		content: z.string(),
		role: z.enum(['user', 'assistant', 'system']),
		type: z.string(),
		status: nodeStatusSchema.optional(),
		createdAt: z.number(),
		metadata: z.object({
			x: z.number(),
			y: z.number(),
			height: z.number().optional(),
			tags: z.array(z.string()).optional()
		}),
		data: z.unknown().optional()
	})
	.transform((n) => ({
		id: n.id,
		parentIds: n.parentId ? [n.parentId] : [],
		content: n.content,
		role: n.role,
		type: n.type,
		status: n.status,
		createdAt: n.createdAt,
		metadata: n.metadata,
		data: n.data
	}));

/** Accepts both new (parentIds) and legacy (parentId) node formats. Normalizes to parentIds. */
export const serializedNodeFlexSchema = z.union([serializedNodeSchema, legacySerializedNodeSchema]);

export const conversationSnapshotSchema = z.object({
	version: z.literal(1),
	createdAt: z.number(),
	title: z.string().optional(),
	config: z.record(z.string(), z.unknown()).optional(),
	viewport: z
		.object({
			scale: z.number(),
			offsetX: z.number(),
			offsetY: z.number()
		})
		.optional(),
	activeNodeId: z.string().nullable(),
	nodes: z.array(serializedNodeFlexSchema)
});

export type SerializedNode = z.infer<typeof serializedNodeSchema>;
export type ConversationSnapshot = z.infer<typeof conversationSnapshotSchema>;

export const saveStateSchema = z.enum(['idle', 'saving', 'saved', 'error']);

export const storedConversationSchema = z.object({
	id: z.string(),
	title: z.string(),
	createdAt: z.number(),
	updatedAt: z.number(),
	snapshot: conversationSnapshotSchema
});

export const conversationListItemSchema = z.object({
	id: z.string(),
	title: z.string(),
	createdAt: z.number(),
	updatedAt: z.number(),
	nodeCount: z.number(),
	preview: z.string()
});
