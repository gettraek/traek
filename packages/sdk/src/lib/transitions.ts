import { cubicOut, cubicInOut } from 'svelte/easing';
import type { EasingFunction, TransitionConfig } from 'svelte/transition';

export interface FadedSlideParams {
	delay?: number;
	duration?: number;
	easing?: EasingFunction;
	axis?: 'x' | 'y';
	opacity?: number;
}

export interface DetailLevelTransitionParams {
	delay?: number;
	duration?: number;
	easing?: EasingFunction;
}

/**
 * Slides an element in and out while making it fade in and out as well.
 * @returns {TransitionConfig}
 */
export function fadedSlide(
	node: Element,
	{ delay = 0, opacity = 0, duration = 400, easing = cubicOut, axis = 'y' }: FadedSlideParams = {}
): TransitionConfig {
	const style = getComputedStyle(node) as unknown as Record<string, string>;

	const target_opacity = parseFloat(style.opacity || '1');
	const primary_property = axis === 'y' ? 'height' : 'width';
	const primary_property_value = parseFloat(style[primary_property] || '0');
	const secondary_properties =
		axis === 'y' ? (['top', 'bottom'] as const) : (['left', 'right'] as const);
	const capitalized_secondary_properties = secondary_properties.map(
		(e) => (e.charAt(0).toUpperCase() + e.slice(1)) as 'Top' | 'Bottom' | 'Left' | 'Right'
	);
	const padding_start_value = parseFloat(
		style[`padding${capitalized_secondary_properties[0]}`] || '0'
	);
	const padding_end_value = parseFloat(
		style[`padding${capitalized_secondary_properties[1]}`] || '0'
	);
	const margin_start_value = parseFloat(
		style[`margin${capitalized_secondary_properties[0]}`] || '0'
	);
	const margin_end_value = parseFloat(style[`margin${capitalized_secondary_properties[1]}`] || '0');
	const border_width_start_value = parseFloat(
		style[`border${capitalized_secondary_properties[0]}Width`] || '0'
	);
	const od = target_opacity * (1 - opacity);
	const border_width_end_value = parseFloat(
		style[`border${capitalized_secondary_properties[1]}Width`] || '0'
	);
	return {
		delay,
		duration,
		easing,
		css: (t, u) =>
			'overflow: hidden;' +
			`opacity: ${target_opacity - od * u};` +
			`${primary_property}: ${t * primary_property_value}px;` +
			`padding-${secondary_properties[0]}: ${t * padding_start_value}px;` +
			`padding-${secondary_properties[1]}: ${t * padding_end_value}px;` +
			`margin-${secondary_properties[0]}: ${t * margin_start_value}px;` +
			`margin-${secondary_properties[1]}: ${t * margin_end_value}px;` +
			`border-${secondary_properties[0]}-width: ${t * border_width_start_value}px;` +
			`border-${secondary_properties[1]}-width: ${t * border_width_end_value}px;` +
			`min-${primary_property}: 0`
	};
}

/**
 * Check if user prefers reduced motion
 */
function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Transition for detail level changes: fade + slight scale
 * Respects prefers-reduced-motion by using instant or very short duration
 */
export function detailLevelTransition(
	node: Element,
	{ delay = 0, duration = 250, easing = cubicInOut }: DetailLevelTransitionParams = {}
): TransitionConfig {
	const reducedMotion = prefersReducedMotion();
	const actualDuration = reducedMotion ? 50 : duration;

	return {
		delay,
		duration: actualDuration,
		easing,
		css: (t) => {
			const opacity = t;
			const scale = reducedMotion ? 1 : 0.98 + 0.02 * t;
			return `
				opacity: ${opacity};
				transform: scale(${scale});
			`;
		}
	};
}
