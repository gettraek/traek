import { describe, it, expect } from 'vitest';
import { focusModeConfigSchema, DEFAULT_FOCUS_MODE_CONFIG } from '../focusModeTypes.js';

describe('focusModeTypes', () => {
	describe('focusModeConfigSchema', () => {
		it('should validate default config', () => {
			expect.assertions(1);
			const result = focusModeConfigSchema.safeParse(DEFAULT_FOCUS_MODE_CONFIG);
			expect(result.success).toBe(true);
		});

		it('should accept valid config with all fields', () => {
			expect.assertions(2);
			const config = {
				swipeThreshold: 100,
				velocityThreshold: 0.5,
				transitionDuration: 200,
				overscrollThreshold: 80,
				scrollCooldownMs: 400,
				showBreadcrumb: true
			};
			const result = focusModeConfigSchema.safeParse(config);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(config);
			}
		});

		it('should accept partial config and use defaults', () => {
			expect.assertions(3);
			const partial = { swipeThreshold: 120 };
			const result = focusModeConfigSchema.safeParse(partial);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.swipeThreshold).toBe(120);
				expect(result.data.velocityThreshold).toBe(0.3); // Default
			}
		});

		it('should accept empty object and use all defaults', () => {
			expect.assertions(2);
			const result = focusModeConfigSchema.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(DEFAULT_FOCUS_MODE_CONFIG);
			}
		});

		it('should reject negative swipeThreshold', () => {
			expect.assertions(2);
			const config = { swipeThreshold: -10 };
			const result = focusModeConfigSchema.safeParse(config);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toContain('swipeThreshold');
			}
		});

		it('should reject negative velocityThreshold', () => {
			expect.assertions(2);
			const config = { velocityThreshold: -0.5 };
			const result = focusModeConfigSchema.safeParse(config);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toContain('velocityThreshold');
			}
		});

		it('should reject negative transitionDuration', () => {
			expect.assertions(2);
			const config = { transitionDuration: -100 };
			const result = focusModeConfigSchema.safeParse(config);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toContain('transitionDuration');
			}
		});

		it('should reject negative overscrollThreshold', () => {
			expect.assertions(2);
			const config = { overscrollThreshold: -20 };
			const result = focusModeConfigSchema.safeParse(config);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toContain('overscrollThreshold');
			}
		});

		it('should reject negative scrollCooldownMs', () => {
			expect.assertions(2);
			const config = { scrollCooldownMs: -50 };
			const result = focusModeConfigSchema.safeParse(config);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].path).toContain('scrollCooldownMs');
			}
		});

		it('should reject invalid showBreadcrumb type', () => {
			expect.assertions(1);
			const config = { showBreadcrumb: 'yes' };
			const result = focusModeConfigSchema.safeParse(config);
			expect(result.success).toBe(false);
		});

		it('should accept zero values', () => {
			expect.assertions(2);
			const config = {
				swipeThreshold: 0,
				velocityThreshold: 0,
				transitionDuration: 0,
				overscrollThreshold: 0,
				scrollCooldownMs: 0
			};
			const result = focusModeConfigSchema.safeParse(config);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.swipeThreshold).toBe(0);
			}
		});

		it('should reject invalid property types', () => {
			expect.assertions(1);
			const config = {
				swipeThreshold: '80', // String instead of number
				velocityThreshold: 0.3
			};
			const result = focusModeConfigSchema.safeParse(config);
			expect(result.success).toBe(false);
		});

		it('should ignore extra properties', () => {
			expect.assertions(2);
			const config = {
				swipeThreshold: 80,
				extraProperty: 'ignored'
			};
			const result = focusModeConfigSchema.safeParse(config);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).not.toHaveProperty('extraProperty');
			}
		});

		it('should handle multiple validation errors', () => {
			expect.assertions(2);
			const config = {
				swipeThreshold: -10,
				velocityThreshold: -0.5,
				transitionDuration: -100
			};
			const result = focusModeConfigSchema.safeParse(config);
			expect(result.success).toBe(false);
			if (!result.success) {
				// Should have multiple errors
				expect(result.error.issues.length).toBeGreaterThan(1);
			}
		});
	});

	describe('DEFAULT_FOCUS_MODE_CONFIG', () => {
		it('should have correct default values', () => {
			expect.assertions(6);
			expect(DEFAULT_FOCUS_MODE_CONFIG.swipeThreshold).toBe(80);
			expect(DEFAULT_FOCUS_MODE_CONFIG.velocityThreshold).toBe(0.3);
			expect(DEFAULT_FOCUS_MODE_CONFIG.transitionDuration).toBe(180);
			expect(DEFAULT_FOCUS_MODE_CONFIG.overscrollThreshold).toBe(60);
			expect(DEFAULT_FOCUS_MODE_CONFIG.scrollCooldownMs).toBe(300);
			expect(DEFAULT_FOCUS_MODE_CONFIG.showBreadcrumb).toBe(false);
		});
	});
});
