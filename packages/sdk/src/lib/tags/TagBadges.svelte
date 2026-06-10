<script lang="ts">
	import type { Node, TraekEngine } from '../TraekEngine.svelte';
	import { getNodeTags, getTagConfig, getTagLabel } from './tagUtils';
	import { getTraekI18n } from '../i18n/index';

	const t = getTraekI18n();

	let { node, engine }: { node: Node; engine?: TraekEngine } = $props();

	const tags = $derived(getNodeTags(node));

	function handleRemoveTag(tag: string) {
		if (engine) {
			engine.removeTag(node.id, tag);
		}
	}
</script>

{#if tags.length > 0}
	<span class="tag-badges">
		{#each tags as tag (tag)}
			{@const config = getTagConfig(tag)}
			<button
				type="button"
				class="tag-badge"
				style:color={config.color}
				style:background={config.bgColor}
				style:border-color={config.color}
				onclick={(e) => {
					e.stopPropagation();
					handleRemoveTag(tag);
				}}
				title={t.tags.removeTag}
			>
				<span class="tag-badge-label">{getTagLabel(tag, t)}</span>
				<span class="tag-badge-remove" aria-hidden="true">×</span>
			</button>
		{/each}
	</span>
{/if}

<style>
	.tag-badges {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px;
		padding: 0 8px 0 4px;
	}

	.tag-badge {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 2px 6px;
		border: 1px solid;
		border-radius: 999px;
		font-size: 9px;
		font-weight: 500;
		letter-spacing: 0.3px;
		cursor: pointer;
		transition:
			opacity 0.15s,
			transform 0.15s;
		text-transform: uppercase;
		line-height: 1;
	}

	.tag-badge:hover {
		opacity: 0.8;
		transform: scale(1.05);
	}

	.tag-badge:focus-visible {
		outline: 2px solid var(--traek-input-button-bg, #00d8ff);
		outline-offset: 2px;
	}

	/* Invisible hit-area extension so the touch target is at least 32x32px */
	.tag-badge::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: max(100%, 32px);
		height: max(100%, 32px);
	}

	.tag-badge-label {
		line-height: 1;
	}

	.tag-badge-remove {
		font-size: 12px;
		line-height: 1;
		opacity: 0.7;
	}

	.tag-badge:hover .tag-badge-remove {
		opacity: 1;
	}
</style>
