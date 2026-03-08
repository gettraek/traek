import { expect, test } from '@playwright/test';
import { gotoExplore, gotoNewConversation } from './helpers';

test.describe('Canvas load & render', () => {
	test('home page renders with h1', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('h1')).toBeVisible();
	});

	test('demo list page renders with new conversation button', async ({ page }) => {
		await page.goto('/demo');
		await expect(page.getByRole('button', { name: 'Neue Unterhaltung' })).toBeVisible();
	});

	test('explore page renders the canvas viewport', async ({ page }) => {
		await gotoExplore(page);
		const viewport = page.locator('[role="tree"]');
		await expect(viewport).toBeVisible();
		await expect(viewport).toHaveAttribute('aria-label', 'Conversation tree');
	});

	test('explore page shows pre-seeded nodes', async ({ page }) => {
		await gotoExplore(page);
		// The explore engine pre-populates with "What is træk" root message
		await expect(page.getByText('What is træk and why does it exist?')).toBeVisible();
	});

	test('explore page renders zoom controls', async ({ page }) => {
		await gotoExplore(page);
		await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Zoom out' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Reset zoom to 100%' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Fit all nodes' })).toBeVisible();
	});

	test('explore page renders the message input', async ({ page }) => {
		await gotoExplore(page);
		await expect(page.locator('textarea[aria-label]').first()).toBeVisible();
		await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();
	});

	test('new conversation shows empty state', async ({ page }) => {
		await gotoNewConversation(page);
		await expect(page.getByText('Start a conversation')).toBeVisible();
	});

	test('send button is disabled when input is empty', async ({ page }) => {
		await gotoExplore(page);
		const sendBtn = page.getByRole('button', { name: 'Send message' });
		await expect(sendBtn).toBeDisabled();
	});

	test('send button enables when text is entered', async ({ page }) => {
		await gotoExplore(page);
		const textarea = page.locator('textarea[aria-label]').first();
		const sendBtn = page.getByRole('button', { name: 'Send message' });

		await textarea.fill('hello');
		await expect(sendBtn).toBeEnabled();

		await textarea.fill('');
		await expect(sendBtn).toBeDisabled();
	});
});
