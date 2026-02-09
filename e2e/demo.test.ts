import { expect, test } from '@playwright/test';

test('home page has expected h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toBeVisible();
});

test('demo list page loads', async ({ page }) => {
	await page.goto('/demo');
	await expect(page.getByRole('heading', { name: /Mycelium Demo/i })).toBeVisible();
	await expect(page.getByRole('button', { name: /New chat/i })).toBeVisible();
});
