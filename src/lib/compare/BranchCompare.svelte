<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { wordDiff } from './diffUtils.js';
	import type { TraekEngine, Node, MessageNode } from '../TraekEngine.svelte';

	let {
		engine,
		nodeId,
		onClose
	}: {
		engine: TraekEngine;
		nodeId: string;
		onClose: () => void;
	} = $props();

	const node = $derived(engine.getNode(nodeId));
	const children = $derived(
		node ? engine.getChildren(nodeId).filter((c) => c.type !== 'thought') : []
	);

	// Selected branch indices for comparison
	let selectedBranchA = $state(0);
	let selectedBranchB = $state(1);

	// Get linear path from a node to its leaf (following primary parent chain downward)
	function getLinearPath(startNode: Node): Node[] {
		const path: Node[] = [startNode];
		let current = startNode;

		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const visited = new Set<string>([current.id]);

		while (true) {
			const kids = engine.getChildren(current.id).filter((c) => c.type !== 'thought');
			if (kids.length === 0) break;
			// Follow first child (primary branch)
			const next = kids[0];
			if (visited.has(next.id)) break; // Cycle detection
			visited.add(next.id);
			path.push(next);
			current = next;
		}

		return path;
	}

	// Concatenate all message contents from a path
	function pathToText(path: Node[]): string {
		return path.map((n) => (n as MessageNode).content ?? '').join('\n\n');
	}

	const branchPathA = $derived(
		children[selectedBranchA] ? getLinearPath(children[selectedBranchA]) : []
	);
	const branchPathB = $derived(
		children[selectedBranchB] ? getLinearPath(children[selectedBranchB]) : []
	);

	const textA = $derived(pathToText(branchPathA));
	const textB = $derived(pathToText(branchPathB));

	const diff = $derived(wordDiff(textA, textB));

	// Group diff segments for display: left side (removed/same), right side (added/same)
	const leftSegments = $derived(diff.filter((s) => s.type === 'removed' || s.type === 'same'));
	const rightSegments = $derived(diff.filter((s) => s.type === 'added' || s.type === 'same'));

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if node && children.length >= 2}
	<div
		class="compare-backdrop"
		role="presentation"
		transition:fade={{ duration: 200 }}
		onclick={onClose}
	></div>
	<div
		class="compare-overlay"
		role="dialog"
		aria-modal="true"
		aria-labelledby="compare-title"
		tabindex="-1"
		transition:fly={{ y: 20, duration: 250 }}
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
	>
		<div class="compare-header">
			<h2 id="compare-title" class="compare-title">Compare Branches</h2>
			<button type="button" class="compare-close" onclick={onClose} aria-label="Close comparison">
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
					<path
						d="M5 5L15 15M15 5L5 15"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
			</button>
		</div>

		{#if children.length > 2}
			<div class="compare-selectors">
				<label class="compare-selector">
					<span class="compare-selector-label">Branch A:</span>
					<select bind:value={selectedBranchA} class="compare-select">
						{#each children as child, i (child.id)}
							<option value={i} disabled={i === selectedBranchB}>
								Branch {i + 1} ({child.role})
							</option>
						{/each}
					</select>
				</label>
				<label class="compare-selector">
					<span class="compare-selector-label">Branch B:</span>
					<select bind:value={selectedBranchB} class="compare-select">
						{#each children as child, i (child.id)}
							<option value={i} disabled={i === selectedBranchA}>
								Branch {i + 1} ({child.role})
							</option>
						{/each}
					</select>
				</label>
			</div>
		{/if}

		<div class="compare-content">
			<div class="compare-pane compare-pane--left">
				<div class="compare-pane-header">
					Branch A
					{#if children[selectedBranchA]}
						<span class="compare-pane-meta">
							({branchPathA.length} node{branchPathA.length !== 1 ? 's' : ''})
						</span>
					{/if}
				</div>
				<div class="compare-pane-body">
					<div class="compare-text">
						{#each leftSegments as segment (segment)}
							<span class="diff-segment diff-segment--{segment.type}">{segment.text}</span>
						{/each}
					</div>
				</div>
			</div>

			<div class="compare-divider"></div>

			<div class="compare-pane compare-pane--right">
				<div class="compare-pane-header">
					Branch B
					{#if children[selectedBranchB]}
						<span class="compare-pane-meta">
							({branchPathB.length} node{branchPathB.length !== 1 ? 's' : ''})
						</span>
					{/if}
				</div>
				<div class="compare-pane-body">
					<div class="compare-text">
						{#each rightSegments as segment (segment)}
							<span class="diff-segment diff-segment--{segment.type}">{segment.text}</span>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<div class="compare-footer">
			<div class="compare-legend">
				<span class="compare-legend-item">
					<span class="compare-legend-swatch compare-legend-swatch--removed"></span>
					Only in A
				</span>
				<span class="compare-legend-item">
					<span class="compare-legend-swatch compare-legend-swatch--added"></span>
					Only in B
				</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.compare-backdrop {
		position: fixed;
		inset: 0;
		background: var(--traek-overlay-gradient-1, rgba(0, 0, 0, 0.7));
		backdrop-filter: blur(4px);
		z-index: 100;
	}

	.compare-overlay {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 90%;
		max-width: 1200px;
		max-height: 85vh;
		background: var(--traek-overlay-card-bg, rgba(15, 15, 15, 0.95));
		border: 1px solid var(--traek-overlay-card-border, rgba(255, 255, 255, 0.08));
		border-radius: 16px;
		box-shadow: 0 16px 48px var(--traek-overlay-card-shadow, rgba(0, 0, 0, 0.8));
		display: flex;
		flex-direction: column;
		z-index: 101;
		overflow: hidden;
	}

	.compare-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px;
		border-bottom: 1px solid var(--traek-thought-divider, rgba(255, 255, 255, 0.06));
		flex-shrink: 0;
	}

	.compare-title {
		font-size: 18px;
		font-weight: 600;
		color: var(--traek-overlay-text, #e5e5e5);
		margin: 0;
	}

	.compare-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 8px;
		color: var(--traek-thought-row-muted-1, #888888);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}

	.compare-close:hover {
		background: rgba(255, 255, 255, 0.08);
		color: var(--traek-overlay-text, #e5e5e5);
	}

	.compare-close:focus-visible {
		outline: 2px solid var(--traek-input-button-bg, #00d8ff);
		outline-offset: 2px;
	}

	.compare-selectors {
		display: flex;
		gap: 16px;
		padding: 16px 24px;
		background: var(--traek-thought-header-bg, rgba(255, 255, 255, 0.03));
		border-bottom: 1px solid var(--traek-thought-divider, rgba(255, 255, 255, 0.06));
		flex-shrink: 0;
	}

	.compare-selector {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
	}

	.compare-selector-label {
		font-size: 12px;
		font-weight: 500;
		color: var(--traek-thought-row-muted-1, #888888);
		white-space: nowrap;
	}

	.compare-select {
		flex: 1;
		padding: 6px 10px;
		background: var(--traek-node-bg, #161616);
		border: 1px solid var(--traek-node-border, #2a2a2a);
		border-radius: 6px;
		color: var(--traek-node-text, #dddddd);
		font-size: 13px;
		font-family: inherit;
		cursor: pointer;
		transition: border-color 0.15s;
	}

	.compare-select:hover {
		border-color: var(--traek-input-button-bg, #00d8ff);
	}

	.compare-select:focus {
		outline: none;
		border-color: var(--traek-input-button-bg, #00d8ff);
		box-shadow: 0 0 0 3px var(--traek-thought-panel-glow, rgba(0, 216, 255, 0.15));
	}

	.compare-content {
		display: flex;
		flex: 1;
		min-height: 0;
		gap: 1px;
		background: var(--traek-thought-divider, rgba(255, 255, 255, 0.06));
	}

	.compare-pane {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		background: var(--traek-node-bg, #161616);
	}

	.compare-pane-header {
		padding: 12px 16px;
		background: var(--traek-thought-header-bg, rgba(255, 255, 255, 0.03));
		border-bottom: 1px solid var(--traek-thought-divider, rgba(255, 255, 255, 0.06));
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--traek-thought-header-accent, #888888);
		flex-shrink: 0;
	}

	.compare-pane-meta {
		font-weight: 400;
		opacity: 0.7;
		text-transform: none;
		margin-left: 6px;
	}

	.compare-pane-body {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		min-height: 0;
	}

	.compare-pane-body::-webkit-scrollbar {
		width: 8px;
	}

	.compare-pane-body::-webkit-scrollbar-track {
		background: transparent;
	}

	.compare-pane-body::-webkit-scrollbar-thumb {
		background: var(--traek-scrollbar-thumb, #333333);
		border-radius: 4px;
	}

	.compare-pane-body::-webkit-scrollbar-thumb:hover {
		background: var(--traek-scrollbar-thumb-hover, #444444);
	}

	.compare-text {
		font-size: 14px;
		line-height: 1.6;
		color: var(--traek-textnode-text, #dddddd);
		white-space: pre-wrap;
		word-break: break-word;
	}

	.diff-segment {
		display: inline;
	}

	.diff-segment--same {
		color: var(--traek-textnode-text, #dddddd);
	}

	.diff-segment--removed {
		background: rgba(255, 62, 0, 0.2);
		color: #ffb399;
		text-decoration: line-through;
		text-decoration-color: rgba(255, 62, 0, 0.5);
	}

	.diff-segment--added {
		background: rgba(0, 255, 163, 0.15);
		color: #99ffcc;
	}

	.compare-divider {
		width: 1px;
		background: var(--traek-thought-divider, rgba(255, 255, 255, 0.06));
		flex-shrink: 0;
	}

	.compare-footer {
		display: flex;
		justify-content: center;
		padding: 12px 24px;
		border-top: 1px solid var(--traek-thought-divider, rgba(255, 255, 255, 0.06));
		flex-shrink: 0;
	}

	.compare-legend {
		display: flex;
		gap: 24px;
		align-items: center;
	}

	.compare-legend-item {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		color: var(--traek-thought-row-muted-1, #888888);
	}

	.compare-legend-swatch {
		width: 12px;
		height: 12px;
		border-radius: 3px;
	}

	.compare-legend-swatch--removed {
		background: rgba(255, 62, 0, 0.4);
	}

	.compare-legend-swatch--added {
		background: rgba(0, 255, 163, 0.4);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.compare-overlay {
			width: 95%;
			max-height: 90vh;
		}

		.compare-content {
			flex-direction: column;
		}

		.compare-divider {
			width: 100%;
			height: 1px;
		}

		.compare-selectors {
			flex-direction: column;
			gap: 12px;
		}
	}
</style>
