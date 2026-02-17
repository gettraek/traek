import { z } from 'zod';

export const traekEngineConfigSchema = z.object({
	focusDurationMs: z.number(),
	zoomSpeed: z.number(),
	zoomLineModeBoost: z.number(),
	scaleMin: z.number(),
	scaleMax: z.number(),
	nodeWidth: z.number(),
	nodeHeightDefault: z.number(),
	streamIntervalMs: z.number(),
	rootNodeOffsetX: z.number(),
	rootNodeOffsetY: z.number(),
	layoutGapX: z.number(),
	layoutGapY: z.number(),
	heightChangeThreshold: z.number(),
	gridStep: z.number()
});

export const addNodePayloadSchema = z.object({
	id: z.string().optional(),
	parentIds: z.array(z.string()),
	content: z.string(),
	role: z.enum(['user', 'assistant', 'system']),
	type: z.string().optional(),
	status: z.enum(['streaming', 'done', 'error']).optional(),
	errorMessage: z.string().optional(),
	createdAt: z.number().optional(),
	metadata: z
		.object({
			x: z.number(),
			y: z.number(),
			height: z.number().optional()
		})
		.partial()
		.optional(),
	data: z.unknown().optional()
});
