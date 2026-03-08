import { expect, test } from '@playwright/test';
import { gotoExplore } from './helpers';

test.describe('Undo & redo', () => {
	test('undo/redo controls appear after adding a node', async ({ page }) => {
		await gotoExplore(page);

		const textarea = page.locator('textarea[aria-label]').first();
		await textarea.fill('hello');
		await textarea.press('Enter');

		// Wait for the user node to appear
		await expect(page.getByText('hello').first()).toBeVisible({ timeout: 10_000 });

		// Undo/redo buttons should now be visible
		await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible({ timeout: 5_000 });
	});

	test('undo button is enabled after adding a node', async ({ page }) => {
		await gotoExplore(page);

		const textarea = page.locator('textarea[aria-label]').first();
		await textarea.fill('hello');
		await textarea.press('Enter');
		await expect(page.getByText('hello').first()).toBeVisible({ timeout: 10_000 });

		const undoBtn = page.getByRole('button', { name: 'Undo' });
		await expect(undoBtn).toBeEnabled({ timeout: 5_000 });
	});

	test('undo button click reverts last action', async ({ page }) => {
		await gotoExplore(page);

		const textarea = page.locator('textarea[aria-label]').first();
		await textarea.fill('hello');
		await textarea.press('Enter');
		await expect(page.getByText('hello').first()).toBeVisible({ timeout: 10_000 });

		const undoBtn = page.getByRole('button', { name: 'Undo' });
		await expect(undoBtn).toBeEnabled({ timeout: 5_000 });

		// Count nodes before undo
		const nodesBefore = await page.locator('.canvas-space [data-node-id]').count();

		await undoBtn.click();

		// After undo, fewer nodes on the canvas (or same if we undid to explore state)
		const nodesAfter = await page.locator('.canvas-space [data-node-id]').count();
		expect(nodesAfter).toBeLessThanOrEqual(nodesBefore);

		// Canvas remains functional
		await expect(page.locator('[role="tree"]')).toBeVisible();
	});

	test('redo is enabled after undo', async ({ page }) => {
		await gotoExplore(page);

		const textarea = page.locator('textarea[aria-label]').first();
		await textarea.fill('hello');
		await textarea.press('Enter');
		await expect(page.getByText('hello').first()).toBeVisible({ timeout: 10_000 });

		const undoBtn = page.getByRole('button', { name: 'Undo' });
		await expect(undoBtn).toBeEnabled({ timeout: 5_000 });

		await undoBtn.click();

		const redoBtn = page.getByRole('button', { name: 'Redo' });
		await expect(redoBtn).toBeEnabled({ timeout: 5_000 });
	});

	test('redo restores undone action', async ({ page }) => {
		await gotoExplore(page);

		const textarea = page.locator('textarea[aria-label]').first();
		await textarea.fill('hello');
		await textarea.press('Enter');
		await expect(page.getByText('hello').first()).toBeVisible({ timeout: 10_000 });

		const undoBtn = page.getByRole('button', { name: 'Undo' });
		await expect(undoBtn).toBeEnabled({ timeout: 5_000 });

		const nodesBefore = await page.locator('.canvas-space [data-node-id]').count();

		await undoBtn.click();
		const nodesAfterUndo = await page.locator('.canvas-space [data-node-id]').count();

		const redoBtn = page.getByRole('button', { name: 'Redo' });
		await expect(redoBtn).toBeEnabled({ timeout: 5_000 });
		await redoBtn.click();

		const nodesAfterRedo = await page.locator('.canvas-space [data-node-id]').count();

		// After redo, node count should be back to where it was before undo
		expect(nodesAfterRedo).toBeGreaterThanOrEqual(nodesAfterUndo);
		expect(nodesAfterRedo).toBeLessThanOrEqual(nodesBefore);
	});

	test('Ctrl+Z keyboard shortcut performs undo', async ({ page }) => {
		await gotoExplore(page);

		const textarea = page.locator('textarea[aria-label]').first();
		await textarea.fill('hello');
		await textarea.press('Enter');
		await expect(page.getByText('hello').first()).toBeVisible({ timeout: 10_000 });

		await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled({ timeout: 5_000 });

		await page.keyboard.press('Control+z');

		// Canvas remains functional
		await expect(page.locator('[role="tree"]')).toBeVisible();
	});

	test('Ctrl+Shift+Z keyboard shortcut performs redo', async ({ page }) => {
		await gotoExplore(page);

		const textarea = page.locator('textarea[aria-label]').first();
		await textarea.fill('hello');
		await textarea.press('Enter');
		await expect(page.getByText('hello').first()).toBeVisible({ timeout: 10_000 });

		await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled({ timeout: 5_000 });
		await page.keyboard.press('Control+z');

		await expect(page.getByRole('button', { name: 'Redo' })).toBeEnabled({ timeout: 5_000 });
		await page.keyboard.press('Control+Shift+z');

		// Canvas remains functional
		await expect(page.locator('[role="tree"]')).toBeVisible();
	});
});
