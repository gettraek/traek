import { z } from 'zod';

export const focusModeConfigSchema = z.object({
	/** Minimum swipe distance in px to trigger navigation */
	swipeThreshold: z.number().min(0).default(80),
	/** Minimum velocity in px/ms to trigger navigation */
	velocityThreshold: z.number().min(0).default(0.3),
	/** Transition duration in ms */
	transitionDuration: z.number().min(0).default(180),
	/** Overscroll distance in px before triggering navigation from scroll boundary */
	overscrollThreshold: z.number().min(0).default(60),
	/** Cooldown in ms after content scroll before allowing swipe navigation */
	scrollCooldownMs: z.number().min(0).default(300),
	/** Show breadcrumb navigation (phase 2) */
	showBreadcrumb: z.boolean().default(false)
});

export type FocusModeConfig = z.infer<typeof focusModeConfigSchema>;

export const DEFAULT_FOCUS_MODE_CONFIG: FocusModeConfig = {
	swipeThreshold: 80,
	velocityThreshold: 0.3,
	transitionDuration: 180,
	overscrollThreshold: 60,
	scrollCooldownMs: 300,
	showBreadcrumb: false
};

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

export interface SwipeState {
	/** Whether a gesture is currently being tracked */
	isGestureActive: boolean;
	/** Current horizontal drag offset in px */
	dragDeltaX: number;
	/** Current vertical drag offset in px */
	dragDeltaY: number;
	/** Overscroll amount on Y axis (for boundary indicator) */
	overscrollY: number;
	/** Overscroll amount on X axis (for boundary indicator) */
	overscrollX: number;
}

export interface SwipeResult {
	/** Detected direction, or null if gesture didn't meet thresholds */
	direction: SwipeDirection | null;
	/** Whether this was triggered by velocity (vs distance) */
	velocityTriggered: boolean;
}

export interface NavigationTarget {
	/** Target node ID to navigate to */
	nodeId: string;
	/** Direction the navigation came from (for transition animation) */
	direction: SwipeDirection;
}
