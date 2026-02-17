import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import adapter from '@sveltejs/adapter-node'
import { mdsvex } from 'mdsvex'

const config = {
	extensions: ['.svelte', '.svx'],
	preprocess: [vitePreprocess(), mdsvex()],
	kit: {
		adapter: adapter()
	}
}

export default config
