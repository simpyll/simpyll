import { defineConfig, devices } from '@playwright/test'
import process from 'node:process'

const crossBrowserMatch = process.env.PLAYWRIGHT_FULL_MATRIX
  ? /(?:cross-browser|navigation|heading-permalinks|project-detail|about|footer|recovery)\.spec\.ts/
  : /cross-browser\.spec\.ts/

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
    locale: 'en-US',
    timezoneId: 'UTC',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : undefined } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : undefined } },
    { name: 'desktop-firefox', testMatch: crossBrowserMatch, use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } } },
    { name: 'desktop-webkit', testMatch: crossBrowserMatch, use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-webkit', testMatch: crossBrowserMatch, use: { ...devices['iPhone SE'] } },
    // Bounded coverage across engines; full feature journeys remain in Chromium.
    { name: 'accessibility-firefox', testMatch: /accessibility\.spec\.ts/, use: { ...devices['Desktop Firefox'] } },
    { name: 'accessibility-webkit', testMatch: /accessibility\.spec\.ts/, use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${previewPort} --strictPort`,
    url: `http://127.0.0.1:${previewPort}`,
    reuseExistingServer: false,
  },
})
