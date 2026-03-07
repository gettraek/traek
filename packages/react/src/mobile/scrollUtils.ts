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
