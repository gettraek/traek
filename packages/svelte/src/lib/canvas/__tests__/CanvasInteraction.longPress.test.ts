import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock scrollUtils before importing CanvasInteraction (it uses HTMLElement at module level)
vi.mock('../scrollUtils', () => ({
	findScrollable: () => null,
	scrollableCanConsumeWheel: () => false,
	ScrollBoundaryGuard: class {
		recordScrollInside() {}
		shouldSuppressCanvasWheel() {
			return false;
		}
	}
}));

import { CanvasInteraction } from '../CanvasInteraction.svelte';
import type { TraekEngine, TraekEngineConfig } from '../../TraekEngine.svelte';
import type { ViewportManager } from '../ViewportManager.svelte';

// --- Minimal mocks ---

function createMockViewport(rectLeft = 0, rectTop = 0): ViewportManager {
	return {
		viewportEl: {
			getBoundingClientRect: () => ({ left: rectLeft, top: rectTop, right: 800, bottom: 600 })
		},
		offset: { x: 0, y: 0 },
		scale: 1,
		clampOffset: vi.fn(),
		scheduleViewportChange: vi.fn(),
		notifyViewportChange: vi.fn(),
		centerOnNode: vi.fn(),
		viewportResizeVersion: 0
	} as unknown as ViewportManager;
}

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

function createMockEngine(nodeId: string): TraekEngine {
	const node = {
		id: nodeId,
		parentIds: [],
		role: 'user',
		type: 'text',
		status: 'done',
		metadata: { x: 5, y: 5, height: 100 }
	};
	return {
		nodes: [node],
		activeNodeId: null,
		getNode: (id: string) => (id === nodeId ? node : undefined),
		setNodePosition: vi.fn(),
		snapNodeToGrid: vi.fn(),
		captureForUndo: vi.fn(),
		addConnection: vi.fn(),
		removeConnection: vi.fn(),
		updateNode: vi.fn(),
		updateNodeHeight: vi.fn()
	} as unknown as TraekEngine;
}

/**
 * Build a mock target element that looks like a node header.
 * `.closest('[data-node-id]')` returns an object with the given nodeId.
 * `.closest('.message-node-content, .content-area')` returns null.
 * `.closest('.floating-input-container')` returns null.
 */
function makeNodeHeaderTarget(nodeId: string): EventTarget {
	const nodeEl = {
		getAttribute: (attr: string) => (attr === 'data-node-id' ? nodeId : null)
	};
	return {
		closest: (selector: string) => {
			if (selector === '[data-node-id]') return nodeEl;
			return null;
		}
	} as unknown as EventTarget;
}

/** Build a target that is NOT inside a node (e.g. canvas background). */
function makeCanvasTarget(): EventTarget {
	return {
		closest: (_selector: string) => null
	} as unknown as EventTarget;
}

/** Build a TouchEvent-like object. */
function makeTouchEvent(
	touches: Array<{ clientX: number; clientY: number }>,
	target?: EventTarget
): TouchEvent {
	const resolvedTarget = target ?? makeCanvasTarget();
	const touchList = touches.map(
		(t, i) =>
			({
				identifier: i,
				clientX: t.clientX,
				clientY: t.clientY,
				target: resolvedTarget
			}) as unknown as Touch
	);
	return {
		touches: {
			length: touchList.length,
			item: (i: number) => touchList[i] ?? null,
			[Symbol.iterator]: function* () {
				for (const t of touchList) yield t;
			},
			...touchList.reduce(
				(acc, t, i) => {
					acc[i] = t;
					return acc;
				},
				{} as Record<number, Touch>
			)
		} as unknown as TouchList,
		target: resolvedTarget,
		cancelable: true,
		preventDefault: vi.fn()
	} as unknown as TouchEvent;
}

describe('CanvasInteraction — long-press', () => {
	let interaction: CanvasInteraction;
	let viewport: ViewportManager;
	let engine: TraekEngine;
	const NODE_ID = 'node-1';

	beforeEach(() => {
		vi.useFakeTimers();
		viewport = createMockViewport();
		engine = createMockEngine(NODE_ID);
		interaction = new CanvasInteraction(viewport, engine, DEFAULT_CONFIG);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('should set longPressNodeId after 500ms while holding on a node', () => {
		const target = makeNodeHeaderTarget(NODE_ID);
		interaction.handleTouchStart(makeTouchEvent([{ clientX: 100, clientY: 200 }], target));

		expect(interaction.longPressNodeId).toBeNull();

		vi.advanceTimersByTime(500);

		expect(interaction.longPressNodeId).toBe(NODE_ID);
	});

	it('should compute longPressViewportPos relative to viewport element', () => {
		viewport = createMockViewport(50, 80); // viewport rect origin at (50, 80)
		engine = createMockEngine(NODE_ID);
		interaction = new CanvasInteraction(viewport, engine, DEFAULT_CONFIG);

		const target = makeNodeHeaderTarget(NODE_ID);
		interaction.handleTouchStart(makeTouchEvent([{ clientX: 150, clientY: 280 }], target));
		vi.advanceTimersByTime(500);

		expect(interaction.longPressViewportPos).toEqual({ x: 100, y: 200 }); // 150-50, 280-80
	});

	it('should not fire long press if touch ends before 500ms', () => {
		const target = makeNodeHeaderTarget(NODE_ID);
		interaction.handleTouchStart(makeTouchEvent([{ clientX: 100, clientY: 200 }], target));
		interaction.handleTouchEnd(makeTouchEvent([]));

		vi.advanceTimersByTime(600);

		expect(interaction.longPressNodeId).toBeNull();
	});

	it('should cancel long press if finger moves beyond 8px threshold', () => {
		const target = makeNodeHeaderTarget(NODE_ID);
		interaction.handleTouchStart(makeTouchEvent([{ clientX: 100, clientY: 200 }], target));
		// Move 15px (> 8px threshold)
		interaction.handleTouchMove(makeTouchEvent([{ clientX: 115, clientY: 200 }]));

		vi.advanceTimersByTime(600);

		expect(interaction.longPressNodeId).toBeNull();
	});

	it('should not cancel long press if finger barely moves within threshold', () => {
		const target = makeNodeHeaderTarget(NODE_ID);
		interaction.handleTouchStart(makeTouchEvent([{ clientX: 100, clientY: 200 }], target));
		// Move only 5px (< 8px threshold)
		interaction.handleTouchMove(makeTouchEvent([{ clientX: 105, clientY: 200 }]));

		vi.advanceTimersByTime(500);

		expect(interaction.longPressNodeId).toBe(NODE_ID);
	});

	it('clearLongPress should reset longPressNodeId and position', () => {
		const target = makeNodeHeaderTarget(NODE_ID);
		interaction.handleTouchStart(makeTouchEvent([{ clientX: 100, clientY: 200 }], target));
		vi.advanceTimersByTime(500);
		expect(interaction.longPressNodeId).toBe(NODE_ID);

		interaction.clearLongPress();

		expect(interaction.longPressNodeId).toBeNull();
		expect(interaction.longPressViewportPos).toBeNull();
	});

	it('should dismiss long press menu when a new touch begins', () => {
		const target = makeNodeHeaderTarget(NODE_ID);
		interaction.handleTouchStart(makeTouchEvent([{ clientX: 100, clientY: 200 }], target));
		vi.advanceTimersByTime(500);
		expect(interaction.longPressNodeId).toBe(NODE_ID);

		// New touch on canvas background
		interaction.handleTouchStart(makeTouchEvent([{ clientX: 300, clientY: 400 }]));

		expect(interaction.longPressNodeId).toBeNull();
	});
});
