import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

function createMockViewport(): ViewportManager {
	return {
		viewportEl: {
			getBoundingClientRect: () => ({ left: 0, top: 0, right: 800, bottom: 600 })
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

function createNode(id: string, x = 5, y = 5) {
	return {
		id,
		parentIds: [],
		role: 'user',
		type: 'text',
		status: 'done',
		metadata: { x, y, height: 100 }
	};
}

function createMockEngine(nodes: ReturnType<typeof createNode>[]): TraekEngine {
	const snapNodeToGrid = vi.fn();
	const setNodePosition = vi.fn();
	const captureForUndo = vi.fn();
	return {
		nodes,
		activeNodeId: null,
		getNode: (id: string) => nodes.find((n) => n.id === id),
		setNodePosition,
		snapNodeToGrid,
		captureForUndo,
		addConnection: vi.fn(),
		removeConnection: vi.fn(),
		reparentNode: vi.fn().mockReturnValue(true),
		updateNode: vi.fn()
	} as unknown as TraekEngine;
}

function makeNodeTarget(nodeId: string): EventTarget {
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

function makeMouseEvent(opts: {
	clientX?: number;
	clientY?: number;
	button?: number;
	shiftKey?: boolean;
	movementX?: number;
	movementY?: number;
	target?: EventTarget;
}): MouseEvent {
	return {
		button: opts.button ?? 0,
		clientX: opts.clientX ?? 0,
		clientY: opts.clientY ?? 0,
		shiftKey: opts.shiftKey ?? false,
		movementX: opts.movementX ?? 0,
		movementY: opts.movementY ?? 0,
		target: opts.target ?? ({ closest: () => null } as unknown as EventTarget),
		preventDefault: vi.fn(),
		stopPropagation: vi.fn()
	} as unknown as MouseEvent;
}

function makeTouchEvent(
	touches: Array<{ clientX: number; clientY: number }>,
	target?: EventTarget
): TouchEvent {
	const resolvedTarget = target ?? ({ closest: () => null } as unknown as EventTarget);
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

describe('CanvasInteraction — snap-to-grid', () => {
	let interaction: CanvasInteraction;
	let engine: TraekEngine;
	const NODE_ID = 'node-1';

	beforeEach(() => {
		// handleMouseMove calls document.elementFromPoint; handleMouseUp uses document.body.style
		vi.stubGlobal('document', {
			elementFromPoint: () => null,
			body: { style: { cursor: '' } }
		});
		const nodes = [createNode(NODE_ID)];
		engine = createMockEngine(nodes);
		interaction = new CanvasInteraction(createMockViewport(), engine, DEFAULT_CONFIG);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('defaults snapToGrid to true', () => {
		expect(interaction.snapToGrid).toBe(true);
	});

	it('snaps node to grid on mouse-up when snapToGrid is true', () => {
		const target = makeNodeTarget(NODE_ID);
		interaction.handleMouseDown(makeMouseEvent({ clientX: 100, clientY: 100, target }));
		interaction.handleMouseMove(makeMouseEvent({ clientX: 110, clientY: 110 }));
		interaction.handleMouseUp();

		expect(engine.snapNodeToGrid).toHaveBeenCalledWith(NODE_ID);
	});

	it('does NOT snap node to grid on mouse-up when snapToGrid is false', () => {
		interaction.snapToGrid = false;

		const target = makeNodeTarget(NODE_ID);
		interaction.handleMouseDown(makeMouseEvent({ clientX: 100, clientY: 100, target }));
		interaction.handleMouseMove(makeMouseEvent({ clientX: 110, clientY: 110 }));
		interaction.handleMouseUp();

		expect(engine.snapNodeToGrid).not.toHaveBeenCalled();
	});

	it('can toggle snapToGrid on and off', () => {
		expect(interaction.snapToGrid).toBe(true);
		interaction.snapToGrid = false;
		expect(interaction.snapToGrid).toBe(false);
		interaction.snapToGrid = true;
		expect(interaction.snapToGrid).toBe(true);
	});
});

describe('CanvasInteraction — touch batch drag', () => {
	let interaction: CanvasInteraction;
	let engine: TraekEngine;
	const NODE_A = 'node-a';
	const NODE_B = 'node-b';

	beforeEach(() => {
		vi.useFakeTimers();
		const nodes = [createNode(NODE_A, 5, 5), createNode(NODE_B, 10, 5)];
		engine = createMockEngine(nodes);
		interaction = new CanvasInteraction(createMockViewport(), engine, DEFAULT_CONFIG);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('moves batch-selected nodes on touch drag (parity with mouse)', () => {
		// Select both nodes via shift+click
		interaction.handleMouseDown(
			makeMouseEvent({ clientX: 110, clientY: 110, shiftKey: true, target: makeNodeTarget(NODE_A) })
		);
		interaction.handleMouseDown(
			makeMouseEvent({ clientX: 210, clientY: 110, shiftKey: true, target: makeNodeTarget(NODE_B) })
		);

		expect(interaction.selectedNodeIds.has(NODE_A)).toBe(true);
		expect(interaction.selectedNodeIds.has(NODE_B)).toBe(true);

		// Start touch drag on NODE_A past threshold
		const target = makeNodeTarget(NODE_A);
		interaction.handleTouchStart(makeTouchEvent([{ clientX: 110, clientY: 110 }], target));

		// Move past drag threshold (4px)
		interaction.handleTouchMove(makeTouchEvent([{ clientX: 120, clientY: 110 }]));

		// Both nodes should have setNodePosition called
		const calls = (engine.setNodePosition as ReturnType<typeof vi.fn>).mock.calls;
		const movedIds = calls.map((c) => c[0]);
		expect(movedIds).toContain(NODE_A);
		expect(movedIds).toContain(NODE_B);
	});

	it('snaps batch-selected nodes on touch-end when snapToGrid is true', () => {
		// Select both nodes via shift+click
		interaction.handleMouseDown(
			makeMouseEvent({ clientX: 110, clientY: 110, shiftKey: true, target: makeNodeTarget(NODE_A) })
		);
		interaction.handleMouseDown(
			makeMouseEvent({ clientX: 210, clientY: 110, shiftKey: true, target: makeNodeTarget(NODE_B) })
		);

		// Touch drag NODE_A
		const target = makeNodeTarget(NODE_A);
		interaction.handleTouchStart(makeTouchEvent([{ clientX: 110, clientY: 110 }], target));
		interaction.handleTouchMove(makeTouchEvent([{ clientX: 120, clientY: 110 }]));
		interaction.handleTouchEnd(makeTouchEvent([]));

		// Both selected nodes should be snapped
		const snappedIds = (engine.snapNodeToGrid as ReturnType<typeof vi.fn>).mock.calls.map(
			(c) => c[0]
		);
		expect(snappedIds).toContain(NODE_A);
		expect(snappedIds).toContain(NODE_B);
	});
});
