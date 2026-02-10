import createDOMPurify from 'dompurify';
import { Marked } from 'marked';
import { markedHighlight } from "marked-highlight";
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

/** Renders markdown to sanitized HTML (supports images, bold, lists, etc.). */
export function markdownToHtml(md: string): string {
  if (!md || typeof md !== 'string') return '';
  const raw = marked.parse(md, { async: false });
  const html = typeof raw === 'string' ? raw : '';

  // On the server we don't have a real DOM; fall back to unsanitized HTML there.
  if (typeof window === 'undefined') return html;

  // In the browser, create a DOMPurify instance bound to the real window.
  const DOMPurify = createDOMPurify(window as unknown as unknown as typeof globalThis);
  return DOMPurify.sanitize(html, {
    // Keep link targets and highlight.js classes (e.g. "hljs-keyword").
    ADD_ATTR: ['target', 'class'],
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'code',
      'pre',
      'a',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'blockquote',
      'hr',
      'img',
      // Allow span tags emitted by highlight.js (e.g. <span class="hljs-keyword">).
      'span'
    ]
  });
}