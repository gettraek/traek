export type ConnectionDragState = {
	sourceNodeId: string;
	sourcePortType: 'output' | 'input';
	sourceX: number;
	sourceY: number;
	currentX: number;
	currentY: number;
	hoverTargetNodeId: string | null;
};

export const CONNECTION_CORNER_RADIUS = 12;

/** Bezier factor for a 90° circular arc: 4/3 * (sqrt(2)-1) */
export const QUARTER_BEZIER = (4 * (Math.SQRT2 - 1)) / 3;

/**
 * Rectilinear path with rounded corners using cubic Bezier (no SVG arc).
 * Vertical → horizontal → vertical; corners are quarter-circle Beziers.
 */
export function pathVerticalHorizontalVertical(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	r: number
): string {
	const midY = (y1 + y2) / 2;
	const dx = x2 - x1;
	const minR = Math.min(r, Math.abs(dx) / 2, Math.abs(y2 - y1) / 4);
	if (minR <= 0) return `M ${x1} ${y1} L ${x2} ${y2}`;
	const k = QUARTER_BEZIER;
	const t = minR * (1 - k);
	const goRight = dx >= 0;
	const r1 = goRight ? minR : -minR;
	const r2 = goRight ? -minR : minR;
	const a1x = x1;
	const a1y = midY - minR;
	const c1a = goRight ? `${x1} ${midY - t}` : `${x1} ${midY - t}`;
	const c1b = goRight ? `${x1 + t} ${midY}` : `${x1 - t} ${midY}`;
	const b1x = x1 + r1;
	const b1y = midY;
	const a2x = x2 + r2;
	const a2y = midY;
	const c2a = goRight ? `${x2 - t} ${midY}` : `${x2 + t} ${midY}`;
	const c2b = goRight ? `${x2} ${midY + t}` : `${x2} ${midY + t}`;
	const b2x = x2;
	const b2y = midY + minR;
	return `M ${x1} ${y1} L ${a1x} ${a1y} C ${c1a} ${c1b} ${b1x} ${b1y} L ${a2x} ${a2y} C ${c2a} ${c2b} ${b2x} ${b2y} L ${x2} ${y2}`;
}

/**
 * Build an SVG path through a series of axis-aligned waypoints with rounded
 * corners (quadratic Bezier at each turn).
 */
function pathThroughPoints(points: { x: number; y: number }[], r: number): string {
	if (points.length < 2) return '';
	if (points.length === 2) {
		return `M ${points[0]!.x} ${points[0]!.y} L ${points[1]!.x} ${points[1]!.y}`;
	}

	let d = `M ${points[0]!.x} ${points[0]!.y}`;

	for (let i = 1; i < points.length - 1; i++) {
		const prev = points[i - 1]!;
		const curr = points[i]!;
		const next = points[i + 1]!;

		const dx1 = prev.x - curr.x;
		const dy1 = prev.y - curr.y;
		const len1 = Math.hypot(dx1, dy1);

		const dx2 = next.x - curr.x;
		const dy2 = next.y - curr.y;
		const len2 = Math.hypot(dx2, dy2);

		const minR = Math.min(r, len1 / 2, len2 / 2);
		if (minR <= 0) {
			d += ` L ${curr.x} ${curr.y}`;
			continue;
		}

		const ax = curr.x + (dx1 / len1) * minR;
		const ay = curr.y + (dy1 / len1) * minR;
		const bx = curr.x + (dx2 / len2) * minR;
		const by = curr.y + (dy2 / len2) * minR;

		d += ` L ${ax} ${ay} Q ${curr.x} ${curr.y} ${bx} ${by}`;
	}

	const last = points[points.length - 1]!;
	d += ` L ${last.x} ${last.y}`;

	return d;
}

/**
 * Returns SVG path d for a rectilinear connection from parent bottom-center
 * to child top-center. When the child is below the parent, uses a simple VHV
 * path. When the child is above (upward connection), routes around both nodes
 * to avoid crossing through them.
 */
export function getConnectionPath(
	parentX: number,
	parentY: number,
	parentW: number,
	parentH: number,
	childX: number,
	childY: number,
	childW: number,
	_childH: number
): string {
	const r = CONNECTION_CORNER_RADIUS;
	const x1 = parentX + parentW / 2;
	const y1 = parentY + parentH;
	const x2 = childX + childW / 2;
	const y2 = childY;

	// Normal case: child is below parent — simple VHV
	if (y2 >= y1) {
		return pathVerticalHorizontalVertical(x1, y1, x2, y2, r);
	}

	// Upward case: route around both nodes to avoid crossing through them.
	// Path: down from parent → side → up past child → align with child → down into child
	const escape = 30;
	const sideMargin = 30;

	// Choose side: route through the gap between nodes when they don't
	// overlap horizontally; otherwise go around the closer outer side.
	const parentRight = parentX + parentW;
	const childRight = childX + childW;

	let sideX: number;
	if (childX > parentRight) {
		// Child entirely to the right — route through the gap
		sideX = (parentRight + childX) / 2;
	} else if (childRight < parentX) {
		// Child entirely to the left — route through the gap
		sideX = (childRight + parentX) / 2;
	} else {
		// Horizontal overlap — go around the closer outer side
		const rightSide = Math.max(parentRight, childRight) + sideMargin;
		const leftSide = Math.min(parentX, childX) - sideMargin;
		const avgCenter = (x1 + x2) / 2;
		sideX = rightSide - avgCenter <= avgCenter - leftSide ? rightSide : leftSide;
	}

	return pathThroughPoints(
		[
			{ x: x1, y: y1 },
			{ x: x1, y: y1 + escape },
			{ x: sideX, y: y1 + escape },
			{ x: sideX, y: y2 - escape },
			{ x: x2, y: y2 - escape },
			{ x: x2, y: y2 }
		],
		r
	);
}
