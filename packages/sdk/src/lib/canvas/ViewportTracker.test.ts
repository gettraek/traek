import { describe, it, expect } from 'vitest';
import { ViewportTracker } from './ViewportTracker.svelte';
import { DEFAULT_TRACK_ENGINE_CONFIG, type Node } from '../TraekEngine.svelte';

describe('ViewportTracker', () => {
	const config = DEFAULT_TRACK_ENGINE_CONFIG;
	const tracker = new ViewportTracker(config, 200);

	describe('getViewportBounds', () => {
		it('should return null when viewportEl is null', () => {
			const bounds = tracker.getViewportBounds(null, 1, { x: 0, y: 0 });
			expect(bounds).toBeNull();
		});

		it('should return null when viewport has zero dimensions', () => {
			const el = { clientWidth: 0, clientHeight: 0 } as HTMLElement;
			const bounds = tracker.getViewportBounds(el, 1, { x: 0, y: 0 });
			expect(bounds).toBeNull();
		});

		it('should calculate viewport bounds with buffer', () => {
			const el = { clientWidth: 1000, clientHeight: 800 } as HTMLElement;
			const bounds = tracker.getViewportBounds(el, 1, { x: 0, y: 0 });
			expect(bounds).toEqual({
				minX: -200,
				maxX: 1200,
				minY: -200,
				maxY: 1000
			});
		});

		it('should account for scale and offset', () => {
			const el = { clientWidth: 1000, clientHeight: 800 } as HTMLElement;
			// offset = { x: 100, y: 50 }, scale = 2
			// Canvas coords = (screen - offset) / scale
			// minX = (0 - 100) / 2 - 200 = -50 - 200 = -250
			// maxX = (1000 - 100) / 2 + 200 = 450 + 200 = 650
			const bounds = tracker.getViewportBounds(el, 2, { x: 100, y: 50 });
			expect(bounds).toEqual({
				minX: -250,
				maxX: 650,
				minY: -225,
				maxY: 575
			});
		});
	});

	describe('isNodeInViewport', () => {
		const bounds = { minX: 0, maxX: 1000, minY: 0, maxY: 800 };

		it('should detect node fully in viewport', () => {
			const node: Node = {
				id: '1',
				parentIds: [],
				role: 'user',
				type: 'text',
				metadata: { x: 10, y: 10, height: 100 }
			};
			expect(tracker.isNodeInViewport(node, bounds)).toBe(true);
		});

		it('should detect node partially in viewport', () => {
			// Node starts before viewport but extends into it
			const node: Node = {
				id: '1',
				parentIds: [],
				role: 'user',
				type: 'text',
				metadata: { x: -5, y: -5, height: 100 }
			};
			expect(tracker.isNodeInViewport(node, bounds)).toBe(true);
		});

		it('should detect node outside viewport (left)', () => {
			const node: Node = {
				id: '1',
				parentIds: [],
				role: 'user',
				type: 'text',
				metadata: { x: -30, y: 10, height: 100 }
			};
			// Node x in grid units: -30 * 20 = -600px
			// Node right edge: -600 + 350 = -250px (left of bounds.minX = 0)
			expect(tracker.isNodeInViewport(node, bounds)).toBe(false);
		});

		it('should detect node outside viewport (above)', () => {
			const node: Node = {
				id: '1',
				parentIds: [],
				role: 'user',
				type: 'text',
				metadata: { x: 10, y: -50, height: 100 }
			};
			// Node y in grid units: -50 * 20 = -1000px
			// Node bottom edge: -1000 + 100 = -900px (above bounds.minY = 0)
			expect(tracker.isNodeInViewport(node, bounds)).toBe(false);
		});

		it('should detect node outside viewport (right)', () => {
			const node: Node = {
				id: '1',
				parentIds: [],
				role: 'user',
				type: 'text',
				metadata: { x: 60, y: 10, height: 100 }
			};
			// Node x in grid units: 60 * 20 = 1200px (right of bounds.maxX = 1000)
			expect(tracker.isNodeInViewport(node, bounds)).toBe(false);
		});

		it('should detect node outside viewport (below)', () => {
			const node: Node = {
				id: '1',
				parentIds: [],
				role: 'user',
				type: 'text',
				metadata: { x: 10, y: 50, height: 100 }
			};
			// Node y in grid units: 50 * 20 = 1000px (below bounds.maxY = 800)
			expect(tracker.isNodeInViewport(node, bounds)).toBe(false);
		});

		it('should use default height when not provided', () => {
			const node: Node = {
				id: '1',
				parentIds: [],
				role: 'user',
				type: 'text',
				metadata: { x: 10, y: 10 }
			};
			expect(tracker.isNodeInViewport(node, bounds)).toBe(true);
		});
	});

	describe('getVisibleNodeIds', () => {
		it('should return empty set when viewport is null', () => {
			const nodes: Node[] = [];
			const visible = tracker.getVisibleNodeIds(nodes, new Set(), null, 1, { x: 0, y: 0 });
			expect(visible.size).toBe(0);
		});

		it('should return empty set for empty canvas', () => {
			const el = { clientWidth: 1000, clientHeight: 800 } as HTMLElement;
			const nodes: Node[] = [];
			const visible = tracker.getVisibleNodeIds(nodes, new Set(), el, 1, { x: 0, y: 0 });
			expect(visible.size).toBe(0);
		});

		it('should return visible nodes', () => {
			const el = { clientWidth: 1000, clientHeight: 800 } as HTMLElement;
			const nodes: Node[] = [
				{
					id: 'visible-1',
					parentIds: [],
					role: 'user',
					type: 'text',
					metadata: { x: 10, y: 10, height: 100 }
				},
				{
					id: 'visible-2',
					parentIds: [],
					role: 'assistant',
					type: 'text',
					metadata: { x: 20, y: 15, height: 150 }
				},
				{
					id: 'off-screen',
					parentIds: [],
					role: 'user',
					type: 'text',
					metadata: { x: 100, y: 100, height: 100 }
				}
			];
			const visible = tracker.getVisibleNodeIds(nodes, new Set(), el, 1, { x: 0, y: 0 });
			expect(visible.has('visible-1')).toBe(true);
			expect(visible.has('visible-2')).toBe(true);
			expect(visible.has('off-screen')).toBe(false);
		});

		it('should exclude thought nodes', () => {
			const el = { clientWidth: 1000, clientHeight: 800 } as HTMLElement;
			const nodes: Node[] = [
				{
					id: 'normal',
					parentIds: [],
					role: 'user',
					type: 'text',
					metadata: { x: 10, y: 10, height: 100 }
				},
				{
					id: 'thought',
					parentIds: [],
					role: 'assistant',
					type: 'thought',
					metadata: { x: 10, y: 10, height: 100 }
				}
			];
			const visible = tracker.getVisibleNodeIds(nodes, new Set(), el, 1, { x: 0, y: 0 });
			expect(visible.has('normal')).toBe(true);
			expect(visible.has('thought')).toBe(false);
		});

		it('should exclude collapsed descendants', () => {
			const el = { clientWidth: 1000, clientHeight: 800 } as HTMLElement;
			const nodes: Node[] = [
				{
					id: 'parent',
					parentIds: [],
					role: 'user',
					type: 'text',
					metadata: { x: 10, y: 10, height: 100 }
				},
				{
					id: 'child',
					parentIds: ['parent'],
					role: 'assistant',
					type: 'text',
					metadata: { x: 10, y: 20, height: 100 }
				}
			];
			const collapsedNodes = new Set(['parent']);
			const visible = tracker.getVisibleNodeIds(nodes, collapsedNodes, el, 1, { x: 0, y: 0 });
			expect(visible.has('parent')).toBe(true);
			expect(visible.has('child')).toBe(false);
		});

		it('should handle large number of nodes efficiently', () => {
			const el = { clientWidth: 1000, clientHeight: 800 } as HTMLElement;
			const nodes: Node[] = [];
			for (let i = 0; i < 1000; i++) {
				nodes.push({
					id: `node-${i}`,
					parentIds: i > 0 ? [`node-${i - 1}`] : [],
					role: i % 2 === 0 ? 'user' : 'assistant',
					type: 'text',
					metadata: { x: i % 10, y: Math.floor(i / 10), height: 100 }
				});
			}
			const start = performance.now();
			const visible = tracker.getVisibleNodeIds(nodes, new Set(), el, 1, { x: 0, y: 0 });
			const duration = performance.now() - start;
			expect(visible.size).toBeGreaterThan(0);
			expect(visible.size).toBeLessThan(1000);
			// Should complete in reasonable time (< 200ms for 1000 nodes)
			expect(duration).toBeLessThan(200);
		});
	});
});
