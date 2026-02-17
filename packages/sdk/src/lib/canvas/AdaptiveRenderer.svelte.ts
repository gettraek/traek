/**
 * Adaptive rendering utility for zoom-based detail levels.
 * Determines how much detail to show for nodes based on viewport scale.
 */

export type DetailLevel = 'full' | 'compact' | 'minimal' | 'dot';

/**
 * Calculate the appropriate detail level based on viewport scale.
 *
 * @param scale - Current viewport scale (zoom level)
 * @returns DetailLevel - 'full' (>0.8), 'compact' (0.4-0.8), 'minimal' (0.2-0.4), or 'dot' (<0.2)
 *
 * @example
 * getDetailLevel(1.0) // 'full' - normal zoom, show all details
 * getDetailLevel(0.5) // 'compact' - medium zoom, show first line only
 * getDetailLevel(0.3) // 'minimal' - far zoom, show colored block with role
 * getDetailLevel(0.1) // 'dot' - very far zoom, show tiny colored dot
 */
export function getDetailLevel(scale: number): DetailLevel {
	if (scale > 0.8) return 'full';
	if (scale > 0.4) return 'compact';
	if (scale > 0.2) return 'minimal';
	return 'dot';
}
