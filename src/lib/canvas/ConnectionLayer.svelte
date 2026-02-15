<script lang="ts">
	import type { Node, TraekEngineConfig } from '../TraekEngine.svelte';
	import type { ConnectionDragState } from './connectionPath.js';
	import { getConnectionPath } from './connectionPath.js';

	let {
		nodes,
		config,
		activeAncestorIds,
		hoveredNodeId = null,
		hoveredConnection = $bindable(null),
		connectionDrag,
		onDeleteConnection
	}: {
		nodes: Node[];
		config: TraekEngineConfig;
		activeAncestorIds: Set<string> | null;
		hoveredNodeId?: string | null;
		hoveredConnection: { parentId: string; childId: string } | null;
		connectionDrag: ConnectionDragState | null;
		onDeleteConnection: (parentId: string, childId: string) => void;
	} = $props();

	// Cursor position in canvas coordinates for the delete icon
	let hoverPos = $state<{ x: number; y: number } | null>(null);
</script>

{#each nodes as node}
	{#if node.parentIds.length > 0 && node.type !== 'thought'}
		{@const nodeX = (node.metadata?.x ?? 0) * config.gridStep}
		{@const nodeY = (node.metadata?.y ?? 0) * config.gridStep}
		{@const nodeH = node.metadata?.height ?? config.nodeHeightDefault}
		{#each node.parentIds as pid}
			{@const parent = nodes.find((n) => n.id === pid)}
			{#if parent}
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
				{@const isHoverAdjacent =
					hoveredNodeId !== null &&
					(parent.id === hoveredNodeId || node.id === hoveredNodeId)}
				{#if !isOnActivePath}
					<path
						class="connection"
						class:faded={activeAncestorIds !== null && !isHoverAdjacent}
						class:hover-adjacent={isHoverAdjacent}
						d={pathD}
					/>
				{/if}
			{/if}
		{/each}
	{/if}
{/each}

{#each nodes as node}
	{#if node.parentIds.length > 0 && node.type !== 'thought'}
		{@const nodeX = (node.metadata?.x ?? 0) * config.gridStep}
		{@const nodeY = (node.metadata?.y ?? 0) * config.gridStep}
		{@const nodeH = node.metadata?.height ?? config.nodeHeightDefault}
		{#each node.parentIds as pid}
			{@const parent = nodes.find((n) => n.id === pid)}
			{#if parent}
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
				{#if isOnActivePath}
					<path class="connection connection--highlight" d={pathD} />
				{/if}
			{/if}
		{/each}
	{/if}
{/each}
<!-- Delete highlight for hovered connection -->
{#if hoveredConnection}
	{@const hc = hoveredConnection}
	{@const hChild = nodes.find((n) => n.id === hc.childId)}
	{@const hParent = nodes.find((n) => n.id === hc.parentId)}
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

<!-- Invisible hit areas for clicking/deleting connections -->
{#each nodes as node}
	{#if node.parentIds.length > 0 && node.type !== 'thought'}
		{@const nodeX = (node.metadata?.x ?? 0) * config.gridStep}
		{@const nodeY = (node.metadata?.y ?? 0) * config.gridStep}
		{@const nodeH = node.metadata?.height ?? config.nodeHeightDefault}
		{#each node.parentIds as pid}
			{@const parent = nodes.find((n) => n.id === pid)}
			{#if parent}
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
{/each}

{#if connectionDrag}
	{@const sx = connectionDrag.sourceX}
	{@const sy = connectionDrag.sourceY}
	{@const cx = connectionDrag.currentX}
	{@const cy = connectionDrag.currentY}
	{@const dy = Math.abs(cy - sy)}
	{@const cpOffset = Math.max(40, dy * 0.5)}
	<path
		class="connection-rubber-band"
		d="M {sx} {sy} C {sx} {sy + (connectionDrag.sourcePortType === 'output' ? cpOffset : -cpOffset)}, {cx} {cy + (connectionDrag.sourcePortType === 'output' ? -cpOffset : cpOffset)}, {cx} {cy}"
	/>
{/if}

<style>
	.connection {
		transition: opacity 0.2s ease;
	}

	.connection.faded {
		opacity: 0.2;
	}

	.connection.hover-adjacent {
		stroke: var(--traek-connection-hover, rgba(255, 255, 255, 0.6));
		stroke-width: 2;
		opacity: 1;
	}

	.connection--highlight {
		stroke: var(--traek-connection-highlight, #00d8ff);
		stroke-width: 2.5;
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
