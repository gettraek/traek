import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ViewportManager } from '../ViewportManager.svelte';
import type { TraekEngineConfig, Node } from '../../TraekEngine.svelte';

const DEFAULT_CONFIG: TraekEngineConfig = {
	focusDurationMs: 280,
	zoomSpeed: 0.004,
	zoomLineModeBoost: 20,
	scaleMin: 0.05,
	scaleMax: 8,
	nodeWidth: 350,
	nodeHeightDefault: 100,
	streamIntervalMs: 30,
	rootNodeOffsetX: -175,
	rootNodeOffsetY: -50,
	layoutGapX: 35,
	layoutGapY: 50,
	heightChangeThreshold: 5,
	gridStep: 20
};

function createMockViewport(width: number, height: number): HTMLElement {
	return {
		clientWidth: width,
		clientHeight: height
	} as HTMLElement;
}

function createNode(id: string, x: number, y: number, height?: number, type = 'text'): Node {
	return {
		id,
		parentIds: [],
		role: 'user',
		type,
		metadata: {
			x,
			y,
			height
		}
	};
}

describe('ViewportManager.fitAll', () => {
	let viewport: ViewportManager;
	let mockViewportEl: HTMLElement;

	beforeEach(() => {
		mockViewportEl = createMockViewport(1000, 800);
		viewport = new ViewportManager(DEFAULT_CONFIG);
		viewport.viewportEl = mockViewportEl;
	});

	it('should do nothing if viewportEl is null', () => {
		viewport.viewportEl = null;
		const nodes = [createNode('1', 0, 0)];
		const initialScale = viewport.scale;
		viewport.fitAll(nodes);
		expect(viewport.scale).toBe(initialScale);
	});

	it('should do nothing if no non-thought nodes exist', () => {
		const nodes = [createNode('1', 0, 0, undefined, 'thought')];
		const initialScale = viewport.scale;
		viewport.fitAll(nodes);
		expect(viewport.scale).toBe(initialScale);
	});

	it('should center and scale a single node', () => {
		const nodes = [createNode('1', 5, 5, 150)];
		viewport.fitAll(nodes, 50);

		// Node bounds: x=100px, y=100px, w=350px, h=150px (grid 5,5 * 20px step)
		// Content size: 350x150
		// Viewport: 1000x800
		// Available space: (1000-100)x(800-100) = 900x700
		// Scale: min(900/350, 700/150) = min(2.57, 4.67) = 2.57 (clamped to scaleMax=8)
		expect(viewport.scale).toBeGreaterThan(1);
		expect(viewport.scale).toBeLessThanOrEqual(DEFAULT_CONFIG.scaleMax);

		// Check that content is centered
		const contentCenterX = 100 + 350 / 2; // 275
		const contentCenterY = 100 + 150 / 2; // 175
		const expectedOffsetX = 1000 / 2 - contentCenterX * viewport.scale;
		const expectedOffsetY = 800 / 2 - contentCenterY * viewport.scale;

		// Allow some tolerance due to clamping
		expect(Math.abs(viewport.offset.x - expectedOffsetX)).toBeLessThan(10);
		expect(Math.abs(viewport.offset.y - expectedOffsetY)).toBeLessThan(10);
	});

	it('should scale to fit multiple nodes', () => {
		const nodes = [
			createNode('1', 0, 0, 100),
			createNode('2', 30, 0, 100),
			createNode('3', 0, 15, 100),
			createNode('4', 30, 15, 100)
		];
		viewport.fitAll(nodes, 50);

		// Grid bounds: x=0-30, y=0-15 (in grid units)
		// Pixel bounds: x=0-950px (30*20 + 350), y=0-400px (15*20 + 100)
		// Content size: 950x400
		// Available: 900x700
		// Scale: min(900/950, 700/400) = min(0.95, 1.75) = 0.95
		expect(viewport.scale).toBeCloseTo(0.95, 1);
	});

	it('should respect scaleMin constraint', () => {
		// Create very large node layout
		const nodes = [
			createNode('1', 0, 0),
			createNode('2', 500, 0), // Very far apart
			createNode('3', 0, 500)
		];
		viewport.fitAll(nodes, 50);

		expect(viewport.scale).toBeGreaterThanOrEqual(DEFAULT_CONFIG.scaleMin);
	});

	it('should respect scaleMax constraint', () => {
		// Create very small node layout
		const nodes = [createNode('1', 0, 0, 50)];
		viewport.fitAll(nodes, 50);

		expect(viewport.scale).toBeLessThanOrEqual(DEFAULT_CONFIG.scaleMax);
	});

	it('should filter out thought nodes', () => {
		const nodes = [
			createNode('1', 0, 0),
			createNode('2', 100, 100, undefined, 'thought'), // Should be ignored
			createNode('3', 10, 10)
		];
		viewport.fitAll(nodes, 50);

		// The thought node at (100,100) should not affect bounds
		// Scale should be calculated only for nodes 1 and 3
		expect(viewport.scale).toBeGreaterThan(1);
	});

	it('should apply padding correctly', () => {
		const nodes = [createNode('1', 5, 5, 100)];

		viewport.fitAll(nodes, 100); // Larger padding
		const scaleWithLargePadding = viewport.scale;

		viewport.fitAll(nodes, 20); // Smaller padding
		const scaleWithSmallPadding = viewport.scale;

		// Larger padding should result in smaller scale
		expect(scaleWithLargePadding).toBeLessThan(scaleWithSmallPadding);
	});

	it('should use default padding of 50 when not specified', () => {
		const nodes = [createNode('1', 5, 5, 100)];
		viewport.fitAll(nodes);

		// Should work without throwing
		expect(viewport.scale).toBeGreaterThan(0);
	});

	it('should notify viewport change after fitting', () => {
		const onViewportChange = vi.fn();
		viewport = new ViewportManager(DEFAULT_CONFIG, undefined, undefined, onViewportChange);
		viewport.viewportEl = mockViewportEl;

		const nodes = [createNode('1', 5, 5)];
		viewport.fitAll(nodes);

		expect(onViewportChange).toHaveBeenCalledWith({
			scale: expect.any(Number),
			offset: { x: expect.any(Number), y: expect.any(Number) }
		});
	});

	it('should handle nodes with default height when metadata.height is missing', () => {
		const nodes = [createNode('1', 5, 5)]; // No height specified
		viewport.fitAll(nodes, 50);

		// Should use nodeHeightDefault (100)
		expect(viewport.scale).toBeGreaterThan(0);
	});

	it('should handle zero-sized viewport', () => {
		viewport.viewportEl = createMockViewport(0, 0);
		const nodes = [createNode('1', 5, 5)];
		const initialScale = viewport.scale;
		viewport.fitAll(nodes);

		// Should do nothing with zero-sized viewport
		expect(viewport.scale).toBe(initialScale);
	});
});
