import { test } from '@playwright/test';
import { gotoExplore } from './helpers';

test('debug ? - check preventDefault and showHelp', async ({ page }) => {
	await gotoExplore(page);

	const tree = page.locator('[role="tree"]');
	await tree.click({ position: { x: 50, y: 50 } });
	await page.waitForTimeout(300);

	// Monitor keydown in bubbling phase (after all element handlers)
	await page.evaluate(() => {
		(window as any).__keyLog = [];
		window.addEventListener(
			'keydown',
			(e) => {
				(window as any).__keyLog.push(`WIN: key=${e.key} defaultPrevented=${e.defaultPrevented}`);
			},
			false
		); // bubble phase = last to fire
	});

	await page.keyboard.press('?');
	await page.waitForTimeout(500);

	const log = await page.evaluate(() => (window as any).__keyLog);
	console.log('Key log (bubble phase):', JSON.stringify(log));

	// Check if there's a keyboardNavigator by looking for the showHelp element
	const dialogCount = await page.locator('[role="dialog"]').count();
	console.log('Dialog count:', dialogCount);

	// Check via DOM if keyboardNavigator state
	const navState = await page.evaluate(() => {
		// Try to find if there's a variable exposed
		const store = (window as any).__svelteStores;
		return store ? Object.keys(store) : 'no store';
	});
	console.log('Svelte stores:', navState);
});
