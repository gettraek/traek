import { z } from 'zod';

export const actionDefinitionSchema = z.object({
	id: z.string(),
	label: z.string(),
	description: z.string(),
	icon: z.string().optional(),
	keywords: z.array(z.string()).optional(),
	slashCommand: z.string().optional()
});

export type ActionDefinition = z.infer<typeof actionDefinitionSchema>;
