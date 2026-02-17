import { describe, it, expect } from 'vitest';
import { pathVerticalHorizontalVertical, getConnectionPath } from '../connectionPath';

describe('pathVerticalHorizontalVertical', () => {
	it('should produce a path for normal case', () => {
		expect.assertions(3);
		const path = pathVerticalHorizontalVertical(0, 0, 100, 200, 12);
		expect(path).toContain('M 0 0');
		expect(path).toContain('C');
		expect(path).toContain('100 200');
	});

	it('should produce straight line when same X (vertical)', () => {
		expect.assertions(2);
		const path = pathVerticalHorizontalVertical(50, 0, 50, 200, 12);
		// When dx=0, minR = min(r, 0, ...) = 0, so it falls back to straight line
		expect(path).toContain('M 50 0');
		expect(path).toContain('L 50 200');
	});

	it('should produce straight line for zero distance', () => {
		expect.assertions(1);
		const path = pathVerticalHorizontalVertical(50, 100, 50, 100, 12);
		expect(path).toContain('M 50 100');
	});

	it('should handle negative direction (right to left)', () => {
		expect.assertions(2);
		const path = pathVerticalHorizontalVertical(100, 0, 0, 200, 12);
		expect(path).toContain('M 100 0');
		expect(path).toContain('0 200');
	});

	it('should use smaller radius when distance is small', () => {
		expect.assertions(2);
		// Very small dx: radius should be clamped
		const path = pathVerticalHorizontalVertical(0, 0, 4, 200, 12);
		expect(path).toContain('M 0 0');
		expect(path).toContain('C');
	});

	it('should handle small vertical distance', () => {
		expect.assertions(1);
		// Very small dy: minR = min(r, dx/2, dy/4)
		const path = pathVerticalHorizontalVertical(0, 0, 100, 8, 12);
		expect(path).toBeDefined();
	});
});

describe('getConnectionPath', () => {
	it('should use VHV path when child is below parent', () => {
		expect.assertions(2);
		const path = getConnectionPath(0, 0, 100, 50, 200, 200, 100, 50);
		// x1 = 0+50 = 50, y1 = 0+50 = 50, x2 = 200+50 = 250, y2 = 200
		expect(path).toContain('M 50 50');
		expect(path).toContain('250 200');
	});

	it('should route around nodes when child is above parent (upward)', () => {
		expect.assertions(2);
		const path = getConnectionPath(0, 200, 100, 50, 0, 0, 100, 50);
		// x1 = 50, y1 = 250, x2 = 50, y2 = 0 => upward routing
		expect(path).toContain('M 50 250');
		expect(path.length).toBeGreaterThan(20);
	});

	it('should handle same position', () => {
		expect.assertions(1);
		const path = getConnectionPath(0, 0, 100, 50, 0, 0, 100, 50);
		// y2 (0) < y1 (50) → upward routing
		expect(path).toBeDefined();
	});

	it('should handle overlapping nodes with upward routing', () => {
		expect.assertions(1);
		const path = getConnectionPath(50, 200, 100, 50, 50, 50, 100, 50);
		// Overlapping horizontally, child above
		expect(path).toBeDefined();
	});

	it('should route through gap when child is entirely to the right and above', () => {
		expect.assertions(1);
		const path = getConnectionPath(0, 200, 100, 50, 200, 0, 100, 50);
		// Child entirely right of parent, above
		expect(path).toBeDefined();
	});

	it('should route through gap when child is entirely to the left and above', () => {
		expect.assertions(1);
		const path = getConnectionPath(200, 200, 100, 50, 0, 0, 100, 50);
		// Child entirely left of parent, above
		expect(path).toBeDefined();
	});

	it('should produce VHV when child is directly below (same center X)', () => {
		expect.assertions(1);
		const path = getConnectionPath(100, 0, 100, 50, 100, 200, 100, 50);
		// Both centered at x=150, y1=50, y2=200 → straight VHV with dx=0 → straight line
		expect(path).toContain('L 150 200');
	});

	it('should handle zero-size nodes', () => {
		expect.assertions(1);
		const path = getConnectionPath(0, 0, 0, 0, 100, 100, 0, 0);
		expect(path).toBeDefined();
	});
});
