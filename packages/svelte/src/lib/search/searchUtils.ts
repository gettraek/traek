import type { Node, MessageNode, NodeColor } from '../TraekEngine.svelte';

export type SearchFilters = {
	roles?: Array<'user' | 'assistant' | 'system'>;
	statuses?: Array<string>;
	tags?: string[]; // filter by tag slugs (OR logic)
	colors?: NodeColor[]; // filter by color
	bookmarked?: boolean; // show only bookmarked nodes
};

/**
 * Search nodes by content (case-insensitive), with optional role/status filters.
 * Returns an array of node IDs that match the query and filters.
 */
export function searchNodes(nodes: Node[], query: string, filters?: SearchFilters): string[] {
	if (!query || query.trim() === '') return [];

	const lowerQuery = query.toLowerCase().trim();
	const matches: string[] = [];
	const roleFilter = filters?.roles && filters.roles.length > 0 ? filters.roles : null;
	const statusFilter = filters?.statuses && filters.statuses.length > 0 ? filters.statuses : null;
	const tagFilter = filters?.tags && filters.tags.length > 0 ? filters.tags : null;
	const colorFilter = filters?.colors && filters.colors.length > 0 ? filters.colors : null;
	const bookmarkedFilter = filters?.bookmarked ?? null;

	for (const node of nodes) {
		if (roleFilter && !roleFilter.includes(node.role as 'user' | 'assistant' | 'system')) {
			continue;
		}
		if (statusFilter && node.status && !statusFilter.includes(node.status)) {
			continue;
		}
		if (tagFilter) {
			const nodeTags = (node.metadata?.tags as string[]) ?? [];
			if (!tagFilter.some((t) => nodeTags.includes(t))) continue;
		}
		if (colorFilter) {
			const nodeColor = node.metadata?.color as NodeColor | undefined;
			if (!nodeColor || !colorFilter.includes(nodeColor)) continue;
		}
		if (bookmarkedFilter !== null && bookmarkedFilter === true) {
			if (!node.metadata?.bookmarked) continue;
		}

		const messageNode = node as MessageNode;
		if (messageNode.content) {
			const lowerContent = messageNode.content.toLowerCase();
			if (lowerContent.includes(lowerQuery)) {
				matches.push(node.id);
			}
		}
	}

	return matches;
}

/**
 * Highlight matches in text by wrapping them in <mark> tags.
 * Returns HTML string with highlighted spans.
 * Uses case-insensitive matching.
 */
export function highlightMatch(text: string, query: string): string {
	if (!query || query.trim() === '') return escapeHtml(text);

	const escapedText = escapeHtml(text);
	const lowerText = text.toLowerCase();
	const lowerQuery = query.toLowerCase().trim();

	if (!lowerText.includes(lowerQuery)) return escapedText;

	// Find all matches and their positions
	const matches: { start: number; end: number }[] = [];
	let pos = 0;

	while (pos < lowerText.length) {
		const idx = lowerText.indexOf(lowerQuery, pos);
		if (idx === -1) break;
		matches.push({ start: idx, end: idx + lowerQuery.length });
		pos = idx + 1;
	}

	if (matches.length === 0) return escapedText;

	// Build result by escaping text and wrapping matches
	let result = '';
	let lastEnd = 0;

	for (const match of matches) {
		// Add text before match (already escaped above, but we need original)
		result += escapeHtml(text.substring(lastEnd, match.start));
		// Add highlighted match
		result += '<mark class="search-highlight">';
		result += escapeHtml(text.substring(match.start, match.end));
		result += '</mark>';
		lastEnd = match.end;
	}

	// Add remaining text
	result += escapeHtml(text.substring(lastEnd));

	return result;
}

/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
