import { cubicOut } from 'svelte/easing';
import type { TransitionConfig as SvelteTransitionConfig } from 'svelte/transition';
import type { SwipeDirection } from './focusModeTypes';

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

/**
 * Svelte transition: slide a node in from the direction's enter offset.
 * Use as `in:slideIn={{ direction, duration }}`.
 */
export function slideIn(
	_node: Element,
	{ direction, duration = 180 }: { direction: SwipeDirection; duration?: number }
): SvelteTransitionConfig {
	const from = SLIDE_OFFSETS[direction].enter;
	const dur = getTransitionDuration(duration);
	return {
		duration: dur,
		easing: cubicOut,
		css: (t) => `transform: ${interpolateTransform(from, t)}`
	};
}

/**
 * Svelte transition: slide a node out to the direction's exit offset.
 * Use as `out:slideOut={{ direction, duration }}`.
 */
export function slideOut(
	_node: Element,
	{ direction, duration = 180 }: { direction: SwipeDirection; duration?: number }
): SvelteTransitionConfig {
	const to = SLIDE_OFFSETS[direction].exit;
	const dur = getTransitionDuration(duration);
	return {
		duration: dur,
		easing: cubicOut,
		css: (t) => `transform: ${interpolateTransform(to, 1 - t)}`
	};
}

/** Interpolate between identity (0%) and a translate transform (100%). */
function interpolateTransform(target: string, progress: number): string {
	// progress: 0 = at target offset, 1 = at center (identity)
	const match = target.match(/(translateX|translateY)\((-?\d+)%\)/);
	if (!match) return `translate(0, 0)`;
	const fn = match[1];
	const value = parseInt(match[2], 10);
	const current = value * (1 - progress);
	return `${fn}(${current}%)`;
}
