import { describe, it, expect } from 'vitest';
import { getDetailLevel } from './AdaptiveRenderer.svelte';

describe('getDetailLevel', () => {
	it('returns "full" for scale > 0.8', () => {
		expect(getDetailLevel(1.0)).toBe('full');
		expect(getDetailLevel(0.9)).toBe('full');
		expect(getDetailLevel(0.81)).toBe('full');
		expect(getDetailLevel(2.0)).toBe('full');
	});

	it('returns "compact" for scale between 0.4 and 0.8', () => {
		expect(getDetailLevel(0.8)).toBe('compact');
		expect(getDetailLevel(0.6)).toBe('compact');
		expect(getDetailLevel(0.5)).toBe('compact');
		expect(getDetailLevel(0.41)).toBe('compact');
	});

	it('returns "minimal" for scale between 0.2 and 0.4', () => {
		expect(getDetailLevel(0.4)).toBe('minimal');
		expect(getDetailLevel(0.3)).toBe('minimal');
		expect(getDetailLevel(0.25)).toBe('minimal');
		expect(getDetailLevel(0.21)).toBe('minimal');
	});

	it('returns "dot" for scale < 0.2', () => {
		expect(getDetailLevel(0.2)).toBe('dot');
		expect(getDetailLevel(0.1)).toBe('dot');
		expect(getDetailLevel(0.05)).toBe('dot');
		expect(getDetailLevel(0.01)).toBe('dot');
	});

	it('handles edge cases correctly', () => {
		expect(getDetailLevel(0.8)).toBe('compact');
		expect(getDetailLevel(0.4)).toBe('minimal');
		expect(getDetailLevel(0.2)).toBe('dot');
	});
});
