import { defineConfig, devices } from '@playwright/test'
import process from 'node:process'

// Focused pull-request browser gate. PRs keep the required axe/keyboard
// accessibility suites on Firefox and WebKit, plus the critical functional
// journeys on both Chromium projects: navigation, the clinical LipidPath
// calculator, missing-page hydration recovery, published slug-history
// redirects, route restoration and pre-paint theme behavior.
// The exhaustive inventory stays in playwright.config.ts and runs in the
// weekly schedule, manual full-matrix dispatch and the main/Pages deploy gate.
const criticalMatch = /(?:navigation|lipidpath|missing-page|redirects|recovery|route-restoration|theme)\.spec\.ts/

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
  // Critical journeys are sharded by the PR workflow; project order keeps
  // the axe scans distributed instead of piling onto one runner.
  projects: [
    { name: 'accessibility-firefox', testMatch: /accessibility\.spec\.ts/, use: { ...devices['Desktop Firefox'] } },
    { name: 'accessibility-webkit', testMatch: /accessibility\.spec\.ts/, use: { ...devices['Desktop Safari'] } },
    { name: 'desktop-chromium', testMatch: criticalMatch, use: { ...devices['Desktop Chrome'], launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : undefined } },
    { name: 'mobile-chromium', testMatch: criticalMatch, use: { ...devices['Pixel 7'], launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : undefined } },
  ],
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${previewPort} --strictPort`,
    url: `http://127.0.0.1:${previewPort}`,
    reuseExistingServer: false,
  },
})
