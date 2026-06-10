import { describe, it, expect } from 'vitest';
import {
	getNodeTags,
	getTagConfig,
	getTagLabel,
	matchesTagFilter,
	PREDEFINED_TAGS
} from '../tagUtils';
import type { Node } from '../../TraekEngine.svelte';
import { DEFAULT_TRANSLATIONS } from '../../i18n/defaults';
import { mergeTranslations } from '../../i18n/context';

describe('tagUtils', () => {
	describe('getNodeTags', () => {
		it('should return empty array for node without metadata', () => {
			const node: Node = {
				id: '1',
				parentIds: [],
				role: 'user',
				type: 'text'
			};
			expect(getNodeTags(node)).toEqual([]);
		});

		it('should return empty array for node without tags', () => {
			const node: Node = {
				id: '1',
				parentIds: [],
				role: 'user',
				type: 'text',
				metadata: { x: 0, y: 0 }
			};
			expect(getNodeTags(node)).toEqual([]);
		});

		it('should return tags from metadata', () => {
			const node: Node = {
				id: '1',
				parentIds: [],
				role: 'user',
				type: 'text',
				metadata: { x: 0, y: 0, tags: ['important', 'todo'] }
			};
			expect(getNodeTags(node)).toEqual(['important', 'todo']);
		});
	});

	describe('getTagConfig', () => {
		it('should return predefined config for known tags', () => {
			const config = getTagConfig('important');
			expect(config).toEqual(PREDEFINED_TAGS.important);
		});

		it('should return default config for custom tags', () => {
			const config = getTagConfig('custom-tag');
			expect(config).toEqual({
				label: 'custom-tag',
				color: '#888888',
				bgColor: 'rgba(136, 136, 136, 0.15)'
			});
		});
	});

	describe('getTagLabel', () => {
		it('should resolve predefined tag labels from translations', () => {
			expect(getTagLabel('important', DEFAULT_TRANSLATIONS)).toBe('Important');
			expect(getTagLabel('todo', DEFAULT_TRANSLATIONS)).toBe('Todo');
			expect(getTagLabel('idea', DEFAULT_TRANSLATIONS)).toBe('Idea');
			expect(getTagLabel('question', DEFAULT_TRANSLATIONS)).toBe('Question');
			expect(getTagLabel('resolved', DEFAULT_TRANSLATIONS)).toBe('Resolved');
		});

		it('should use overridden translations for predefined tags', () => {
			const t = mergeTranslations({ tags: { labelImportant: 'Wichtig' } });
			expect(getTagLabel('important', t)).toBe('Wichtig');
			expect(getTagLabel('todo', t)).toBe('Todo');
		});

		it('should fall back to the stored label for custom tags', () => {
			expect(getTagLabel('custom-tag', DEFAULT_TRANSLATIONS)).toBe('custom-tag');
		});
	});

	describe('matchesTagFilter', () => {
		const node: Node = {
			id: '1',
			parentIds: [],
			role: 'user',
			type: 'text',
			metadata: { x: 0, y: 0, tags: ['important', 'todo'] }
		};

		it('should return true when filter is empty', () => {
			expect(matchesTagFilter(node, [])).toBe(true);
		});

		it('should return true when node has matching tag', () => {
			expect(matchesTagFilter(node, ['important'])).toBe(true);
			expect(matchesTagFilter(node, ['todo'])).toBe(true);
		});

		it('should return true when node has at least one matching tag', () => {
			expect(matchesTagFilter(node, ['important', 'idea'])).toBe(true);
		});

		it('should return false when node has no matching tags', () => {
			expect(matchesTagFilter(node, ['idea', 'question'])).toBe(false);
		});

		it('should return false for node without tags', () => {
			const nodeWithoutTags: Node = {
				id: '2',
				parentIds: [],
				role: 'user',
				type: 'text',
				metadata: { x: 0, y: 0 }
			};
			expect(matchesTagFilter(nodeWithoutTags, ['important'])).toBe(false);
		});
	});
});
