import { defineConfig, devices } from '@playwright/test'
import process from 'node:process'

const previewPort = Number(process.env.PLAYWRIGHT_PREVIEW_PORT ?? 4173)

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }], ['./tests/e2e/helpers/accessibility-reporter.ts']],
  use: {
    baseURL: `http://127.0.0.1:${previewPort}`,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : undefined,
    locale: 'en-US',
    timezoneId: 'UTC',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${previewPort} --strictPort`,
    url: `http://127.0.0.1:${previewPort}`,
    reuseExistingServer: false,
  },
})
