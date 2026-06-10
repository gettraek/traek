/**
 * Half the size of the SVG connection layer in pixels.
 *
 * The connection SVG is positioned at (-SVG_ORIGIN_OFFSET, -SVG_ORIGIN_OFFSET) with a
 * size of 2 * SVG_ORIGIN_OFFSET, and its content group is translated by
 * (+SVG_ORIGIN_OFFSET, +SVG_ORIGIN_OFFSET) so connections at negative canvas
 * coordinates still render inside the SVG canvas.
 */
export const SVG_ORIGIN_OFFSET = 25000;
