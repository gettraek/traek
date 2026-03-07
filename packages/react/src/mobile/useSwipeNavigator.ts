import { useCallback, useEffect, useRef, useState } from 'react';
import type { FocusModeConfig, SwipeResult, SwipeState } from './focusModeTypes.js';
import { DEFAULT_FOCUS_MODE_CONFIG } from './focusModeTypes.js';
import { findScrollable } from './scrollUtils.js';

interface TouchRecord {
	startX: number;
	startY: number;
	startTime: number;
	currentX: number;
	currentY: number;
	axisLock: 'horizontal' | 'vertical' | null;
	scrollableEl: HTMLElement | null;
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

const INITIAL_STATE: SwipeState = {
	isGestureActive: false,
	dragDeltaX: 0,
	dragDeltaY: 0,
	overscrollY: 0,
	overscrollX: 0
};

/**
 * React hook for touch-based swipe navigation.
 *
 * Returns swipe state and a ref-based bind function to attach to a DOM element.
 *
 * @example
 * ```tsx
 * function FocusMode({ onSwipe }) {
 *   const { swipeState, bindRef } = useSwipeNavigator({ onSwipe })
 *   return <div ref={bindRef} style={{ transform: `translateX(${swipeState.dragDeltaX}px)` }} />
 * }
 * ```
 */
export function useSwipeNavigator(opts: {
	config?: Partial<FocusModeConfig>;
	onSwipe?: (result: SwipeResult) => void;
}): { swipeState: SwipeState; bindRef: (el: HTMLElement | null) => void } {
	const config: FocusModeConfig = { ...DEFAULT_FOCUS_MODE_CONFIG, ...opts.config };
	const onSwipeRef = useRef(opts.onSwipe);
	onSwipeRef.current = opts.onSwipe;

	const [swipeState, setSwipeState] = useState<SwipeState>(INITIAL_STATE);

	const touch = useRef<TouchRecord | null>(null);
	const lastScrollTime = useRef(0);
	const configRef = useRef(config);
	configRef.current = config;

	const reset = useCallback(() => {
		touch.current = null;
		setSwipeState(INITIAL_STATE);
	}, []);

	const handleTouchStart = useCallback((e: TouchEvent) => {
		if (e.touches.length !== 1) return;
		const t = e.touches[0];
		if (!t) return;

		const scrollableEl = findScrollable(e.target as Element);
		const scrollBoundary = scrollableEl ? getScrollBoundary(scrollableEl) : null;

		touch.current = {
			startX: t.clientX,
			startY: t.clientY,
			startTime: performance.now(),
			currentX: t.clientX,
			currentY: t.clientY,
			axisLock: null,
			scrollableEl,
			scrollBoundary
		};

		setSwipeState({
			isGestureActive: true,
			dragDeltaX: 0,
			dragDeltaY: 0,
			overscrollX: 0,
			overscrollY: 0
		});
	}, []);

	const handleTouchMove = useCallback((e: TouchEvent) => {
		if (!touch.current || e.touches.length !== 1) return;
		const t = e.touches[0];
		if (!t) return;

		touch.current.currentX = t.clientX;
		touch.current.currentY = t.clientY;

		const dx = t.clientX - touch.current.startX;
		const dy = t.clientY - touch.current.startY;
		const absDx = Math.abs(dx);
		const absDy = Math.abs(dy);

		if (!touch.current.axisLock && (absDx > AXIS_LOCK_THRESHOLD || absDy > AXIS_LOCK_THRESHOLD)) {
			if (absDx > absDy * AXIS_LOCK_RATIO) {
				touch.current.axisLock = 'horizontal';
			} else if (absDy > absDx * AXIS_LOCK_RATIO) {
				touch.current.axisLock = 'vertical';
			} else {
				touch.current.axisLock = absDx >= absDy ? 'horizontal' : 'vertical';
			}
		}

		if (!touch.current.axisLock) return;

		if (touch.current.axisLock === 'horizontal') {
			if (e.cancelable) e.preventDefault();
			setSwipeState((prev) => ({ ...prev, dragDeltaX: dx, dragDeltaY: 0 }));
			return;
		}

		if (touch.current.scrollableEl) {
			const currentBoundary = getScrollBoundary(touch.current.scrollableEl);
			const swipingUp = dy < 0;
			const swipingDown = dy > 0;
			const canOverscroll =
				(swipingUp && (currentBoundary === 'bottom' || currentBoundary === 'both')) ||
				(swipingDown && (currentBoundary === 'top' || currentBoundary === 'both'));

			if (canOverscroll) {
				if (e.cancelable) e.preventDefault();
				setSwipeState((prev) => ({ ...prev, overscrollY: dy, dragDeltaX: 0, dragDeltaY: dy }));
			} else {
				const scrollPosBefore = touch.current.scrollableEl.scrollTop;
				requestAnimationFrame(() => {
					if (
						touch.current?.scrollableEl &&
						touch.current.scrollableEl.scrollTop !== scrollPosBefore
					) {
						lastScrollTime.current = performance.now();
					}
				});
			}
		} else {
			if (e.cancelable) e.preventDefault();
			setSwipeState((prev) => ({ ...prev, dragDeltaX: 0, dragDeltaY: dy }));
		}
	}, []);

	const handleTouchEnd = useCallback(
		(_e: TouchEvent) => {
			if (!touch.current) {
				reset();
				return;
			}

			const cfg = configRef.current;
			const dx = touch.current.currentX - touch.current.startX;
			const dy = touch.current.currentY - touch.current.startY;
			const elapsed = performance.now() - touch.current.startTime;
			const velocityX = elapsed > 0 ? Math.abs(dx) / elapsed : 0;
			const velocityY = elapsed > 0 ? Math.abs(dy) / elapsed : 0;

			const timeSinceScroll = performance.now() - lastScrollTime.current;
			if (lastScrollTime.current > 0 && timeSinceScroll < cfg.scrollCooldownMs) {
				reset();
				return;
			}

			let direction: SwipeResult['direction'] = null;
			let velocityTriggered = false;

			const axis = touch.current.axisLock;
			// Read overscrollY from current state snapshot — use ref to avoid closure issue
			const overscrollY = touch.current.currentY - touch.current.startY;
			const isOverscroll = Math.abs(overscrollY) > 0 && touch.current.scrollableEl !== null;
			const threshold = isOverscroll ? cfg.overscrollThreshold : cfg.swipeThreshold;

			if (axis === 'horizontal') {
				const distanceMet = Math.abs(dx) >= threshold;
				const velocityMet = velocityX >= cfg.velocityThreshold;
				if (distanceMet || velocityMet) {
					direction = dx < 0 ? 'left' : 'right';
					velocityTriggered = !distanceMet && velocityMet;
				}
			} else if (axis === 'vertical') {
				const checkDist = isOverscroll ? Math.abs(overscrollY) : Math.abs(dy);
				const distanceMet = checkDist >= threshold;
				const velocityMet = velocityY >= cfg.velocityThreshold;
				if (distanceMet || velocityMet) {
					direction = dy < 0 ? 'up' : 'down';
					velocityTriggered = !distanceMet && velocityMet;
				}
			}

			onSwipeRef.current?.({ direction, velocityTriggered });
			reset();
		},
		[reset]
	);

	const handleTouchCancel = useCallback(() => reset(), [reset]);

	// Bind touch handlers to a DOM element
	const cleanupRef = useRef<(() => void) | null>(null);

	const bindRef = useCallback(
		(el: HTMLElement | null) => {
			if (cleanupRef.current) {
				cleanupRef.current();
				cleanupRef.current = null;
			}

			if (!el) return;

			el.addEventListener('touchstart', handleTouchStart, { passive: true });
			el.addEventListener('touchmove', handleTouchMove, { passive: false });
			el.addEventListener('touchend', handleTouchEnd, { passive: true });
			el.addEventListener('touchcancel', handleTouchCancel, { passive: true });

			cleanupRef.current = () => {
				el.removeEventListener('touchstart', handleTouchStart);
				el.removeEventListener('touchmove', handleTouchMove);
				el.removeEventListener('touchend', handleTouchEnd);
				el.removeEventListener('touchcancel', handleTouchCancel);
			};
		},
		[handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]
	);

	// Clean up on unmount
	useEffect(() => {
		return () => {
			cleanupRef.current?.();
		};
	}, []);

	return { swipeState, bindRef };
}
