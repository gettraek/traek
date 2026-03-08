<script lang="ts">
	import type { MessageNode } from '../../TraekEngine.svelte';
	import { imageNodeDataSchema, type ImageEntry } from './types';
	import Lightbox from './Lightbox.svelte';

	let { node }: { node: MessageNode } = $props();

	const data = $derived.by(() => {
		const result = imageNodeDataSchema.safeParse(node.data);
		return result.success ? result.data : null;
	});

	let lightboxOpen = $state(false);
	let lightboxIndex = $state(0);
	let imageErrors = $state<Set<number>>(new Set());
	let imageLoaded = $state<Set<number>>(new Set());

	function openLightbox(index: number) {
		lightboxIndex = index;
		lightboxOpen = true;
	}

	function handleImgError(index: number) {
		imageErrors = new Set([...imageErrors, index]);
		imageLoaded = new Set([...imageLoaded, index]);
	}

	function handleImgLoad(index: number) {
		imageLoaded = new Set([...imageLoaded, index]);
	}

	function downloadImage(img: ImageEntry) {
		const a = document.createElement('a');
		a.href = img.src;
		a.download = img.alt || 'image';
		a.click();
	}

	const images = $derived(data?.images ?? []);
	const layout = $derived(
		images.length === 1
			? 'single'
			: images.length === 2
				? 'two'
				: images.length === 3
					? 'three'
					: 'grid'
	);
	const visibleImages = $derived(images.slice(0, 4));
	const overflow = $derived(Math.max(0, images.length - 4));
</script>

<div class="image-node">
	{#if !data}
		<div class="error-state" role="alert">Invalid image data</div>
	{:else}
		<div
			class="image-grid"
			class:layout-single={layout === 'single'}
			class:layout-two={layout === 'two'}
			class:layout-three={layout === 'three'}
			class:layout-grid={layout === 'grid'}
		>
			{#each visibleImages as img, i (i)}
				<div class="img-cell" class:primary={layout === 'three' && i === 0}>
					{#if imageErrors.has(i)}
						<div class="img-error" role="img" aria-label={img.alt}>
							<span class="img-error-icon">🖼</span>
							<span>Failed to load</span>
							<button
								onclick={() => {
									imageErrors = new Set([...imageErrors].filter((n) => n !== i));
									imageLoaded = new Set([...imageLoaded].filter((n) => n !== i));
								}}
							>
								Retry
							</button>
						</div>
					{:else}
						{#if !imageLoaded.has(i)}
							<div class="img-shimmer" aria-hidden="true"></div>
						{/if}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
						<img
							src={img.src}
							alt={img.alt}
							loading="lazy"
							class="img-preview"
							class:img-preview--loaded={imageLoaded.has(i)}
							onclick={() => openLightbox(i)}
							onerror={() => handleImgError(i)}
							onload={() => handleImgLoad(i)}
						/>
						{#if i === 3 && overflow > 0}
							<button
								class="overflow-badge"
								onclick={() => openLightbox(3)}
								aria-label="View {overflow} more images"
							>
								+{overflow}
							</button>
						{/if}
					{/if}
				</div>
			{/each}
		</div>

		<div class="image-footer">
			{#if data.caption}
				<span class="caption">{data.caption}</span>
			{/if}
			<div class="image-actions">
				<button
					class="action-btn"
					aria-label="View fullscreen"
					onclick={() => openLightbox(0)}
					title="View fullscreen"
				>
					🔍
				</button>
				{#if images[0]?.src}
					<button
						class="action-btn"
						aria-label="Download image"
						onclick={() => downloadImage(images[0])}
						title="Download"
					>
						⬇
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>

{#if lightboxOpen && data}
	<Lightbox
		images={data.images}
		startIndex={lightboxIndex}
		onClose={() => (lightboxOpen = false)}
	/>
{/if}

<style>
	@keyframes img-shimmer {
		0% {
			background-position: -200% center;
		}
		100% {
			background-position: 200% center;
		}
	}

	.image-node {
		background: var(--traek-node-bg, #1e1e1e);
		border: 1px solid var(--traek-node-border, #2a2a2a);
		border-radius: 8px;
		overflow: hidden;
		min-width: 280px;
		max-width: 500px;
	}

	.image-grid {
		display: grid;
		gap: 2px;
		background: #111113;
	}

	.layout-single {
		grid-template-columns: 1fr;
	}

	.layout-two {
		grid-template-columns: 1fr 1fr;
	}

	.layout-three {
		grid-template-columns: 2fr 1fr;
		grid-template-rows: 1fr 1fr;
	}

	.layout-grid {
		grid-template-columns: 1fr 1fr;
	}

	.img-cell {
		position: relative;
		background: #111113;
		min-height: 120px;
		overflow: hidden;
	}

	.img-cell.primary {
		grid-row: 1 / 3;
	}

	/* Shimmer placeholder shown while image is loading */
	.img-shimmer {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			var(--traek-node-border, rgba(255, 255, 255, 0.06)) 25%,
			var(--traek-node-active-border, rgba(0, 216, 255, 0.1)) 50%,
			var(--traek-node-border, rgba(255, 255, 255, 0.06)) 75%
		);
		background-size: 200% 100%;
		animation: img-shimmer 1.6s ease-in-out infinite;
		z-index: 1;
	}

	.img-preview {
		width: 100%;
		height: 100%;
		max-height: 280px;
		object-fit: contain;
		display: block;
		cursor: zoom-in;
		/* Hidden until loaded — shimmer shows beneath */
		opacity: 0;
		transition: opacity 0.25s ease-out;
		position: relative;
		z-index: 2;
	}

	.img-preview--loaded {
		opacity: 1;
	}

	.layout-single .img-preview {
		max-height: 280px;
		object-fit: contain;
	}

	.layout-two .img-preview,
	.layout-grid .img-preview {
		height: 140px;
		object-fit: cover;
		max-height: none;
	}

	.layout-three .img-cell.primary .img-preview {
		height: 200px;
		object-fit: cover;
		max-height: none;
	}

	.layout-three .img-cell:not(.primary) .img-preview {
		height: 98px;
		object-fit: cover;
		max-height: none;
	}

	.img-error {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		height: 120px;
		color: var(--traek-node-text, #999);
		font-size: 12px;
	}

	.img-error-icon {
		font-size: 24px;
		opacity: 0.4;
	}

	.img-error button {
		background: transparent;
		border: 1px solid var(--traek-node-border, #333);
		color: var(--traek-node-text, #999);
		font-size: 11px;
		padding: 2px 8px;
		border-radius: 4px;
		cursor: pointer;
		margin-top: 4px;
	}

	.overflow-badge {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.55);
		color: #fff;
		font-size: 20px;
		font-weight: 600;
		border: none;
		cursor: pointer;
		letter-spacing: -0.5px;
		z-index: 3;
	}

	.overflow-badge:hover {
		background: rgba(0, 0, 0, 0.7);
	}

	.overflow-badge:focus-visible {
		outline: 2px solid var(--traek-input-button-bg, #00d8ff);
		outline-offset: -2px;
	}

	.image-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 10px;
		gap: 8px;
	}

	.caption {
		font-size: 12px;
		color: var(--traek-thought-header-accent, #888);
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.image-actions {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
	}

	.action-btn {
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		color: var(--traek-node-text, #999);
		font-size: 14px;
		border-radius: 4px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.action-btn:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.action-btn:focus-visible {
		outline: 2px solid var(--traek-input-button-bg, #00d8ff);
		outline-offset: 2px;
	}

	.error-state {
		padding: 16px;
		color: #ef4444;
		font-size: 13px;
	}

	@media (prefers-reduced-motion: reduce) {
		.img-shimmer {
			animation: none;
			opacity: 0.3;
		}

		.img-preview {
			transition: none;
		}
	}
</style>
