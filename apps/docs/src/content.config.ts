import { defineCollection } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		schema: (context) =>
			docsSchema()(context).transform((data) => ({
				...data,
				head: (data as { head?: unknown }).head ?? []
			}))
	})
};
