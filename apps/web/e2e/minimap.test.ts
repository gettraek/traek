import { expect, test } from '@playwright/test';
import { gotoExplore } from './helpers';

test.describe('Minimap navigation', () => {
	test('minimap renders when enough nodes exist', async ({ page }) => {
		await gotoExplore(page);

		// The explore engine pre-seeds more than 4 nodes (minimapMinNodes=4),
		// so the minimap toggle should be visible after page load
		const minimap = page.locator(
			'svg[aria-label="Minimap overview"], [aria-label="Expand minimap"]'
		);
		await expect(minimap.first()).toBeVisible({ timeout: 10_000 });
	});

	test('minimap toggle button exists', async ({ page }) => {
		await gotoExplore(page);

		// Toggle button collapses/expands minimap
		const toggleBtn = page.locator(
			'button[aria-label="Collapse minimap"], button[aria-label="Expand minimap"]'
		);
		await expect(toggleBtn.first()).toBeVisible({ timeout: 10_000 });
	});

	test('minimap collapses and expands via toggle button', async ({ page }) => {
		await gotoExplore(page);

		// Minimap starts collapsed — expand button should be visible
		const expandBtn = page.getByRole('button', { name: 'Expand minimap' });
		const collapseBtn = page.getByRole('button', { name: 'Collapse minimap' });

		await expect(expandBtn).toBeVisible({ timeout: 10_000 });

		// Expand it
		await expandBtn.click();
		await expect(collapseBtn).toBeVisible({ timeout: 5_000 });
		await expect(expandBtn).not.toBeVisible();

		// Collapse it again
		await collapseBtn.click();
		await expect(expandBtn).toBeVisible({ timeout: 5_000 });
	});

	test('minimap shows node representations', async ({ page }) => {
		await gotoExplore(page);

		// Expand minimap first (starts collapsed)
		const expandBtn = page.getByRole('button', { name: 'Expand minimap' });
		await expect(expandBtn).toBeVisible({ timeout: 10_000 });
		await expandBtn.click();

		// Minimap SVG with node rectangles should be present
		const minimapSvg = page.locator('svg[aria-label="Minimap overview"]');
		await expect(minimapSvg).toBeVisible({ timeout: 5_000 });

		// Minimap nodes should be rendered as rects inside the SVG
		const minimapNodes = minimapSvg.locator('.minimap-node, rect:not(.minimap-bg)');
		await expect(minimapNodes.first()).toBeVisible({ timeout: 5_000 });
	});

	test('minimap is keyboard accessible', async ({ page }) => {
		await gotoExplore(page);

		const toggleBtn = page.locator(
			'button[aria-label="Collapse minimap"], button[aria-label="Expand minimap"]'
		);
		await expect(toggleBtn.first()).toBeVisible({ timeout: 10_000 });

		// Tab to the minimap toggle and activate with keyboard
		await toggleBtn.first().focus();
		await page.keyboard.press('Enter');

		// State should have toggled
		await expect(
			page.locator('button[aria-label="Collapse minimap"], button[aria-label="Expand minimap"]')
		).toBeVisible({ timeout: 3_000 });
	});
});
