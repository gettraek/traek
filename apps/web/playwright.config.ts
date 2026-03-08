import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	},
	testDir: 'e2e',
	timeout: 30_000,
	expect: { timeout: 10_000 },
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure'
	},
	projects: [
		{
			name: 'chromium',
			testIgnore: '**/mobile.test.ts',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'firefox',
			testIgnore: '**/mobile.test.ts',
			use: { ...devices['Desktop Firefox'] }
		},
		{
			name: 'webkit',
			testIgnore: '**/mobile.test.ts',
			use: { ...devices['Desktop Safari'] }
		},
		{
			name: 'mobile-chrome',
			testMatch: '**/mobile.test.ts',
			use: { ...devices['Pixel 5'] }
		},
		{
			name: 'mobile-safari',
			testMatch: '**/mobile.test.ts',
			use: { ...devices['iPhone 14'] }
		}
	]
});
