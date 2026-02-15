import { z } from 'zod';

const nodeStatusSchema = z.enum(['streaming', 'done', 'error']);

export const serializedNodeSchema = z.object({
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
		height: z.number().optional()
	}),
	data: z.unknown().optional()
});

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
	nodes: z.array(serializedNodeSchema)
});

export type SerializedNode = z.infer<typeof serializedNodeSchema>;
export type ConversationSnapshot = z.infer<typeof conversationSnapshotSchema>;
