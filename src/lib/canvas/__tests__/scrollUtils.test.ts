import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findScrollable, scrollableCanConsumeWheel, ScrollBoundaryGuard } from '../scrollUtils';

// Mock DOM classes for node environment
class MockElement {
	parentElement: MockElement | null = null;
}

class MockHTMLElement extends MockElement {
	scrollHeight = 0;
	clientHeight = 0;
	scrollWidth = 0;
	clientWidth = 0;
	scrollTop = 0;
	scrollLeft = 0;
	private _style: Record<string, string> = {};

	constructor(style: Record<string, string> = {}) {
		super();
		this._style = style;
	}

	getStyle() {
		return this._style;
	}
}

beforeEach(() => {
	// Set up globalThis mocks for DOM APIs
	globalThis.HTMLElement = MockHTMLElement as unknown as typeof HTMLElement;
	globalThis.getComputedStyle = ((el: MockHTMLElement) => {
		const style = el.getStyle();
		return {
			overflow: style.overflow ?? 'visible',
			overflowX: style.overflowX ?? style.overflow ?? 'visible',
			overflowY: style.overflowY ?? style.overflow ?? 'visible'
		};
	}) as unknown as typeof getComputedStyle;
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('findScrollable', () => {
	it('should return null for non-scrollable element', () => {
		expect.assertions(1);
		const el = new MockHTMLElement({ overflow: 'visible' });
		el.scrollHeight = 100;
		el.clientHeight = 100;
		const result = findScrollable(el as unknown as Element);
		expect(result).toBeNull();
	});

	it('should return null when content does not overflow', () => {
		expect.assertions(1);
		const el = new MockHTMLElement({ overflow: 'auto' });
		el.scrollHeight = 100;
		el.clientHeight = 100;
		const result = findScrollable(el as unknown as Element);
		expect(result).toBeNull();
	});

	it('should find vertically scrollable element', () => {
		expect.assertions(1);
		const el = new MockHTMLElement({ overflowY: 'auto' });
		el.scrollHeight = 200;
		el.clientHeight = 100;
		const result = findScrollable(el as unknown as Element);
		expect(result).toBe(el);
	});

	it('should find horizontally scrollable element', () => {
		expect.assertions(1);
		const el = new MockHTMLElement({ overflowX: 'scroll' });
		el.scrollWidth = 200;
		el.clientWidth = 100;
		const result = findScrollable(el as unknown as Element);
		expect(result).toBe(el);
	});

	it('should find scrollable parent', () => {
		expect.assertions(1);
		const parent = new MockHTMLElement({ overflow: 'auto' });
		parent.scrollHeight = 300;
		parent.clientHeight = 100;
		const child = new MockHTMLElement({ overflow: 'visible' });
		child.scrollHeight = 50;
		child.clientHeight = 50;
		child.parentElement = parent;
		const result = findScrollable(child as unknown as Element);
		expect(result).toBe(parent);
	});

	it('should handle overflow: scroll with overflowing content', () => {
		expect.assertions(1);
		const el = new MockHTMLElement({ overflow: 'scroll' });
		el.scrollHeight = 500;
		el.clientHeight = 100;
		const result = findScrollable(el as unknown as Element);
		expect(result).toBe(el);
	});
});

describe('scrollableCanConsumeWheel', () => {
	it('should allow scrolling down when space available', () => {
		expect.assertions(1);
		const el = new MockHTMLElement();
		el.scrollTop = 0;
		el.scrollHeight = 200;
		el.clientHeight = 100;
		const result = scrollableCanConsumeWheel(el as unknown as HTMLElement, 0, 10);
		expect(result).toBe(true);
	});

	it('should allow scrolling up when not at top', () => {
		expect.assertions(1);
		const el = new MockHTMLElement();
		el.scrollTop = 50;
		el.scrollHeight = 200;
		el.clientHeight = 100;
		const result = scrollableCanConsumeWheel(el as unknown as HTMLElement, 0, -10);
		expect(result).toBe(true);
	});

	it('should prevent scrolling down at bottom boundary', () => {
		expect.assertions(1);
		const el = new MockHTMLElement();
		el.scrollTop = 100;
		el.scrollHeight = 200;
		el.clientHeight = 100;
		const result = scrollableCanConsumeWheel(el as unknown as HTMLElement, 0, 10);
		expect(result).toBe(false);
	});

	it('should prevent scrolling up at top boundary', () => {
		expect.assertions(1);
		const el = new MockHTMLElement();
		el.scrollTop = 0;
		el.scrollHeight = 200;
		el.clientHeight = 100;
		const result = scrollableCanConsumeWheel(el as unknown as HTMLElement, 0, -10);
		expect(result).toBe(false);
	});

	it('should allow scrolling right when space available', () => {
		expect.assertions(1);
		const el = new MockHTMLElement();
		el.scrollLeft = 0;
		el.scrollWidth = 200;
		el.clientWidth = 100;
		// Horizontal scroll takes priority when deltaX > deltaY
		const result = scrollableCanConsumeWheel(el as unknown as HTMLElement, 10, 0);
		expect(result).toBe(true);
	});

	it('should allow scrolling left when not at start', () => {
		expect.assertions(1);
		const el = new MockHTMLElement();
		el.scrollLeft = 50;
		el.scrollWidth = 200;
		el.clientWidth = 100;
		const result = scrollableCanConsumeWheel(el as unknown as HTMLElement, -10, 0);
		expect(result).toBe(true);
	});

	it('should prevent scrolling right at boundary', () => {
		expect.assertions(1);
		const el = new MockHTMLElement();
		el.scrollLeft = 100;
		el.scrollWidth = 200;
		el.clientWidth = 100;
		const result = scrollableCanConsumeWheel(el as unknown as HTMLElement, 10, 0);
		expect(result).toBe(false);
	});

	it('should prefer vertical when deltaY >= deltaX', () => {
		expect.assertions(1);
		const el = new MockHTMLElement();
		el.scrollTop = 50;
		el.scrollHeight = 200;
		el.clientHeight = 100;
		el.scrollLeft = 0;
		el.scrollWidth = 200;
		el.clientWidth = 100;
		// deltaY=10 >= deltaX=10, so uses vertical check
		const result = scrollableCanConsumeWheel(el as unknown as HTMLElement, 10, 10);
		expect(result).toBe(true);
	});
});

describe('ScrollBoundaryGuard', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should not suppress when no scroll recorded', () => {
		expect.assertions(1);
		const guard = new ScrollBoundaryGuard(400);
		expect(guard.shouldSuppressCanvasWheel()).toBe(false);
	});

	it('should suppress immediately after recording scroll', () => {
		expect.assertions(1);
		// Advance past 0 so performance.now() > 0 (guard treats 0 as "never recorded")
		vi.advanceTimersByTime(1);
		const guard = new ScrollBoundaryGuard(400);
		guard.recordScrollInside();
		expect(guard.shouldSuppressCanvasWheel()).toBe(true);
	});

	it('should suppress during cooldown period', () => {
		expect.assertions(1);
		vi.advanceTimersByTime(1);
		const guard = new ScrollBoundaryGuard(400);
		guard.recordScrollInside();
		vi.advanceTimersByTime(200);
		expect(guard.shouldSuppressCanvasWheel()).toBe(true);
	});

	it('should stop suppressing after cooldown expires', () => {
		expect.assertions(1);
		const guard = new ScrollBoundaryGuard(400);
		guard.recordScrollInside();
		vi.advanceTimersByTime(500);
		expect(guard.shouldSuppressCanvasWheel()).toBe(false);
	});

	it('should reset cooldown on new scroll', () => {
		expect.assertions(1);
		vi.advanceTimersByTime(1);
		const guard = new ScrollBoundaryGuard(400);
		guard.recordScrollInside();
		vi.advanceTimersByTime(300);
		guard.recordScrollInside(); // Reset cooldown
		vi.advanceTimersByTime(300);
		// Only 300ms since last record, still within 400ms cooldown
		expect(guard.shouldSuppressCanvasWheel()).toBe(true);
	});

	it('should use default cooldown of 400ms', () => {
		expect.assertions(2);
		vi.advanceTimersByTime(1);
		const guard = new ScrollBoundaryGuard();
		guard.recordScrollInside();
		vi.advanceTimersByTime(399);
		expect(guard.shouldSuppressCanvasWheel()).toBe(true);
		vi.advanceTimersByTime(2);
		expect(guard.shouldSuppressCanvasWheel()).toBe(false);
	});

	it('should clear internal timer after expiry', () => {
		expect.assertions(2);
		vi.advanceTimersByTime(1);
		const guard = new ScrollBoundaryGuard(100);
		guard.recordScrollInside();
		vi.advanceTimersByTime(150);
		// First call after expiry returns false and resets
		expect(guard.shouldSuppressCanvasWheel()).toBe(false);
		// Subsequent call also returns false
		expect(guard.shouldSuppressCanvasWheel()).toBe(false);
	});
});
