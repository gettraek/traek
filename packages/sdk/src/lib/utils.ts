import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import typescript from 'highlight.js/lib/languages/typescript';
import bash from 'highlight.js/lib/languages/bash';
import xml from 'highlight.js/lib/languages/xml';

// Register a minimal set of languages we actually use in the docs.
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('bash', bash);
// Treat Svelte blocks as HTML/XML for highlighting purposes.
hljs.registerLanguage('svelte', xml);

const marked = new Marked(
	markedHighlight({
		emptyLangClass: 'hljs',
		langPrefix: 'hljs language-',
		highlight(code, lang) {
			const language = hljs.getLanguage(lang) ? lang : 'plaintext';
			return hljs.highlight(code, { language }).value;
		}
	})
);

/**
 * Renders markdown to HTML (supports images, bold, lists, code blocks, etc.).
 * Returns the same output on server and client to avoid hydration mismatch.
 * Only use with trusted content (e.g. static strings); sanitize user input elsewhere if needed.
 */
export function markdownToHtml(md: string): string {
	if (!md || typeof md !== 'string') return '';
	const raw = marked.parse(md, { async: false });
	return typeof raw === 'string' ? raw : '';
}
