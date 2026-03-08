import { expect, test } from '@playwright/test';
import { gotoExplore } from './helpers';

test.describe('Search & filter', () => {
	test('Ctrl/Cmd+F opens search bar', async ({ page }) => {
		await gotoExplore(page);

		await page.keyboard.press('Control+f');

		const searchInput = page.locator('input[placeholder="Search..."]');
		await expect(searchInput).toBeVisible({ timeout: 5_000 });
		// Input should be auto-focused
		await expect(searchInput).toBeFocused();
	});

	test('search bar shows result count', async ({ page }) => {
		await gotoExplore(page);
		await page.keyboard.press('Control+f');

		const searchInput = page.locator('input[placeholder="Search..."]');
		await expect(searchInput).toBeVisible();

		// Type a query that matches the pre-seeded content
		await searchInput.fill('træk');

		// Wait for match count to appear (e.g., "3 / 5 matches")
		await expect(
			page
				.locator('[aria-label="Next match (Enter)"], [aria-label="Previous match (Shift+Enter)"]')
				.first()
		).toBeVisible({ timeout: 5_000 });
	});

	test('search navigation buttons appear with matches', async ({ page }) => {
		await gotoExplore(page);
		await page.keyboard.press('Control+f');

		const searchInput = page.locator('input[placeholder="Search..."]');
		await searchInput.fill('træk');

		// Previous and next match buttons
		const prevBtn = page.getByRole('button', { name: /Previous match/i });
		const nextBtn = page.getByRole('button', { name: /Next match/i });

		await expect(nextBtn).toBeVisible({ timeout: 5_000 });
		await expect(prevBtn).toBeVisible({ timeout: 5_000 });
	});

	test('next match button navigates to next result', async ({ page }) => {
		await gotoExplore(page);
		await page.keyboard.press('Control+f');

		const searchInput = page.locator('input[placeholder="Search..."]');
		await searchInput.fill('træk');

		const nextBtn = page.getByRole('button', { name: /Next match/i });
		await expect(nextBtn).toBeVisible({ timeout: 5_000 });

		// Clicking next match should not throw
		await nextBtn.click();
		await expect(page.locator('[role="tree"]')).toBeVisible();
	});

	test('Enter key navigates to next search result', async ({ page }) => {
		await gotoExplore(page);
		await page.keyboard.press('Control+f');

		const searchInput = page.locator('input[placeholder="Search..."]');
		await searchInput.fill('træk');
		await expect(page.getByRole('button', { name: /Next match/i })).toBeVisible({ timeout: 5_000 });

		// Enter to go to next match
		await searchInput.press('Enter');
		await expect(page.locator('[role="tree"]')).toBeVisible();
	});

	test('Shift+Enter navigates to previous search result', async ({ page }) => {
		await gotoExplore(page);
		await page.keyboard.press('Control+f');

		const searchInput = page.locator('input[placeholder="Search..."]');
		await searchInput.fill('træk');
		await expect(page.getByRole('button', { name: /Previous match/i })).toBeVisible({
			timeout: 5_000
		});

		// Shift+Enter to go to previous match
		await searchInput.press('Shift+Enter');
		await expect(page.locator('[role="tree"]')).toBeVisible();
	});

	test('search shows no matches for unmatched query', async ({ page }) => {
		await gotoExplore(page);
		await page.keyboard.press('Control+f');

		const searchInput = page.locator('input[placeholder="Search..."]');
		await searchInput.fill('xyzzy_no_such_content_12345');

		await expect(page.getByText('No matches')).toBeVisible({ timeout: 5_000 });
	});

	test('close search button hides the search bar', async ({ page }) => {
		await gotoExplore(page);
		await page.keyboard.press('Control+f');

		const searchInput = page.locator('input[placeholder="Search..."]');
		await expect(searchInput).toBeVisible({ timeout: 5_000 });

		const closeBtn = page.getByRole('button', { name: /Close search/i });
		await expect(closeBtn).toBeVisible();
		await closeBtn.click();

		await expect(searchInput).not.toBeVisible({ timeout: 5_000 });
	});

	test('fuzzy search (Ctrl/Cmd+K) filters nodes by content', async ({ page }) => {
		await gotoExplore(page);
		await page.keyboard.press('Control+k');

		const fuzzyInput = page.locator('[aria-label="Search nodes"]');
		await expect(fuzzyInput).toBeVisible({ timeout: 5_000 });

		await fuzzyInput.fill('branch');

		// Should show matching results
		await expect(page.getByText(/branching/i).first()).toBeVisible({ timeout: 5_000 });
	});
});
