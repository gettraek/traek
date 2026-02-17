<script lang="ts">
	import type {
		TraekEngine,
		TraekEngineConfig,
		NodeComponentMap,
		CustomTraekNode
	} from '../TraekEngine.svelte';
	import type { NodeTypeRegistry } from '../node-types/NodeTypeRegistry.svelte';
	import TraekNodeWrapper from '../TraekNodeWrapper.svelte';

	let {
		engine,
		config,
		componentMap,
		registry,
		viewportEl,
		viewportResizeVersion,
		scale,
		visibleNodeIds,
		editingNodeId,
		onEditSave,
		onEditCancel,
		onEditNode,
		onRetry,
		onNodeActivated,
		focusedNodeId = null
	}: {
		engine: TraekEngine;
		config: TraekEngineConfig;
		componentMap: NodeComponentMap;
		registry?: NodeTypeRegistry;
		viewportEl: HTMLElement | null;
		viewportResizeVersion: number;
		scale: number;
		visibleNodeIds: Set<string>;
		editingNodeId: string | null;
		onEditSave: (nodeId: string, content: string) => void;
		onEditCancel: () => void;
		onEditNode: (nodeId: string) => void;
		onRetry?: (nodeId: string) => void;
		onNodeActivated?: (nodeId: string) => void;
		focusedNodeId?: string | null;
	} = $props();
</script>

{#each engine.nodes as node (node.id)}
	{@const isActive = engine.activeNodeId === node.id}
	{@const isFocused = focusedNodeId === node.id}
	{@const isNodeHidden = engine.isInCollapsedSubtree(node.id)}
	{@const isVisible = visibleNodeIds.has(node.id)}
	{#if !isNodeHidden}
		{#if isVisible || isActive || isFocused}
			{@const typeDef = registry?.get(node.type)}
			{@const uiData = node as CustomTraekNode}
			{@const ResolvedComponent =
				typeDef?.component ?? uiData?.component ?? componentMap[node.type]}
			{#if ResolvedComponent}
				{#if typeDef?.selfWrapping}
					<!-- Self-wrapping registry component (e.g. TextNode) -->
					<ResolvedComponent
						{node}
						{isActive}
						{isFocused}
						{engine}
						viewportRoot={viewportEl}
						gridStep={config.gridStep}
						nodeWidth={config.nodeWidth}
						{viewportResizeVersion}
						{scale}
						{editingNodeId}
						{onEditSave}
						{onEditCancel}
						onStartEdit={onEditNode}
					/>
				{:else}
					<!-- Wrapped component (registry, node.component, or componentMap) -->
					<TraekNodeWrapper
						{node}
						{isActive}
						{isFocused}
						{engine}
						viewportRoot={viewportEl}
						gridStep={config.gridStep}
						nodeWidth={config.nodeWidth}
						{viewportResizeVersion}
						{scale}
						{onRetry}
						{onNodeActivated}
					>
						<ResolvedComponent {node} {engine} {isActive} {...uiData?.props ?? {}} />
					</TraekNodeWrapper>
				{/if}
			{:else if node.type !== 'thought'}
				<!-- Fallback if no component found -->
				<TraekNodeWrapper
					{node}
					{isActive}
					{isFocused}
					{engine}
					viewportRoot={viewportEl}
					gridStep={config.gridStep}
					nodeWidth={config.nodeWidth}
					{viewportResizeVersion}
					{scale}
					{onRetry}
					{onNodeActivated}
				>
					<div class="node-card error">
						<div class="role-tag">{node.type}</div>
						<div class="node-card-content">Missing component for {node.type} node.</div>
					</div>
				</TraekNodeWrapper>
			{/if}
		{:else if node.type !== 'thought'}
			<!-- Placeholder for off-screen nodes to preserve scroll position -->
			<div
				class="node-placeholder"
				data-node-id={node.id}
				style:position="absolute"
				style:left="{(node.metadata?.x ?? 0) * config.gridStep}px"
				style:top="{(node.metadata?.y ?? 0) * config.gridStep}px"
				style:width="{config.nodeWidth}px"
				style:height="{node.metadata?.height ?? config.nodeHeightDefault}px"
				style:pointer-events="none"
				style:visibility="hidden"
			></div>
		{/if}
	{/if}
{/each}

<style>
	.node-card {
		position: absolute;
		width: 100%;
		min-height: 100px;
		background: var(--traek-node-bg, #161616);
		border: 1px solid var(--traek-node-border, #2a2a2a);
		border-radius: 12px;
		padding: 16px;
		color: var(--traek-node-text, #dddddd);
		transition:
			border-color 0.2s,
			box-shadow 0.2s,
			top 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
			left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
		cursor: pointer;
	}

	.role-tag {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 1px;
		margin-bottom: 8px;
		opacity: 0.5;
	}

	.node-card-content {
		font-size: 13px;
		line-height: 1.45;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.node-placeholder {
		/* Invisible placeholder to preserve layout for off-screen nodes */
		background: transparent;
	}
</style>
