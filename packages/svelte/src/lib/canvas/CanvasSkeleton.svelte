<script lang="ts">
	/**
	 * CanvasSkeleton — full-canvas loading state showing ghost node placeholders
	 * in a spatial tree arrangement while content is being loaded or initialized.
	 */

	let { nodeCount = 4 }: { nodeCount?: number } = $props();

	// Static ghost node layout: mimics a small branching tree
	const GHOST_NODES = [
		{ x: 50, y: 8, width: 220, lines: 2, role: 'user' },
		{ x: 50, y: 44, width: 260, lines: 3, role: 'assistant' },
		{ x: 10, y: 82, width: 200, lines: 2, role: 'user' },
		{ x: 90, y: 82, width: 200, lines: 2, role: 'user' },
		{ x: 10, y: 116, width: 240, lines: 3, role: 'assistant' },
		{ x: 90, y: 116, width: 240, lines: 3, role: 'assistant' }
	] as const;

	const visibleNodes = $derived(GHOST_NODES.slice(0, Math.min(nodeCount + 2, GHOST_NODES.length)));

	const LINE_WIDTHS = ['85%', '68%', '52%'];
</script>

<div class="canvas-skeleton" aria-hidden="true" aria-label="Loading canvas…">
	<div class="canvas-skeleton__grid">
		<!-- Connection lines as SVG -->
		<svg class="canvas-skeleton__connections" viewBox="0 0 340 160" preserveAspectRatio="none">
			<!-- Root → child 1 -->
			<path d="M160,36 C160,52 160,52 160,52" class="skeleton-edge" style:--edge-delay="0.1s" />
			<!-- Child 1 → grandchild left -->
			<path d="M120,72 C90,82 90,82 90,90" class="skeleton-edge" style:--edge-delay="0.2s" />
			<!-- Child 1 → grandchild right -->
			<path d="M200,72 C230,82 230,82 230,90" class="skeleton-edge" style:--edge-delay="0.25s" />
			<!-- Grandchild left → leaf left -->
			<path d="M90,108 C90,120 90,120 90,124" class="skeleton-edge" style:--edge-delay="0.35s" />
			<!-- Grandchild right → leaf right -->
			<path d="M230,108 C230,120 230,120 230,124" class="skeleton-edge" style:--edge-delay="0.4s" />
		</svg>

		<!-- Ghost node cards -->
		{#each visibleNodes as node, i (i)}
			<div
				class="ghost-node ghost-node--{node.role}"
				style:left="{node.x}px"
				style:top="{node.y}px"
				style:width="{node.width}px"
				style:animation-delay="{i * 0.06}s"
			>
				<div class="ghost-node__header">
					<div class="ghost-node__role-dot"></div>
					<div class="ghost-node__role-label shimmer-line" style:width="48px"></div>
				</div>
				<div class="ghost-node__body">
					{#each Array.from({ length: node.lines }) as _, li (li)}
						<div
							class="shimmer-line"
							style:width={LINE_WIDTHS[li % LINE_WIDTHS.length]}
							style:animation-delay="{i * 0.06 + li * 0.08}s"
						></div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	@layer base {
		@keyframes skeleton-shimmer {
			0% {
				background-position: -400% center;
			}
			100% {
				background-position: 400% center;
			}
		}

		@keyframes ghost-node-appear {
			from {
				opacity: 0;
				transform: scale(0.96) translateY(4px);
			}
			to {
				opacity: 1;
				transform: scale(1) translateY(0);
			}
		}

		@keyframes edge-draw {
			from {
				stroke-dashoffset: 200;
				opacity: 0;
			}
			to {
				stroke-dashoffset: 0;
				opacity: 0.35;
			}
		}

		.canvas-skeleton {
			position: absolute;
			inset: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			pointer-events: none;
		}

		.canvas-skeleton__grid {
			position: relative;
			width: 340px;
			height: 200px;
		}

		.canvas-skeleton__connections {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			pointer-events: none;
		}

		.skeleton-edge {
			fill: none;
			stroke: var(--traek-connection-stroke, #333333);
			stroke-width: 1.5;
			stroke-dasharray: 200;
			stroke-dashoffset: 0;
			animation: edge-draw 0.5s ease-out both;
			animation-delay: var(--edge-delay, 0s);
		}

		.ghost-node {
			position: absolute;
			background: var(--traek-thought-panel-bg, rgba(22, 22, 22, 0.9));
			border: 1px solid var(--traek-thought-panel-border, #333333);
			border-radius: 10px;
			overflow: hidden;
			animation: ghost-node-appear 0.35s ease-out both;
			backdrop-filter: blur(8px);
		}

		.ghost-node--user {
			border-top: 2px solid var(--traek-node-user-border-top, rgba(0, 216, 255, 0.3));
		}

		.ghost-node--assistant {
			border-top: 2px solid var(--traek-node-assistant-border-top, rgba(255, 62, 0, 0.3));
		}

		.ghost-node__header {
			display: flex;
			align-items: center;
			gap: 6px;
			padding: 8px 12px 6px;
			border-bottom: 1px solid var(--traek-thought-panel-border, rgba(255, 255, 255, 0.06));
		}

		.ghost-node__role-dot {
			width: 7px;
			height: 7px;
			border-radius: 50%;
			background: linear-gradient(
				90deg,
				var(--traek-node-border, rgba(255, 255, 255, 0.08)) 25%,
				var(--traek-node-active-border, rgba(0, 216, 255, 0.12)) 50%,
				var(--traek-node-border, rgba(255, 255, 255, 0.08)) 75%
			);
			background-size: 200% 100%;
			animation: skeleton-shimmer 1.8s ease-in-out infinite;
			flex-shrink: 0;
		}

		.ghost-node__body {
			display: flex;
			flex-direction: column;
			gap: 8px;
			padding: 10px 12px;
		}

		.shimmer-line {
			height: 11px;
			border-radius: 6px;
			background: linear-gradient(
				90deg,
				var(--traek-node-border, rgba(255, 255, 255, 0.06)) 25%,
				var(--traek-node-active-border, rgba(0, 216, 255, 0.1)) 50%,
				var(--traek-node-border, rgba(255, 255, 255, 0.06)) 75%
			);
			background-size: 200% 100%;
			animation: skeleton-shimmer 1.8s ease-in-out infinite;
		}

		@media (prefers-reduced-motion: reduce) {
			.ghost-node {
				animation: none;
			}

			.skeleton-edge {
				animation: none;
				stroke-dashoffset: 0;
				opacity: 0.35;
			}

			.shimmer-line,
			.ghost-node__role-dot {
				animation: none;
				opacity: 0.3;
			}
		}
	}
</style>
