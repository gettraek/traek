import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { TraekTheme } from './tokens.js';
import { themes, DEFAULT_THEME } from './themes.js';
import type { ThemeName } from './themes.js';

export type { ThemeName } from './themes.js';

export interface ThemeContextValue {
	currentTheme: TraekTheme;
	currentThemeName: ThemeName;
	setTheme: (name: ThemeName) => void;
	applyTheme: (theme: TraekTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Apply a theme by setting CSS custom properties on :root.
 */
export function applyThemeToRoot(theme: TraekTheme, themeName?: ThemeName): void {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	if (themeName) root.setAttribute('data-theme', themeName);

	const c = theme.colors;
	root.style.setProperty('--traek-canvas-bg', c.canvasBg);
	root.style.setProperty('--traek-canvas-dot', c.canvasDot);
	root.style.setProperty('--traek-node-bg', c.nodeBg);
	root.style.setProperty('--traek-node-border', c.nodeBorder);
	root.style.setProperty('--traek-node-text', c.nodeText);
	root.style.setProperty('--traek-node-active-border', c.nodeActiveBorder);
	root.style.setProperty('--traek-node-active-glow', c.nodeActiveGlow);
	root.style.setProperty('--traek-node-user-border-top', c.nodeUserBorderTop);
	root.style.setProperty('--traek-node-assistant-border-top', c.nodeAssistantBorderTop);
	root.style.setProperty('--traek-connection-stroke', c.connectionStroke);
	root.style.setProperty('--traek-connection-highlight', c.connectionHighlight);
	root.style.setProperty('--traek-input-bg', c.inputBg);
	root.style.setProperty('--traek-input-border', c.inputBorder);
	root.style.setProperty('--traek-input-shadow', c.inputShadow);
	root.style.setProperty('--traek-input-button-bg', c.inputButtonBg);
	root.style.setProperty('--traek-input-button-text', c.inputButtonText);
	root.style.setProperty('--traek-input-text', c.inputText);
	root.style.setProperty('--traek-input-context-bg', c.inputContextBg);
	root.style.setProperty('--traek-input-context-text', c.inputContextText);
	root.style.setProperty('--traek-input-dot', c.inputDot);
	root.style.setProperty('--traek-input-dot-muted', c.inputDotMuted);
	root.style.setProperty('--traek-stats-text', c.statsText);
	root.style.setProperty('--traek-textnode-text', c.textNodeText);
	root.style.setProperty('--traek-textnode-bg', c.textNodeBg);
	root.style.setProperty('--traek-markdown-quote-border', c.markdownQuoteBorder);
	root.style.setProperty('--traek-markdown-quote-text', c.markdownQuoteText);
	root.style.setProperty('--traek-markdown-hr', c.markdownHr);
	root.style.setProperty('--traek-scroll-hint-bg', c.scrollHintBg);
	root.style.setProperty('--traek-scroll-hint-text', c.scrollHintText);
	root.style.setProperty('--traek-scrollbar-thumb', c.scrollbarThumb);
	root.style.setProperty('--traek-scrollbar-thumb-hover', c.scrollbarThumbHover);
	root.style.setProperty('--traek-typing-cursor', c.typingCursor);
	root.style.setProperty('--traek-search-match-border', c.searchMatchBorder);
	root.style.setProperty('--traek-search-dimmed-opacity', c.searchDimmedOpacity.toString());
	root.style.setProperty('--traek-thought-panel-bg', c.thoughtPanelBg);
	root.style.setProperty('--traek-thought-panel-border', c.thoughtPanelBorder);
	root.style.setProperty('--traek-thought-panel-border-active', c.thoughtPanelBorderActive);
	root.style.setProperty('--traek-thought-panel-glow', c.thoughtPanelGlow);
	root.style.setProperty('--traek-thought-header-bg', c.thoughtHeaderBg);
	root.style.setProperty('--traek-thought-header-border', c.thoughtHeaderBorder);
	root.style.setProperty('--traek-thought-header-muted', c.thoughtHeaderMuted);
	root.style.setProperty('--traek-thought-header-accent', c.thoughtHeaderAccent);
	root.style.setProperty('--traek-thought-tag-cyan', c.thoughtTagCyan);
	root.style.setProperty('--traek-thought-tag-orange', c.thoughtTagOrange);
	root.style.setProperty('--traek-thought-tag-gray', c.thoughtTagGray);
	root.style.setProperty('--traek-thought-divider', c.thoughtDivider);
	root.style.setProperty('--traek-thought-row-bg', c.thoughtRowBg);
	root.style.setProperty('--traek-thought-row-muted-1', c.thoughtRowMuted1);
	root.style.setProperty('--traek-thought-row-muted-2', c.thoughtRowMuted2);
	root.style.setProperty('--traek-thought-row-muted-3', c.thoughtRowMuted3);
	root.style.setProperty('--traek-thought-row-muted-4', c.thoughtRowMuted4);
	root.style.setProperty('--traek-thought-badge-cyan', c.thoughtBadgeCyan);
	root.style.setProperty('--traek-thought-footer-muted', c.thoughtFooterMuted);
	root.style.setProperty('--traek-thought-footer-bg', c.thoughtFooterBg);
	root.style.setProperty('--traek-thought-footer-border', c.thoughtFooterBorder);
	root.style.setProperty('--traek-thought-toggle-bg', c.thoughtToggleBg);
	root.style.setProperty('--traek-thought-toggle-border', c.thoughtToggleBorder);
	root.style.setProperty('--traek-overlay-gradient-1', c.overlayGradient1);
	root.style.setProperty('--traek-overlay-gradient-2', c.overlayGradient2);
	root.style.setProperty('--traek-overlay-gradient-3', c.overlayGradient3);
	root.style.setProperty('--traek-overlay-card-bg', c.overlayCardBg);
	root.style.setProperty('--traek-overlay-card-border', c.overlayCardBorder);
	root.style.setProperty('--traek-overlay-card-shadow', c.overlayCardShadow);
	root.style.setProperty('--traek-overlay-text', c.overlayText);
	root.style.setProperty('--traek-overlay-pill-bg', c.overlayPillBg);
	root.style.setProperty('--traek-overlay-pill-shadow', c.overlayPillShadow);

	const s = theme.spacing;
	root.style.setProperty('--traek-spacing-xs', `${s.xs}px`);
	root.style.setProperty('--traek-spacing-sm', `${s.sm}px`);
	root.style.setProperty('--traek-spacing-md', `${s.md}px`);
	root.style.setProperty('--traek-spacing-lg', `${s.lg}px`);
	root.style.setProperty('--traek-spacing-xl', `${s.xl}px`);

	const r = theme.radius;
	root.style.setProperty('--traek-radius-sm', `${r.sm}px`);
	root.style.setProperty('--traek-radius-md', `${r.md}px`);
	root.style.setProperty('--traek-radius-lg', `${r.lg}px`);

	const t = theme.typography;
	root.style.setProperty('--traek-font-family', t.fontFamily);
	root.style.setProperty('--traek-font-mono', t.fontMono);

	const a = theme.animation;
	root.style.setProperty('--traek-anim-fast', `${a.fast}ms`);
	root.style.setProperty('--traek-anim-normal', `${a.normal}ms`);
	root.style.setProperty('--traek-anim-slow', `${a.slow}ms`);
}

export interface ThemeProviderProps {
	initialTheme?: ThemeName;
	children: React.ReactNode;
}

/**
 * Provides theme context and applies CSS custom properties.
 *
 * @example
 * ```tsx
 * <ThemeProvider initialTheme="dark">
 *   <TraekCanvas ... />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ initialTheme = DEFAULT_THEME, children }: ThemeProviderProps) {
	const [currentThemeName, setCurrentThemeName] = useState<ThemeName>(initialTheme);
	const [currentTheme, setCurrentTheme] = useState<TraekTheme>(
		themes[initialTheme] ?? themes[DEFAULT_THEME]
	);
	const initialized = useRef(false);

	useEffect(() => {
		applyThemeToRoot(currentTheme, currentThemeName);
		initialized.current = true;
	}, [currentTheme, currentThemeName]);

	const setTheme = useCallback((name: ThemeName) => {
		const t = themes[name];
		if (!t) {
			console.warn(`Theme "${name}" not found, falling back to default`);
			return;
		}
		setCurrentThemeName(name);
		setCurrentTheme(t);
	}, []);

	const applyTheme = useCallback((theme: TraekTheme) => {
		setCurrentTheme(theme);
	}, []);

	return (
		<ThemeContext.Provider value={{ currentTheme, currentThemeName, setTheme, applyTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

/**
 * Access theme context from the nearest ThemeProvider.
 */
export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error('useTheme must be called within a ThemeProvider');
	return ctx;
}
