/**
 * Hint animation logic for SwipeAffordances
 */

export const HINT_DELAY_MS = 2000; // Show hint after 2s of inactivity
export const HINT_DURATION_MS = 3000; // Hide hint after 3s

export interface HintState {
	showHint: boolean;
	hintTimer: ReturnType<typeof setTimeout> | null;
	hideTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * Create initial hint state
 */
export function createHintState(): HintState {
	return {
		showHint: false,
		hintTimer: null,
		hideTimer: null
	};
}

/**
 * Start hint timer - shows hint after delay
 */
export function startHintTimer(
	state: HintState,
	onShow: () => void,
	onHide: () => void
): HintState {
	// Clear existing timers
	if (state.hintTimer) clearTimeout(state.hintTimer);
	if (state.hideTimer) clearTimeout(state.hideTimer);

	const hintTimer = setTimeout(() => {
		onShow();

		// Auto-hide after duration
		const hideTimer = setTimeout(() => {
			onHide();
		}, HINT_DURATION_MS);

		state.hideTimer = hideTimer;
	}, HINT_DELAY_MS);

	return {
		...state,
		hintTimer,
		showHint: false
	};
}

/**
 * Cancel hint timers
 */
export function cancelHintTimers(state: HintState): HintState {
	if (state.hintTimer) clearTimeout(state.hintTimer);
	if (state.hideTimer) clearTimeout(state.hideTimer);

	return {
		...state,
		hintTimer: null,
		hideTimer: null,
		showHint: false
	};
}

/**
 * Determine which affordances should be visible
 */
export interface AffordanceVisibility {
	canSwipeUp: boolean;
	canSwipeDown: boolean;
	canSwipeLeft: boolean;
	canSwipeRight: boolean;
}

/**
 * Calculate affordance visibility based on navigation state
 */
export function calculateAffordanceVisibility(params: {
	hasChildren: boolean;
	hasParent: boolean;
	hasPrevSibling: boolean;
	hasNextSibling: boolean;
}): AffordanceVisibility {
	return {
		canSwipeUp: params.hasChildren,
		canSwipeDown: params.hasParent,
		canSwipeLeft: params.hasPrevSibling,
		canSwipeRight: params.hasNextSibling
	};
}
