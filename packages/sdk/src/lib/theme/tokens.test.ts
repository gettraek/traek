import { describe, it, expect } from 'vitest';
import {
	TraekThemeSchema,
	TraekThemeColorsSchema,
	TraekThemeSpacingSchema,
	TraekThemeRadiusSchema,
	TraekThemeTypographySchema,
	TraekThemeAnimationSchema
} from './tokens';
import { darkTheme, lightTheme, highContrastTheme } from './themes';

describe('Token Validation', () => {
	describe('TraekThemeSchema', () => {
		it('should validate dark theme', () => {
			expect(() => TraekThemeSchema.parse(darkTheme)).not.toThrow();
		});

		it('should validate light theme', () => {
			expect(() => TraekThemeSchema.parse(lightTheme)).not.toThrow();
		});

		it('should validate high contrast theme', () => {
			expect(() => TraekThemeSchema.parse(highContrastTheme)).not.toThrow();
		});

		it('should reject invalid theme with missing colors', () => {
			const invalidTheme = {
				colors: {
					canvasBg: '#000000'
					// Missing required color properties
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
					fontFamily: 'sans-serif',
					fontMono: 'monospace',
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

			expect(() => TraekThemeSchema.parse(invalidTheme)).toThrow();
		});

		it('should reject invalid spacing values', () => {
			const invalidTheme = {
				...darkTheme,
				spacing: {
					xs: -4, // Negative spacing not allowed
					sm: 8,
					md: 16,
					lg: 24,
					xl: 32
				}
			};

			expect(() => TraekThemeSchema.parse(invalidTheme)).toThrow();
		});

		it('should reject invalid opacity values', () => {
			const invalidTheme = {
				...darkTheme,
				colors: {
					...darkTheme.colors,
					searchDimmedOpacity: 1.5 // Must be between 0 and 1
				}
			};

			expect(() => TraekThemeSchema.parse(invalidTheme)).toThrow();
		});

		it('should reject invalid font weight values', () => {
			const invalidTheme = {
				...darkTheme,
				typography: {
					...darkTheme.typography,
					weights: {
						...darkTheme.typography.weights,
						normal: 50 // Must be between 100 and 900
					}
				}
			};

			expect(() => TraekThemeSchema.parse(invalidTheme)).toThrow();
		});
	});

	describe('TraekThemeColorsSchema', () => {
		it('should validate all color properties', () => {
			expect(() => TraekThemeColorsSchema.parse(darkTheme.colors)).not.toThrow();
			expect(() => TraekThemeColorsSchema.parse(lightTheme.colors)).not.toThrow();
			expect(() => TraekThemeColorsSchema.parse(highContrastTheme.colors)).not.toThrow();
		});

		it('should accept hex colors', () => {
			const colors = {
				...darkTheme.colors,
				canvasBg: '#000000'
			};
			expect(() => TraekThemeColorsSchema.parse(colors)).not.toThrow();
		});

		it('should accept rgba colors', () => {
			const colors = {
				...darkTheme.colors,
				canvasBg: 'rgba(0, 0, 0, 0.9)'
			};
			expect(() => TraekThemeColorsSchema.parse(colors)).not.toThrow();
		});

		it('should accept CSS color keywords', () => {
			const colors = {
				...darkTheme.colors,
				canvasBg: 'black'
			};
			expect(() => TraekThemeColorsSchema.parse(colors)).not.toThrow();
		});
	});

	describe('TraekThemeSpacingSchema', () => {
		it('should validate spacing values', () => {
			expect(() => TraekThemeSpacingSchema.parse(darkTheme.spacing)).not.toThrow();
		});

		it('should reject negative spacing', () => {
			const spacing = {
				xs: -4,
				sm: 8,
				md: 16,
				lg: 24,
				xl: 32
			};
			expect(() => TraekThemeSpacingSchema.parse(spacing)).toThrow();
		});

		it('should reject fractional spacing', () => {
			const spacing = {
				xs: 4.5,
				sm: 8,
				md: 16,
				lg: 24,
				xl: 32
			};
			expect(() => TraekThemeSpacingSchema.parse(spacing)).toThrow();
		});
	});

	describe('TraekThemeRadiusSchema', () => {
		it('should validate radius values', () => {
			expect(() => TraekThemeRadiusSchema.parse(darkTheme.radius)).not.toThrow();
		});

		it('should reject negative radius', () => {
			const radius = {
				sm: -6,
				md: 12,
				lg: 24
			};
			expect(() => TraekThemeRadiusSchema.parse(radius)).toThrow();
		});
	});

	describe('TraekThemeTypographySchema', () => {
		it('should validate typography values', () => {
			expect(() => TraekThemeTypographySchema.parse(darkTheme.typography)).not.toThrow();
		});

		it('should reject invalid font weights', () => {
			const typography = {
				...darkTheme.typography,
				weights: {
					normal: 1000, // Must be <= 900
					medium: 500,
					semibold: 600,
					bold: 700
				}
			};
			expect(() => TraekThemeTypographySchema.parse(typography)).toThrow();
		});
	});

	describe('TraekThemeAnimationSchema', () => {
		it('should validate animation durations', () => {
			expect(() => TraekThemeAnimationSchema.parse(darkTheme.animation)).not.toThrow();
		});

		it('should reject negative durations', () => {
			const animation = {
				fast: -150,
				normal: 250,
				slow: 400
			};
			expect(() => TraekThemeAnimationSchema.parse(animation)).toThrow();
		});
	});
});
