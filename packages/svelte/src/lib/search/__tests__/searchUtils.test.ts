import { describe, it, expect } from 'vitest';
import { searchNodes, highlightMatch, type SearchFilters } from '../searchUtils';
import type { Node, MessageNode } from '../../TraekEngine.svelte';
import { BasicNodeTypes } from '../../TraekEngine.svelte';

// Helper to create test nodes for extended filter tests
const makeNode = (
	id: string,
	content: string,
	tags: string[] = [],
	color?: string,
	bookmarked?: boolean
) => ({
	id,
	parentIds: [],
	role: 'user' as const,
	type: 'text',
	status: 'done' as const,
	content,
	metadata: {
		x: 0,
		y: 0,
		tags,
		...(color ? { color } : {}),
		...(bookmarked !== undefined ? { bookmarked } : {})
	}
});

describe('searchUtils', () => {
	describe('searchNodes', () => {
		const createNode = (id: string, content: string): MessageNode => ({
			id,
			parentIds: [],
			content,
			role: 'user',
			type: BasicNodeTypes.TEXT,
			metadata: { x: 0, y: 0 }
		});

		it('should return empty array when query is empty', () => {
			const nodes: Node[] = [createNode('1', 'Hello world')];
			expect(searchNodes(nodes, '')).toEqual([]);
			expect(searchNodes(nodes, '   ')).toEqual([]);
		});

		it('should find nodes with matching content (case-insensitive)', () => {
			const nodes: Node[] = [
				createNode('1', 'Hello world'),
				createNode('2', 'Goodbye world'),
				createNode('3', 'Something else')
			];

			const matches = searchNodes(nodes, 'world');
			expect(matches).toEqual(['1', '2']);
		});

		it('should match case-insensitively', () => {
			const nodes: Node[] = [
				createNode('1', 'Hello World'),
				createNode('2', 'HELLO WORLD'),
				createNode('3', 'hello world')
			];

			const matches = searchNodes(nodes, 'WoRlD');
			expect(matches).toEqual(['1', '2', '3']);
		});

		it('should match partial strings', () => {
			const nodes: Node[] = [
				createNode('1', 'JavaScript is awesome'),
				createNode('2', 'Java is different'),
				createNode('3', 'Python is cool')
			];

			const matches = searchNodes(nodes, 'java');
			expect(matches).toEqual(['1', '2']);
		});

		it('should return empty array when no matches found', () => {
			const nodes: Node[] = [createNode('1', 'Hello world'), createNode('2', 'Goodbye world')];

			const matches = searchNodes(nodes, 'xyz');
			expect(matches).toEqual([]);
		});

		it('should handle nodes without content', () => {
			const nodes: Node[] = [
				createNode('1', 'Hello world'),
				{
					id: '2',
					parentIds: [],
					role: 'assistant',
					type: BasicNodeTypes.TEXT,
					metadata: { x: 0, y: 0 }
				} as Node,
				createNode('3', 'Goodbye world')
			];

			const matches = searchNodes(nodes, 'world');
			expect(matches).toEqual(['1', '3']);
		});

		it('should trim whitespace from query', () => {
			const nodes: Node[] = [createNode('1', 'Hello world')];

			const matches = searchNodes(nodes, '  world  ');
			expect(matches).toEqual(['1']);
		});
	});

	describe('role filters', () => {
		const createNodeWithRole = (
			id: string,
			content: string,
			role: 'user' | 'assistant' | 'system'
		): MessageNode => ({
			id,
			parentIds: [],
			content,
			role,
			type: BasicNodeTypes.TEXT,
			metadata: { x: 0, y: 0 }
		});

		it('should filter by single role', () => {
			const nodes: Node[] = [
				createNodeWithRole('1', 'Hello world', 'user'),
				createNodeWithRole('2', 'Hello world', 'assistant'),
				createNodeWithRole('3', 'Hello world', 'system')
			];
			const filters: SearchFilters = { roles: ['user'] };
			expect(searchNodes(nodes, 'hello', filters)).toEqual(['1']);
		});

		it('should filter by multiple roles', () => {
			const nodes: Node[] = [
				createNodeWithRole('1', 'Hello world', 'user'),
				createNodeWithRole('2', 'Hello world', 'assistant'),
				createNodeWithRole('3', 'Hello world', 'system')
			];
			const filters: SearchFilters = { roles: ['user', 'assistant'] };
			expect(searchNodes(nodes, 'hello', filters)).toEqual(['1', '2']);
		});

		it('should return all roles when filter is empty', () => {
			const nodes: Node[] = [
				createNodeWithRole('1', 'Hello world', 'user'),
				createNodeWithRole('2', 'Hello world', 'assistant')
			];
			expect(searchNodes(nodes, 'hello', {})).toEqual(['1', '2']);
			expect(searchNodes(nodes, 'hello', { roles: [] })).toEqual(['1', '2']);
		});

		it('should combine content match and role filter', () => {
			const nodes: Node[] = [
				createNodeWithRole('1', 'Hello world', 'user'),
				createNodeWithRole('2', 'Goodbye world', 'user'),
				createNodeWithRole('3', 'Hello world', 'assistant')
			];
			const filters: SearchFilters = { roles: ['user'] };
			expect(searchNodes(nodes, 'hello', filters)).toEqual(['1']);
		});
	});

	describe('highlightMatch', () => {
		it('should return escaped HTML when query is empty', () => {
			const result = highlightMatch('Hello world', '');
			expect(result).toBe('Hello world');
		});

		it('should return escaped HTML when query is whitespace', () => {
			const result = highlightMatch('Hello world', '   ');
			expect(result).toBe('Hello world');
		});

		it('should highlight single match', () => {
			const result = highlightMatch('Hello world', 'world');
			expect(result).toBe('Hello <mark class="search-highlight">world</mark>');
		});

		it('should highlight multiple matches', () => {
			const result = highlightMatch('Hello world, goodbye world', 'world');
			expect(result).toBe(
				'Hello <mark class="search-highlight">world</mark>, goodbye <mark class="search-highlight">world</mark>'
			);
		});

		it('should be case-insensitive', () => {
			const result = highlightMatch('Hello World', 'world');
			expect(result).toBe('Hello <mark class="search-highlight">World</mark>');
		});

		it('should escape HTML special characters', () => {
			const result = highlightMatch('<script>alert("xss")</script>', 'script');
			expect(result).toContain('&lt;');
			expect(result).toContain('&gt;');
			expect(result).toContain('<mark class="search-highlight">');
		});

		it('should handle overlapping matches correctly', () => {
			const result = highlightMatch('aaaa', 'aa');
			// Should match at positions 0 and 1 (overlapping)
			expect(result).toContain('<mark class="search-highlight">');
		});

		it('should return original text when no match found', () => {
			const result = highlightMatch('Hello world', 'xyz');
			expect(result).toBe('Hello world');
		});

		it('should trim whitespace from query', () => {
			const result = highlightMatch('Hello world', '  world  ');
			expect(result).toBe('Hello <mark class="search-highlight">world</mark>');
		});

		it('should preserve original case in highlights', () => {
			const result = highlightMatch('Hello WORLD', 'world');
			expect(result).toBe('Hello <mark class="search-highlight">WORLD</mark>');
		});
	});
});

describe('searchNodes with extended filters', () => {
	it('filters by tag (OR logic)', () => {
		const nodes = [
			makeNode('1', 'hello world', ['important']),
			makeNode('2', 'hello world', ['todo']),
			makeNode('3', 'hello world', [])
		] as any[];
		const result = searchNodes(nodes, 'hello', { tags: ['important'] });
		expect(result).toContain('1');
		expect(result).not.toContain('2');
		expect(result).not.toContain('3');
	});

	it('filters bookmarked only', () => {
		const nodes = [
			makeNode('1', 'hello world', [], undefined, true),
			makeNode('2', 'hello world', [], undefined, false)
		] as any[];
		const result = searchNodes(nodes, 'hello', { bookmarked: true });
		expect(result).toContain('1');
		expect(result).not.toContain('2');
	});

	it('filters by color', () => {
		const nodes = [
			makeNode('1', 'hello world', [], 'red'),
			makeNode('2', 'hello world', [], 'blue'),
			makeNode('3', 'hello world')
		] as any[];
		const result = searchNodes(nodes, 'hello', { colors: ['red'] as any });
		expect(result).toContain('1');
		expect(result).not.toContain('2');
		expect(result).not.toContain('3');
	});

	it('no filter passes all matching content nodes', () => {
		const nodes = [
			makeNode('1', 'hello world', ['important'], 'red', true),
			makeNode('2', 'hello world', [], undefined, false)
		] as any[];
		const result = searchNodes(nodes, 'hello', {});
		expect(result).toContain('1');
		expect(result).toContain('2');
	});
});
