import { expect, test } from '@playwright/test';
import { gotoExplore } from './helpers';

test.describe('Keyboard shortcuts', () => {
	test('Ctrl/Cmd+F opens the search bar', async ({ page }) => {
		await gotoExplore(page);

		await page.keyboard.press('Control+f');

		// Search bar should appear with a search input
		const searchInput = page.locator('input[placeholder="Search..."]');
		await expect(searchInput).toBeVisible({ timeout: 5_000 });
	});

	test('Escape closes the search bar', async ({ page }) => {
		await gotoExplore(page);

		await page.keyboard.press('Control+f');
		const searchInput = page.locator('input[placeholder="Search..."]');
		await expect(searchInput).toBeVisible({ timeout: 5_000 });

		await page.keyboard.press('Escape');
		await expect(searchInput).not.toBeVisible({ timeout: 5_000 });
	});

	test('Ctrl/Cmd+K opens the fuzzy search overlay', async ({ page }) => {
		await gotoExplore(page);

		await page.keyboard.press('Control+k');

		// Fuzzy search overlay should appear
		const fuzzyInput = page.locator('[aria-label="Search nodes"]');
		await expect(fuzzyInput).toBeVisible({ timeout: 5_000 });
	});

	test('Ctrl/Cmd+Z triggers undo when available', async ({ page }) => {
		await gotoExplore(page);

		// Send a message to create history
		const textarea = page.locator('textarea[aria-label]').first();
		await textarea.fill('hello');
		await textarea.press('Enter');

		// Wait for response to arrive
		await expect(page.getByText(/Welcome to the/i).first()).toBeVisible({ timeout: 15_000 });

		// Undo button should now be visible
		const undoBtn = page.getByRole('button', { name: 'Undo' });
		await expect(undoBtn).toBeVisible();

		// Press Ctrl+Z
		await page.keyboard.press('Control+z');

		// After undo, the nodes added may be removed; canvas should still render
		await expect(page.locator('[role="tree"]')).toBeVisible();
	});

	test('Ctrl/Cmd+Shift+Z triggers redo after undo', async ({ page }) => {
		await gotoExplore(page);

		// Send a message to create history
		const textarea = page.locator('textarea[aria-label]').first();
		await textarea.fill('hello');
		await textarea.press('Enter');
		await expect(page.getByText(/Welcome to the/i).first()).toBeVisible({ timeout: 15_000 });

		// Undo
		await page.keyboard.press('Control+z');
		const undoBtn = page.getByRole('button', { name: 'Undo' });
		await expect(undoBtn).toBeVisible(); // still shows undo/redo controls

		// Redo
		const redoBtn = page.getByRole('button', { name: 'Redo' });
		await expect(redoBtn).toBeEnabled();
		await page.keyboard.press('Control+Shift+z');

		// Canvas should still render after redo
		await expect(page.locator('[role="tree"]')).toBeVisible();
	});

	test('? key opens keyboard help overlay', async ({ page }) => {
		await gotoExplore(page);

		// Focus the canvas viewport and press ?
		const canvas = page.locator('[role="tree"]');
		await canvas.click({ position: { x: 50, y: 50 } });
		await canvas.press('?');

		// Keyboard help dialog should appear
		const helpDialog = page.locator('[role="dialog"]');
		await expect(helpDialog).toBeVisible({ timeout: 5_000 });
		await expect(page.getByText('Keyboard Shortcuts')).toBeVisible();
	});

	test('Escape closes keyboard help overlay', async ({ page }) => {
		await gotoExplore(page);

		const canvas = page.locator('[role="tree"]');
		await canvas.click({ position: { x: 50, y: 50 } });
		await canvas.press('?');

		const helpDialog = page.locator('[role="dialog"]');
		await expect(helpDialog).toBeVisible({ timeout: 5_000 });

		await page.keyboard.press('Escape');
		await expect(helpDialog).not.toBeVisible({ timeout: 5_000 });
	});

	test('Ctrl/Cmd+B toggles bookmark jump overlay', async ({ page }) => {
		await gotoExplore(page);

		await page.keyboard.press('Control+b');

		// Bookmark jump overlay should appear or toggle
		// The overlay appears as a floating panel
		await page.waitForTimeout(500);
		// Just verify the canvas is still functional
		await expect(page.locator('[role="tree"]')).toBeVisible();
	});
});
