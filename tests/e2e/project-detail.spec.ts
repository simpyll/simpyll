import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
test('case study direct load, canonical status, accessibility and board navigation', async ({ page }, testInfo) => {
  const errors:string[]=[]
  page.on('pageerror', e=>errors.push(e.message))
  page.on('console', m=>{if(m.type()==='error') errors.push(m.text())})
  await page.goto('/projects/simpyll')
  await expect(page.locator('h1')).toHaveText('Simpyll.')
  await expect(page.locator('.case-metadata')).toContainText('In Progress')
  await expect(page.locator('.case-metadata')).toContainText('Active')
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://simpyll.com/projects/simpyll')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /https:\/\/simpyll.com\//)
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])
  await page.keyboard.press('Tab')
  await expect(page.locator(':focus')).toBeVisible()
  await page.screenshot({path:testInfo.outputPath('case-study.png'), fullPage:true})
  for(const width of [320,390,1280]) {
    await page.setViewportSize({width,height:900})
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  }
  await page.getByRole('link',{name:'← Explore the Project Lab'}).click()
  await page.getByRole('link',{name:'Simpyll',exact:true}).click()
  await expect(page).toHaveURL(/\/projects\/simpyll$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/projects$/)
  expect(errors).toEqual([])
  await page.goto('/projects/not-a-project')
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content',/noindex/)
})
