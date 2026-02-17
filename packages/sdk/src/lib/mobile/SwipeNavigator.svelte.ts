import { findScrollable } from '../canvas/scrollUtils';
import type { FocusModeConfig, SwipeDirection, SwipeResult, SwipeState } from './focusModeTypes';
import { DEFAULT_FOCUS_MODE_CONFIG } from './focusModeTypes';

interface TouchRecord {
	startX: number;
	startY: number;
	startTime: number;
	currentX: number;
	currentY: number;
	/** Locked axis after movement exceeds threshold, or null */
	axisLock: 'horizontal' | 'vertical' | null;
	/** Whether touch started inside a scrollable container */
	scrollableEl: HTMLElement | null;
	/** Scroll boundary status at touch start */
	scrollBoundary: 'top' | 'bottom' | 'both' | null;
}

const AXIS_LOCK_THRESHOLD = 10;
const AXIS_LOCK_RATIO = 1.5;

function getScrollBoundary(el: HTMLElement): 'top' | 'bottom' | 'both' | null {
	const atTop = el.scrollTop <= 1;
	const atBottom = el.scrollTop >= el.scrollHeight - el.clientHeight - 1;
	if (atTop && atBottom) return 'both';
	if (atTop) return 'top';
	if (atBottom) return 'bottom';
	return null;
}

export class SwipeNavigator {
	config: FocusModeConfig;

	// Reactive state (Svelte 5 runes)
	overscrollY = $state(0);
	overscrollX = $state(0);
	isGestureActive = $state(false);
	dragDeltaX = $state(0);
	dragDeltaY = $state(0);

	private touch: TouchRecord | null = null;
	private lastScrollTime = 0;
	private onSwipe: ((result: SwipeResult) => void) | null = null;

	constructor(config?: Partial<FocusModeConfig>, onSwipe?: (result: SwipeResult) => void) {
		this.config = { ...DEFAULT_FOCUS_MODE_CONFIG, ...config };
		this.onSwipe = onSwipe ?? null;
	}

	get state(): SwipeState {
		return {
			isGestureActive: this.isGestureActive,
			dragDeltaX: this.dragDeltaX,
			dragDeltaY: this.dragDeltaY,
			overscrollY: this.overscrollY,
			overscrollX: this.overscrollX
		};
	}

	handleTouchStart(e: TouchEvent): void {
		if (e.touches.length !== 1) return;
		const t = e.touches[0];
		if (!t) return;

		const scrollableEl = findScrollable(e.target as Element);
		const scrollBoundary = scrollableEl ? getScrollBoundary(scrollableEl) : null;

		this.touch = {
			startX: t.clientX,
			startY: t.clientY,
			startTime: performance.now(),
			currentX: t.clientX,
			currentY: t.clientY,
			axisLock: null,
			scrollableEl,
			scrollBoundary
		};

		this.isGestureActive = true;
		this.dragDeltaX = 0;
		this.dragDeltaY = 0;
		this.overscrollX = 0;
		this.overscrollY = 0;
	}

	handleTouchMove(e: TouchEvent): void {
		if (!this.touch || e.touches.length !== 1) return;
		const t = e.touches[0];
		if (!t) return;

		this.touch.currentX = t.clientX;
		this.touch.currentY = t.clientY;

		const dx = t.clientX - this.touch.startX;
		const dy = t.clientY - this.touch.startY;
		const absDx = Math.abs(dx);
		const absDy = Math.abs(dy);

		// Axis-lock after threshold
		if (!this.touch.axisLock && (absDx > AXIS_LOCK_THRESHOLD || absDy > AXIS_LOCK_THRESHOLD)) {
			if (absDx > absDy * AXIS_LOCK_RATIO) {
				this.touch.axisLock = 'horizontal';
			} else if (absDy > absDx * AXIS_LOCK_RATIO) {
				this.touch.axisLock = 'vertical';
			} else {
				// Ambiguous — pick dominant
				this.touch.axisLock = absDx >= absDy ? 'horizontal' : 'vertical';
			}
		}

		if (!this.touch.axisLock) return;

		// Horizontal is always navigation
		if (this.touch.axisLock === 'horizontal') {
			if (e.cancelable) e.preventDefault();
			this.dragDeltaX = dx;
			this.dragDeltaY = 0;
			return;
		}

		// Vertical axis
		if (this.touch.scrollableEl) {
			// Check if currently at scroll boundary
			const currentBoundary = getScrollBoundary(this.touch.scrollableEl);
			const swipingUp = dy < 0;
			const swipingDown = dy > 0;
			const canOverscroll =
				(swipingUp && (currentBoundary === 'bottom' || currentBoundary === 'both')) ||
				(swipingDown && (currentBoundary === 'top' || currentBoundary === 'both'));

			if (canOverscroll) {
				// At boundary — show overscroll indicator
				if (e.cancelable) e.preventDefault();
				this.overscrollY = dy;
				this.dragDeltaX = 0;
				this.dragDeltaY = dy;
			} else {
				// Content can scroll — let it through. Record scroll position to detect actual scroll.
				const scrollPosBefore = this.touch.scrollableEl.scrollTop;
				// Check on next frame if scroll actually happened
				requestAnimationFrame(() => {
					if (this.touch?.scrollableEl && this.touch.scrollableEl.scrollTop !== scrollPosBefore) {
						this.lastScrollTime = performance.now();
					}
				});
			}
		} else {
			// No scrollable context — vertical is navigation
			if (e.cancelable) e.preventDefault();
			this.dragDeltaX = 0;
			this.dragDeltaY = dy;
		}
	}

	handleTouchEnd(_e: TouchEvent): void {
		if (!this.touch) {
			this.reset();
			return;
		}

		const dx = this.touch.currentX - this.touch.startX;
		const dy = this.touch.currentY - this.touch.startY;
		const elapsed = performance.now() - this.touch.startTime;
		const velocityX = elapsed > 0 ? Math.abs(dx) / elapsed : 0;
		const velocityY = elapsed > 0 ? Math.abs(dy) / elapsed : 0;

		// Cooldown check after content scroll
		const timeSinceScroll = performance.now() - this.lastScrollTime;
		if (this.lastScrollTime > 0 && timeSinceScroll < this.config.scrollCooldownMs) {
			this.reset();
			return;
		}

		let direction: SwipeDirection | null = null;
		let velocityTriggered = false;

		const axis = this.touch.axisLock;
		const isOverscroll = Math.abs(this.overscrollY) > 0;
		const threshold = isOverscroll ? this.config.overscrollThreshold : this.config.swipeThreshold;

		if (axis === 'horizontal') {
			const distanceMet = Math.abs(dx) >= threshold;
			const velocityMet = velocityX >= this.config.velocityThreshold;
			if (distanceMet || velocityMet) {
				direction = dx < 0 ? 'left' : 'right';
				velocityTriggered = !distanceMet && velocityMet;
			}
		} else if (axis === 'vertical') {
			const checkDist = isOverscroll ? Math.abs(this.overscrollY) : Math.abs(dy);
			const distanceMet = checkDist >= threshold;
			const velocityMet = velocityY >= this.config.velocityThreshold;
			if (distanceMet || velocityMet) {
				direction = dy < 0 ? 'up' : 'down';
				velocityTriggered = !distanceMet && velocityMet;
			}
		}

		const result: SwipeResult = { direction, velocityTriggered };
		this.onSwipe?.(result);
		this.reset();
	}

	handleTouchCancel(): void {
		this.reset();
	}

	private reset(): void {
		this.touch = null;
		this.isGestureActive = false;
		this.dragDeltaX = 0;
		this.dragDeltaY = 0;
		this.overscrollX = 0;
		this.overscrollY = 0;
	}

	/** Bind all touch event handlers to an element. Returns a cleanup function. */
	bind(el: HTMLElement): () => void {
		const onStart = (e: TouchEvent) => this.handleTouchStart(e);
		const onMove = (e: TouchEvent) => this.handleTouchMove(e);
		const onEnd = (e: TouchEvent) => this.handleTouchEnd(e);
		const onCancel = () => this.handleTouchCancel();

		el.addEventListener('touchstart', onStart, { passive: true });
		el.addEventListener('touchmove', onMove, { passive: false });
		el.addEventListener('touchend', onEnd, { passive: true });
		el.addEventListener('touchcancel', onCancel, { passive: true });

		return () => {
			el.removeEventListener('touchstart', onStart);
			el.removeEventListener('touchmove', onMove);
			el.removeEventListener('touchend', onEnd);
			el.removeEventListener('touchcancel', onCancel);
		};
	}
}
