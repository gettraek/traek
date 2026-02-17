import { describe, it, expect } from 'vitest';
import {
	keyToDirection,
	isNavigationKey,
	shouldPreventDefault,
	shouldUseInputHandling,
	shouldSendMessage,
	shouldBlurInput
} from '../keyboardLogic';

describe('keyboardLogic', () => {
	describe('key to direction mapping', () => {
		it('should map ArrowUp to up', () => {
			expect.assertions(1);
			expect(keyToDirection('ArrowUp')).toBe('up');
		});

		it('should map ArrowDown to down', () => {
			expect.assertions(1);
			expect(keyToDirection('ArrowDown')).toBe('down');
		});

		it('should map ArrowLeft to left', () => {
			expect.assertions(1);
			expect(keyToDirection('ArrowLeft')).toBe('left');
		});

		it('should map ArrowRight to right', () => {
			expect.assertions(1);
			expect(keyToDirection('ArrowRight')).toBe('right');
		});

		it('should map Home to home', () => {
			expect.assertions(1);
			expect(keyToDirection('Home')).toBe('home');
		});

		it('should map i to input', () => {
			expect.assertions(1);
			expect(keyToDirection('i')).toBe('input');
		});

		it('should return null for unmapped keys', () => {
			expect.assertions(3);
			expect(keyToDirection('a')).toBeNull();
			expect(keyToDirection('Enter')).toBeNull();
			expect(keyToDirection('Escape')).toBeNull();
		});
	});

	describe('navigation key detection', () => {
		it('should recognize arrow keys as navigation', () => {
			expect.assertions(4);
			expect(isNavigationKey('ArrowUp')).toBe(true);
			expect(isNavigationKey('ArrowDown')).toBe(true);
			expect(isNavigationKey('ArrowLeft')).toBe(true);
			expect(isNavigationKey('ArrowRight')).toBe(true);
		});

		it('should recognize Home as navigation', () => {
			expect.assertions(1);
			expect(isNavigationKey('Home')).toBe(true);
		});

		it('should recognize i as navigation', () => {
			expect.assertions(1);
			expect(isNavigationKey('i')).toBe(true);
		});

		it('should not recognize non-navigation keys', () => {
			expect.assertions(3);
			expect(isNavigationKey('a')).toBe(false);
			expect(isNavigationKey('Enter')).toBe(false);
			expect(isNavigationKey('Escape')).toBe(false);
		});
	});

	describe('prevent default logic', () => {
		it('should prevent default for arrow keys', () => {
			expect.assertions(4);
			expect(shouldPreventDefault('ArrowUp')).toBe(true);
			expect(shouldPreventDefault('ArrowDown')).toBe(true);
			expect(shouldPreventDefault('ArrowLeft')).toBe(true);
			expect(shouldPreventDefault('ArrowRight')).toBe(true);
		});

		it('should prevent default for Home', () => {
			expect.assertions(1);
			expect(shouldPreventDefault('Home')).toBe(true);
		});

		it('should not prevent default for i', () => {
			expect.assertions(1);
			expect(shouldPreventDefault('i')).toBe(false);
		});

		it('should not prevent default for other keys', () => {
			expect.assertions(3);
			expect(shouldPreventDefault('a')).toBe(false);
			expect(shouldPreventDefault('Enter')).toBe(false);
			expect(shouldPreventDefault('Escape')).toBe(false);
		});
	});

	describe('input handling detection', () => {
		it('should use input handling for Enter when input focused', () => {
			expect.assertions(1);
			expect(shouldUseInputHandling('input', 'Enter')).toBe(true);
		});

		it('should use input handling for Escape when input focused', () => {
			expect.assertions(1);
			expect(shouldUseInputHandling('input', 'Escape')).toBe(true);
		});

		it('should not use input handling for arrows when input focused', () => {
			expect.assertions(4);
			expect(shouldUseInputHandling('input', 'ArrowUp')).toBe(false);
			expect(shouldUseInputHandling('input', 'ArrowDown')).toBe(false);
			expect(shouldUseInputHandling('input', 'ArrowLeft')).toBe(false);
			expect(shouldUseInputHandling('input', 'ArrowRight')).toBe(false);
		});

		it('should not use input handling when content focused', () => {
			expect.assertions(3);
			expect(shouldUseInputHandling('content', 'Enter')).toBe(false);
			expect(shouldUseInputHandling('content', 'Escape')).toBe(false);
			expect(shouldUseInputHandling('content', 'ArrowUp')).toBe(false);
		});
	});

	describe('send message detection', () => {
		it('should send on Enter without Shift', () => {
			expect.assertions(1);
			expect(shouldSendMessage('Enter', false)).toBe(true);
		});

		it('should not send on Enter with Shift', () => {
			expect.assertions(1);
			expect(shouldSendMessage('Enter', true)).toBe(false);
		});

		it('should not send on other keys', () => {
			expect.assertions(2);
			expect(shouldSendMessage('a', false)).toBe(false);
			expect(shouldSendMessage('Escape', false)).toBe(false);
		});
	});

	describe('blur input detection', () => {
		it('should blur on Escape', () => {
			expect.assertions(1);
			expect(shouldBlurInput('Escape')).toBe(true);
		});

		it('should not blur on other keys', () => {
			expect.assertions(3);
			expect(shouldBlurInput('Enter')).toBe(false);
			expect(shouldBlurInput('a')).toBe(false);
			expect(shouldBlurInput('ArrowUp')).toBe(false);
		});
	});
});
