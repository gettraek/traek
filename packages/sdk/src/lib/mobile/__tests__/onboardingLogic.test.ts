import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
	ONBOARDING_SEEN_KEY,
	hasCompletedOnboarding,
	markOnboardingComplete,
	clearOnboardingComplete,
	ONBOARDING_STEPS,
	getNextStepIndex,
	getStepButtonText,
	isValidStepIndex
} from '../onboardingLogic';

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		}
	};
})();

beforeEach(() => {
	Object.defineProperty(globalThis, 'localStorage', {
		value: localStorageMock,
		writable: true,
		configurable: true
	});
	localStorageMock.clear();
});

afterEach(() => {
	localStorageMock.clear();
});

describe('onboardingLogic', () => {
	describe('localStorage persistence', () => {
		it('should return false when onboarding not completed', () => {
			expect.assertions(1);
			expect(hasCompletedOnboarding()).toBe(false);
		});

		it('should mark onboarding as complete', () => {
			expect.assertions(2);
			expect(hasCompletedOnboarding()).toBe(false);

			markOnboardingComplete();

			expect(hasCompletedOnboarding()).toBe(true);
		});

		it('should persist completion to localStorage', () => {
			expect.assertions(1);
			markOnboardingComplete();

			expect(localStorage.getItem(ONBOARDING_SEEN_KEY)).toBe('true');
		});

		it('should clear onboarding completion', () => {
			expect.assertions(2);
			markOnboardingComplete();
			expect(hasCompletedOnboarding()).toBe(true);

			clearOnboardingComplete();

			expect(hasCompletedOnboarding()).toBe(false);
		});

		it('should handle missing localStorage gracefully', () => {
			expect.assertions(1);
			// @ts-expect-error - testing undefined localStorage
			globalThis.localStorage = undefined;

			expect(hasCompletedOnboarding()).toBe(false);
		});
	});

	describe('onboarding steps', () => {
		it('should have 4 steps', () => {
			expect.assertions(1);
			expect(ONBOARDING_STEPS.length).toBe(4);
		});

		it('should have correct first step', () => {
			expect.assertions(2);
			const firstStep = ONBOARDING_STEPS[0];
			expect(firstStep.title).toBe('Willkommen zum Focus Mode');
			expect(firstStep.gesture).toBe('swipe-demo');
		});

		it('should have all required properties for each step', () => {
			expect.assertions(16);
			ONBOARDING_STEPS.forEach((step) => {
				expect(step.title).toBeDefined();
				expect(step.description).toBeDefined();
				expect(step.gesture).toBeDefined();
				expect(step.position).toBeDefined();
			});
		});
	});

	describe('step navigation', () => {
		it('should get next step index from step 0', () => {
			expect.assertions(1);
			expect(getNextStepIndex(0)).toBe(1);
		});

		it('should get next step index from step 1', () => {
			expect.assertions(1);
			expect(getNextStepIndex(1)).toBe(2);
		});

		it('should return null at final step', () => {
			expect.assertions(1);
			expect(getNextStepIndex(3)).toBeNull();
		});

		it('should return "Weiter" for intermediate steps', () => {
			expect.assertions(3);
			expect(getStepButtonText(0)).toBe('Weiter');
			expect(getStepButtonText(1)).toBe('Weiter');
			expect(getStepButtonText(2)).toBe('Weiter');
		});

		it('should return "Los geht\'s!" for final step', () => {
			expect.assertions(1);
			expect(getStepButtonText(3)).toBe("Los geht's!");
		});
	});

	describe('step validation', () => {
		it('should validate step 0', () => {
			expect.assertions(1);
			expect(isValidStepIndex(0)).toBe(true);
		});

		it('should validate step 3 (last step)', () => {
			expect.assertions(1);
			expect(isValidStepIndex(3)).toBe(true);
		});

		it('should invalidate negative step', () => {
			expect.assertions(1);
			expect(isValidStepIndex(-1)).toBe(false);
		});

		it('should invalidate step beyond range', () => {
			expect.assertions(1);
			expect(isValidStepIndex(4)).toBe(false);
		});

		it('should invalidate step 10', () => {
			expect.assertions(1);
			expect(isValidStepIndex(10)).toBe(false);
		});
	});
});
