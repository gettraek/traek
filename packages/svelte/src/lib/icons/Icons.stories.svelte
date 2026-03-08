<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'Design System/Icons',
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	import Icon from './Icon.svelte';
	import { ICONS, type IconName } from './icons.js';

	// Group icon names for the gallery
	const groups: { label: string; icons: IconName[] }[] = [
		{
			label: 'Node Types',
			icons: ['node-text', 'node-code', 'node-thought', 'node-image']
		},
		{
			label: 'Canvas Actions',
			icons: [
				'branch',
				'collapse',
				'expand',
				'zoom-in',
				'zoom-out',
				'pan',
				'fit',
				'snap-grid',
				'focus-mode'
			]
		},
		{
			label: 'Status',
			icons: ['streaming', 'done', 'error', 'warning', 'spinner']
		},
		{
			label: 'Toolbar',
			icons: [
				'send',
				'search',
				'bookmark',
				'tag',
				'copy',
				'delete',
				'settings',
				'pin',
				'link',
				'edit',
				'retry',
				'filter',
				'compare',
				'undo',
				'redo'
			]
		},
		{
			label: 'Primitives',
			icons: [
				'close',
				'check',
				'chevron-down',
				'chevron-up',
				'chevron-right',
				'chevron-left',
				'node'
			]
		}
	];

	let hoveredIcon: IconName | null = $state(null);
</script>

<!-- Gallery story: all icons in a dark background grid -->
<Story name="Gallery">
	<div class="gallery-shell">
		<h1 class="gallery-title">Træk Icon Set</h1>
		<p class="gallery-subtitle">
			43 icons · 24×24 grid · 2 px stroke · round linecap · currentColor
		</p>

		{#each groups as group}
			<section class="gallery-section">
				<h2 class="gallery-group-label">{group.label}</h2>
				<div class="gallery-grid">
					{#each group.icons as name}
						<button
							class="gallery-item"
							class:gallery-item--hovered={hoveredIcon === name}
							onmouseenter={() => (hoveredIcon = name)}
							onmouseleave={() => (hoveredIcon = null)}
							onclick={() => navigator.clipboard.writeText(`<Icon name="${name}" />`)}
							title="Click to copy"
						>
							<div class="gallery-icon">
								<Icon {name} size={24} />
							</div>
							<span class="gallery-name">{name}</span>
						</button>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</Story>

<!-- Size scale story -->
<Story name="Sizes">
	<div class="size-shell">
		<h2 class="gallery-group-label">Size scale</h2>
		<div class="size-row">
			{#each [12, 16, 20, 24, 32, 48] as size}
				<div class="size-item">
					<Icon name="branch" {size} />
					<span class="gallery-name">{size}px</span>
				</div>
			{/each}
		</div>

		<h2 class="gallery-group-label" style="margin-top:2rem">Stroke weight</h2>
		<div class="size-row">
			{#each [1, 1.5, 2, 2.5] as strokeWidth}
				<div class="size-item">
					<Icon name="node-text" size={32} {strokeWidth} />
					<span class="gallery-name">{strokeWidth}px</span>
				</div>
			{/each}
		</div>
	</div>
</Story>

<!-- Color story: icons on different backgrounds -->
<Story name="Colors">
	<div class="color-shell">
		{#each [{ bg: '#0b0b0b', color: '#dddddd', label: 'Canvas (default)' }, { bg: '#161616', color: '#dddddd', label: 'Node bg' }, { bg: '#ffffff', color: '#111111', label: 'Light surface' }, { bg: '#00d8ff', color: '#000000', label: 'Cyan accent' }, { bg: '#ff3e00', color: '#ffffff', label: 'Orange accent' }] as swatch}
			<div class="color-swatch" style="background:{swatch.bg}; color:{swatch.color}">
				<span class="gallery-name" style="color:{swatch.color}">{swatch.label}</span>
				<div class="swatch-icons">
					{#each ['branch', 'node-text', 'streaming', 'send', 'done'] as name}
						<Icon name={name as IconName} size={24} />
					{/each}
				</div>
			</div>
		{/each}
	</div>
</Story>

<style>
	.gallery-shell,
	.size-shell,
	.color-shell {
		background: #0b0b0b;
		color: #dddddd;
		font-family:
			'Space Grotesk',
			-apple-system,
			sans-serif;
		padding: 2rem;
		min-height: 100vh;
	}

	.gallery-title {
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: #f5f5f5;
		margin: 0 0 0.25rem;
	}

	.gallery-subtitle {
		font-size: 0.8125rem;
		color: #666666;
		margin: 0 0 2.5rem;
		font-family: 'Space Mono', monospace;
	}

	.gallery-section {
		margin-bottom: 2.5rem;
	}

	.gallery-group-label {
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #555555;
		margin: 0 0 0.75rem;
	}

	.gallery-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.gallery-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.375rem;
		padding: 0.75rem;
		border-radius: 8px;
		border: 1px solid #2a2a2a;
		background: #161616;
		cursor: pointer;
		transition:
			border-color 0.15s,
			background 0.15s;
		width: 96px;
		color: #dddddd;
	}

	.gallery-item:hover,
	.gallery-item--hovered {
		border-color: #00d8ff;
		background: rgba(0, 216, 255, 0.06);
		color: #00d8ff;
	}

	.gallery-item:active {
		transform: scale(0.97);
	}

	.gallery-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
	}

	.gallery-name {
		font-size: 0.625rem;
		font-family: 'Space Mono', monospace;
		color: #666666;
		text-align: center;
		word-break: break-all;
		line-height: 1.3;
	}

	.gallery-item:hover .gallery-name,
	.gallery-item--hovered .gallery-name {
		color: #00d8ff;
	}

	/* Size story */
	.size-row {
		display: flex;
		align-items: flex-end;
		gap: 2rem;
	}

	.size-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		color: #dddddd;
	}

	/* Color story */
	.color-swatch {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.swatch-icons {
		display: flex;
		gap: 1rem;
		align-items: center;
	}
</style>
