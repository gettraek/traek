/** Find the nearest scrollable ancestor (overflow auto/scroll with scrollable content). */
export function findScrollable(el: Element): HTMLElement | null {
	let current: Element | null = el;
	while (current && current instanceof HTMLElement) {
		const style = getComputedStyle(current);
		const oy = style.overflowY;
		const ox = style.overflowX;
		const overflow = style.overflow;
		const canScrollY =
			(oy === 'auto' || oy === 'scroll' || overflow === 'auto' || overflow === 'scroll') &&
			current.scrollHeight > current.clientHeight;
		const canScrollX =
			(ox === 'auto' || ox === 'scroll' || overflow === 'auto' || overflow === 'scroll') &&
			current.scrollWidth > current.clientWidth;
		if (canScrollY || canScrollX) return current;
		current = current.parentElement;
	}
	return null;
}

/** True if the scrollable element can consume the wheel (has room to scroll in that direction). */
export function scrollableCanConsumeWheel(
	el: HTMLElement,
	deltaX: number,
	deltaY: number
): boolean {
	const canScrollDown = el.scrollTop < el.scrollHeight - el.clientHeight - 1;
	const canScrollUp = el.scrollTop > 1;
	const canScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
	const canScrollLeft = el.scrollLeft > 1;
	if (Math.abs(deltaY) >= Math.abs(deltaX)) {
		return (deltaY > 0 && canScrollDown) || (deltaY < 0 && canScrollUp);
	}
	return (deltaX > 0 && canScrollRight) || (deltaX < 0 && canScrollLeft);
}

/**
 * Guard that prevents canvas pan/zoom from activating immediately
 * after a scrollable container hits its boundary.
 *
 * While the user scrolls inside a container, every wheel event resets
 * an internal cooldown. When the container can no longer scroll (boundary
 * reached), `shouldSuppressCanvasWheel` keeps returning `true` for
 * `cooldownMs` after the last scroll-inside event — giving the user
 * time to lift their fingers before the canvas reacts.
 */
export class ScrollBoundaryGuard {
	private lastScrollInsideTime = 0;
	private cooldownMs: number;

	constructor(cooldownMs = 400) {
		this.cooldownMs = cooldownMs;
	}

	/** Call when a wheel event was consumed by a scrollable container. */
	recordScrollInside(): void {
		this.lastScrollInsideTime = performance.now();
	}

	/** True if the canvas should still suppress pan/zoom (cooldown active). */
	shouldSuppressCanvasWheel(): boolean {
		if (this.lastScrollInsideTime === 0) return false;
		const elapsed = performance.now() - this.lastScrollInsideTime;
		if (elapsed < this.cooldownMs) return true;
		this.lastScrollInsideTime = 0;
		return false;
	}
}
