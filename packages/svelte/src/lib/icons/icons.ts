/**
 * Traek custom icon set — SVG icons on a 24×24 grid.
 *
 * Visual language:
 *   - Grid:        24×24 px (node icons), 16×16 px equivalents scaled via `size` prop
 *   - Stroke:      2 px (default), round linecap & linejoin
 *   - Corner radius: 3 px for containers, 2 px for small shapes
 *   - Optical size: 2 px safe-zone on all sides (live area 20×20)
 *   - Style:       Outline/stroke with selective fill for dots & indicators
 *   - Color:       currentColor throughout (no hard-coded fills)
 *
 * All stroke icons use strokeLinecap="round", strokeLinejoin="round", strokeWidth=2.
 * Filled elements (dots, indicators) use fill="currentColor" with no stroke.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single SVG element within an icon. */
export type IconElement =
	| { type: 'path'; d: string; fill?: string; stroke?: string }
	| {
			type: 'circle';
			cx: number;
			cy: number;
			r: number;
			fill?: string;
			stroke?: string;
	  }
	| {
			type: 'rect';
			x: number;
			y: number;
			width: number;
			height: number;
			rx?: number;
			fill?: string;
			stroke?: string;
	  };

export type IconName =
	// Node types
	| 'node-text'
	| 'node-code'
	| 'node-thought'
	| 'node-image'
	// Canvas actions
	| 'branch'
	| 'collapse'
	| 'expand'
	| 'zoom-in'
	| 'zoom-out'
	| 'pan'
	| 'fit'
	| 'snap-grid'
	| 'focus-mode'
	// Status
	| 'streaming'
	| 'done'
	| 'error'
	| 'warning'
	| 'spinner'
	// Toolbar / utility
	| 'send'
	| 'search'
	| 'bookmark'
	| 'tag'
	| 'copy'
	| 'delete'
	| 'settings'
	| 'pin'
	| 'link'
	| 'edit'
	| 'retry'
	| 'filter'
	| 'compare'
	| 'undo'
	| 'redo'
	// Primitives / chevrons
	| 'close'
	| 'check'
	| 'chevron-down'
	| 'chevron-up'
	| 'chevron-right'
	| 'chevron-left'
	| 'node';

export interface IconDef {
	/** Structured SVG elements to render */
	elements: IconElement[];
	/** viewBox — defaults to "0 0 24 24" */
	viewBox?: string;
}

// Shorthand helpers so definitions stay readable
const path = (d: string, fill?: string, stroke?: string): IconElement => ({
	type: 'path',
	d,
	fill,
	stroke
});
const circle = (
	cx: number,
	cy: number,
	r: number,
	fill?: string,
	stroke?: string
): IconElement => ({
	type: 'circle',
	cx,
	cy,
	r,
	fill,
	stroke
});
const rect = (
	x: number,
	y: number,
	width: number,
	height: number,
	rx?: number,
	fill?: string,
	stroke?: string
): IconElement => ({ type: 'rect', x, y, width, height, rx, fill, stroke });

// ---------------------------------------------------------------------------
// Icon definitions
// ---------------------------------------------------------------------------

export const ICONS: Record<IconName, IconDef> = {
	// -------------------------------------------------------------------------
	// Node type icons (document container + semantic interior)
	// -------------------------------------------------------------------------

	/** Text node: document outline with three horizontal text lines */
	'node-text': {
		elements: [
			rect(3, 3, 18, 18, 3, 'none', 'currentColor'),
			path('M7 9H17'),
			path('M7 12H17'),
			path('M7 15H13')
		]
	},

	/** Code node: document outline with </ > brackets and slash */
	'node-code': {
		elements: [
			rect(3, 3, 18, 18, 3, 'none', 'currentColor'),
			path('M9 10L7 12L9 14'),
			path('M15 10L17 12L15 14'),
			path('M13.5 8.5L10.5 15.5')
		]
	},

	/** Thought node: document outline with thought-bubble interior (circle + dots) */
	'node-thought': {
		elements: [
			rect(3, 3, 18, 18, 3, 'none', 'currentColor'),
			circle(12.5, 10.5, 3.5, 'none', 'currentColor'),
			circle(9, 15, 1, 'currentColor', 'none'),
			circle(12.5, 16, 1, 'currentColor', 'none'),
			circle(16, 15, 1, 'currentColor', 'none')
		]
	},

	/** Image node: document outline with mountain silhouette and sun */
	'node-image': {
		elements: [
			rect(3, 3, 18, 18, 3, 'none', 'currentColor'),
			circle(16, 8, 2, 'none', 'currentColor'),
			path('M3 16L8 10L12 14L15 11L21 17')
		]
	},

	// -------------------------------------------------------------------------
	// Canvas action icons
	// -------------------------------------------------------------------------

	/** Branch: Y-fork with filled node circles at each tip */
	branch: {
		elements: [
			path('M12 20V12M12 12L7 6M12 12L17 6'),
			circle(12, 20.5, 2, 'currentColor', 'none'),
			circle(7, 5.5, 2, 'currentColor', 'none'),
			circle(17, 5.5, 2, 'currentColor', 'none')
		]
	},

	/** Collapse: chevron pointing up (fold node up) */
	collapse: {
		elements: [path('M6 15L12 9L18 15')]
	},

	/** Expand: chevron pointing down (unfold node down) */
	expand: {
		elements: [path('M6 9L12 15L18 9')]
	},

	/** Zoom in: magnifying glass with plus */
	'zoom-in': {
		elements: [
			circle(10, 10, 6, 'none', 'currentColor'),
			path('M10 7V13M7 10H13'),
			path('M14.5 14.5L20 20')
		]
	},

	/** Zoom out: magnifying glass with minus */
	'zoom-out': {
		elements: [
			circle(10, 10, 6, 'none', 'currentColor'),
			path('M7 10H13'),
			path('M14.5 14.5L20 20')
		]
	},

	/**
	 * Pan: four-directional arrow for canvas pan mode.
	 * Cross lines with outward arrow heads.
	 */
	pan: {
		elements: [
			path('M12 5V19M5 12H19'),
			path('M9.5 7.5L12 5L14.5 7.5'),
			path('M9.5 16.5L12 19L14.5 16.5'),
			path('M7.5 9.5L5 12L7.5 14.5'),
			path('M16.5 9.5L19 12L16.5 14.5')
		]
	},

	/** Fit: frame corners showing "fit all nodes in view" */
	fit: {
		elements: [
			path('M8 3H5C3.9 3 3 3.9 3 5V8'),
			path('M21 8V5C21 3.9 20.1 3 19 3H16'),
			path('M3 16V19C3 20.1 3.9 21 5 21H8'),
			path('M16 21H19C20.1 21 21 20.1 21 19V16')
		]
	},

	/** Snap to grid: 3×3 dot grid with center gap */
	'snap-grid': {
		elements: [
			rect(2, 2, 5, 5, 0.5, 'none', 'currentColor'),
			rect(9.5, 2, 5, 5, 0.5, 'none', 'currentColor'),
			rect(17, 2, 5, 5, 0.5, 'none', 'currentColor'),
			rect(2, 9.5, 5, 5, 0.5, 'none', 'currentColor'),
			rect(17, 9.5, 5, 5, 0.5, 'none', 'currentColor'),
			rect(2, 17, 5, 5, 0.5, 'none', 'currentColor'),
			rect(9.5, 17, 5, 5, 0.5, 'none', 'currentColor'),
			rect(17, 17, 5, 5, 0.5, 'none', 'currentColor')
		]
	},

	/** Focus mode: crosshair / target with center dot */
	'focus-mode': {
		elements: [
			circle(12, 12, 6, 'none', 'currentColor'),
			circle(12, 12, 1.5, 'currentColor', 'none'),
			path('M12 2V5.5M12 18.5V22'),
			path('M2 12H5.5M18.5 12H22')
		]
	},

	// -------------------------------------------------------------------------
	// Status indicators
	// -------------------------------------------------------------------------

	/** Streaming: three dots indicating active AI generation */
	streaming: {
		elements: [
			circle(5, 12, 2, 'currentColor', 'none'),
			circle(12, 12, 2, 'currentColor', 'none'),
			circle(19, 12, 2, 'currentColor', 'none')
		]
	},

	/** Done: checkmark inside a circle */
	done: {
		elements: [circle(12, 12, 9, 'none', 'currentColor'), path('M7.5 12L10.5 15L16.5 9')]
	},

	/** Error: X inside a circle */
	error: {
		elements: [
			circle(12, 12, 9, 'none', 'currentColor'),
			path('M8.5 8.5L15.5 15.5M15.5 8.5L8.5 15.5')
		]
	},

	/** Warning: triangle with exclamation */
	warning: {
		elements: [
			path(
				'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'
			),
			path('M12 9V13'),
			path('M12 17H12.01')
		]
	},

	/** Spinner: single open arc (animate rotation via CSS) */
	spinner: {
		elements: [path('M12 2A10 10 0 0 1 22 12')]
	},

	// -------------------------------------------------------------------------
	// Toolbar / utility icons
	// -------------------------------------------------------------------------

	/** Send: paper-plane / diagonal arrow */
	send: {
		elements: [path('M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z')]
	},

	/** Search: magnifying glass */
	search: {
		elements: [circle(10, 10, 7, 'none', 'currentColor'), path('M15 15L21 21')]
	},

	/** Bookmark: flag / ribbon */
	bookmark: {
		elements: [path('M5 3H19C19.6 3 20 3.4 20 4V21L12 17L4 21V4C4 3.4 4.4 3 5 3Z')]
	},

	/** Tag: price-tag shape with hole dot */
	tag: {
		elements: [
			path(
				'M3 3H11C11.5 3 12 3.2 12.4 3.6L20.4 11.6C21.2 12.4 21.2 13.6 20.4 14.4L14.4 20.4C13.6 21.2 12.4 21.2 11.6 20.4L3.6 12.4C3.2 12 3 11.5 3 11V3Z'
			),
			circle(8, 8, 1.5, 'currentColor', 'none')
		]
	},

	/** Copy: two overlapping rectangles */
	copy: {
		elements: [
			rect(8, 8, 13, 13, 2, 'none', 'currentColor'),
			path('M8 8V5C8 3.9 8.9 3 10 3H19C20.1 3 21 3.9 21 5V14C21 15.1 20.1 16 19 16H16')
		]
	},

	/** Delete: trash can with lid and interior lines */
	delete: {
		elements: [
			path('M3 6H21'),
			path('M8 6V4H16V6'),
			path('M19 6L18 20H6L5 6'),
			path('M10 11V17M14 11V17')
		]
	},

	/** Settings: two horizontal sliders */
	settings: {
		elements: [
			path('M3 8H21'),
			circle(8, 8, 2.5, 'none', 'currentColor'),
			path('M3 16H21'),
			circle(16, 16, 2.5, 'none', 'currentColor')
		]
	},

	/** Pin: thumbtack — pin a node to the canvas */
	pin: {
		elements: [
			path('M12 21V13'),
			path('M8 13Q6.5 10 8 7Q9.5 5 12 5Q14.5 5 16 7Q17.5 10 16 13Z'),
			path('M8 13H16')
		]
	},

	/** Link: chain link — connection between nodes */
	link: {
		elements: [
			path('M9 14H7A5 5 0 0 1 7 4H9'),
			path('M15 10H17A5 5 0 0 1 17 20H15'),
			path('M9 12H15')
		]
	},

	/** Edit: pencil */
	edit: {
		elements: [
			path('M11 4H4A2 2 0 0 0 2 6V20A2 2 0 0 0 4 22H18A2 2 0 0 0 20 20V13'),
			path('M18.5 2.5A2.121 2.121 0 0 1 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z')
		]
	},

	/** Retry: circular arrow */
	retry: {
		elements: [path('M1 4V10H7'), path('M3.51 15A9 9 0 1 0 3.99 11.7')]
	},

	/** Filter: funnel */
	filter: {
		elements: [path('M22 3H2L10 12.46V19L14 21V12.46L22 3Z')]
	},

	/** Compare: side-by-side columns */
	compare: {
		elements: [
			rect(3, 3, 8, 18, 2, 'none', 'currentColor'),
			rect(13, 3, 8, 18, 2, 'none', 'currentColor')
		]
	},

	/** Undo: counter-clockwise arrow */
	undo: {
		elements: [path('M3 7V13H9'), path('M21 17A9 9 0 0 0 12 8A9 9 0 0 0 5.7 10.3L3 13')]
	},

	/** Redo: clockwise arrow */
	redo: {
		elements: [path('M21 7V13H15'), path('M3 17A9 9 0 0 1 12 8A9 9 0 0 1 18.3 10.3L21 13')]
	},

	// -------------------------------------------------------------------------
	// Primitives / chevrons
	// -------------------------------------------------------------------------

	/** X close / dismiss */
	close: {
		elements: [path('M18 6L6 18M6 6L18 18')]
	},

	/** Checkmark */
	check: {
		elements: [path('M20 6L9 17L4 12')]
	},

	/** Chevron down */
	'chevron-down': {
		elements: [path('M6 9L12 15L18 9')]
	},

	/** Chevron up */
	'chevron-up': {
		elements: [path('M18 15L12 9L6 15')]
	},

	/** Chevron right */
	'chevron-right': {
		elements: [path('M9 18L15 12L9 6')]
	},

	/** Chevron left */
	'chevron-left': {
		elements: [path('M15 18L9 12L15 6')]
	},

	/** Generic node circle */
	node: {
		elements: [circle(12, 12, 5, 'none', 'currentColor')]
	}
};
