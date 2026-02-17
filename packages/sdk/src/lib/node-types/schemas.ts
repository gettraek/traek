import { z } from 'zod';

export const nodeTypeActionSchema = z.object({
	id: z.string(),
	label: z.string(),
	icon: z.string().optional(),
	handler: z.function(),
	variants: z.function().optional()
});

export const nodeTypeDefinitionSchema = z.object({
	type: z.string(),
	label: z.string(),
	component: z.any().optional(),
	icon: z.string().optional(),
	selfWrapping: z.boolean().optional(),
	defaultSize: z
		.object({
			width: z.number().optional(),
			minHeight: z.number().optional()
		})
		.optional(),
	validateData: z.function().optional(),
	serializeData: z.function().optional(),
	deserializeData: z.function().optional(),
	actions: z.array(nodeTypeActionSchema).optional(),
	onCreate: z.function().optional(),
	onDestroy: z.function().optional()
});
