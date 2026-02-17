import type { Node } from '../TraekEngine.svelte';

export interface TagConfig {
	label: string;
	color: string;
	bgColor: string;
}

export const PREDEFINED_TAGS: Record<string, TagConfig> = {
	important: {
		label: 'Important',
		color: '#ff6b4a',
		bgColor: 'rgba(255, 107, 74, 0.15)'
	},
	todo: {
		label: 'Todo',
		color: '#00d8ff',
		bgColor: 'rgba(0, 216, 255, 0.15)'
	},
	idea: {
		label: 'Idea',
		color: '#ffeb3b',
		bgColor: 'rgba(255, 235, 59, 0.15)'
	},
	question: {
		label: 'Question',
		color: '#ff9500',
		bgColor: 'rgba(255, 149, 0, 0.15)'
	},
	resolved: {
		label: 'Resolved',
		color: '#4caf50',
		bgColor: 'rgba(76, 175, 80, 0.15)'
	}
};

/**
 * Get tags for a node from metadata.
 */
export function getNodeTags(node: Node): string[] {
	if (!node.metadata) return [];
	return (node.metadata.tags as string[]) ?? [];
}

/**
 * Get tag configuration for a tag name.
 * Returns a default config for custom tags.
 */
export function getTagConfig(tag: string): TagConfig {
	return (
		PREDEFINED_TAGS[tag] ?? {
			label: tag,
			color: '#888888',
			bgColor: 'rgba(136, 136, 136, 0.15)'
		}
	);
}

/**
 * Check if a node matches a tag filter.
 * If filterTags is empty, all nodes match.
 */
export function matchesTagFilter(node: Node, filterTags: string[]): boolean {
	if (filterTags.length === 0) return true;

	const nodeTags = getNodeTags(node);
	return filterTags.some((tag) => nodeTags.includes(tag));
}
