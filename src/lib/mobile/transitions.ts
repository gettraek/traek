import type { SwipeDirection } from './focusModeTypes.js';

export interface TransitionConfig {
	/** Duration in ms */
	duration: number;
	/** CSS timing function */
	easing: string;
}

/** CSS transform values for incoming/outgoing nodes per swipe direction. */
const SLIDE_OFFSETS: Record<SwipeDirection, { enter: string; exit: string }> = {
	up: {
		enter: 'translateY(-100%)',
		exit: 'translateY(100%)'
	},
	down: {
		enter: 'translateY(100%)',
		exit: 'translateY(-100%)'
	},
	left: {
		enter: 'translateX(100%)',
		exit: 'translateX(-100%)'
	},
	right: {
		enter: 'translateX(-100%)',
		exit: 'translateX(100%)'
	}
};

/** Get the CSS transform for entering node (starts off-screen, animates to center). */
export function getEnterTransform(direction: SwipeDirection): string {
	return SLIDE_OFFSETS[direction].enter;
}

/** Get the CSS transform for exiting node (starts at center, animates off-screen). */
export function getExitTransform(direction: SwipeDirection): string {
	return SLIDE_OFFSETS[direction].exit;
}

/** Get transition duration respecting prefers-reduced-motion. */
export function getTransitionDuration(durationMs: number): number {
	if (typeof window === 'undefined') return durationMs;
	const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
	return mq.matches ? 0 : durationMs;
}
