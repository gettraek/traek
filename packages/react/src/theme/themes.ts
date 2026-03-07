import type { TraekTheme } from './tokens';

/**
 * Dark theme - default theme matching existing CSS variables
 */
export const darkTheme: TraekTheme = {
	colors: {
		// Canvas
		canvasBg: '#0b0b0b',
		canvasDot: '#333333',

		// Nodes
		nodeBg: '#161616',
		nodeBorder: '#2a2a2a',
		nodeText: '#dddddd',
		nodeActiveBorder: '#00d8ff',
		nodeActiveGlow: 'rgba(0, 216, 255, 0.15)',
		nodeUserBorderTop: '#00d8ff',
		nodeAssistantBorderTop: '#ff3e00',

		// Connections
		connectionStroke: '#333333',
		connectionHighlight: '#00d8ff',

		// Input
		inputBg: 'rgba(30, 30, 30, 0.8)',
		inputBorder: '#444444',
		inputShadow: 'rgba(0, 0, 0, 0.4)',
		inputButtonBg: '#00d8ff',
		inputButtonText: '#000000',
		inputText: 'rgb(255, 255, 255)',
		inputContextBg: 'rgba(0, 0, 0, 0.4)',
		inputContextText: '#888888',
		inputDot: '#00d8ff',
		inputDotMuted: '#555555',
		statsText: '#555555',

		// TextNode
		textNodeText: '#dddddd',
		textNodeBg: '#222222',
		markdownQuoteBorder: '#444444',
		markdownQuoteText: '#999999',
		markdownHr: '#333333',
		scrollHintBg: 'linear-gradient(transparent, rgba(0, 0, 0, 0.5))',
		scrollHintText: '#444444',
		scrollbarThumb: '#333333',
		scrollbarThumbHover: '#444444',
		typingCursor: '#ff3e00',

		// Search
		searchMatchBorder: 'rgba(255, 235, 59, 0.5)',
		searchDimmedOpacity: 0.4,

		// Thought Panel
		thoughtPanelBg: 'rgba(22, 22, 22, 0.9)',
		thoughtPanelBorder: '#333333',
		thoughtPanelBorderActive: '#00d8ff',
		thoughtPanelGlow: 'rgba(0, 216, 255, 0.15)',
		thoughtHeaderBg: 'rgba(255, 255, 255, 0.03)',
		thoughtHeaderBorder: '#222222',
		thoughtHeaderMuted: '#666666',
		thoughtHeaderAccent: '#888888',
		thoughtTagCyan: '#00d8ff',
		thoughtTagOrange: '#ff3e00',
		thoughtTagGray: '#444444',
		thoughtDivider: 'rgba(255, 255, 255, 0.06)',
		thoughtRowBg: 'rgba(255, 255, 255, 0.03)',
		thoughtRowMuted1: '#888888',
		thoughtRowMuted2: '#aaaaaa',
		thoughtRowMuted3: '#999999',
		thoughtRowMuted4: '#666666',
		thoughtBadgeCyan: '#00dddd',
		thoughtFooterMuted: '#bbbbbb',
		thoughtFooterBg: 'rgba(0, 0, 0, 0.2)',
		thoughtFooterBorder: 'rgba(255, 255, 255, 0.05)',
		thoughtToggleBg: '#444444',
		thoughtToggleBorder: '#555555',

		// Overlays
		overlayGradient1: 'rgba(0, 0, 0, 0.7)',
		overlayGradient2: 'rgba(0, 0, 0, 0.9)',
		overlayGradient3: 'rgba(0, 0, 0, 1)',
		overlayCardBg: 'rgba(15, 15, 15, 0.9)',
		overlayCardBorder: 'rgba(255, 255, 255, 0.08)',
		overlayCardShadow: 'rgba(0, 0, 0, 0.8)',
		overlayText: '#e5e5e5',
		overlayPillBg: '#00d8ff',
		overlayPillShadow: 'rgba(0, 216, 255, 0.7)'
	},
	spacing: {
		xs: 4,
		sm: 8,
		md: 16,
		lg: 24,
		xl: 32
	},
	radius: {
		sm: 6,
		md: 12,
		lg: 24
	},
	typography: {
		fontFamily: "'Space Grotesk', sans-serif",
		fontMono: "'Space Mono', monospace",
		sizes: {
			xs: '10px',
			sm: '12px',
			base: '14px',
			lg: '16px',
			xl: '20px',
			'2xl': '28px'
		},
		weights: {
			normal: 400,
			medium: 500,
			semibold: 600,
			bold: 700
		}
	},
	animation: {
		fast: 150,
		normal: 250,
		slow: 400
	}
};

/**
 * Light theme - matching existing [data-theme='light'] CSS variables
 */
export const lightTheme: TraekTheme = {
	colors: {
		// Canvas
		canvasBg: '#f0f0f0',
		canvasDot: '#cccccc',

		// Nodes
		nodeBg: '#ffffff',
		nodeBorder: '#d4d4d4',
		nodeText: '#1a1a1a',
		nodeActiveBorder: '#0099cc',
		nodeActiveGlow: 'rgba(0, 153, 204, 0.2)',
		nodeUserBorderTop: '#0099cc',
		nodeAssistantBorderTop: '#e03a00',

		// Connections
		connectionStroke: '#a3a3a3',
		connectionHighlight: '#0099cc',

		// Input
		inputBg: 'rgba(255, 255, 255, 0.95)',
		inputBorder: '#a3a3a3',
		inputShadow: 'rgba(0, 0, 0, 0.1)',
		inputButtonBg: '#0099cc',
		inputButtonText: '#ffffff',
		inputText: '#1a1a1a',
		inputContextBg: 'rgba(0, 0, 0, 0.05)',
		inputContextText: '#525252',
		inputDot: '#0099cc',
		inputDotMuted: '#a3a3a3',
		statsText: '#737373',

		// TextNode
		textNodeText: '#1a1a1a',
		textNodeBg: '#ffffff',
		markdownQuoteBorder: '#a3a3a3',
		markdownQuoteText: '#525252',
		markdownHr: '#d4d4d4',
		scrollHintBg: 'linear-gradient(transparent, rgba(255, 255, 255, 0.8))',
		scrollHintText: '#737373',
		scrollbarThumb: '#d4d4d4',
		scrollbarThumbHover: '#a3a3a3',
		typingCursor: '#e03a00',

		// Search
		searchMatchBorder: 'rgba(255, 193, 7, 0.6)',
		searchDimmedOpacity: 0.3,

		// Thought Panel
		thoughtPanelBg: 'rgba(255, 255, 255, 0.95)',
		thoughtPanelBorder: '#d4d4d4',
		thoughtPanelBorderActive: '#0099cc',
		thoughtPanelGlow: 'rgba(0, 153, 204, 0.2)',
		thoughtHeaderBg: 'rgba(0, 0, 0, 0.03)',
		thoughtHeaderBorder: '#e5e5e5',
		thoughtHeaderMuted: '#737373',
		thoughtHeaderAccent: '#525252',
		thoughtTagCyan: '#0099cc',
		thoughtTagOrange: '#e03a00',
		thoughtTagGray: '#a3a3a3',
		thoughtDivider: 'rgba(0, 0, 0, 0.06)',
		thoughtRowBg: 'rgba(0, 0, 0, 0.02)',
		thoughtRowMuted1: '#737373',
		thoughtRowMuted2: '#525252',
		thoughtRowMuted3: '#525252',
		thoughtRowMuted4: '#737373',
		thoughtBadgeCyan: '#008b8b',
		thoughtFooterMuted: '#404040',
		thoughtFooterBg: 'rgba(0, 0, 0, 0.04)',
		thoughtFooterBorder: 'rgba(0, 0, 0, 0.06)',
		thoughtToggleBg: '#d4d4d4',
		thoughtToggleBorder: '#a3a3a3',

		// Overlays
		overlayGradient1: 'rgba(0, 0, 0, 0.4)',
		overlayGradient2: 'rgba(0, 0, 0, 0.6)',
		overlayGradient3: 'rgba(0, 0, 0, 0.85)',
		overlayCardBg: 'rgba(255, 255, 255, 0.95)',
		overlayCardBorder: 'rgba(0, 0, 0, 0.1)',
		overlayCardShadow: 'rgba(0, 0, 0, 0.2)',
		overlayText: '#1a1a1a',
		overlayPillBg: '#0099cc',
		overlayPillShadow: 'rgba(0, 153, 204, 0.4)'
	},
	spacing: {
		xs: 4,
		sm: 8,
		md: 16,
		lg: 24,
		xl: 32
	},
	radius: {
		sm: 6,
		md: 12,
		lg: 24
	},
	typography: {
		fontFamily: "'Space Grotesk', sans-serif",
		fontMono: "'Space Mono', monospace",
		sizes: {
			xs: '10px',
			sm: '12px',
			base: '14px',
			lg: '16px',
			xl: '20px',
			'2xl': '28px'
		},
		weights: {
			normal: 400,
			medium: 500,
			semibold: 600,
			bold: 700
		}
	},
	animation: {
		fast: 150,
		normal: 250,
		slow: 400
	}
};

/**
 * High contrast theme - WCAG AAA compliant with >7:1 contrast ratios
 */
export const highContrastTheme: TraekTheme = {
	colors: {
		// Canvas
		canvasBg: '#000000',
		canvasDot: '#555555',

		// Nodes
		nodeBg: '#000000',
		nodeBorder: '#ffffff',
		nodeText: '#ffffff',
		nodeActiveBorder: '#00ffff',
		nodeActiveGlow: 'rgba(0, 255, 255, 0.3)',
		nodeUserBorderTop: '#00ffff',
		nodeAssistantBorderTop: '#ffff00',

		// Connections
		connectionStroke: '#ffffff',
		connectionHighlight: '#00ffff',

		// Input
		inputBg: 'rgba(0, 0, 0, 0.95)',
		inputBorder: '#ffffff',
		inputShadow: 'rgba(255, 255, 255, 0.2)',
		inputButtonBg: '#00ffff',
		inputButtonText: '#000000',
		inputText: '#ffffff',
		inputContextBg: 'rgba(255, 255, 255, 0.1)',
		inputContextText: '#ffffff',
		inputDot: '#00ffff',
		inputDotMuted: '#ffffff',
		statsText: '#ffffff',

		// TextNode
		textNodeText: '#ffffff',
		textNodeBg: '#000000',
		markdownQuoteBorder: '#ffffff',
		markdownQuoteText: '#ffffff',
		markdownHr: '#ffffff',
		scrollHintBg: 'linear-gradient(transparent, rgba(0, 0, 0, 0.9))',
		scrollHintText: '#ffffff',
		scrollbarThumb: '#ffffff',
		scrollbarThumbHover: '#00ffff',
		typingCursor: '#ffff00',

		// Search
		searchMatchBorder: 'rgba(255, 255, 0, 0.8)',
		searchDimmedOpacity: 0.5,

		// Thought Panel
		thoughtPanelBg: 'rgba(0, 0, 0, 0.95)',
		thoughtPanelBorder: '#ffffff',
		thoughtPanelBorderActive: '#00ffff',
		thoughtPanelGlow: 'rgba(0, 255, 255, 0.3)',
		thoughtHeaderBg: 'rgba(255, 255, 255, 0.1)',
		thoughtHeaderBorder: '#ffffff',
		thoughtHeaderMuted: '#ffffff',
		thoughtHeaderAccent: '#ffffff',
		thoughtTagCyan: '#00ffff',
		thoughtTagOrange: '#ffff00',
		thoughtTagGray: '#ffffff',
		thoughtDivider: 'rgba(255, 255, 255, 0.2)',
		thoughtRowBg: 'rgba(255, 255, 255, 0.05)',
		thoughtRowMuted1: '#ffffff',
		thoughtRowMuted2: '#ffffff',
		thoughtRowMuted3: '#ffffff',
		thoughtRowMuted4: '#ffffff',
		thoughtBadgeCyan: '#00ffff',
		thoughtFooterMuted: '#ffffff',
		thoughtFooterBg: 'rgba(255, 255, 255, 0.1)',
		thoughtFooterBorder: 'rgba(255, 255, 255, 0.2)',
		thoughtToggleBg: '#000000',
		thoughtToggleBorder: '#ffffff',

		// Overlays
		overlayGradient1: 'rgba(0, 0, 0, 0.9)',
		overlayGradient2: 'rgba(0, 0, 0, 0.95)',
		overlayGradient3: 'rgba(0, 0, 0, 1)',
		overlayCardBg: 'rgba(0, 0, 0, 0.95)',
		overlayCardBorder: 'rgba(255, 255, 255, 0.3)',
		overlayCardShadow: 'rgba(255, 255, 255, 0.2)',
		overlayText: '#ffffff',
		overlayPillBg: '#00ffff',
		overlayPillShadow: 'rgba(0, 255, 255, 0.8)'
	},
	spacing: {
		xs: 4,
		sm: 8,
		md: 16,
		lg: 24,
		xl: 32
	},
	radius: {
		sm: 6,
		md: 12,
		lg: 24
	},
	typography: {
		fontFamily: "'Space Grotesk', sans-serif",
		fontMono: "'Space Mono', monospace",
		sizes: {
			xs: '10px',
			sm: '12px',
			base: '14px',
			lg: '16px',
			xl: '20px',
			'2xl': '28px'
		},
		weights: {
			normal: 400,
			medium: 500,
			semibold: 600,
			bold: 700
		}
	},
	animation: {
		fast: 150,
		normal: 250,
		slow: 400
	}
};

/**
 * Theme registry - map of theme names to theme objects
 */
export const themes = {
	dark: darkTheme,
	light: lightTheme,
	highContrast: highContrastTheme
} as const;

/**
 * Theme names
 */
export type ThemeName = keyof typeof themes;

/**
 * Default theme name
 */
export const DEFAULT_THEME: ThemeName = 'dark';

/**
 * Generate color variations for the accent color
 */
function generateAccentVariations(accentHex: string): {
	base: string;
	light: string;
	dark: string;
	alpha15: string;
	alpha20: string;
	alpha30: string;
} {
	// Parse hex color
	const hex = accentHex.replace('#', '');
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);

	// Generate lighter version (+20% brightness)
	const lighter = (v: number) => Math.min(255, Math.floor(v * 1.2));
	const light = `#${lighter(r).toString(16).padStart(2, '0')}${lighter(g).toString(16).padStart(2, '0')}${lighter(b).toString(16).padStart(2, '0')}`;

	// Generate darker version (-20% brightness)
	const darker = (v: number) => Math.floor(v * 0.8);
	const dark = `#${darker(r).toString(16).padStart(2, '0')}${darker(g).toString(16).padStart(2, '0')}${darker(b).toString(16).padStart(2, '0')}`;

	return {
		base: accentHex,
		light,
		dark,
		alpha15: `rgba(${r}, ${g}, ${b}, 0.15)`,
		alpha20: `rgba(${r}, ${g}, ${b}, 0.2)`,
		alpha30: `rgba(${r}, ${g}, ${b}, 0.3)`
	};
}

/**
 * Create a custom theme by replacing the accent color in a base theme
 */
export function createCustomTheme(baseTheme: TraekTheme, accentColor: string): TraekTheme {
	const variations = generateAccentVariations(accentColor);

	// Deep clone the base theme
	const customTheme: TraekTheme = JSON.parse(JSON.stringify(baseTheme));

	// Replace all accent colors in the theme
	customTheme.colors.nodeActiveBorder = variations.base;
	customTheme.colors.nodeActiveGlow = variations.alpha15;
	customTheme.colors.nodeUserBorderTop = variations.base;
	customTheme.colors.connectionHighlight = variations.base;
	customTheme.colors.inputButtonBg = variations.base;
	customTheme.colors.inputDot = variations.base;
	customTheme.colors.thoughtPanelBorderActive = variations.base;
	customTheme.colors.thoughtPanelGlow = variations.alpha15;
	customTheme.colors.thoughtTagCyan = variations.base;
	customTheme.colors.thoughtBadgeCyan = variations.light;
	customTheme.colors.overlayPillBg = variations.base;
	customTheme.colors.overlayPillShadow = variations.alpha20;

	return customTheme;
}
