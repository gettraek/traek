/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getEnterTransform, getExitTransform, getTransitionDuration } from '../transitions';
import type { SwipeDirection } from '../focusModeTypes';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('transitions', () => {
	describe('getEnterTransform', () => {
		it('should return correct transform for up direction', () => {
			expect.assertions(1);
			expect(getEnterTransform('up')).toBe('translateY(-100%)');
		});

		it('should return correct transform for down direction', () => {
			expect.assertions(1);
			expect(getEnterTransform('down')).toBe('translateY(100%)');
		});

		it('should return correct transform for left direction', () => {
			expect.assertions(1);
			expect(getEnterTransform('left')).toBe('translateX(100%)');
		});

		it('should return correct transform for right direction', () => {
			expect.assertions(1);
			expect(getEnterTransform('right')).toBe('translateX(-100%)');
		});
	});

	describe('getExitTransform', () => {
		it('should return correct transform for up direction', () => {
			expect.assertions(1);
			expect(getExitTransform('up')).toBe('translateY(100%)');
		});

		it('should return correct transform for down direction', () => {
			expect.assertions(1);
			expect(getExitTransform('down')).toBe('translateY(-100%)');
		});

		it('should return correct transform for left direction', () => {
			expect.assertions(1);
			expect(getExitTransform('left')).toBe('translateX(-100%)');
		});

		it('should return correct transform for right direction', () => {
			expect.assertions(1);
			expect(getExitTransform('right')).toBe('translateX(100%)');
		});

		it('should return opposite direction from getEnterTransform', () => {
			expect.assertions(4);
			const directions: SwipeDirection[] = ['up', 'down', 'left', 'right'];
			for (const dir of directions) {
				const enter = getEnterTransform(dir);
				const exit = getExitTransform(dir);
				// Enter and exit should be opposite (not the same)
				expect(enter).not.toBe(exit);
			}
		});
	});

	describe('getTransitionDuration', () => {
		it('should return original duration when window is undefined (SSR)', () => {
			expect.assertions(1);
			// In Node environment, window is undefined
			expect(getTransitionDuration(300)).toBe(300);
		});

		it('should return 0 when prefers-reduced-motion is enabled', () => {
			expect.assertions(1);
			// Mock window.matchMedia for reduced motion
			const mockMatchMedia = vi.fn().mockReturnValue({
				matches: true,
				media: '(prefers-reduced-motion: reduce)',
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			});
			global.window = { matchMedia: mockMatchMedia } as any;

			expect(getTransitionDuration(300)).toBe(0);

			delete (global as any).window;
		});

		it('should return original duration when prefers-reduced-motion is disabled', () => {
			expect.assertions(1);
			// Mock window.matchMedia for no reduced motion
			const mockMatchMedia = vi.fn().mockReturnValue({
				matches: false,
				media: '(prefers-reduced-motion: reduce)',
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			});
			global.window = { matchMedia: mockMatchMedia } as any;

			expect(getTransitionDuration(300)).toBe(300);

			delete (global as any).window;
		});

		it('should work with different duration values', () => {
			expect.assertions(3);
			const mockMatchMedia = vi.fn().mockReturnValue({
				matches: false,
				media: '(prefers-reduced-motion: reduce)',
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			});
			global.window = { matchMedia: mockMatchMedia } as any;

			expect(getTransitionDuration(0)).toBe(0);
			expect(getTransitionDuration(180)).toBe(180);
			expect(getTransitionDuration(1000)).toBe(1000);

			delete (global as any).window;
		});
	});
});
