import { expect, test } from '@playwright/test';
import { gotoExplore } from './helpers';

test.describe('Node creation & streaming', () => {
	test('typing and submitting a message creates a user node', async ({ page }) => {
		await gotoExplore(page);

		const textarea = page.locator('textarea[aria-label]').first();
		await textarea.fill('hello');
		await textarea.press('Enter');

		// The user message should appear as a new node
		await expect(page.getByText('hello').first()).toBeVisible({ timeout: 10_000 });
	});

	test('assistant responds after user message', async ({ page }) => {
		await gotoExplore(page);

		const textarea = page.locator('textarea[aria-label]').first();
		await textarea.fill('hello');
		await textarea.press('Enter');

		// The explore engine produces scripted responses — wait for assistant content
		// "Welcome to the træk interactive demo" is the scripted hello response
		await expect(page.getByText(/Welcome to the/i).first()).toBeVisible({ timeout: 15_000 });
	});

	test('user node is cleared from input after submission', async ({ page }) => {
		await gotoExplore(page);

		const textarea = page.locator('textarea[aria-label]').first();
		await textarea.fill('hello');
		await textarea.press('Enter');

		// Input should be cleared after submission
		await expect(textarea).toHaveValue('', { timeout: 5_000 });
	});

	test('multiple messages create a conversation chain', async ({ page }) => {
		await gotoExplore(page);

		const textarea = page.locator('textarea[aria-label]').first();

		// First message
		await textarea.fill('hello');
		await textarea.press('Enter');
		await expect(page.getByText(/Welcome to the/i).first()).toBeVisible({ timeout: 15_000 });

		// Second message
		await textarea.fill('branching');
		await textarea.press('Enter');
		await expect(page.getByText(/Branching is the core idea/i).first()).toBeVisible({
			timeout: 15_000
		});
	});

	test('send button submits the message', async ({ page }) => {
		await gotoExplore(page);

		const textarea = page.locator('textarea[aria-label]').first();
		await textarea.fill('spatial');

		await page.getByRole('button', { name: 'Send message' }).click({ force: true });

		await expect(page.getByText(/Why spatial layout/i).first()).toBeVisible({ timeout: 15_000 });
	});

	test('Shift+Enter inserts newline instead of submitting', async ({ page }) => {
		await gotoExplore(page);

		const textarea = page.locator('textarea[aria-label]').first();
		await textarea.fill('line one');
		await textarea.press('Shift+Enter');
		await textarea.type('line two');

		// Should NOT have submitted — textarea still has value
		const value = await textarea.inputValue();
		expect(value).toContain('line one');
		expect(value).toContain('line two');
	});
});
