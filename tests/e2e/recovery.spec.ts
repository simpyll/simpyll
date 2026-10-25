import { test, expect } from '@playwright/test'
import { destination } from './helpers/navigation'

// Fault injection is confined to intercepted test responses. No shipped flags.
async function injectFailure(page: import('@playwright/test').Page, text: string) {
  await page.route('**/assets/*.js', async route => {
    const response = await route.fetch()
    const source = await response.text()
    const needle = source.includes(JSON.stringify(text)) ? JSON.stringify(text) : "`" + text + "`"
    await route.fulfill({ response, body: source.replace(needle,
      `(()=>{if(!globalThis.__recoveryAllowed)throw Error("private fixture detail");return ${needle}})()`),
    })
  })
}

test('route failures preserve the shell, focus recovery, and retry successfully', async ({ page }) => {
  await injectFailure(page, 'Simpyll / A personal work in progress')
  await page.goto('/blog')
  await (await destination(page, 'Home')).click()
  await expect(page.getByRole('heading', { name: 'Something went wrong.' })).toBeFocused()
  await expect(page.locator('header')).toBeVisible()
  await expect(page.locator('footer')).toBeVisible()
  await expect(page.getByText('private fixture detail')).toHaveCount(0)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeFocused()
  await page.evaluate('globalThis.__recoveryAllowed = true')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('bedside to')
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0)
})

test('persistent failures have bounded retry and navigation resets the boundary', async ({ page }) => {
  await injectFailure(page, 'Simpyll / A personal work in progress')
  await page.goto('/blog')
  await (await destination(page, 'Home')).click()
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('button', { name: 'Reload page' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0)
  await (await destination(page, 'Journal')).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Learning journal')
  await (await destination(page, 'Home')).click()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

for (const path of ['/blog/no-such-article', '/projects/no-such-project']) {
  test(`unknown resource is a genuine 404: ${path}`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: 'Page not found.' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Go home', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0)
  })
}

test('already loaded static content remains usable offline', async ({ page, context }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/blog')
  await context.setOffline(true)
  await page.locator('main a[href="/blog/hello-world"]').click()
  await expect(page.locator('main article').filter({ has: page.getByRole('heading', { level: 1 }) })).toBeVisible()
  expect(errors).toEqual([])
})


test('MDX render failures recover through the route boundary', async ({ page }) => {
  await injectFailure(page, 'Every website starts somewhere.')
  await page.goto('/blog')
  await page.locator('main a[href="/blog/hello-world"]').click()
  await expect(page.getByRole('heading', { name: 'Something went wrong.' })).toBeVisible()
  await expect(page.locator('header')).toBeVisible()
  await page.evaluate('globalThis.__recoveryAllowed = true')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByText('Every website starts somewhere.')).toBeVisible()
})

test('application failures use recovery without router context', async ({ page }) => {
  await injectFailure(page, 'floating-header')
  await page.goto('/blog')
  await expect(page.getByRole('heading', { name: 'Something went wrong.' })).toBeFocused()
  await expect(page.getByRole('button', { name: 'Reload page' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Go home', exact: true })).toHaveAttribute('href', '/')
  await expect(page.getByText('private fixture detail')).toHaveCount(0)
})
