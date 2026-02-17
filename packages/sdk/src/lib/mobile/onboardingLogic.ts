/**
 * Onboarding logic - localStorage persistence and step navigation
 */

export const ONBOARDING_SEEN_KEY = 'traek-focus-mode-onboarding-seen';

/**
 * Check if onboarding has been completed
 */
export function hasCompletedOnboarding(): boolean {
	if (typeof localStorage === 'undefined') return false;
	return localStorage.getItem(ONBOARDING_SEEN_KEY) === 'true';
}

/**
 * Mark onboarding as completed
 */
export function markOnboardingComplete(): void {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
	}
}

/**
 * Clear onboarding completion (for testing)
 */
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
		title: 'Willkommen zum Focus Mode',
		description: 'Navigiere durch deine Konversation mit natürlichen Gesten',
		gesture: 'swipe-demo',
		position: 'center'
	},
	{
		title: 'Nach oben wischen',
		description: 'Gehe tiefer in die Antwort-Kette',
		gesture: 'up',
		position: 'bottom'
	},
	{
		title: 'Nach unten wischen',
		description: 'Zurück zur vorherigen Nachricht',
		gesture: 'down',
		position: 'top'
	},
	{
		title: 'Seitlich wischen',
		description: 'Zwischen alternativen Antworten wechseln',
		gesture: 'horizontal',
		position: 'middle'
	}
];

/**
 * Get the next step index, or null if at end
 */
export function getNextStepIndex(currentStep: number): number | null {
	if (currentStep < ONBOARDING_STEPS.length - 1) {
		return currentStep + 1;
	}
	return null;
}

/**
 * Get the button text for a given step
 */
export function getStepButtonText(currentStep: number): string {
	if (currentStep < ONBOARDING_STEPS.length - 1) {
		return 'Weiter';
	}
	return "Los geht's!";
}

/**
 * Check if a step index is valid
 */
export function isValidStepIndex(step: number): boolean {
	return step >= 0 && step < ONBOARDING_STEPS.length;
}
