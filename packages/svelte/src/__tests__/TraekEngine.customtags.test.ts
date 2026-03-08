import { describe, it, expect } from 'vitest';
import { TraekEngine } from '../lib/TraekEngine.svelte';

describe('TraekEngine: custom tags', () => {
	it('creates a custom tag', () => {
		const engine = new TraekEngine();
		const tag = engine.createCustomTag('My Label', '#ff0000');
		expect(tag.label).toBe('My Label');
		expect(tag.color).toBe('#ff0000');
		expect(tag.slug).toMatch(/^my-label/);
	});

	it('stores custom tag in engine.customTags', () => {
		const engine = new TraekEngine();
		const tag = engine.createCustomTag('Feature', '#3b82f6');
		expect(engine.customTags.get(tag.slug)).toEqual(tag);
	});

	it('deletes a custom tag', () => {
		const engine = new TraekEngine();
		const tag = engine.createCustomTag('Remove Me', '#aaa');
		engine.deleteCustomTag(tag.slug);
		expect(engine.customTags.has(tag.slug)).toBe(false);
	});

	it('listAllTags returns predefined + custom', () => {
		const engine = new TraekEngine();
		engine.createCustomTag('Mine', '#123456');
		const all = engine.listAllTags();
		// Should include at least 5 predefined + 1 custom
		expect(all.length).toBeGreaterThanOrEqual(6);
		const slugs = all.map((t) => t.slug);
		expect(slugs).toContain('important');
		expect(slugs).toContain('mine');
	});
});
