<script lang="ts">
	import { onMount } from 'svelte';
	import { useTheme } from './ThemeProvider.svelte';
	import { themes, DEFAULT_THEME, type ThemeName, createCustomTheme } from './themes';
	import { getTraekI18n } from '../i18n/index';

	const t = getTraekI18n();

	const STORAGE_KEY_THEME = 'traek-selected-theme';
	const STORAGE_KEY_ACCENT = 'traek-custom-accent';
	const DEFAULT_ACCENT = '#00d8ff';

	let { compact = false }: { compact?: boolean } = $props();

	const themeContext = useTheme();

	function isThemeName(value: string | null | undefined): value is ThemeName {
		return value != null && value in themes;
	}

	/**
	 * Seed from the data-theme the host page applied before hydration
	 * (e.g. honoring prefers-color-scheme). Guarded for SSR.
	 */
	function resolveSeedTheme(): ThemeName {
		if (typeof document !== 'undefined') {
			const domTheme = document.documentElement.dataset.theme;
			if (isThemeName(domTheme)) {
				return domTheme;
			}
		}
		return DEFAULT_THEME;
	}

	let selectedThemeName = $state<ThemeName>(resolveSeedTheme());
	let customAccent = $state<string>(DEFAULT_ACCENT);
	let isOpen = $state(false);

	// Load saved preferences
	onMount(() => {
		if (typeof localStorage !== 'undefined') {
			const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
			const savedAccent = localStorage.getItem(STORAGE_KEY_ACCENT);

			if (isThemeName(savedTheme)) {
				selectedThemeName = savedTheme;
			}

			if (savedAccent) {
				customAccent = savedAccent;
			}
		}

		// Apply only when the result differs from what the DOM already
		// carries, so a pre-hydration system preference is not clobbered.
		const domTheme = document.documentElement.dataset.theme;
		if (selectedThemeName !== domTheme || customAccent !== DEFAULT_ACCENT) {
			applyThemeWithAccent(selectedThemeName, customAccent);
		}
	});

	function applyThemeWithAccent(themeName: ThemeName, accent: string) {
		const baseTheme = themes[themeName];
		const customTheme =
			accent !== DEFAULT_ACCENT ? createCustomTheme(baseTheme, accent) : baseTheme;
		themeContext.setTheme(themeName);
		// Apply accent customization after setting the base theme
		if (accent !== DEFAULT_ACCENT) {
			themeContext.applyTheme(customTheme);
		}
		selectedThemeName = themeName;
	}

	function selectTheme(themeName: ThemeName) {
		applyThemeWithAccent(themeName, customAccent);

		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(STORAGE_KEY_THEME, themeName);
		}
	}

	function updateAccent(event: Event) {
		const input = event.target as HTMLInputElement;
		customAccent = input.value;
		applyThemeWithAccent(selectedThemeName, customAccent);

		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(STORAGE_KEY_ACCENT, customAccent);
		}
	}

	const themeLabels: Record<ThemeName, string> = {
		dark: t.theme.dark,
		light: t.theme.light,
		highContrast: t.theme.highContrast
	};

	let containerEl = $state<HTMLDivElement | null>(null);

	function handleWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			isOpen = false;
		}
	}

	function handleWindowClick(e: MouseEvent) {
		if (isOpen && containerEl && e.target instanceof Node && !containerEl.contains(e.target)) {
			isOpen = false;
		}
	}

	const themePreviewColors: Record<ThemeName, { bg: string; border: string; accent: string }> = {
		dark: { bg: '#161616', border: '#2a2a2a', accent: '#00d8ff' },
		light: { bg: '#ffffff', border: '#d4d4d4', accent: '#0099cc' },
		highContrast: { bg: '#000000', border: '#ffffff', accent: '#00ffff' }
	};
</script>

<svelte:window onkeydown={handleWindowKeydown} onclick={handleWindowClick} />

<div class="theme-picker" class:compact bind:this={containerEl}>
	<button
		type="button"
		class="theme-toggle"
		onclick={() => (isOpen = !isOpen)}
		aria-label={t.theme.togglePicker}
		aria-expanded={isOpen}
	>
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path
				d="M8 1v2m0 10v2M3.5 3.5l1.4 1.4m7.6 7.6l1.4 1.4M1 8h2m10 0h2M3.5 12.5l1.4-1.4m7.6-7.6l1.4-1.4"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
			/>
			<circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5" />
		</svg>
		{#if !compact}
			<span class="theme-toggle-label">{t.theme.themeTitle}</span>
		{/if}
	</button>

	{#if isOpen}
		<div class="theme-picker-panel">
			<div class="theme-preview-grid">
				{#each Object.entries(themes) as [name] (name)}
					{@const themeName = name as ThemeName}
					{@const colors = themePreviewColors[themeName]}
					<button
						type="button"
						class="theme-preview-card"
						class:selected={selectedThemeName === themeName}
						onclick={() => selectTheme(themeName)}
						aria-label={t.theme.selectTheme(themeLabels[themeName])}
						aria-pressed={selectedThemeName === themeName}
					>
						<div
							class="theme-preview-sample"
							style:background-color={colors.bg}
							style:border-color={colors.border}
						>
							<div class="theme-preview-accent" style:background-color={colors.accent}></div>
						</div>
						<span class="theme-preview-label">{themeLabels[themeName]}</span>
					</button>
				{/each}
			</div>

			<div class="accent-picker">
				<label for="accent-color" class="accent-label">{t.theme.accentColor}</label>
				<div class="accent-input-wrapper">
					<input
						id="accent-color"
						type="color"
						value={customAccent}
						oninput={updateAccent}
						class="accent-color-input"
					/>
					<span class="accent-hex-value">{customAccent}</span>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	@layer base {
		.theme-picker {
			position: relative;
		}

		.theme-toggle {
			display: flex;
			align-items: center;
			gap: 6px;
			padding: 8px 12px;
			background: var(--traek-thought-toggle-bg, #444444);
			border: 1px solid var(--traek-thought-toggle-border, #555555);
			border-radius: 8px;
			color: var(--traek-node-text, #dddddd);
			font-family: inherit;
			font-size: 12px;
			cursor: pointer;
			transition:
				background 0.15s,
				border-color 0.15s;
		}

		.theme-toggle:hover {
			background: var(--traek-thought-toggle-border, #555555);
			border-color: var(--traek-thought-header-accent, #888888);
		}

		.theme-toggle:focus-visible {
			outline: 2px solid var(--traek-input-button-bg, #00d8ff);
			outline-offset: 2px;
		}

		.theme-toggle svg {
			width: 16px;
			height: 16px;
		}

		.theme-toggle-label {
			font-weight: 500;
		}

		.theme-picker.compact .theme-toggle {
			padding: 8px;
		}

		.theme-picker-panel {
			position: absolute;
			top: calc(100% + 8px);
			right: 0;
			width: 280px;
			padding: 16px;
			background: var(--traek-overlay-card-bg, rgba(15, 15, 15, 0.9));
			border: 1px solid var(--traek-overlay-card-border, rgba(255, 255, 255, 0.08));
			border-radius: 12px;
			box-shadow: var(--traek-shadow-tool-panel, 0 12px 40px rgba(0, 0, 0, 0.5));
			backdrop-filter: blur(20px);
			z-index: 100;
			animation: fade-in 150ms ease-out;
		}

		@keyframes fade-in {
			from {
				opacity: 0;
				transform: translateY(-4px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}

		.theme-preview-grid {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 8px;
			margin-bottom: 16px;
		}

		.theme-preview-card {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 6px;
			padding: 8px;
			background: transparent;
			border: 2px solid transparent;
			border-radius: 8px;
			cursor: pointer;
			transition:
				border-color 0.15s,
				background 0.15s;
		}

		.theme-preview-card:hover {
			background: rgba(255, 255, 255, 0.04);
		}

		.theme-preview-card.selected {
			border-color: var(--traek-input-button-bg, #00d8ff);
		}

		.theme-preview-card:focus-visible {
			outline: 2px solid var(--traek-input-button-bg, #00d8ff);
			outline-offset: 2px;
		}

		.theme-preview-sample {
			width: 100%;
			height: 40px;
			border: 2px solid;
			border-radius: 6px;
			display: flex;
			align-items: flex-end;
			justify-content: center;
			padding: 4px;
		}

		.theme-preview-accent {
			width: 16px;
			height: 4px;
			border-radius: 2px;
		}

		.theme-preview-label {
			font-size: 10px;
			font-weight: 500;
			color: var(--traek-overlay-text, #e5e5e5);
			text-align: center;
			letter-spacing: 0.3px;
		}

		.accent-picker {
			padding-top: 12px;
			border-top: 1px solid var(--traek-thought-divider, rgba(255, 255, 255, 0.06));
		}

		.accent-label {
			display: block;
			font-size: 11px;
			font-weight: 500;
			color: var(--traek-overlay-text, #e5e5e5);
			margin-bottom: 8px;
			letter-spacing: 0.3px;
		}

		.accent-input-wrapper {
			display: flex;
			align-items: center;
			gap: 8px;
		}

		.accent-color-input {
			width: 48px;
			height: 32px;
			padding: 0;
			border: 2px solid var(--traek-thought-toggle-border, #555555);
			border-radius: 6px;
			cursor: pointer;
			background: transparent;
		}

		.accent-color-input::-webkit-color-swatch-wrapper {
			padding: 2px;
		}

		.accent-color-input::-webkit-color-swatch {
			border: none;
			border-radius: 4px;
		}

		.accent-color-input::-moz-color-swatch {
			border: none;
			border-radius: 4px;
		}

		.accent-color-input:focus-visible {
			outline: 2px solid var(--traek-input-button-bg, #00d8ff);
			outline-offset: 2px;
		}

		.accent-hex-value {
			flex: 1;
			font-size: 11px;
			font-family: 'Space Mono', monospace;
			color: var(--traek-thought-row-muted-2, #aaaaaa);
			text-transform: uppercase;
		}
	}
</style>
