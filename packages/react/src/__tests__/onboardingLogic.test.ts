import { describe, it, expect, beforeEach } from 'vitest';
import {
	hasCompletedOnboarding,
	markOnboardingComplete,
	clearOnboardingComplete,
	getNextStepIndex,
	getStepButtonText,
	isValidStepIndex,
	ONBOARDING_STEPS,
	ONBOARDING_SEEN_KEY
} from '../mobile/onboardingLogic.js';

function makeLocalStorage() {
	const store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		get length() {
			return Object.keys(store).length;
		},
		key: (i: number) => Object.keys(store)[i] ?? null
	};
}

describe('onboardingLogic', () => {
	beforeEach(() => {
		const ls = makeLocalStorage();
		Object.defineProperty(globalThis, 'localStorage', {
			value: ls,
			writable: true,
			configurable: true
		});
	});

	it('hasCompletedOnboarding() is false initially', () => {
		expect(hasCompletedOnboarding()).toBe(false);
	});

	it('markOnboardingComplete() sets the flag', () => {
		markOnboardingComplete();
		expect(hasCompletedOnboarding()).toBe(true);
		expect(localStorage.getItem(ONBOARDING_SEEN_KEY)).toBe('true');
	});

	it('clearOnboardingComplete() removes the flag', () => {
		markOnboardingComplete();
		clearOnboardingComplete();
		expect(hasCompletedOnboarding()).toBe(false);
	});

	it('ONBOARDING_STEPS has 4 steps', () => {
		expect(ONBOARDING_STEPS).toHaveLength(4);
	});

	it('getNextStepIndex() returns next index or null at end', () => {
		expect(getNextStepIndex(0)).toBe(1);
		expect(getNextStepIndex(2)).toBe(3);
		expect(getNextStepIndex(3)).toBeNull();
	});

	it('getStepButtonText() returns "Next" or final text', () => {
		expect(getStepButtonText(0)).toBe('Next');
		expect(getStepButtonText(3)).toBeTruthy();
		expect(getStepButtonText(3)).not.toBe('Next');
	});

	it('isValidStepIndex() validates indices', () => {
		expect(isValidStepIndex(0)).toBe(true);
		expect(isValidStepIndex(3)).toBe(true);
		expect(isValidStepIndex(-1)).toBe(false);
		expect(isValidStepIndex(4)).toBe(false);
	});
});
