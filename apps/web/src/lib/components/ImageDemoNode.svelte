<script lang="ts">
	import type { Node, TraekEngine } from 'traek';

	type ImageData = {
		prompt?: string;
		imageUrl?: string;
		status?: 'loading' | 'done' | 'error';
		error?: string;
	};

	let { node, isActive } = $props<{
		node: Node;
		engine: TraekEngine;
		isActive: boolean;
	}>();

	const data = $derived((node.data ?? {}) as ImageData);
</script>

<div class="image-node" data-node-id={node.id}>
	<div class="image-node__header">
		<span class="image-node__title">Generated image</span>
		<span class="image-node__badge" class:active={isActive}>
			{#if data.status === 'loading'}
				Generating…
			{:else if data.status === 'error'}
				Error
			{:else}
				Ready
			{/if}
		</span>
	</div>

	{#if data.status === 'error'}
		<div class="image-node__error">
			<p>Could not generate image.</p>
			{#if data.error}
				<p class="image-node__error-detail">{data.error}</p>
			{/if}
		</div>
	{:else}
		<div class="image-node__body" class:loading={data.status === 'loading'}>
			{#if data.imageUrl}
				<div class="image-node__image-wrap">
					<img src={data.imageUrl} alt={data.prompt ?? 'Generated image'} loading="lazy" />
				</div>
			{:else}
				<div class="image-node__placeholder">
					<div class="image-node__spinner" aria-hidden="true"></div>
					<span>Waiting for image…</span>
				</div>
			{/if}
		</div>
	{/if}

	{#if data.prompt}
		<div class="image-node__footer">
			<div class="image-node__footer-label">Prompt</div>
			<p>{data.prompt}</p>
		</div>
	{/if}
</div>

<style>
	@layer base {
		.image-node {
			display: flex;
			flex-direction: column;
			gap: 10px;
			padding: 10px 12px 12px;
			background: rgba(0, 0, 0, 0.3);
			color: #e5e5e5;
			font-family:
				system-ui,
				-apple-system,
				BlinkMacSystemFont,
				'SF Pro Text',
				sans-serif;
			font-size: 12px;
		}

		.image-node__header {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}

		.image-node__title {
			text-transform: uppercase;
			letter-spacing: 0.08em;
			font-size: 10px;
			color: #9ca3af;
		}

		.image-node__badge {
			font-size: 10px;
			padding: 2px 6px;
			border-radius: 999px;
			background: rgba(148, 163, 184, 0.2);
			color: #9ca3af;
		}

		.image-node__badge.active {
			background: rgba(56, 189, 248, 0.18);
			color: #e0f2fe;
		}

		.image-node__body {
			border-radius: 10px;
			background: rgba(15, 23, 42, 0.8);
			border: 1px solid rgba(148, 163, 184, 0.35);
			padding: 6px;
		}

		.image-node__body.loading {
			opacity: 0.85;
		}

		.image-node__image-wrap {
			border-radius: 8px;
			overflow: hidden;
			max-height: 260px;
		}

		.image-node__image-wrap img {
			display: block;
			width: 100%;
			height: auto;
			object-fit: cover;
		}

		.image-node__placeholder {
			display: flex;
			align-items: center;
			gap: 8px;
			justify-content: center;
			padding: 24px 8px;
			color: #9ca3af;
		}

		.image-node__spinner {
			width: 14px;
			height: 14px;
			border-radius: 50%;
			border: 2px solid rgba(148, 163, 184, 0.6);
			border-top-color: transparent;
			animation: image-node-spin 0.8s linear infinite;
		}

		.image-node__footer {
			border-radius: 8px;
			padding: 6px 8px;
			background: rgba(15, 23, 42, 0.7);
			border: 1px solid rgba(148, 163, 184, 0.25);
		}

		.image-node__footer-label {
			display: block;
			font-size: 10px;
			text-transform: uppercase;
			letter-spacing: 0.08em;
			color: #9ca3af;
			margin-bottom: 2px;
		}

		.image-node__footer p {
			margin: 0;
			font-size: 11px;
			color: #d4d4d4;
		}

		.image-node__error {
			padding: 10px 8px;
			border-radius: 8px;
			background: rgba(127, 29, 29, 0.4);
			border: 1px solid rgba(248, 113, 113, 0.6);
			color: #fee2e2;
			font-size: 11px;
		}

		.image-node__error-detail {
			margin-top: 4px;
			font-size: 10px;
			opacity: 0.9;
		}

		@keyframes image-node-spin {
			to {
				transform: rotate(360deg);
			}
		}
	}
</style>
