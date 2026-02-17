<script lang="ts">
	import type { Node, TraekEngineConfig } from '../TraekEngine.svelte';
	import type { ConnectionDragState } from './connectionPath.js';
	import { getConnectionPath } from './connectionPath.js';

	let {
		nodes,
		config,
		activeAncestorIds,
		hoveredNodeId = null,
		focusedNodeId = null,
		activeNodeId = null,
		hoveredConnection = $bindable(null),
		connectionDrag,
		collapsedNodes = new Set(),
		visibleNodeIds = new Set(),
		onDeleteConnection
	}: {
		nodes: Node[];
		config: TraekEngineConfig;
		activeAncestorIds: Set<string> | null;
		hoveredNodeId?: string | null;
		focusedNodeId?: string | null;
		activeNodeId?: string | null;
		hoveredConnection: { parentId: string; childId: string } | null;
		connectionDrag: ConnectionDragState | null;
		collapsedNodes?: Set<string>;
		visibleNodeIds?: Set<string>;
		onDeleteConnection: (parentId: string, childId: string) => void;
	} = $props();

	/** Node whose path to root should be highlighted (hover > focus > active/click). */
	const highlightNodeId = $derived(hoveredNodeId ?? focusedNodeId ?? activeNodeId ?? null);

	/**
	 * Get the CSS color variable for a node role.
	 */
	function getRoleColor(role: Node['role']): string {
		if (role === 'user') return 'var(--traek-node-user-border-top, #00d8ff)';
		if (role === 'assistant') return 'var(--traek-node-assistant-border-top, #ff3e00)';
		return 'var(--traek-connection-stroke, #333333)';
	}

	// Cursor position in canvas coordinates for the delete icon
	let hoverPos = $state<{ x: number; y: number } | null>(null);

	/**
	 * Build a Map for O(1) node lookup and cache collapsed subtree checks.
	 * This replaces the expensive nodes.find() and repeated isInCollapsedSubtree() calls.
	 */
	const nodeMap = $derived(new Map(nodes.map((n) => [n.id, n])));

	const collapsedCache = $derived.by(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const cache = new Map<string, boolean>();
		for (const node of nodes) {
			cache.set(node.id, isInCollapsedSubtree(node.id));
		}
		return cache;
	});

	/**
	 * Check if a node should be hidden because one of its ancestors is collapsed.
	 * A node is hidden if any ancestor in its primary parent chain is collapsed.
	 */
	function isInCollapsedSubtree(nodeId: string): boolean {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const visited = new Set<string>();
		let current = nodeMap.get(nodeId);
		while (current) {
			if (visited.has(current.id)) return false;
			visited.add(current.id);
			const primaryParentId = current.parentIds[0];
			if (!primaryParentId) return false;
			if (collapsedNodes.has(primaryParentId)) return true;
			current = nodeMap.get(primaryParentId);
		}
		return false;
	}

	/**
	 * Get all ancestor IDs for a node (following ALL parentIds, full DAG).
	 * Does NOT include the node itself.
	 */
	function getAncestorIds(nodeId: string): Set<string> {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const visited = new Set<string>();
		const node = nodeMap.get(nodeId);
		if (!node) return visited;

		const stack = [...node.parentIds];
		while (stack.length > 0) {
			const currentId = stack.pop()!;
			if (visited.has(currentId)) continue;
			visited.add(currentId);
			const currentNode = nodeMap.get(currentId);
			if (currentNode) {
				for (const pid of currentNode.parentIds) {
					stack.push(pid);
				}
			}
		}
		return visited;
	}

	/**
	 * Ancestors of the highlight node (path from node up to root). Used to mark all
	 * connections that lead TO this node (backtracked to root).
	 */
	const highlightAncestors = $derived(highlightNodeId ? getAncestorIds(highlightNodeId) : null);

	/** True if this edge (parent → child) lies on any path from root to the highlight node. */
	function isConnectionHighlighted(parentId: string, childId: string): boolean {
		if (!highlightNodeId || !highlightAncestors) return false;

		const parentIsAncestor = highlightAncestors.has(parentId);
		const childIsAncestor = highlightAncestors.has(childId);
		const childIsHighlightNode = childId === highlightNodeId;

		return parentIsAncestor && (childIsAncestor || childIsHighlightNode);
	}
</script>

<!-- SVG defs for gradients (userSpaceOnUse so vertical lines get a valid gradient) -->
<defs>
	{#each nodes as node (node.id)}
		{#if node.parentIds.length > 0 && node.type !== 'thought'}
			{#each node.parentIds as pid (pid)}
				{@const parent = nodeMap.get(pid)}
				{#if parent}
					{@const gradientId = `gradient-${pid}-${node.id}`}
					{@const parentColor = getRoleColor(parent.role)}
					{@const childColor = getRoleColor(node.role)}
					{@const gParentX = (parent.metadata?.x ?? 0) * config.gridStep}
					{@const gParentY = (parent.metadata?.y ?? 0) * config.gridStep}
					{@const gParentH = parent.metadata?.height ?? config.nodeHeightDefault}
					{@const gChildX = (node.metadata?.x ?? 0) * config.gridStep}
					{@const gChildY = (node.metadata?.y ?? 0) * config.gridStep}
					{@const gx1 = gParentX + config.nodeWidth / 2}
					{@const gy1 = gParentY + gParentH}
					{@const gx2 = gChildX + config.nodeWidth / 2}
					{@const gy2 = gChildY}
					<linearGradient
						id={gradientId}
						gradientUnits="userSpaceOnUse"
						x1={gx1}
						y1={gy1}
						x2={gx2}
						y2={gy2}
					>
						<stop offset="0%" stop-color={parentColor} />
						<stop offset="100%" stop-color={childColor} />
					</linearGradient>
				{/if}
			{/each}
		{/if}
	{/each}
</defs>

<!-- Single-pass rendering: compute path once, render all variants -->
{#each nodes as node (node.id)}
	{#if node.parentIds.length > 0 && node.type !== 'thought'}
		{@const isNodeHidden = collapsedCache.get(node.id) ?? false}
		{@const isChildVisible = visibleNodeIds.has(node.id)}
		{#if !isNodeHidden}
			{@const nodeX = (node.metadata?.x ?? 0) * config.gridStep}
			{@const nodeY = (node.metadata?.y ?? 0) * config.gridStep}
			{@const nodeH = node.metadata?.height ?? config.nodeHeightDefault}
			{#each node.parentIds as pid (pid)}
				{@const parent = nodeMap.get(pid)}
				{@const isParentVisible = visibleNodeIds.has(pid)}
				{#if parent && (isChildVisible || isParentVisible)}
					{@const parentX = (parent.metadata?.x ?? 0) * config.gridStep}
					{@const parentY = (parent.metadata?.y ?? 0) * config.gridStep}
					{@const parentH = parent.metadata?.height ?? config.nodeHeightDefault}
					{@const pathD = getConnectionPath(
						parentX,
						parentY,
						config.nodeWidth,
						parentH,
						nodeX,
						nodeY,
						config.nodeWidth,
						nodeH
					)}
					{@const isOnActivePath =
						activeAncestorIds !== null &&
						activeAncestorIds.has(parent.id) &&
						activeAncestorIds.has(node.id)}
					{@const isHoverAdjacent = isConnectionHighlighted(pid, node.id)}
					{@const gradientId = `gradient-${pid}-${node.id}`}
					{@const isChildCollapsed = collapsedNodes.has(node.id)}
					{@const isParentCollapsed = collapsedNodes.has(pid)}
					{@const isCollapsedConnection = isChildCollapsed || isParentCollapsed}

					<!-- Normal connection (not on active path) -->
					{#if !isOnActivePath}
						<path
							class="connection"
							class:faded={activeAncestorIds !== null && !isHoverAdjacent}
							class:hover-adjacent={isHoverAdjacent}
							class:collapsed={isCollapsedConnection}
							class:animated-flow={!isCollapsedConnection && !isHoverAdjacent}
							d={pathD}
							stroke={`url(#${gradientId})`}
						/>
					{/if}

					<!-- Highlighted connection (on active path) -->
					{#if isOnActivePath}
						<path
							class="connection connection--highlight"
							class:collapsed={isCollapsedConnection}
							d={pathD}
							stroke={`url(#${gradientId})`}
						/>
					{/if}

					<!-- Hit area for interaction (always rendered) -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<path
						class="connection-hit-area"
						d={pathD}
						onmouseenter={() => (hoveredConnection = { parentId: pid, childId: node.id })}
						onmousemove={(e) => {
							const svg = (e.target as SVGElement).ownerSVGElement;
							if (!svg) return;
							const pt = svg.createSVGPoint();
							pt.x = e.clientX;
							pt.y = e.clientY;
							const ctm = svg.getScreenCTM();
							if (!ctm) return;
							const svgPt = pt.matrixTransform(ctm.inverse());
							hoverPos = { x: svgPt.x - 25000, y: svgPt.y - 25000 };
						}}
						onmouseleave={() => {
							hoveredConnection = null;
							hoverPos = null;
						}}
						onclick={(e) => {
							e.stopPropagation();
							onDeleteConnection(pid, node.id);
							hoveredConnection = null;
							hoverPos = null;
						}}
					/>
				{/if}
			{/each}
		{/if}
	{/if}
{/each}

<!-- Delete highlight for hovered connection -->
{#if hoveredConnection}
	{@const hc = hoveredConnection}
	{@const hChild = nodeMap.get(hc.childId)}
	{@const hParent = nodeMap.get(hc.parentId)}
	{#if hChild && hParent}
		{@const hPathD = getConnectionPath(
			(hParent.metadata?.x ?? 0) * config.gridStep,
			(hParent.metadata?.y ?? 0) * config.gridStep,
			config.nodeWidth,
			hParent.metadata?.height ?? config.nodeHeightDefault,
			(hChild.metadata?.x ?? 0) * config.gridStep,
			(hChild.metadata?.y ?? 0) * config.gridStep,
			config.nodeWidth,
			hChild.metadata?.height ?? config.nodeHeightDefault
		)}
		<path class="connection connection--delete-highlight" d={hPathD} />
		{#if hoverPos}
			<g class="connection-delete-icon" transform="translate({hoverPos.x}, {hoverPos.y - 16})">
				<circle r="10" />
				<line x1="-4" y1="-4" x2="4" y2="4" />
				<line x1="4" y1="-4" x2="-4" y2="4" />
			</g>
		{/if}
	{/if}
{/if}

<!-- Connection drag rubber band -->
{#if connectionDrag}
	{@const sx = connectionDrag.sourceX}
	{@const sy = connectionDrag.sourceY}
	{@const cx = connectionDrag.currentX}
	{@const cy = connectionDrag.currentY}
	{@const dy = Math.abs(cy - sy)}
	{@const cpOffset = Math.max(40, dy * 0.5)}
	<path
		class="connection-rubber-band"
		d="M {sx} {sy} C {sx} {sy +
			(connectionDrag.sourcePortType === 'output' ? cpOffset : -cpOffset)}, {cx} {cy +
			(connectionDrag.sourcePortType === 'output' ? -cpOffset : cpOffset)}, {cx} {cy}"
	/>
{/if}

<style>
	.connection {
		transition:
			opacity 0.2s ease,
			stroke-width 0.2s ease;
		stroke-width: 1.5;
		fill: none;
	}

	.connection.faded {
		opacity: 0.35;
	}

	.connection.hover-adjacent {
		stroke-width: 2.5;
		opacity: 1;
		filter: brightness(1.4);
		stroke-dasharray: none;
		animation: none;
	}

	.connection.collapsed {
		stroke-dasharray: 6 4;
		opacity: 0.5;
	}

	.connection.animated-flow {
		stroke-dasharray: 4 4;
		animation: connection-flow 2s linear infinite;
	}

	@keyframes connection-flow {
		to {
			stroke-dashoffset: -20;
		}
	}

	.connection--highlight {
		stroke-width: 2.5;
		stroke-dasharray: none;
		animation: none;
		filter: brightness(1.3) drop-shadow(0 0 4px currentColor);
	}

	.connection--delete-highlight {
		stroke: var(--traek-connection-delete, #ff3e00);
		stroke-width: 3;
		stroke-dasharray: 8 6;
		animation: connection-delete-march 0.4s linear infinite;
		filter: drop-shadow(0 0 6px rgba(255, 62, 0, 0.5));
	}

	@keyframes connection-delete-march {
		to {
			stroke-dashoffset: -14;
		}
	}

	.connection-hit-area {
		stroke: transparent;
		stroke-width: 14;
		fill: none;
		pointer-events: stroke;
		cursor: pointer;
	}

	.connection-rubber-band {
		stroke: var(--traek-connection-highlight, #00d8ff);
		stroke-width: 2;
		stroke-dasharray: 6 4;
		fill: none;
		opacity: 0.8;
	}

	.connection-delete-icon circle {
		fill: rgba(255, 62, 0, 0.9);
	}

	.connection-delete-icon line {
		stroke: #ffffff;
		stroke-width: 2;
		stroke-linecap: round;
	}
</style>
