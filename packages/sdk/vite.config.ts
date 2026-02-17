import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{ts,js}'],
		exclude: ['**/node_modules/**', '**/dist/**', '**/.svelte-kit/**']
	}
});
