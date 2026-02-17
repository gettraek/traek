import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	integrations: [
		starlight({
			title: 'Træk',
			description: 'Spatial tree-chat UI for AI agents',
			social: {
				github: 'https://github.com/gettraek/traek'
			},
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'getting-started/introduction' },
						{ label: 'Installation', slug: 'getting-started/installation' },
						{ label: 'Quick Start', slug: 'getting-started/quick-start' }
					]
				},
				{
					label: 'API Reference',
					items: [
						{ label: 'TraekCanvas', slug: 'api/traek-canvas' },
						{ label: 'TraekEngine', slug: 'api/traek-engine' },
						{ label: 'TextNode', slug: 'api/text-node' },
						{ label: 'Types', slug: 'api/types' }
					]
				},
				{
					label: 'Integration Guide',
					items: [
						{ label: 'With SvelteKit', slug: 'guides/sveltekit' },
						{ label: 'OpenAI Streaming', slug: 'guides/openai-streaming' },
						{ label: 'Custom Node Types', slug: 'guides/custom-nodes' }
					]
				}
			]
		})
	]
});
