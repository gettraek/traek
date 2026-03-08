import type { Page } from '@playwright/test';

/** Navigate to the explore demo page (no API key needed, scripted responses). */
export async function gotoExplore(page: Page) {
	await page.goto('/demo/explore');
	await page.waitForSelector('[role="tree"]', { state: 'visible' });
}

/** Navigate to the home page and create a fresh empty conversation. */
export async function gotoNewConversation(page: Page): Promise<string> {
	await page.goto('/demo');
	await page.getByRole('button', { name: 'Neue Unterhaltung' }).click();
	await page.waitForSelector('[role="tree"]', { state: 'visible' });
	return page.url();
}

/**
 * Type a message in the canvas input and submit it.
 * Returns after the message textarea has cleared (submission accepted).
 */
export async function sendMessage(page: Page, text: string) {
	const textarea = page.locator('textarea[aria-label]').first();
	await textarea.fill(text);
	await textarea.press('Enter');
}

/** Wait for at least `count` text node cards to be visible on the canvas. */
export async function waitForNodeCount(page: Page, count: number) {
	await page.waitForFunction(
		(n) => document.querySelectorAll('.node-card, [data-node-id]').length >= n,
		count,
		{ timeout: 15_000 }
	);
}

/** Modifier key for the current platform (Meta on macOS, Control elsewhere). */
export function mod(page: Page): string {
	const ua = page.context().browser()?.browserType().name() ?? '';
	// Webkit (Safari) reports darwin; use Meta for Mac-like environments
	return ua === 'webkit' ? 'Meta' : 'Control';
}
