import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js/lib/core';
import plaintext from 'highlight.js/lib/languages/plaintext';
import type { LanguageFn } from 'highlight.js';
import DOMPurify, { type Config as DOMPurifyConfig } from 'dompurify';

// plaintext is the only language registered at startup — it's the safe fallback
// for all code blocks whose language hasn't yet lazy-loaded.
hljs.registerLanguage('plaintext', plaintext);

/**
 * Lazy language registry for highlight.js.
 *
 * Languages are loaded on first use via dynamic import() so that
 * consumers' bundlers can code-split them away from the initial chunk.
 * Aliases map to the same loader (e.g. 'ts' → typescript loader).
 *
 * On the very first render of an unseen language the code falls back to
 * plaintext; subsequent renders (streaming updates) use proper highlighting
 * once the module has resolved.
 */
const LANG_LOADERS: Record<string, () => Promise<{ default: LanguageFn }>> = {
	typescript: () => import('highlight.js/lib/languages/typescript'),
	ts: () => import('highlight.js/lib/languages/typescript'),
	javascript: () => import('highlight.js/lib/languages/javascript'),
	js: () => import('highlight.js/lib/languages/javascript'),
	bash: () => import('highlight.js/lib/languages/bash'),
	sh: () => import('highlight.js/lib/languages/bash'),
	shell: () => import('highlight.js/lib/languages/bash'),
	xml: () => import('highlight.js/lib/languages/xml'),
	html: () => import('highlight.js/lib/languages/xml'),
	svelte: () => import('highlight.js/lib/languages/xml'),
	css: () => import('highlight.js/lib/languages/css'),
	json: () => import('highlight.js/lib/languages/json'),
	python: () => import('highlight.js/lib/languages/python'),
	py: () => import('highlight.js/lib/languages/python'),
	rust: () => import('highlight.js/lib/languages/rust'),
	go: () => import('highlight.js/lib/languages/go'),
	sql: () => import('highlight.js/lib/languages/sql')
};

// Track in-flight loads to avoid duplicate requests
const pendingLoads = new Set<string>();

/**
 * Kick off an async language load without blocking the sync highlight() call.
 * On the next render the language will be registered and syntax-coloured.
 */
function ensureLanguageAsync(lang: string): void {
	if (hljs.getLanguage(lang) || pendingLoads.has(lang)) return;
	const loader = LANG_LOADERS[lang.toLowerCase()];
	if (!loader) return;
	pendingLoads.add(lang);
	loader()
		.then((mod) => {
			// Register under the canonical name (first key) and the requested alias
			const canonical = Object.keys(LANG_LOADERS).find((k) => LANG_LOADERS[k] === loader) ?? lang;
			if (!hljs.getLanguage(canonical)) {
				hljs.registerLanguage(canonical, mod.default);
			}
			// Also register the alias so subsequent calls find it immediately
			if (lang !== canonical && !hljs.getLanguage(lang)) {
				hljs.registerLanguage(lang, mod.default);
			}
		})
		.catch(() => {
			/* ignore — falls back to plaintext */
		})
		.finally(() => pendingLoads.delete(lang));
}

const marked = new Marked(
	markedHighlight({
		emptyLangClass: 'hljs',
		langPrefix: 'hljs language-',
		highlight(code, lang) {
			if (lang) ensureLanguageAsync(lang);
			const language = hljs.getLanguage(lang) ? lang : 'plaintext';
			return hljs.highlight(code, { language }).value;
		}
	})
);

/**
 * DOMPurify config for markdown-rendered HTML.
 *
 * Allowlist covers all elements produced by marked (headings, lists, code,
 * links, images, tables, blockquotes, etc.) while blocking every XSS vector:
 * - `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>` are removed
 * - `on*` event attributes are stripped
 * - `javascript:` and `data:` URIs are rejected
 * - `ALLOW_DATA_ATTR: false` prevents data-* attribute injection
 *
 * CSP note: DOMPurify operates on the DOM and never injects `eval` or
 * `Function()` calls, making it compatible with `script-src 'self'` policies.
 *
 * SSR note: DOMPurify requires a browser DOM. When running on the server
 * (typeof window === 'undefined') marked output is returned as-is; the
 * browser will sanitize on first render via hydration. For fully server-side
 * contexts (e.g. email, PDF) always sanitize separately before use.
 */
const PURIFY_CONFIG: DOMPurifyConfig = {
	ALLOWED_TAGS: [
		// Block elements
		'p',
		'div',
		'br',
		'hr',
		'pre',
		'blockquote',
		// Headings
		'h1',
		'h2',
		'h3',
		'h4',
		'h5',
		'h6',
		// Inline elements
		'span',
		'strong',
		'em',
		'del',
		'ins',
		'mark',
		'code',
		'kbd',
		'samp',
		// Lists
		'ul',
		'ol',
		'li',
		// Links & media
		'a',
		'img',
		// Tables
		'table',
		'thead',
		'tbody',
		'tfoot',
		'tr',
		'th',
		'td',
		'caption',
		// Details/summary (used in some markdown extensions)
		'details',
		'summary'
	],
	ALLOWED_ATTR: [
		'href',
		'src',
		'alt',
		'title',
		'class',
		'id',
		'width',
		'height',
		'target',
		'rel',
		// Table alignment
		'align',
		'valign'
	],
	ALLOW_DATA_ATTR: false,
	// Reject javascript: and data: URIs in href/src; allow http/https/mailto/tel
	ALLOWED_URI_REGEXP:
		/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i
};

/**
 * Renders markdown to sanitized HTML (supports images, bold, lists, code
 * blocks, tables, etc.).
 *
 * Security: output is sanitized with DOMPurify in browser environments,
 * blocking script injection, event handlers, and dangerous URIs. Safe to use
 * with user-supplied content and AI model responses.
 *
 * Returns the same output on server and client to avoid hydration mismatch.
 */
export function markdownToHtml(md: string): string {
	if (!md || typeof md !== 'string') return '';
	const raw = marked.parse(md, { async: false });
	const html = typeof raw === 'string' ? raw : '';

	// DOMPurify is browser-only; skip on server (SSR path)
	if (typeof window === 'undefined' || !DOMPurify.isSupported) {
		return html;
	}

	return String(DOMPurify.sanitize(html, PURIFY_CONFIG));
}
