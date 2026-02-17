import { describe, it, expect } from 'vitest';
import { markdownToHtml } from '../lib/utils';

describe('markdownToHtml', () => {
	describe('basic markdown rendering', () => {
		it('should return empty string for empty input', () => {
			expect.assertions(1);
			expect(markdownToHtml('')).toBe('');
		});

		it('should return empty string for non-string input', () => {
			expect.assertions(2);
			expect(markdownToHtml(null as unknown as string)).toBe('');
			expect(markdownToHtml(undefined as unknown as string)).toBe('');
		});

		it('should wrap plain text in a paragraph tag', () => {
			expect.assertions(1);
			const result = markdownToHtml('Hello world');
			expect(result.trim()).toBe('<p>Hello world</p>');
		});

		it('should render bold text', () => {
			expect.assertions(1);
			const result = markdownToHtml('**bold**');
			expect(result).toContain('<strong>bold</strong>');
		});

		it('should render italic text', () => {
			expect.assertions(1);
			const result = markdownToHtml('*italic*');
			expect(result).toContain('<em>italic</em>');
		});

		it('should render inline code', () => {
			expect.assertions(1);
			const result = markdownToHtml('use `console.log()`');
			expect(result).toContain('<code>console.log()</code>');
		});

		it('should render h1 headers', () => {
			expect.assertions(1);
			const result = markdownToHtml('# Heading 1');
			expect(result).toContain('<h1');
			// marked adds id attributes; just check the tag and content
		});

		it('should render h2 headers', () => {
			expect.assertions(1);
			const result = markdownToHtml('## Heading 2');
			expect(result).toContain('<h2');
		});

		it('should render h3 headers', () => {
			expect.assertions(1);
			const result = markdownToHtml('### Heading 3');
			expect(result).toContain('<h3');
		});

		it('should render unordered lists', () => {
			expect.assertions(2);
			const result = markdownToHtml('- item one\n- item two\n- item three');
			expect(result).toContain('<ul>');
			expect(result).toContain('<li>');
		});

		it('should render ordered lists', () => {
			expect.assertions(2);
			const result = markdownToHtml('1. first\n2. second\n3. third');
			expect(result).toContain('<ol>');
			expect(result).toContain('<li>');
		});

		it('should render links', () => {
			expect.assertions(2);
			const result = markdownToHtml('[example](https://example.com)');
			expect(result).toContain('href="https://example.com"');
			expect(result).toContain('>example</a>');
		});

		it('should render blockquotes', () => {
			expect.assertions(1);
			const result = markdownToHtml('> This is a quote');
			expect(result).toContain('<blockquote>');
		});
	});

	describe('code blocks', () => {
		it('should render fenced code blocks with language tag', () => {
			expect.assertions(2);
			const result = markdownToHtml('```typescript\nconst x = 1;\n```');
			expect(result).toContain('<pre>');
			expect(result).toContain('<code class="hljs language-typescript">');
		});

		it('should render fenced code blocks without language tag', () => {
			expect.assertions(2);
			const result = markdownToHtml('```\nsome code\n```');
			expect(result).toContain('<pre>');
			expect(result).toContain('<code class="hljs">');
		});

		it('should apply highlight.js classes for known languages', () => {
			expect.assertions(1);
			const result = markdownToHtml('```bash\necho hello\n```');
			expect(result).toContain('language-bash');
		});

		it('should fall back to plaintext for unknown languages', () => {
			expect.assertions(1);
			const result = markdownToHtml('```unknownlang\nfoo bar\n```');
			// Unknown languages get highlighted as plaintext
			expect(result).toContain('<code class="hljs language-unknownlang">');
		});

		it('should render inline code within paragraphs', () => {
			expect.assertions(2);
			const result = markdownToHtml('Run `npm install` to start');
			expect(result).toContain('<code>npm install</code>');
			expect(result).toContain('<p>');
		});
	});

	describe('XSS safety', () => {
		// markdownToHtml does NOT sanitize — it is designed for trusted content only.
		// These tests document the actual behavior: raw HTML passes through marked.
		// Consumers must sanitize separately (e.g. with DOMPurify) for untrusted input.

		it('should pass through script tags (not sanitized — trusted content only)', () => {
			expect.assertions(1);
			const result = markdownToHtml('<script>alert("xss")</script>');
			// Documenting that script tags are preserved — callers must sanitize
			expect(result).toContain('<script>');
		});

		it('should pass through img onerror handlers (not sanitized — trusted content only)', () => {
			expect.assertions(1);
			const result = markdownToHtml('<img onerror="alert(\'xss\')">');
			expect(result).toContain('onerror');
		});

		it('should pass through javascript: URLs (not sanitized — trusted content only)', () => {
			expect.assertions(1);
			const result = markdownToHtml('<a href="javascript:alert(\'xss\')">click</a>');
			expect(result).toContain('javascript:');
		});

		it('should pass through iframe tags (not sanitized — trusted content only)', () => {
			expect.assertions(1);
			const result = markdownToHtml('<iframe src="evil.com"></iframe>');
			expect(result).toContain('<iframe');
		});

		it('should escape angle brackets inside markdown code spans', () => {
			expect.assertions(2);
			// Inline code in markdown escapes HTML entities
			const result = markdownToHtml('`<script>alert("xss")</script>`');
			expect(result).not.toContain('<script>alert');
			expect(result).toContain('&lt;script&gt;');
		});

		it('should escape angle brackets inside fenced code blocks', () => {
			expect.assertions(2);
			const result = markdownToHtml('```\n<script>alert("xss")</script>\n```');
			expect(result).not.toContain('<script>alert');
			expect(result).toContain('&lt;script&gt;');
		});
	});

	describe('edge cases', () => {
		it('should handle a very long single line', () => {
			expect.assertions(1);
			const longText = 'a'.repeat(10000);
			const result = markdownToHtml(longText);
			expect(result).toContain(longText);
		});

		it('should handle multiple consecutive newlines', () => {
			expect.assertions(1);
			const result = markdownToHtml('paragraph one\n\n\n\nparagraph two');
			// Multiple blank lines still produce two paragraphs
			expect(result).toContain('<p>paragraph one</p>');
		});

		it('should handle special characters: <, >, &', () => {
			expect.assertions(3);
			const result = markdownToHtml('Use `<div>` and `&amp;` in code');
			expect(result).toContain('&lt;div&gt;');
			expect(result).toContain('&amp;amp;');
			expect(result).toContain('<code>');
		});

		it('should escape bare < and > in plain text', () => {
			expect.assertions(2);
			// Bare angle brackets in text context — marked converts to HTML entities
			const result = markdownToHtml('5 > 3 and 2 < 4');
			expect(result).toContain('&gt;');
			expect(result).toContain('&lt;');
		});

		it('should handle ampersand in plain text', () => {
			expect.assertions(1);
			const result = markdownToHtml('Tom & Jerry');
			expect(result).toContain('&amp;');
		});

		it('should return a string (never a promise)', () => {
			expect.assertions(1);
			const result = markdownToHtml('test');
			expect(typeof result).toBe('string');
		});

		it('should handle mixed markdown elements', () => {
			expect.assertions(4);
			const md =
				'# Title\n\nSome **bold** and *italic* text.\n\n- item\n\n```ts\nconst x = 1;\n```';
			const result = markdownToHtml(md);
			expect(result).toContain('<h1');
			expect(result).toContain('<strong>bold</strong>');
			expect(result).toContain('<em>italic</em>');
			expect(result).toContain('<pre>');
		});

		it('should handle markdown with only whitespace', () => {
			expect.assertions(1);
			const result = markdownToHtml('   \n\n   ');
			// Whitespace-only input produces empty or whitespace-only output
			expect(result.trim()).toBe('');
		});
	});
});
