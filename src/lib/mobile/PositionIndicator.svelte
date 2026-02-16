<script lang="ts">
	let {
		depth,
		maxDepth,
		siblingIndex,
		siblingTotal,
		hasChildren,
		childCount = 0
	}: {
		depth: number;
		maxDepth: number;
		siblingIndex: number;
		siblingTotal: number;
		hasChildren: boolean;
		childCount?: number;
	} = $props();
</script>

<div class="position-indicator">
	<span class="depth-label">{depth + 1} / {maxDepth + 1}</span>

	{#if siblingTotal > 1}
		<div class="sibling-dots" role="list" aria-label="Sibling position">
			{#each Array(siblingTotal) as _, i}
				<span
					class="dot"
					class:active={i === siblingIndex}
					role="listitem"
					aria-label="Position {i + 1} of {siblingTotal}"
					aria-current={i === siblingIndex ? 'true' : 'false'}
				></span>
			{/each}
		</div>
	{/if}

	{#if hasChildren}
		<span class="branch-icon" title="{childCount} {childCount === 1 ? 'child' : 'children'}">
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
				<path
					d="M7 2v6M7 8c-2 0-3 2-5 2M7 8c2 0 3 2 5 2"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
				/>
			</svg>
			{#if childCount > 1}
				<span class="child-count">{childCount}</span>
			{/if}
		</span>
	{/if}
</div>

<style>
	.position-indicator {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 14px;
		background: var(--traek-input-context-bg, rgba(0, 0, 0, 0.4));
		backdrop-filter: blur(10px);
		border-radius: 20px;
		font-size: 12px;
		color: var(--traek-input-context-text, #888888);
		user-select: none;
	}

	.depth-label {
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.5px;
	}

	.sibling-dots {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--traek-input-dot-muted, #555555);
		transition: background 0.15s ease;
	}

	.dot.active {
		background: var(--traek-input-dot, #00d8ff);
		width: 8px;
		height: 8px;
	}

	.branch-icon {
		display: flex;
		align-items: center;
		gap: 3px;
		color: var(--traek-input-context-text, #888888);
	}

	.child-count {
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}
</style>
