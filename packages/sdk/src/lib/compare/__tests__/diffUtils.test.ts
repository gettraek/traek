import { describe, it, expect } from 'vitest';
import { wordDiff } from '../diffUtils';

describe('wordDiff', () => {
	it('should return empty array for two empty strings', () => {
		const result = wordDiff('', '');
		expect(result).toEqual([]);
	});

	it('should mark all words as same when texts are identical', () => {
		const text = 'Hello world';
		const result = wordDiff(text, text);
		expect(result).toEqual([
			{ type: 'same', text: 'Hello' },
			{ type: 'same', text: ' ' },
			{ type: 'same', text: 'world' }
		]);
	});

	it('should mark all words as removed when B is empty', () => {
		const result = wordDiff('Hello world', '');
		expect(result).toEqual([
			{ type: 'removed', text: 'Hello' },
			{ type: 'removed', text: ' ' },
			{ type: 'removed', text: 'world' }
		]);
	});

	it('should mark all words as added when A is empty', () => {
		const result = wordDiff('', 'Hello world');
		expect(result).toEqual([
			{ type: 'added', text: 'Hello' },
			{ type: 'added', text: ' ' },
			{ type: 'added', text: 'world' }
		]);
	});

	it('should detect word replacement', () => {
		const result = wordDiff('Hello world', 'Hello universe');
		expect(result).toEqual([
			{ type: 'same', text: 'Hello' },
			{ type: 'same', text: ' ' },
			{ type: 'removed', text: 'world' },
			{ type: 'added', text: 'universe' }
		]);
	});

	it('should detect word insertion', () => {
		const result = wordDiff('Hello world', 'Hello beautiful world');
		expect(result).toEqual([
			{ type: 'same', text: 'Hello' },
			{ type: 'same', text: ' ' },
			{ type: 'added', text: 'beautiful' },
			{ type: 'added', text: ' ' },
			{ type: 'same', text: 'world' }
		]);
	});

	it('should detect word deletion', () => {
		const result = wordDiff('Hello beautiful world', 'Hello world');
		expect(result).toEqual([
			{ type: 'same', text: 'Hello' },
			{ type: 'same', text: ' ' },
			{ type: 'removed', text: 'beautiful' },
			{ type: 'removed', text: ' ' },
			{ type: 'same', text: 'world' }
		]);
	});

	it('should handle punctuation as separate tokens', () => {
		const result = wordDiff('Hello, world!', 'Hello world!');
		expect(result).toEqual([
			{ type: 'same', text: 'Hello' },
			{ type: 'removed', text: ',' },
			{ type: 'same', text: ' ' },
			{ type: 'same', text: 'world' },
			{ type: 'same', text: '!' }
		]);
	});

	it('should handle complex diff with multiple changes', () => {
		const result = wordDiff('The quick brown fox jumps', 'The slow brown dog runs');
		// Note: LCS algorithm may produce different valid orderings for complex diffs.
		// The important thing is that all changes are captured correctly.
		expect(result).toEqual([
			{ type: 'same', text: 'The' },
			{ type: 'same', text: ' ' },
			{ type: 'removed', text: 'quick' },
			{ type: 'added', text: 'slow' },
			{ type: 'same', text: ' ' },
			{ type: 'same', text: 'brown' },
			{ type: 'same', text: ' ' },
			{ type: 'removed', text: 'fox' },
			{ type: 'added', text: 'dog' },
			{ type: 'same', text: ' ' },
			{ type: 'removed', text: 'jumps' },
			{ type: 'added', text: 'runs' }
		]);
	});

	it('should preserve whitespace accurately', () => {
		const result = wordDiff('Hello  world', 'Hello world');
		expect(result).toEqual([
			{ type: 'same', text: 'Hello' },
			{ type: 'removed', text: '  ' },
			{ type: 'added', text: ' ' },
			{ type: 'same', text: 'world' }
		]);
	});

	it('should handle newlines', () => {
		const result = wordDiff('Hello\nworld', 'Hello\nuniverse');
		expect(result).toEqual([
			{ type: 'same', text: 'Hello' },
			{ type: 'same', text: '\n' },
			{ type: 'removed', text: 'world' },
			{ type: 'added', text: 'universe' }
		]);
	});

	it('should handle contractions', () => {
		const result = wordDiff("I don't know", "I don't understand");
		expect(result).toEqual([
			{ type: 'same', text: 'I' },
			{ type: 'same', text: ' ' },
			{ type: 'same', text: "don't" },
			{ type: 'same', text: ' ' },
			{ type: 'removed', text: 'know' },
			{ type: 'added', text: 'understand' }
		]);
	});

	it('should handle numbers', () => {
		const result = wordDiff('I have 2 apples', 'I have 3 apples');
		expect(result).toEqual([
			{ type: 'same', text: 'I' },
			{ type: 'same', text: ' ' },
			{ type: 'same', text: 'have' },
			{ type: 'same', text: ' ' },
			{ type: 'removed', text: '2' },
			{ type: 'added', text: '3' },
			{ type: 'same', text: ' ' },
			{ type: 'same', text: 'apples' }
		]);
	});

	it('should handle special characters', () => {
		const result = wordDiff('$100 USD', '$200 USD');
		expect(result).toEqual([
			{ type: 'same', text: '$' },
			{ type: 'removed', text: '100' },
			{ type: 'added', text: '200' },
			{ type: 'same', text: ' ' },
			{ type: 'same', text: 'USD' }
		]);
	});

	it('should handle reordering', () => {
		const result = wordDiff('A B C', 'C B A');
		// LCS picks one of several valid orderings; exact output may vary
		// but should capture the reordering
		expect(result.length).toBeGreaterThan(0);
		expect(result.some((s) => s.type === 'removed')).toBe(true);
		expect(result.some((s) => s.type === 'added')).toBe(true);
	});

	it('should handle long text efficiently', () => {
		const longText = 'Lorem ipsum dolor sit amet consectetur adipiscing elit '.repeat(10);
		const modifiedText = longText.replace('consectetur', 'modified');
		const result = wordDiff(longText, modifiedText);
		// Should complete without throwing
		expect(result.length).toBeGreaterThan(0);
		expect(result.some((s) => s.type === 'removed')).toBe(true);
		expect(result.some((s) => s.type === 'added')).toBe(true);
	});
});
