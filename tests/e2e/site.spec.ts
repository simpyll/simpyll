import { destination, navigationReady } from './helpers/navigation'
import { test as base, expect, type Page } from '@playwright/test'
import { readdirSync } from 'node:fs'

// Exercise checked-in publishing output, never the live Notion API or external sites.
// Fail on hydration/runtime errors and accidental external network dependencies.
const test = base.extend<{ browserHealth: void }>({
  browserHealth: [async ({ page, context, baseURL }, use) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error' && /hydration|hydrating|Minified React error/i.test(message.text())) {
        errors.push(message.text())
      }
    })
    await context.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.origin === baseURL) return route.continue()
      errors.push(`Unexpected external request: ${url.origin}${url.pathname}`)
      return route.abort()
    })
    await use()
    expect(errors, 'Browser runtime, hydration and network errors').toEqual([])
  }, { auto: true }],
})

const articles = readdirSync(new URL('../../src/content/blog/', import.meta.url))
  .filter(file => file.endsWith('.mdx'))
  .map(file => file.slice(0, -4))

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

async function tabTo(page: Page, target: ReturnType<Page['getByRole']>, reverse = false) {
  // A bounded real Tab sequence detects controls removed from keyboard order.
  for (let index = 0; index < 40; index++) {
    await page.keyboard.press(reverse ? 'Shift+Tab' : 'Tab')
    if (await target.evaluate(element => element === document.activeElement)) return
  }
  await expect(target).toBeFocused()
}

test('homepage navigation reaches sections and journal, including from an article', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Frombedside tobuild.')
  await expectNoHorizontalOverflow(page)
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  await navigationReady(page)
  await (await destination(page, 'Projects')).click()
  await expect(page).toHaveURL('/projects')
  await expect(page.getByRole('heading', {level:1})).toHaveText('Projects.')
  await page.goto('/blog/hello-world')
  await (await destination(page, 'Journal')).click()
  await expect(page).toHaveURL('/blog')
  await nav.getByRole('link', { name: 'Home', exact: true }).click()
  await expect(page).toHaveURL('/')
})

test('journal links, client navigation and history work without document reloads', async ({ page }) => {
  await page.goto('/')
  const documents: string[] = []
  page.on('request', request => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents.push(request.url())
  })
  await page.getByRole('link', { name: 'Read the journal' }).click()
  await expect(page).toHaveURL('/blog')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Learning journal.')
  for (const slug of articles) {
    await expect(page.locator(`main a[href="/blog/${slug}"]`)).toBeVisible()
  }
  await page.getByRole('link', { name: /Hello, World/ }).click()
  await expect(page).toHaveURL('/blog/hello-world')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, World.')
  await expect(page.getByText('Every website starts somewhere.')).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Learning journal.')
  await page.goForward()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, World.')
  await page.getByRole('link', { name: 'Back to journal' }).click()
  await expect(page).toHaveTitle('Learning Journal | Simpyll')
  expect(documents).toEqual([])
})

for (const slug of articles) {
  test(`published article loads and reloads: ${slug}`, async ({ page }) => {
    const response = await page.goto(`/blog/${slug}/`)
    expect(response?.status()).toBe(200)
    await expect(page.locator('article > div.prose')).not.toBeEmpty()
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://simpyll.com/blog/${slug}`)
    await expectNoHorizontalOverflow(page)
    expect((await page.reload())?.status()).toBe(200)
    await page.getByRole('link', { name: 'Back to journal' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Learning journal.')
  })
}

test('Python MDX renders headings, code, lists and resource links', async ({ page }) => {
  await page.goto('/blog/001-python-fundamentals')
  await expect(page.getByRole('heading', { level: 2, name: 'Lesson 001: Functions and Variables' })).toBeVisible()
  await expect(page.locator('pre code').first()).toHaveText('print("Hello, world!")\n')
  await expect(page.locator('.article-content ol li')).toHaveCount(5)
  await expect(page.getByRole('link', { name: 'Python 3 Documentation' })).toHaveAttribute('href', 'https://docs.python.org/3/')
  await expect(page.locator('article time')).toHaveAttribute('datetime', '2026-10-20')
})

test('Notion-published MDX includes a working durable image', async ({ page }) => {
  await page.goto('/blog/publishing-test')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Publishing Test')
  await expect(page.locator('.prose p')).toContainText('my first blog post written in Notion')
  const image = page.locator('article figure img')
  await image.scrollIntoViewIfNeeded()
  await expect(image).toHaveAttribute('src', /^\/images\/optimized\/.+\.png$/)
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true)
  await expectNoHorizontalOverflow(page)
})

for (const path of ['/missing-e2e-page', '/blog/missing-e2e-article/']) {
  test(`404 response and recovery: ${path}`, async ({ page }) => {
    expect((await page.goto(path))?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found.')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
    await page.getByRole('link', { name: 'Back to journal' }).click()
    await expect(page).toHaveURL('/blog')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Learning journal.')
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
    await page.goBack()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found.')
  })
}

test('keyboard skip link, primary navigation and journal controls are usable', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to content' })
  await expect(skip).toBeFocused()
  await expect(skip).toBeInViewport()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()

  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  await navigationReady(page)
  for (const name of ['Home', 'Journal']) {
    const link = nav.getByRole('link', { name, exact: true })
    if (!await link.isVisible()) {
      await tabTo(page, nav.getByRole('button', { name: 'More' }))
      await page.keyboard.press('Enter')
    }
    await tabTo(page, link)
    await expect(link).toBeFocused()
    await expect(link).toHaveCSS('outline-style', 'solid')
  }
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/blog')
  await nav.getByRole('link', { name: 'Home', exact: true }).click()
  const journey = page.getByRole('link', { name: 'More about me' })
  await tabTo(page, journey)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/about')
  await tabTo(page, page.getByRole('link', { name: 'Read the learning journal' }))
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/blog')
  // Exercise the current journal inventory instead of a growing Tab path to an old post.
  const article = page.locator('main article h2 a').first()
  const articlePath = await article.getAttribute('href')
  expect(articlePath).toMatch(/^\/blog\/[a-z0-9-]+$/)
  await tabTo(page, article)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(articlePath!)
  // Route navigation focuses the article h1; the return link precedes it.
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
  await tabTo(page, page.getByRole('link', { name: 'Back to journal' }), true)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/blog')
})

test.describe('prerendered documents without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  const routes = [
    ['/', 'From Bedside to Build | Simpyll'],
    ['/blog', 'Learning Journal | Simpyll'],
    ['/blog/hello-world', 'Hello, World. | Simpyll'],
    ['/blog/publishing-test', 'Publishing Test | Simpyll'],
  ]
  for (const [path, title] of routes) {
    test(`direct HTML: ${path}`, async ({ page }) => {
      for (const suffix of path === '/' ? ['', '?source=e2e'] : ['', '/', '?source=e2e']) {
        expect((await page.goto(path + suffix))?.status()).toBe(200)
        await expect(page).toHaveTitle(title)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://simpyll.com${path}`)
        if (path === '/blog/hello-world') await expect(page.getByText('Every website starts somewhere.')).toBeVisible()
      }
    })
  }
})
