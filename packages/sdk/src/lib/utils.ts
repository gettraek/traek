import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import plaintext from 'highlight.js/lib/languages/plaintext';
import typescript from 'highlight.js/lib/languages/typescript';
import bash from 'highlight.js/lib/languages/bash';
import xml from 'highlight.js/lib/languages/xml';

// Register a minimal set of languages we actually use in the docs.
// 'plaintext' is the fallback for unknown languages and must be registered
// explicitly when using the highlight.js core build.
hljs.registerLanguage('plaintext', plaintext);
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

// In non-browser environments (SSR) DOMPurify has no DOM and exposes only
// `isSupported: false` — no `sanitize`/`addHook`. Guard all usage accordingly.
if (DOMPurify.isSupported) {
	// Force safe link behavior: open in new tab without opener access.
	// Runs after attribute sanitization, so DOMPurify cannot strip these again.
	DOMPurify.addHook('afterSanitizeAttributes', (node) => {
		if (node.tagName === 'A' && node.hasAttribute('href')) {
			node.setAttribute('target', '_blank');
			node.setAttribute('rel', 'noopener noreferrer');
		}
	});
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * Renders markdown to sanitized HTML (supports images, bold, lists, code blocks, etc.).
 * Output is sanitized with DOMPurify: script tags, event handlers and
 * `javascript:`/`data:` URLs are removed, so untrusted (LLM-streamed or
 * user-provided) content is safe to render via `{@html}`.
 * Links are rewritten to open in a new tab with `rel="noopener noreferrer"`.
 *
 * On the server (no DOM available for DOMPurify) the input is returned as
 * escaped plain text instead of HTML; Træk components only render markdown
 * client-side, so this fallback never produces a hydration mismatch in practice.
 */
export function markdownToHtml(md: string): string {
	if (!md || typeof md !== 'string') return '';
	if (!DOMPurify.isSupported) {
		// SSR / non-browser: cannot sanitize without a DOM — return escaped text.
		return escapeHtml(md);
	}
	const raw = marked.parse(md, { async: false });
	const html = typeof raw === 'string' ? raw : '';
	// `class` is allowed by default (keeps highlight.js `hljs` spans);
	// `target`/`rel` are kept for the link hook above.
	return DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel'] });
}
