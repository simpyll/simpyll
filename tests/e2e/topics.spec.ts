import { test, expect } from '@playwright/test'
import { scan, visibleFocus } from './helpers/accessibility'
import { navigationReady } from './helpers/navigation'

for (const theme of ['light', 'dark'] as const) {
  test(`curated reading paths and reciprocal project links work in ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    const errors: string[] = []
    page.on('pageerror',error=>errors.push(error.message))
    await page.goto('/blog')
    await navigationReady(page)
    const section = page.getByRole('region',{name:'Find a starting point'})
    await expect(section).toBeVisible()
    await expect(section.getByRole('heading',{name:'Nursing informatics & healthcare technology'})).toBeVisible()
    const link = section.getByRole('link',{name:'The Art of Reading Code:',exact:false})
    await link.focus()
    await visibleFocus(link)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/blog\/the-art-of-reading-code$/)
    const project = page.getByRole('region',{name:'Projects behind the writing'})
    await expect(project).toBeVisible()
    await scan(page,info,`topic-article-${theme}`)
    await project.getByRole('link',{name:'Simpyll — project case study'}).click()
    await expect(page).toHaveURL(/\/projects\/simpyll$/)
    await page.getByRole('link',{name:'Read how the journal is built'}).first().click()
    await expect(page).toHaveURL(/\/blog\/the-art-of-reading-code$/)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1)).toBe(true)
    expect(errors).toEqual([])
  })
}
test('reading paths and supporting projects work without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({javaScriptEnabled:false,baseURL})
  try {
    const page = await context.newPage()
    await page.goto('/blog')
    const section = page.getByRole('region',{name:'Find a starting point'})
    await section.getByRole('link',{name:'Learning Python #001:',exact:false}).click()
    await page.getByRole('region',{name:'Projects behind the writing'}).getByRole('link').click()
    await expect(page).toHaveURL(/\/projects\/ai-engineering$/)
  } finally { await context.close() }
})
