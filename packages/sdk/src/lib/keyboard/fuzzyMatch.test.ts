import { describe, it, expect } from 'vitest';

/**
 * Fuzzy matching function - same implementation as in FuzzySearchOverlay
 */
function fuzzyMatch(text: string, query: string): boolean {
	const textLower = text.toLowerCase();
	const queryLower = query.toLowerCase();
	let textIndex = 0;
	let queryIndex = 0;

	while (textIndex < textLower.length && queryIndex < queryLower.length) {
		if (textLower[textIndex] === queryLower[queryIndex]) {
			queryIndex++;
		}
		textIndex++;
	}

	return queryIndex === queryLower.length;
}

describe('fuzzyMatch', () => {
	it('should match exact strings', () => {
		expect(fuzzyMatch('hello', 'hello')).toBe(true);
		expect(fuzzyMatch('Hello', 'hello')).toBe(true);
		expect(fuzzyMatch('HELLO', 'hello')).toBe(true);
	});

	it('should match subsequences', () => {
		expect(fuzzyMatch('hello world', 'hlo')).toBe(true);
		expect(fuzzyMatch('hello world', 'hew')).toBe(true);
		expect(fuzzyMatch('hello world', 'hw')).toBe(true);
		expect(fuzzyMatch('TypeScript', 'ts')).toBe(true);
		expect(fuzzyMatch('TypeScript', 'tsc')).toBe(true);
	});

	it('should not match if query is not a subsequence', () => {
		expect(fuzzyMatch('hello', 'hlo')).toBe(true);
		expect(fuzzyMatch('hello', 'hel')).toBe(true);
		expect(fuzzyMatch('hello', 'hxo')).toBe(false);
		expect(fuzzyMatch('hello', 'world')).toBe(false);
		expect(fuzzyMatch('hello', 'olleh')).toBe(false);
	});

	it('should be case-insensitive', () => {
		expect(fuzzyMatch('Hello World', 'hw')).toBe(true);
		expect(fuzzyMatch('Hello World', 'HW')).toBe(true);
		expect(fuzzyMatch('Hello World', 'Hw')).toBe(true);
		expect(fuzzyMatch('TYPESCRIPT', 'typescript')).toBe(true);
	});

	it('should match with spaces', () => {
		expect(fuzzyMatch('hello world', 'hel wor')).toBe(true);
		expect(fuzzyMatch('hello world', 'h w')).toBe(true);
		expect(fuzzyMatch('hello world', ' ')).toBe(true);
	});

	it('should handle empty query', () => {
		expect(fuzzyMatch('hello', '')).toBe(true);
		expect(fuzzyMatch('', '')).toBe(true);
	});

	it('should not match if text is empty but query is not', () => {
		expect(fuzzyMatch('', 'hello')).toBe(false);
	});

	it('should match at arbitrary positions', () => {
		expect(fuzzyMatch('src/lib/keyboard/KeyboardNavigator.svelte.ts', 'kn')).toBe(true);
		expect(fuzzyMatch('src/lib/keyboard/KeyboardNavigator.svelte.ts', 'kbd')).toBe(true);
		expect(fuzzyMatch('src/lib/keyboard/KeyboardNavigator.svelte.ts', 'svelte')).toBe(true);
	});

	it('should work with special characters', () => {
		expect(fuzzyMatch('node-types/types.ts', 'nt')).toBe(true);
		expect(fuzzyMatch('node-types/types.ts', 'node/types')).toBe(true);
		expect(fuzzyMatch('test@example.com', 't@e')).toBe(true);
	});

	it('should match partial words', () => {
		expect(fuzzyMatch('Implementation of fuzzy search', 'impfuz')).toBe(true);
		expect(fuzzyMatch('Implementation of fuzzy search', 'iofs')).toBe(true);
		expect(fuzzyMatch('Implementation of fuzzy search', 'impl')).toBe(true);
	});

	it('should not match reversed strings', () => {
		expect(fuzzyMatch('abc', 'cba')).toBe(false);
		expect(fuzzyMatch('hello', 'olleh')).toBe(false);
	});

	it('should match with repeated characters', () => {
		expect(fuzzyMatch('hello', 'hel')).toBe(true);
		expect(fuzzyMatch('hello', 'hell')).toBe(true);
		expect(fuzzyMatch('hello', 'llo')).toBe(true);
		expect(fuzzyMatch('mississippi', 'msp')).toBe(true);
	});
});
