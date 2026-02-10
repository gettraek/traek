<script lang="ts">
	import { tick } from 'svelte';
	import { fadedSlide } from './transitions.js';
	import type { TraekEngine } from './TraekEngine.svelte';
	import TraekNodeWrapper from './TraekNodeWrapper.svelte';
	import { markdownToHtml } from './utils.ts';

	let {
		node,
		isActive,
		engine,
		viewportRoot = null,
		gridStep = 20,
		nodeWidth = 350,
		viewportResizeVersion = 0
	} = $props<{
		node: any;
		isActive: boolean;
		engine?: TraekEngine;
		viewportRoot?: HTMLElement | null;
		gridStep?: number;
		nodeWidth?: number;
		viewportResizeVersion?: number;
	}>();

	let scrollContainer = $state<HTMLElement | null>(null);
	let isScrolledToEnd = $state(false);

	const renderedContent = $derived(markdownToHtml(node.content ?? ''));

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
</script>

<TraekNodeWrapper
	{node}
	{isActive}
	{engine}
	{viewportRoot}
	{gridStep}
	{nodeWidth}
	{viewportResizeVersion}
>
	<div
		bind:this={scrollContainer}
		class="content-area custom-scrollbar"
		onscroll={() => checkScrolledToEnd(scrollContainer)}
	>
		<div class="text-content markdown-body">
			{#if node.content}
				{@html renderedContent}
			{:else if node.role === 'assistant'}
				<span class="typing-cursor">|</span>
			{/if}
		</div>
	</div>

	{#if node.content.length > 500 && !isScrolledToEnd}
		<div transition:fadedSlide={{ axis: 'y' }} class="scroll-hint">Scroll for more ↓</div>
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
		}

		.text-content {
			font-size: 14px;
			line-height: 1.6;
			color: var(--traek-textnode-text, #dddddd);
			word-break: break-word;
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

		@keyframes blink {
			50% {
				opacity: 0;
			}
		}
	}
</style>
