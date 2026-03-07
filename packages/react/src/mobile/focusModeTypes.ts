export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

export interface FocusModeConfig {
	/** Minimum swipe distance in px to trigger navigation */
	swipeThreshold: number;
	/** Minimum velocity in px/ms to trigger navigation */
	velocityThreshold: number;
	/** Transition duration in ms */
	transitionDuration: number;
	/** Overscroll distance in px before triggering navigation from scroll boundary */
	overscrollThreshold: number;
	/** Cooldown in ms after content scroll before allowing swipe navigation */
	scrollCooldownMs: number;
	/** Show breadcrumb navigation */
	showBreadcrumb: boolean;
}

export const DEFAULT_FOCUS_MODE_CONFIG: FocusModeConfig = {
	swipeThreshold: 80,
	velocityThreshold: 0.3,
	transitionDuration: 180,
	overscrollThreshold: 60,
	scrollCooldownMs: 300,
	showBreadcrumb: false
};

export interface SwipeState {
	isGestureActive: boolean;
	dragDeltaX: number;
	dragDeltaY: number;
	overscrollY: number;
	overscrollX: number;
}

export interface SwipeResult {
	direction: SwipeDirection | null;
	velocityTriggered: boolean;
}

export interface NavigationTarget {
	nodeId: string;
	direction: SwipeDirection;
}
