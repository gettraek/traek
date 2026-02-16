/**
 * Haptic feedback utilities for mobile focus mode
 * Respects prefers-reduced-motion
 */

function shouldVibrate(): boolean {
	if (typeof window === 'undefined') return false;
	if (!('vibrate' in window.navigator)) return false;

	// Respect prefers-reduced-motion
	const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (prefersReducedMotion) return false;

	return true;
}

/**
 * Short, subtle tap for successful navigation
 */
export function hapticTap(duration = 10) {
	if (shouldVibrate()) {
		window.navigator.vibrate(duration);
	}
}

/**
 * Double short tap for boundary swipe (no target available)
 */
export function hapticBoundary() {
	if (shouldVibrate()) {
		window.navigator.vibrate([5, 50, 5]);
	}
}

/**
 * Slightly stronger tap for opening child selector
 */
export function hapticSelect(duration = 15) {
	if (shouldVibrate()) {
		window.navigator.vibrate(duration);
	}
}
