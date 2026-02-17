import { z } from 'zod';

/**
 * Zod schema for color values (hex, rgb, rgba, hsl, hsla, or CSS color keywords)
 */
const colorSchema = z.string().regex(/^(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|[a-z]+|var\()/);

/**
 * Zod schema for spacing values (pixels)
 */
const spacingSchema = z.number().int().nonnegative();

/**
 * Zod schema for border radius values (pixels)
 */
const radiusSchema = z.number().int().nonnegative();

/**
 * Zod schema for animation duration values (milliseconds)
 */
const durationSchema = z.number().int().nonnegative();

/**
 * Zod schema for opacity values (0-1)
 */
const opacitySchema = z.number().min(0).max(1);

/**
 * Zod schema for font weight values
 */
const fontWeightSchema = z.number().int().min(100).max(900);

/**
 * Zod schema for font size values
 */
const fontSizeSchema = z.string();

/**
 * Zod schema for TraekTheme colors
 */
export const TraekThemeColorsSchema = z.object({
	// Canvas
	canvasBg: colorSchema,
	canvasDot: colorSchema,

	// Nodes
	nodeBg: colorSchema,
	nodeBorder: colorSchema,
	nodeText: colorSchema,
	nodeActiveBorder: colorSchema,
	nodeActiveGlow: colorSchema,
	nodeUserBorderTop: colorSchema,
	nodeAssistantBorderTop: colorSchema,

	// Connections
	connectionStroke: colorSchema,
	connectionHighlight: colorSchema,

	// Input
	inputBg: colorSchema,
	inputBorder: colorSchema,
	inputShadow: colorSchema,
	inputButtonBg: colorSchema,
	inputButtonText: colorSchema,
	inputText: colorSchema,
	inputContextBg: colorSchema,
	inputContextText: colorSchema,
	inputDot: colorSchema,
	inputDotMuted: colorSchema,
	statsText: colorSchema,

	// TextNode
	textNodeText: colorSchema,
	textNodeBg: colorSchema,
	markdownQuoteBorder: colorSchema,
	markdownQuoteText: colorSchema,
	markdownHr: colorSchema,
	scrollHintBg: colorSchema,
	scrollHintText: colorSchema,
	scrollbarThumb: colorSchema,
	scrollbarThumbHover: colorSchema,
	typingCursor: colorSchema,

	// Search
	searchMatchBorder: colorSchema,
	searchDimmedOpacity: opacitySchema,

	// Thought Panel
	thoughtPanelBg: colorSchema,
	thoughtPanelBorder: colorSchema,
	thoughtPanelBorderActive: colorSchema,
	thoughtPanelGlow: colorSchema,
	thoughtHeaderBg: colorSchema,
	thoughtHeaderBorder: colorSchema,
	thoughtHeaderMuted: colorSchema,
	thoughtHeaderAccent: colorSchema,
	thoughtTagCyan: colorSchema,
	thoughtTagOrange: colorSchema,
	thoughtTagGray: colorSchema,
	thoughtDivider: colorSchema,
	thoughtRowBg: colorSchema,
	thoughtRowMuted1: colorSchema,
	thoughtRowMuted2: colorSchema,
	thoughtRowMuted3: colorSchema,
	thoughtRowMuted4: colorSchema,
	thoughtBadgeCyan: colorSchema,
	thoughtFooterMuted: colorSchema,
	thoughtFooterBg: colorSchema,
	thoughtFooterBorder: colorSchema,
	thoughtToggleBg: colorSchema,
	thoughtToggleBorder: colorSchema,

	// Overlays
	overlayGradient1: colorSchema,
	overlayGradient2: colorSchema,
	overlayGradient3: colorSchema,
	overlayCardBg: colorSchema,
	overlayCardBorder: colorSchema,
	overlayCardShadow: colorSchema,
	overlayText: colorSchema,
	overlayPillBg: colorSchema,
	overlayPillShadow: colorSchema
});

/**
 * Zod schema for TraekTheme spacing
 */
export const TraekThemeSpacingSchema = z.object({
	xs: spacingSchema,
	sm: spacingSchema,
	md: spacingSchema,
	lg: spacingSchema,
	xl: spacingSchema
});

/**
 * Zod schema for TraekTheme border radius
 */
export const TraekThemeRadiusSchema = z.object({
	sm: radiusSchema,
	md: radiusSchema,
	lg: radiusSchema
});

/**
 * Zod schema for TraekTheme typography sizes
 */
export const TraekThemeTypographySizesSchema = z.object({
	xs: fontSizeSchema,
	sm: fontSizeSchema,
	base: fontSizeSchema,
	lg: fontSizeSchema,
	xl: fontSizeSchema,
	'2xl': fontSizeSchema
});

/**
 * Zod schema for TraekTheme typography weights
 */
export const TraekThemeTypographyWeightsSchema = z.object({
	normal: fontWeightSchema,
	medium: fontWeightSchema,
	semibold: fontWeightSchema,
	bold: fontWeightSchema
});

/**
 * Zod schema for TraekTheme typography
 */
export const TraekThemeTypographySchema = z.object({
	fontFamily: z.string(),
	fontMono: z.string(),
	sizes: TraekThemeTypographySizesSchema,
	weights: TraekThemeTypographyWeightsSchema
});

/**
 * Zod schema for TraekTheme animation durations
 */
export const TraekThemeAnimationSchema = z.object({
	fast: durationSchema,
	normal: durationSchema,
	slow: durationSchema
});

/**
 * Zod schema for TraekTheme
 */
export const TraekThemeSchema = z.object({
	colors: TraekThemeColorsSchema,
	spacing: TraekThemeSpacingSchema,
	radius: TraekThemeRadiusSchema,
	typography: TraekThemeTypographySchema,
	animation: TraekThemeAnimationSchema
});

/**
 * TraekTheme type inferred from Zod schema
 */
export type TraekTheme = z.infer<typeof TraekThemeSchema>;

/**
 * TraekThemeColors type inferred from Zod schema
 */
export type TraekThemeColors = z.infer<typeof TraekThemeColorsSchema>;

/**
 * TraekThemeSpacing type inferred from Zod schema
 */
export type TraekThemeSpacing = z.infer<typeof TraekThemeSpacingSchema>;

/**
 * TraekThemeRadius type inferred from Zod schema
 */
export type TraekThemeRadius = z.infer<typeof TraekThemeRadiusSchema>;

/**
 * TraekThemeTypography type inferred from Zod schema
 */
export type TraekThemeTypography = z.infer<typeof TraekThemeTypographySchema>;

/**
 * TraekThemeAnimation type inferred from Zod schema
 */
export type TraekThemeAnimation = z.infer<typeof TraekThemeAnimationSchema>;
