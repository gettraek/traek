/**
 * Keyboard navigation logic for FocusMode
 */

export type NavigationDirection = 'up' | 'down' | 'left' | 'right' | 'home' | 'input' | null;

/**
 * Map keyboard key to navigation direction
 */
export function keyToDirection(key: string): NavigationDirection {
	switch (key) {
		case 'ArrowUp':
			return 'up';
		case 'ArrowDown':
			return 'down';
		case 'ArrowLeft':
			return 'left';
		case 'ArrowRight':
			return 'right';
		case 'Home':
			return 'home';
		case 'i':
			return 'input';
		default:
			return null;
	}
}

/**
 * Check if a key should trigger navigation
 */
export function isNavigationKey(key: string): boolean {
	return keyToDirection(key) !== null;
}

/**
 * Check if default behavior should be prevented for this key
 */
export function shouldPreventDefault(key: string): boolean {
	const navigationKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home'];
	return navigationKeys.includes(key);
}

/**
 * Determine if input handling should be used (vs content navigation)
 */
export function shouldUseInputHandling(focusedElement: 'content' | 'input', key: string): boolean {
	// Input has its own keyboard logic (Enter, Escape)
	if (focusedElement === 'input') {
		return key === 'Enter' || key === 'Escape';
	}
	return false;
}

/**
 * Check if message should be sent (Enter without Shift in input)
 */
export function shouldSendMessage(key: string, shiftKey: boolean): boolean {
	return key === 'Enter' && !shiftKey;
}

/**
 * Check if input should be blurred (Escape in input)
 */
export function shouldBlurInput(key: string): boolean {
	return key === 'Escape';
}
