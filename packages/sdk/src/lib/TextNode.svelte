<script lang="ts">
	import { tick } from 'svelte';
	import { fadedSlide } from './transitions';
	import type { TraekEngine } from './TraekEngine.svelte';
	import TraekNodeWrapper from './TraekNodeWrapper.svelte';
	import { markdownToHtml } from './utils';
	import { getDetailLevel } from './canvas/AdaptiveRenderer.svelte';

	import type { MessageNode } from './TraekEngine.svelte';

	let {
		node,
		isActive,
		isFocused = false,
		engine,
		viewportRoot = null,
		gridStep = 20,
		nodeWidth = 350,
		viewportResizeVersion = 0,
		scale = 1,
		editingNodeId = null,
		onEditSave,
		onEditCancel,
		onStartEdit
	} = $props<{
		node: MessageNode;
		isActive: boolean;
		isFocused?: boolean;
		engine?: TraekEngine;
		viewportRoot?: HTMLElement | null;
		gridStep?: number;
		nodeWidth?: number;
		viewportResizeVersion?: number;
		scale?: number;
		editingNodeId?: string | null;
		onEditSave?: (nodeId: string, content: string) => void;
		onEditCancel?: () => void;
		onStartEdit?: (nodeId: string) => void;
	}>();

	let scrollContainer = $state<HTMLElement | null>(null);
	let isScrolledToEnd = $state(false);
	let editContent = $state('');
	let editTextarea = $state<HTMLTextAreaElement | null>(null);

	const isEditing = $derived(editingNodeId === node.id);
	const detailLevel = $derived(getDetailLevel(scale));

	// When entering edit mode, initialize content and auto-focus
	$effect(() => {
		if (isEditing) {
			editContent = node.content ?? '';
			tick().then(() => {
				editTextarea?.focus();
				// Place cursor at end
				if (editTextarea) {
					editTextarea.selectionStart = editTextarea.value.length;
					editTextarea.selectionEnd = editTextarea.value.length;
				}
			});
		}
	});

	function saveEdit() {
		onEditSave?.(node.id, editContent);
	}

	function cancelEdit() {
		onEditCancel?.();
	}

	/**
	 * Markdown streaming optimization: cache stable paragraphs, only re-parse the last block.
	 * When streaming, we split content at the last double-newline:
	 * - Everything before = stable (cached)
	 * - Everything after = streaming (re-parsed each update)
	 * Skip markdown parsing entirely at compact/minimal/dot zoom levels for performance.
	 */
	const contentParts = $derived.by(() => {
		// Skip parsing at low zoom levels
		if (detailLevel === 'compact' || detailLevel === 'minimal' || detailLevel === 'dot') {
			return { stable: '', streaming: '' };
		}

		const content = node.content ?? '';
		// If done or very short, treat entire content as streaming (no split)
		if (node.status === 'done' || content.length < 100) {
			return { stable: '', streaming: content };
		}
		// Find last paragraph break (double newline)
		const lastParagraphBreak = content.lastIndexOf('\n\n');
		if (lastParagraphBreak === -1) {
			return { stable: '', streaming: content };
		}
		return {
			stable: content.slice(0, lastParagraphBreak + 2),
			streaming: content.slice(lastParagraphBreak + 2)
		};
	});

	// Cache stable HTML - only re-parse when stable content changes
	let cachedStableHtml = $state('');
	let lastStableContent = $state('');

	$effect(() => {
		// Skip caching at low zoom levels
		if (detailLevel === 'compact' || detailLevel === 'minimal' || detailLevel === 'dot') {
			return;
		}

		const { stable } = contentParts;
		if (stable !== lastStableContent) {
			cachedStableHtml = markdownToHtml(stable);
			lastStableContent = stable;
		}
	});

	// Only re-parse the streaming part on each update
	const streamingHtml = $derived(
		detailLevel === 'full' ? markdownToHtml(contentParts.streaming) : ''
	);
	const renderedContent = $derived(cachedStableHtml + streamingHtml);

	function checkScrolledToEnd(el: HTMLElement | null) {
		if (!el) return;
		const threshold = 20;
		isScrolledToEnd = el.scrollHeight - el.scrollTop <= el.clientHeight + threshold;
	}

	// Auto-Scroll: when new content streams in, follow if user is at bottom
	$effect(() => {
		if (node.content && scrollContainer) {
			checkScrolledToEnd(scrollContainer);
			const isAtBottom =
				scrollContainer.scrollHeight - scrollContainer.scrollTop <=
				scrollContainer.clientHeight + 50;
			if (isAtBottom) {
				tick().then(() => {
					scrollContainer?.scrollTo({
						top: scrollContainer.scrollHeight,
						behavior: 'smooth'
					});
					checkScrolledToEnd(scrollContainer);
				});
			}
		}
	});

	/**
	 * Walk all text nodes inside container and wrap every occurrence of query
	 * in a <mark class="search-highlight"> element.
	 * Clears previous highlights before applying new ones.
	 */
	function highlightTextInDom(container: HTMLElement, query: string) {
		// Remove existing highlights by unwrapping <mark class="search-highlight"> elements
		container.querySelectorAll('mark.search-highlight').forEach((mark) => {
			const parent = mark.parentNode;
			if (parent) {
				parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
				parent.normalize();
			}
		});

		if (!query.trim()) return;

		const lowerQuery = query.toLowerCase();
		const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
		const textNodes: Text[] = [];
		let current: Text | null;
		while ((current = walker.nextNode() as Text | null)) {
			textNodes.push(current);
		}

		for (const textNode of textNodes) {
			const text = textNode.textContent ?? '';
			const lowerText = text.toLowerCase();

			// Collect all match positions in this text node
			const positions: { start: number; end: number }[] = [];
			let pos = 0;
			while (pos < lowerText.length) {
				const idx = lowerText.indexOf(lowerQuery, pos);
				if (idx === -1) break;
				positions.push({ start: idx, end: idx + query.length });
				pos = idx + 1;
			}

			if (positions.length === 0) continue;

			const frag = document.createDocumentFragment();
			let lastEnd = 0;

			for (const { start, end } of positions) {
				if (start > lastEnd) {
					frag.appendChild(document.createTextNode(text.slice(lastEnd, start)));
				}
				const mark = document.createElement('mark');
				mark.className = 'search-highlight';
				mark.textContent = text.slice(start, end);
				frag.appendChild(mark);
				lastEnd = end;
			}

			if (lastEnd < text.length) {
				frag.appendChild(document.createTextNode(text.slice(lastEnd)));
			}

			textNode.parentNode?.replaceChild(frag, textNode);
		}
	}

	// Apply search highlights whenever searchQuery or rendered content changes
	$effect(() => {
		const query = engine?.searchQuery ?? '';
		// Access renderedContent to re-run when content changes (e.g. during streaming)
		const _content = renderedContent;
		const container = scrollContainer;
		if (!container) return;
		tick().then(() => highlightTextInDom(container, query));
	});
</script>

<TraekNodeWrapper
	{node}
	{isActive}
	{isFocused}
	{engine}
	{viewportRoot}
	{gridStep}
	{nodeWidth}
	{viewportResizeVersion}
	{scale}
>
	{#if isEditing}
		<div class="edit-overlay">
			<textarea
				bind:this={editTextarea}
				bind:value={editContent}
				class="edit-textarea"
				onkeydown={(e) => {
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault();
						saveEdit();
					} else if (e.key === 'Escape') {
						cancelEdit();
					}
				}}
			></textarea>
			<div class="edit-actions">
				<button type="button" class="edit-btn edit-btn-save" onclick={saveEdit}>Save</button>
				<button type="button" class="edit-btn edit-btn-cancel" onclick={cancelEdit}>Cancel</button>
			</div>
		</div>
	{:else if detailLevel === 'full'}
		<!-- Full detail: render complete markdown -->
		<div
			bind:this={scrollContainer}
			class="content-area custom-scrollbar"
			onscroll={() => checkScrolledToEnd(scrollContainer)}
			ondblclick={() => {
				if (node.role === 'user' && onStartEdit) {
					onStartEdit(node.id);
				}
			}}
		>
			<div class="text-content markdown-body">
				{#if node.content}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html renderedContent}
				{:else if node.role === 'assistant'}
					<span class="typing-cursor">|</span>
				{/if}
			</div>
		</div>

		{#if node.content.length > 500 && !isScrolledToEnd}
			<div transition:fadedSlide={{ axis: 'y' }} class="scroll-hint">Scroll for more ↓</div>
		{/if}
	{/if}
</TraekNodeWrapper>

<style>
	@layer base {
		.content-area {
			flex: 1;
			min-height: 0;
			overflow-y: auto;
			padding: 16px;
			position: relative;
			user-select: text;
		}

		.text-content {
			font-size: 14px;
			line-height: 1.6;
			color: var(--traek-textnode-text, #dddddd);
			word-break: break-word;
			user-select: text;
		}

		.markdown-body :global(p) {
			margin: 0 0 0.75em;
		}
		.markdown-body :global(p:last-child) {
			margin-bottom: 0;
		}
		.markdown-body :global(img) {
			max-height: 200px;
			width: auto;
			height: auto;
			object-fit: contain;
			border-radius: 8px;
			display: block;
			background: var(--traek-textnode-bg, #222222);
		}
		.markdown-body :global(ul),
		.markdown-body :global(ol) {
			margin: 0.5em 0;
			padding-left: 1.5em;
		}
		.markdown-body :global(strong),
		.markdown-body :global(em),
		.markdown-body :global(a) {
			color: inherit;
		}
		.markdown-body :global(strong) {
			font-weight: 600;
		}
		.markdown-body :global(a) {
			text-decoration: none;
		}
		.markdown-body :global(a:hover) {
			text-decoration: underline;
		}
		.markdown-body :global(code) {
			font-size: 0.9em;
			background: rgba(255, 255, 255, 0.08);
			padding: 0.15em 0.4em;
			border-radius: 4px;
		}
		.markdown-body :global(pre) {
			margin: 0.5em 0;
			padding: 10px;
			background: var(--traek-textnode-bg, rgba(0, 0, 0, 0.3));
			border-radius: 6px;
			overflow-x: auto;
		}
		.markdown-body :global(pre code) {
			background: none;
			padding: 0;
		}
		.markdown-body :global(h1),
		.markdown-body :global(h2),
		.markdown-body :global(h3),
		.markdown-body :global(h4) {
			margin: 1em 0 0.5em;
			font-weight: 600;
		}
		.markdown-body :global(blockquote) {
			margin: 0.5em 0;
			padding-left: 1em;
			border-left: 3px solid var(--traek-markdown-quote-border, #444444);
			color: var(--traek-markdown-quote-text, #999999);
		}
		.markdown-body :global(hr) {
			border: none;
			border-top: 1px solid var(--traek-markdown-hr, #333333);
			margin: 1em 0;
		}

		.scroll-hint {
			flex-shrink: 0;
			font-size: 9px;
			text-align: center;
			padding: 4px;
			background: var(--traek-scroll-hint-bg, linear-gradient(transparent, rgba(0, 0, 0, 0.5)));
			color: var(--traek-scroll-hint-text, #444444);
		}

		.custom-scrollbar {
			scrollbar-width: thin;
			scrollbar-color: var(--traek-scrollbar-thumb, #333333) transparent;
		}
		.custom-scrollbar::-webkit-scrollbar {
			width: 4px;
		}
		.custom-scrollbar::-webkit-scrollbar-track {
			background: transparent;
		}
		.custom-scrollbar::-webkit-scrollbar-thumb {
			background: var(--traek-scrollbar-thumb, #333333);
			border-radius: 10px;
		}
		.custom-scrollbar::-webkit-scrollbar-thumb:hover {
			background: var(--traek-scrollbar-thumb-hover, #444444);
		}

		.typing-cursor {
			display: inline-block;
			width: 8px;
			animation: blink 1s infinite;
			color: var(--traek-typing-cursor, #ff3e00);
		}

		:global(.search-highlight) {
			background: rgba(255, 200, 0, 0.35);
			color: inherit;
			border-radius: 2px;
			padding: 0 1px;
		}

		@keyframes blink {
			50% {
				opacity: 0;
			}
		}

		/* Inline edit mode */
		.edit-overlay {
			display: flex;
			flex-direction: column;
			padding: 12px;
			gap: 8px;
		}

		.edit-textarea {
			width: 100%;
			min-height: 60px;
			padding: 12px;
			background: var(--traek-node-bg, #161616);
			color: var(--traek-node-text, #dddddd);
			border: 2px solid var(--traek-input-button-bg, #00d8ff);
			border-radius: 8px;
			font-family: inherit;
			font-size: 14px;
			line-height: 1.6;
			resize: vertical;
			outline: none;
			box-sizing: border-box;
		}

		.edit-textarea:focus {
			box-shadow: 0 0 8px var(--traek-thought-panel-glow, rgba(0, 216, 255, 0.3));
		}

		.edit-actions {
			display: flex;
			gap: 6px;
			justify-content: flex-end;
		}

		.edit-btn {
			padding: 4px 14px;
			border-radius: 6px;
			border: 1px solid;
			font-size: 12px;
			cursor: pointer;
			font-family: inherit;
			transition: opacity 0.15s;
		}

		.edit-btn:hover {
			opacity: 0.85;
		}

		.edit-btn-save {
			background: var(--traek-input-button-bg, #00d8ff);
			border-color: var(--traek-input-button-bg, #00d8ff);
			color: var(--traek-input-button-text, #000000);
		}

		.edit-btn-cancel {
			background: transparent;
			border-color: var(--traek-thought-panel-border, #333333);
			color: var(--traek-node-text, #dddddd);
		}
	}
</style>
