import { defineConfig, devices } from '@playwright/test'
import process from 'node:process'
export default defineConfig({
  testDir: './tests/production',
  timeout: 45000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'artifacts/production/browser-report', open: 'never' }]],
  outputDir: 'artifacts/production/browser-results',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.SMOKE_BASE_URL ?? 'https://simpyll.com',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : undefined,
  },
})
