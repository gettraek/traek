/**
 * Onboarding logic — localStorage persistence and step navigation.
 */

export const ONBOARDING_SEEN_KEY = 'traek-focus-mode-onboarding-seen';

export function hasCompletedOnboarding(): boolean {
	if (typeof localStorage === 'undefined') return false;
	return localStorage.getItem(ONBOARDING_SEEN_KEY) === 'true';
}

export function markOnboardingComplete(): void {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
	}
}

export function clearOnboardingComplete(): void {
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(ONBOARDING_SEEN_KEY);
	}
}

export interface OnboardingStep {
	title: string;
	description: string;
	gesture: string;
	position: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
	{
		title: 'Welcome to Focus Mode',
		description: 'Navigate your conversation with natural gestures',
		gesture: 'swipe-demo',
		position: 'center'
	},
	{
		title: 'Swipe Up',
		description: 'Go deeper into the response chain',
		gesture: 'up',
		position: 'bottom'
	},
	{
		title: 'Swipe Down',
		description: 'Return to the previous message',
		gesture: 'down',
		position: 'top'
	},
	{
		title: 'Swipe Sideways',
		description: 'Switch between alternative responses',
		gesture: 'horizontal',
		position: 'middle'
	}
];

export function getNextStepIndex(currentStep: number): number | null {
	if (currentStep < ONBOARDING_STEPS.length - 1) return currentStep + 1;
	return null;
}

export function getStepButtonText(currentStep: number): string {
	if (currentStep < ONBOARDING_STEPS.length - 1) return 'Next';
	return "Let's go!";
}

export function isValidStepIndex(step: number): boolean {
	return step >= 0 && step < ONBOARDING_STEPS.length;
}
