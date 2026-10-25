import { test, expect } from '@playwright/test'
import { profile } from '../../src/content/profile'
import { destination, navigationReady } from './helpers/navigation'
import { scan, tabTo } from './helpers/accessibility'

test('About supports direct loads, refresh, metadata and honest public content', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  for (const path of ['/about', '/about/', '/about?source=test']) {
    expect((await page.goto(path))?.status()).toBe(200)
    await navigationReady(page)
    await expect(page.locator('h1')).toHaveText(
      profile.headline.replaceAll('. ', '.'),
    )
    await expect(page).toHaveTitle(`${profile.seo.title} | Simpyll`)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      profile.seo.description,
    )
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://simpyll.com/about',
    )
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://simpyll.com/about',
    )
    await expect(page.getByRole('main')).toContainText(
      `${profile.name}, ${profile.credentials}`,
    )
    for (const job of profile.experience) {
      await expect(
        page
          .getByRole('listitem')
          .filter({
            has: page.getByRole('heading', { name: job.role, exact: true }),
          }),
      ).toContainText(job.dates)
    }
    await expect(page.getByRole('main')).toContainText(
      'Bachelor of Science in Nursing',
    )
    await expect(page.getByRole('main')).toContainText(
      'Associate Degree in Nursing',
    )
    const text = await page.getByRole('main').innerText()
    expect(text).not.toMatch(
      /Your Name|Lorem ipsum|license number|credential ID/i,
    )
    const schema = await page
      .locator('script[type="application/ld+json"]')
      .textContent()
    expect(JSON.parse(schema!).mainEntity).toMatchObject({
      '@type': 'Person',
      name: profile.name,
      sameAs: [profile.links.linkedin],
    })
  }
  // Firefox exposes successful conditional revalidation as 304.
  expect([200, 304]).toContain((await page.reload())?.status())
  await expect(page.locator('h1')).toBeVisible()
  expect(errors).toEqual([])
})

test('shared teaser, keyboard navigation, route focus and history work', async ({
  page,
}) => {
  await page.goto('/')
  await navigationReady(page)
  await expect(page.locator('#about')).toContainText(profile.homeSummary)
  const documents: string[] = []
  page.on('request', (request) => {
    if (request.isNavigationRequest()) documents.push(request.url())
  })
  await tabTo(page, page.getByRole('link', { name: 'More about me' }))
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/about')
  await expect(page.locator('h1')).toBeFocused()
  await expect(await destination(page, 'About')).toHaveAttribute(
    'aria-current',
    'page',
  )
  await page.evaluate(() => scrollTo(0, 800))
  await (await destination(page, 'Journal')).click()
  await expect(page).toHaveURL('/blog')
  await page.goBack()
  await expect(page).toHaveURL('/about')
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(800, 0)
  await page.goForward()
  await expect(page).toHaveURL('/blog')
  expect(documents).toEqual([])
})

for (const theme of ['light', 'dark'] as const) {
  test(`About ${theme}: accessible, responsive and stable navigation`, async ({
    page,
  }, info) => {
    const viewport = page.viewportSize()!
    await page.addInitScript(
      (value) => localStorage.setItem('simpyll-theme', value),
      theme,
    )
    await page.goto('/about')
    await navigationReady(page)
    // Use the actual resolved palette; screenshots and axe must inspect both themes.
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value
    }, theme)
    await page.evaluate(() => document.fonts.ready)
    await scan(page, info, `about-${theme}`)
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true)
    }
    await page.setViewportSize(viewport)
    const header = page.locator('.floating-header')
    const before = (await header.boundingBox())!
    await page.evaluate(() => scrollBy(0, 24))
    await expect
      .poll(async () => Math.abs((await header.boundingBox())!.y - before.y))
      .toBeLessThan(1)
    await page.evaluate(() => scrollTo(0, 0))
    await page.screenshot({
      path: info.outputPath(`about-${theme}.png`),
      fullPage: true,
    })
  })
}

test('About remains readable without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  })
  const page = await context.newPage()
  expect((await page.goto(`${baseURL}/about`))?.status()).toBe(200)
  await expect(page.locator('h1')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Built in critical care.' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Connect on LinkedIn' }),
  ).toHaveAttribute('href', profile.links.linkedin)
  await context.close()
})
