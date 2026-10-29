import { defineConfig, devices } from '@playwright/test'
import process from 'node:process'

const crossBrowserMatch = process.env.PLAYWRIGHT_FULL_MATRIX
  ? /(?:link-previews|article-share|lightbox|images|lipidpath|topics|pulse|seo|citations|editorial|cross-browser|missing-page|breadcrumbs|navigation|heading-permalinks|project-detail|about|footer|recovery|related-articles|article-print)\.spec\.ts/
  : /(?:link-previews|article-share|lightbox|images|lipidpath|topics|pulse|seo|citations|editorial|cross-browser|missing-page|breadcrumbs|related-articles|article-print)\.spec\.ts/

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
  // Native sharding follows project order. Interleave engine-specific work with
  // Chromium so the required axe scans and new smoke do not pile onto one runner.
  projects: [
    { name: 'accessibility-firefox', testMatch: /accessibility\.spec\.ts/, use: { ...devices['Desktop Firefox'] } },
    { name: 'desktop-firefox', testMatch: crossBrowserMatch, use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } } },
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : undefined } },
    { name: 'accessibility-webkit', testMatch: /accessibility\.spec\.ts/, use: { ...devices['Desktop Safari'] } },
    { name: 'desktop-webkit', testMatch: crossBrowserMatch, use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-webkit', testMatch: crossBrowserMatch, use: { ...devices['iPhone SE'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : undefined } },
  ],
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${previewPort} --strictPort`,
    url: `http://127.0.0.1:${previewPort}`,
    reuseExistingServer: false,
  },
})
