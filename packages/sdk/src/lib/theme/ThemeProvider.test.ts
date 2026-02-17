/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { applyThemeToRoot } from './ThemeProvider.svelte';
import { darkTheme, lightTheme, highContrastTheme } from './themes';

describe('Theme Application', () => {
	afterEach(() => {
		// Clean up styles
		if (typeof document !== 'undefined' && document.documentElement) {
			document.documentElement.style.cssText = '';
		}
	});

	describe('applyThemeToRoot', () => {
		it('should apply dark theme colors to CSS custom properties', () => {
			applyThemeToRoot(darkTheme);

			const root = document.documentElement;
			expect(root.style.getPropertyValue('--traek-canvas-bg')).toBe(darkTheme.colors.canvasBg);
			expect(root.style.getPropertyValue('--traek-canvas-dot')).toBe(darkTheme.colors.canvasDot);
			expect(root.style.getPropertyValue('--traek-node-bg')).toBe(darkTheme.colors.nodeBg);
			expect(root.style.getPropertyValue('--traek-node-border')).toBe(darkTheme.colors.nodeBorder);
			expect(root.style.getPropertyValue('--traek-node-text')).toBe(darkTheme.colors.nodeText);
		});

		it('should apply light theme colors to CSS custom properties', () => {
			applyThemeToRoot(lightTheme);

			const root = document.documentElement;
			expect(root.style.getPropertyValue('--traek-canvas-bg')).toBe(lightTheme.colors.canvasBg);
			expect(root.style.getPropertyValue('--traek-canvas-dot')).toBe(lightTheme.colors.canvasDot);
			expect(root.style.getPropertyValue('--traek-node-bg')).toBe(lightTheme.colors.nodeBg);
			expect(root.style.getPropertyValue('--traek-node-border')).toBe(lightTheme.colors.nodeBorder);
			expect(root.style.getPropertyValue('--traek-node-text')).toBe(lightTheme.colors.nodeText);
		});

		it('should apply high contrast theme colors to CSS custom properties', () => {
			applyThemeToRoot(highContrastTheme);

			const root = document.documentElement;
			expect(root.style.getPropertyValue('--traek-canvas-bg')).toBe(
				highContrastTheme.colors.canvasBg
			);
			expect(root.style.getPropertyValue('--traek-canvas-dot')).toBe(
				highContrastTheme.colors.canvasDot
			);
			expect(root.style.getPropertyValue('--traek-node-bg')).toBe(highContrastTheme.colors.nodeBg);
			expect(root.style.getPropertyValue('--traek-node-border')).toBe(
				highContrastTheme.colors.nodeBorder
			);
			expect(root.style.getPropertyValue('--traek-node-text')).toBe(
				highContrastTheme.colors.nodeText
			);
		});

		it('should apply all color properties', () => {
			applyThemeToRoot(darkTheme);

			const root = document.documentElement;

			// Test a sample of important properties
			expect(root.style.getPropertyValue('--traek-input-button-bg')).toBe(
				darkTheme.colors.inputButtonBg
			);
			expect(root.style.getPropertyValue('--traek-connection-stroke')).toBe(
				darkTheme.colors.connectionStroke
			);
			expect(root.style.getPropertyValue('--traek-thought-panel-bg')).toBe(
				darkTheme.colors.thoughtPanelBg
			);
			expect(root.style.getPropertyValue('--traek-overlay-text')).toBe(
				darkTheme.colors.overlayText
			);
		});

		it('should apply opacity values correctly', () => {
			applyThemeToRoot(darkTheme);

			const root = document.documentElement;
			expect(root.style.getPropertyValue('--traek-search-dimmed-opacity')).toBe(
				darkTheme.colors.searchDimmedOpacity.toString()
			);
		});

		it('should switch themes correctly', () => {
			const root = document.documentElement;

			// Apply dark theme
			applyThemeToRoot(darkTheme);
			expect(root.style.getPropertyValue('--traek-canvas-bg')).toBe(darkTheme.colors.canvasBg);

			// Switch to light theme
			applyThemeToRoot(lightTheme);
			expect(root.style.getPropertyValue('--traek-canvas-bg')).toBe(lightTheme.colors.canvasBg);

			// Switch to high contrast theme
			applyThemeToRoot(highContrastTheme);
			expect(root.style.getPropertyValue('--traek-canvas-bg')).toBe(
				highContrastTheme.colors.canvasBg
			);
		});

		it('should handle gradient values', () => {
			applyThemeToRoot(darkTheme);

			const root = document.documentElement;
			expect(root.style.getPropertyValue('--traek-scroll-hint-bg')).toBe(
				darkTheme.colors.scrollHintBg
			);
		});

		it('should handle rgba values', () => {
			applyThemeToRoot(darkTheme);

			const root = document.documentElement;
			expect(root.style.getPropertyValue('--traek-input-bg')).toBe(darkTheme.colors.inputBg);
			expect(root.style.getPropertyValue('--traek-thought-panel-bg')).toBe(
				darkTheme.colors.thoughtPanelBg
			);
		});
	});

	describe('Theme Switching Performance', () => {
		it('should apply theme quickly', () => {
			const startTime = performance.now();
			applyThemeToRoot(darkTheme);
			const endTime = performance.now();

			// Theme application should be very fast (< 10ms)
			expect(endTime - startTime).toBeLessThan(10);
		});

		it('should handle rapid theme switching', () => {
			expect(() => {
				applyThemeToRoot(darkTheme);
				applyThemeToRoot(lightTheme);
				applyThemeToRoot(highContrastTheme);
				applyThemeToRoot(darkTheme);
				applyThemeToRoot(lightTheme);
			}).not.toThrow();

			const root = document.documentElement;
			expect(root.style.getPropertyValue('--traek-canvas-bg')).toBe(lightTheme.colors.canvasBg);
		});
	});
});
