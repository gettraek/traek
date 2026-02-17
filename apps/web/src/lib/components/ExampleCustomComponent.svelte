<script lang="ts">
	import type { Node, TraekEngine } from 'traek';

	let { node, engine, isActive } = $props<{
		node: Node;
		engine: TraekEngine;
		isActive: boolean;
	}>();
</script>

<div class="debug-node">
	<div class="debug-node__header">
		<span class="debug-node__title">Debug node</span>
		<span class="debug-node__badge" class:active={isActive}>
			{isActive ? 'ACTIVE' : 'INACTIVE'}
		</span>
	</div>

	<div class="debug-node__section">
		<div class="debug-node__label">Node</div>
		<div class="debug-node__rows">
			<div class="debug-node__row">
				<span>ID</span>
				<code>{node.id}</code>
			</div>
			<div class="debug-node__row">
				<span>Type</span>
				<code>{node.type}</code>
			</div>
			<div class="debug-node__row">
				<span>Role</span>
				<code>{node.role}</code>
			</div>
			<div class="debug-node__row">
				<span>Parent</span>
				<code>{node.parentIds.length > 0 ? node.parentIds.join(', ') : 'root'}</code>
			</div>
			<div class="debug-node__row">
				<span>Position</span>
				<code>
					x={node.metadata?.x ?? 0}, y={node.metadata?.y ?? 0}, h={node.metadata?.height ?? '–'}
				</code>
			</div>
		</div>
	</div>

	<div class="debug-node__section">
		<div class="debug-node__label">Engine</div>
		<div class="debug-node__rows">
			<div class="debug-node__row">
				<span>Total nodes</span>
				<code>{engine.nodes.length}</code>
			</div>
			<div class="debug-node__row">
				<span>Active node</span>
				<code>{engine.activeNodeId?.substring(0, 4).toUpperCase() ?? 'none'}</code>
			</div>
			<div class="debug-node__row">
				<span>Context path length</span>
				<code>{engine.contextPath().length}</code>
			</div>
		</div>
	</div>
</div>

<style>
	@layer base {
		.debug-node {
			display: flex;
			flex-direction: column;
			gap: 10px;
			padding: 12px 14px;
			background: var(--traek-node-bg, rgba(0, 0, 0, 0.3));
			color: #e5e5e5;
			font-family:
				system-ui,
				-apple-system,
				BlinkMacSystemFont,
				'SF Pro Text',
				sans-serif;
			font-size: 12px;
		}

		.debug-node__header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 4px;
		}

		.debug-node__title {
			text-transform: uppercase;
			letter-spacing: 0.08em;
			font-size: 10px;
			color: #9ca3af;
		}

		.debug-node__badge {
			font-size: 10px;
			padding: 2px 6px;
			border-radius: 999px;
			background: var(--traek-node-active-glow, rgba(148, 163, 184, 0.2));
			color: var(--traek-node-text, #9ca3af);
		}

		.debug-node__badge.active {
			background: var(--traek-node-active-glow, rgba(56, 189, 248, 0.18));
			color: var(--traek-node-text, #e0f2fe);
		}

		.debug-node__section {
			border-radius: 10px;
			padding: 8px 10px;
			background: var(--traek-node-bg, rgba(15, 23, 42, 0.6));
			border: 1px solid var(--traek-node-border, rgba(148, 163, 184, 0.25));
		}

		.debug-node__label {
			font-size: 10px;
			text-transform: uppercase;
			letter-spacing: 0.08em;
			color: var(--traek-node-text, #9ca3af);
			margin-bottom: 4px;
		}

		.debug-node__rows {
			display: flex;
			flex-direction: column;
			gap: 3px;
		}

		.debug-node__row {
			display: flex;
			justify-content: space-between;
			gap: 8px;
			align-items: baseline;
		}

		.debug-node__row span {
			color: var(--traek-node-text, #9ca3af);
		}

		.debug-node__row code {
			font-family:
				ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
				monospace;
			font-size: 11px;
			color: var(--traek-node-text, #e5e5e5);
		}
	}
</style>
