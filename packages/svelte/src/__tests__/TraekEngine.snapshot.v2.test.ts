import { describe, it, expect } from 'vitest';
import { TraekEngine } from '../lib/TraekEngine.svelte';

describe('Snapshot v2 with custom tags', () => {
	it('serializes custom tags in v2 snapshot', () => {
		const engine = new TraekEngine();
		engine.createCustomTag('Feature', '#3b82f6');
		const snapshot = engine.serialize('Test');
		expect(snapshot.version).toBe(2);
		expect(snapshot.customTags).toHaveLength(1);
		expect(snapshot.customTags![0].label).toBe('Feature');
	});

	it('restores custom tags from v2 snapshot', () => {
		const engine = new TraekEngine();
		engine.createCustomTag('Feature', '#3b82f6');
		const snapshot = engine.serialize('Test');

		const engine2 = new TraekEngine();
		engine2.fromSnapshot(snapshot);
		expect(engine2.customTags.size).toBe(1);
	});

	it('v1 snapshot loads without error (migration)', () => {
		const v1Snapshot = {
			version: 1,
			title: 'Old',
			nodes: [],
			activeNodeId: null,
			createdAt: Date.now()
		};
		const engine = new TraekEngine();
		expect(() => engine.fromSnapshot(v1Snapshot as any)).not.toThrow();
		expect(engine.customTags.size).toBe(0);
	});
});
