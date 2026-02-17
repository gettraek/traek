/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock scrollUtils before importing SwipeNavigator (it imports findScrollable at module level)
vi.mock('../../canvas/scrollUtils', () => ({
	findScrollable: () => null,
	scrollableCanConsumeWheel: () => false,
	ScrollBoundaryGuard: class {
		recordScrollInside() {}
		shouldSuppressCanvasWheel() {
			return false;
		}
	}
}));

import { SwipeNavigator } from '../SwipeNavigator.svelte';

// Stub target element (no DOM needed)
const stubTarget = { closest: () => null } as unknown as Element;

// Helper to create a minimal TouchEvent
function createTouchEvent(
	type: string,
	touches: Array<{ clientX: number; clientY: number }>,
	target?: Element
): TouchEvent {
	const resolvedTarget = target ?? stubTarget;
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
		type,
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
		preventDefault: vi.fn()
	} as unknown as TouchEvent;
}

// Override performance.now for deterministic velocity calculations
let mockNow = 0;

beforeEach(() => {
	mockNow = 0;
	vi.spyOn(performance, 'now').mockImplementation(() => mockNow);
});

afterEach(() => {
	vi.restoreAllMocks();
});

function advanceTime(ms: number) {
	mockNow += ms;
}

describe('SwipeNavigator', () => {
	describe('direction detection', () => {
		it('should detect left swipe', () => {
			expect.assertions(2);
			let result: { direction: string | null; velocityTriggered: boolean } | null = null;
			const nav = new SwipeNavigator({}, (r) => {
				result = r;
			});

			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			advanceTime(200);
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }]));
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			expect(result).not.toBeNull();
			expect(result!.direction).toBe('left');
		});

		it('should detect right swipe', () => {
			expect.assertions(1);
			let result: { direction: string | null } | null = null;
			const nav = new SwipeNavigator({}, (r) => {
				result = r;
			});

			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }]));
			advanceTime(200);
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 200, clientY: 200 }]));
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			expect(result!.direction).toBe('right');
		});

		it('should detect up swipe (vertical, no scroll context)', () => {
			expect.assertions(1);
			let result: { direction: string | null } | null = null;
			const nav = new SwipeNavigator({}, (r) => {
				result = r;
			});

			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 300 }]));
			advanceTime(200);
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 200, clientY: 200 }]));
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			expect(result!.direction).toBe('up');
		});

		it('should detect down swipe', () => {
			expect.assertions(1);
			let result: { direction: string | null } | null = null;
			const nav = new SwipeNavigator({}, (r) => {
				result = r;
			});

			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 100 }]));
			advanceTime(200);
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 200, clientY: 200 }]));
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			expect(result!.direction).toBe('down');
		});
	});

	describe('threshold behavior', () => {
		it('should not trigger when distance is below threshold', () => {
			expect.assertions(1);
			let result: { direction: string | null } | null = null;
			const nav = new SwipeNavigator({ swipeThreshold: 80 }, (r) => {
				result = r;
			});

			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			advanceTime(500);
			// Move only 50px (below 80px threshold)
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 150, clientY: 200 }]));
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			expect(result!.direction).toBeNull();
		});

		it('should trigger via velocity even if distance is below threshold', () => {
			expect.assertions(2);
			let result: { direction: string | null; velocityTriggered: boolean } | null = null;
			const nav = new SwipeNavigator({ swipeThreshold: 80, velocityThreshold: 0.3 }, (r) => {
				result = r;
			});

			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			advanceTime(50); // Very short time = high velocity
			// Move 50px in 50ms = 1.0 px/ms (above 0.3 threshold)
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 150, clientY: 200 }]));
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			expect(result!.direction).toBe('left');
			expect(result!.velocityTriggered).toBe(true);
		});
	});

	describe('axis locking', () => {
		it('should lock to horizontal when horizontal movement dominates', () => {
			expect.assertions(1);
			let result: { direction: string | null } | null = null;
			const nav = new SwipeNavigator({}, (r) => {
				result = r;
			});

			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			advanceTime(200);
			// Move mostly horizontal with slight vertical
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 100, clientY: 205 }]));
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			expect(result!.direction).toBe('left');
		});

		it('should lock to vertical when vertical movement dominates', () => {
			expect.assertions(1);
			let result: { direction: string | null } | null = null;
			const nav = new SwipeNavigator({}, (r) => {
				result = r;
			});

			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			advanceTime(200);
			// Move mostly vertical with slight horizontal
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 205, clientY: 100 }]));
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			expect(result!.direction).toBe('up');
		});
	});

	describe('multi-touch rejection', () => {
		it('should ignore two-finger touches', () => {
			expect.assertions(1);
			let result: { direction: string | null } | null = null;
			const nav = new SwipeNavigator({}, (r) => {
				result = r;
			});

			nav.handleTouchStart(
				createTouchEvent('touchstart', [
					{ clientX: 100, clientY: 200 },
					{ clientX: 200, clientY: 200 }
				])
			);
			advanceTime(200);
			nav.handleTouchMove(
				createTouchEvent('touchmove', [
					{ clientX: 50, clientY: 200 },
					{ clientX: 150, clientY: 200 }
				])
			);
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			expect(result).toBeNull();
		});
	});

	describe('state management', () => {
		it('should set isGestureActive during touch', () => {
			expect.assertions(2);
			const nav = new SwipeNavigator({}, () => {});

			expect(nav.isGestureActive).toBe(false);
			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			expect(nav.isGestureActive).toBe(true);
		});

		it('should reset state after touch end', () => {
			expect.assertions(3);
			const nav = new SwipeNavigator({}, () => {});

			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			advanceTime(200);
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }]));
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			expect(nav.isGestureActive).toBe(false);
			expect(nav.dragDeltaX).toBe(0);
			expect(nav.dragDeltaY).toBe(0);
		});

		it('should reset state on cancel', () => {
			expect.assertions(1);
			const nav = new SwipeNavigator({}, () => {});

			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			nav.handleTouchCancel();

			expect(nav.isGestureActive).toBe(false);
		});
	});

	describe('drag delta tracking', () => {
		it('should track horizontal drag delta', () => {
			expect.assertions(1);
			const nav = new SwipeNavigator({}, () => {});

			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			advanceTime(50);
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 150, clientY: 200 }]));

			expect(nav.dragDeltaX).toBe(-50);
		});
	});

	describe('scroll cooldown', () => {
		it('should block navigation immediately after content scroll', () => {
			expect.assertions(1);
			let result: { direction: string | null } | null = null;
			const nav = new SwipeNavigator({ scrollCooldownMs: 300 }, (r) => {
				result = r;
			});

			// Simulate that scroll happened at time 10
			advanceTime(10);
			(nav as any).lastScrollTime = performance.now();

			// Advance time only 100ms (< 300ms cooldown)
			advanceTime(100);

			// Try to swipe within cooldown period
			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			advanceTime(50);
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }]));
			// At touchEnd, timeSinceScroll will be 150ms (< 300ms cooldown)
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			// Should be blocked by cooldown
			expect(result).toBeNull();
		});

		it('should allow navigation after cooldown expires', () => {
			expect.assertions(1);
			let result: { direction: string | null } | null = null;
			const nav = new SwipeNavigator({ scrollCooldownMs: 200 }, (r) => {
				result = r;
			});

			// Simulate a scroll, then wait beyond cooldown
			const scrollable = {
				scrollTop: 50,
				scrollHeight: 500,
				clientHeight: 300,
				closest: () => null
			} as unknown as HTMLElement;

			nav.handleTouchStart(
				createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }], scrollable)
			);
			advanceTime(50);
			nav.handleTouchMove(
				createTouchEvent('touchmove', [{ clientX: 200, clientY: 250 }], scrollable)
			);
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			// Wait beyond cooldown (250ms > 200ms)
			advanceTime(250);

			// New swipe should work
			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			advanceTime(200);
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }]));
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			expect(result!.direction).toBe('left');
		});
	});

	describe('diagonal movements', () => {
		it('should pick dominant axis when movement is ambiguous', () => {
			expect.assertions(1);
			let result: { direction: string | null } | null = null;
			const nav = new SwipeNavigator({}, (r) => {
				result = r;
			});

			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			advanceTime(200);
			// Move diagonally: dx=80, dy=70 (horizontal slightly dominant)
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 120, clientY: 130 }]));
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			// Should pick horizontal (left)
			expect(result!.direction).toBe('left');
		});

		it('should pick vertical when vertical is dominant in diagonal', () => {
			expect.assertions(1);
			let result: { direction: string | null } | null = null;
			const nav = new SwipeNavigator({}, (r) => {
				result = r;
			});

			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			advanceTime(200);
			// Move diagonally: dx=30, dy=100 (vertical dominant)
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 170, clientY: 100 }]));
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			// Should pick vertical (up)
			expect(result!.direction).toBe('up');
		});
	});

	describe('overscroll threshold', () => {
		it('should track overscrollY state during vertical movement', () => {
			expect.assertions(1);
			const nav = new SwipeNavigator({ overscrollThreshold: 40 }, () => {});

			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			advanceTime(100);
			// Vertical move without scrollable context
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 200, clientY: 250 }]));

			// overscrollY should remain 0 when not in scrollable context
			expect(nav.overscrollY).toBe(0);
		});

		it('should not trigger if below overscrollThreshold at boundary', () => {
			expect.assertions(1);
			let result: { direction: string | null } | null = null;
			const nav = new SwipeNavigator({ overscrollThreshold: 60 }, (r) => {
				result = r;
			});

			const scrollable = {
				scrollTop: 0, // At top boundary
				scrollHeight: 500,
				clientHeight: 300,
				closest: () => null
			} as unknown as HTMLElement;

			nav.handleTouchStart(
				createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }], scrollable)
			);
			advanceTime(200);
			// Move down only 30px (below overscrollThreshold 60)
			nav.handleTouchMove(
				createTouchEvent('touchmove', [{ clientX: 200, clientY: 230 }], scrollable)
			);
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			expect(result!.direction).toBeNull();
		});
	});

	describe('rapid successive swipes', () => {
		it('should handle quick successive swipes independently', () => {
			expect.assertions(2);
			const results: Array<{ direction: string | null }> = [];
			const nav = new SwipeNavigator({}, (r) => {
				results.push(r);
			});

			// First swipe
			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			advanceTime(100);
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }]));
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			// Second swipe immediately after
			advanceTime(10);
			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			advanceTime(100);
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 300, clientY: 200 }]));
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			expect(results[0].direction).toBe('left');
			expect(results[1].direction).toBe('right');
		});

		it('should reset state completely between swipes', () => {
			expect.assertions(4);
			const nav = new SwipeNavigator({}, () => {});

			// First swipe
			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			advanceTime(50);
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 150, clientY: 200 }]));
			expect(nav.dragDeltaX).toBe(-50);
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			// State should be reset
			expect(nav.dragDeltaX).toBe(0);
			expect(nav.isGestureActive).toBe(false);

			// Second swipe should start fresh
			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]));
			expect(nav.isGestureActive).toBe(true);
		});
	});

	describe('callback handling', () => {
		it('should work without onSwipe callback', () => {
			expect.assertions(1);
			// Create navigator without callback
			const nav = new SwipeNavigator({});

			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			advanceTime(200);
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }]));

			// Should not crash when calling handleTouchEnd without callback
			expect(() => nav.handleTouchEnd(createTouchEvent('touchend', []))).not.toThrow();
		});

		it('should call onSwipe callback when provided', () => {
			expect.assertions(2);
			let called = false;
			let result: { direction: string | null } | null = null;
			const nav = new SwipeNavigator({}, (r) => {
				called = true;
				result = r;
			});

			nav.handleTouchStart(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			advanceTime(200);
			nav.handleTouchMove(createTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }]));
			nav.handleTouchEnd(createTouchEvent('touchend', []));

			expect(called).toBe(true);
			expect(result!.direction).toBe('left');
		});
	});

	describe('bind method', () => {
		it('should return a cleanup function', () => {
			expect.assertions(1);
			const nav = new SwipeNavigator({}, () => {});
			const mockElement = {
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			} as unknown as HTMLElement;

			const cleanup = nav.bind(mockElement);

			expect(typeof cleanup).toBe('function');
		});

		it('should add event listeners when binding', () => {
			expect.assertions(4);
			const nav = new SwipeNavigator({}, () => {});
			const mockElement = {
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			} as unknown as HTMLElement;

			nav.bind(mockElement);

			expect(mockElement.addEventListener).toHaveBeenCalledWith(
				'touchstart',
				expect.any(Function),
				{ passive: true }
			);
			expect(mockElement.addEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function), {
				passive: false
			});
			expect(mockElement.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function), {
				passive: true
			});
			expect(mockElement.addEventListener).toHaveBeenCalledWith(
				'touchcancel',
				expect.any(Function),
				{ passive: true }
			);
		});

		it('should remove event listeners when cleanup is called', () => {
			expect.assertions(4);
			const nav = new SwipeNavigator({}, () => {});
			const mockElement = {
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			} as unknown as HTMLElement;

			const cleanup = nav.bind(mockElement);
			cleanup();

			expect(mockElement.removeEventListener).toHaveBeenCalledWith(
				'touchstart',
				expect.any(Function)
			);
			expect(mockElement.removeEventListener).toHaveBeenCalledWith(
				'touchmove',
				expect.any(Function)
			);
			expect(mockElement.removeEventListener).toHaveBeenCalledWith(
				'touchend',
				expect.any(Function)
			);
			expect(mockElement.removeEventListener).toHaveBeenCalledWith(
				'touchcancel',
				expect.any(Function)
			);
		});

		it('should wire up handlers correctly through bind', () => {
			expect.assertions(2);
			let result: { direction: string | null } | null = null;
			const nav = new SwipeNavigator({}, (r) => {
				result = r;
			});

			let touchStartHandler: any;
			let touchMoveHandler: any;
			let touchEndHandler: any;

			const mockElement = {
				addEventListener: vi.fn((event, handler) => {
					if (event === 'touchstart') touchStartHandler = handler;
					if (event === 'touchmove') touchMoveHandler = handler;
					if (event === 'touchend') touchEndHandler = handler;
				}),
				removeEventListener: vi.fn()
			} as unknown as HTMLElement;

			nav.bind(mockElement);

			// Simulate gesture through bound handlers
			touchStartHandler(createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
			advanceTime(200);
			touchMoveHandler(createTouchEvent('touchmove', [{ clientX: 100, clientY: 200 }]));
			touchEndHandler(createTouchEvent('touchend', []));

			expect(result).not.toBeNull();
			expect(result!.direction).toBe('left');
		});
	});
});
