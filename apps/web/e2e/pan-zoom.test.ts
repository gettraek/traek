import { expect, test } from '@playwright/test';
import { gotoExplore } from './helpers';

test.describe('Pan & zoom interactions', () => {
	test('zoom controls are visible on canvas', async ({ page }) => {
		await gotoExplore(page);
		await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Zoom out' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Reset zoom to 100%' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Fit all nodes' })).toBeVisible();
	});

	test('zoom display shows percentage', async ({ page }) => {
		await gotoExplore(page);
		const zoomDisplay = page.getByRole('button', { name: 'Reset zoom to 100%' });
		const text = await zoomDisplay.textContent();
		// Should contain a percentage like "100%"
		expect(text).toMatch(/\d+%/);
	});

	test('zoom in button increases zoom level', async ({ page }) => {
		await gotoExplore(page);

		const zoomDisplay = page.getByRole('button', { name: 'Reset zoom to 100%' });
		const before = await zoomDisplay.textContent();
		const beforeNum = parseInt(before?.replace('%', '') ?? '100', 10);

		await page.getByRole('button', { name: 'Zoom in' }).click();

		const after = await zoomDisplay.textContent();
		const afterNum = parseInt(after?.replace('%', '') ?? '100', 10);

		expect(afterNum).toBeGreaterThan(beforeNum);
	});

	test('zoom out button decreases zoom level', async ({ page }) => {
		await gotoExplore(page);

		const zoomDisplay = page.getByRole('button', { name: 'Reset zoom to 100%' });
		const before = await zoomDisplay.textContent();
		const beforeNum = parseInt(before?.replace('%', '') ?? '100', 10);

		await page.getByRole('button', { name: 'Zoom out' }).click();

		const after = await zoomDisplay.textContent();
		const afterNum = parseInt(after?.replace('%', '') ?? '100', 10);

		expect(afterNum).toBeLessThan(beforeNum);
	});

	test('reset zoom button restores 100%', async ({ page }) => {
		await gotoExplore(page);

		// Zoom in twice then reset
		await page.getByRole('button', { name: 'Zoom in' }).click();
		await page.getByRole('button', { name: 'Zoom in' }).click();

		await page.getByRole('button', { name: 'Reset zoom to 100%' }).click();

		const zoomDisplay = page.getByRole('button', { name: 'Reset zoom to 100%' });
		const text = await zoomDisplay.textContent();
		expect(text).toBe('100%');
	});

	test('fit all nodes button is clickable', async ({ page }) => {
		await gotoExplore(page);
		// Clicking should not throw an error
		await page.getByRole('button', { name: 'Fit all nodes' }).click();
		// Canvas should still be visible and functional
		await expect(page.locator('[role="tree"]')).toBeVisible();
	});

	test('snap to grid toggle is clickable', async ({ page }) => {
		await gotoExplore(page);
		const snapBtn = page.getByRole('button', { name: 'Toggle snap to grid' });
		await expect(snapBtn).toBeVisible();

		// Toggle on
		await snapBtn.click();
		await expect(snapBtn).toHaveAttribute('aria-pressed', 'true');

		// Toggle off
		await snapBtn.click();
		await expect(snapBtn).toHaveAttribute('aria-pressed', 'false');
	});

	test('canvas pans when dragging', async ({ page }) => {
		await gotoExplore(page);

		const viewport = page.locator('[role="tree"]');
		const box = await viewport.boundingBox();
		if (!box) throw new Error('Could not get viewport bounding box');

		const centerX = box.x + box.width / 2;
		const centerY = box.y + box.height / 2;

		// Get the canvas transform before dragging
		const canvasSpace = page.locator('.canvas-space');
		const transformBefore = await canvasSpace.evaluate((el) => el.style.transform);

		// Drag the canvas
		await page.mouse.move(centerX, centerY);
		await page.mouse.down();
		await page.mouse.move(centerX + 100, centerY + 50);
		await page.mouse.up();

		// Canvas space transform should have changed
		const transformAfter = await canvasSpace.evaluate((el) => el.style.transform);
		expect(transformAfter).not.toBe(transformBefore);
	});

	test('ctrl+scroll zooms the canvas', async ({ page }) => {
		await gotoExplore(page);

		const viewport = page.locator('[role="tree"]');
		const box = await viewport.boundingBox();
		if (!box) throw new Error('Could not get viewport bounding box');

		const centerX = box.x + box.width / 2;
		const centerY = box.y + box.height / 2;

		const zoomDisplay = page.getByRole('button', { name: 'Reset zoom to 100%' });
		const before = await zoomDisplay.textContent();
		const beforeNum = parseInt(before?.replace('%', '') ?? '100', 10);

		// Ctrl+scroll up to zoom in
		await page.mouse.move(centerX, centerY);
		await page.keyboard.down('Control');
		await page.mouse.wheel(0, -100);
		await page.keyboard.up('Control');

		const after = await zoomDisplay.textContent();
		const afterNum = parseInt(after?.replace('%', '') ?? '100', 10);

		expect(afterNum).not.toBe(beforeNum);
	});
});
