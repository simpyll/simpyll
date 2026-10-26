import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { accessibilityTags } from './helpers/accessibility'
import { destination } from './helpers/navigation'
import { mkdir } from 'node:fs/promises'
test('Pulse renders real data, supports keyboard graph exploration, filters and accessible alternatives',async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 const response=await page.request.get('/pulse.json');const snapshot=await response.json()
 await page.goto('/pulse')
 await expect(page.getByRole('heading',{level:1})).toHaveText('Simpyll Pulse.')
 await expect(page.getByText('Not connected. No measurements available.',{exact:false})).toHaveCount(2)
 await page.getByLabel('Analytics period').selectOption('7')
 await expect(page.getByRole('heading',{name:'Google Search performance'})).toBeVisible()
 await expect(page.getByRole('table').first().getByRole('row')).toHaveCount(snapshot.articles.length+1)
 if(snapshot.articles.length){
  const node=page.locator('.pulse-node').first();await node.focus();await page.keyboard.press('Enter')
  await expect(page.locator('.pulse-inspector h3')).toHaveText(snapshot.articles[0].title)
  await page.getByRole('searchbox',{name:'Search article titles'}).fill('no-matching-article-xyz')
  await expect(page.getByRole('status')).toContainText('0 of')
  await expect(page.locator('.pulse-node')).toHaveCount(0)
  await page.getByRole('searchbox',{name:'Search article titles'}).fill('')
  await page.getByLabel('Category',{exact:true}).selectOption(snapshot.articles[0].category)
  const n=snapshot.articles.filter((a:{category:string})=>a.category===snapshot.articles[0].category).length
  await expect(page.locator('.pulse-node')).toHaveCount(n)
  await page.getByLabel('Category',{exact:true}).selectOption('')
 }
 await expect(page.locator('html')).not.toHaveJSProperty('scrollWidth',0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
 for(const theme of ['light','dark']){
  await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme)
  const result=await new AxeBuilder({page}).include('main').withTags(accessibilityTags).analyze()
  expect(result.violations).toEqual([])
  if(testInfo.project.name==='desktop-chromium'||testInfo.project.name==='mobile-chromium'){
   await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo(0,0) });
   await mkdir('docs/pulse',{recursive:true});await page.screenshot({path:`docs/pulse/${testInfo.project.name}-${theme}.png`,fullPage:true})
  }
 }
 expect(errors).toEqual([])
})
test('Pulse keeps meaningful content and article links without JavaScript',async({browser,baseURL})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage()
 await page.goto(`${baseURL}/pulse`)
 await expect(page.getByRole('heading',{level:1})).toHaveText('Simpyll Pulse.')
 await expect(page.locator('#pulse-galaxy table')).toBeVisible()
 await expect(page.locator('main a[href^="/blog/"]').first()).toBeVisible()
 await context.close()
})
test('client navigation loads the public snapshot',async({page})=>{
 await page.goto('/projects/simpyll-pulse')
 await (await destination(page,'Pulse')).click()
 await expect(page.getByRole('heading',{level:1})).toHaveText('Simpyll Pulse.')
 await expect(page.locator('.pulse-node').first()).toBeVisible()
})
test('empty snapshots and connected graph fixtures retain usable alternatives',async({page})=>{
 const real=await (await page.request.get('/pulse.json')).json()
 await page.route('**/pulse.json',route=>route.fulfill({json:{...real,articles:[],edges:[],indexablePages:0}}))
 await page.goto('/projects/simpyll-pulse')
 await (await destination(page,'Pulse')).click()
 await expect(page.getByText('The galaxy begins with the first published article.')).toBeVisible()
 await expect(page.getByRole('status')).toHaveText('0 of 0 articles shown')
 await page.unroute('**/pulse.json')
 if(real.articles.length<2)return
 await page.route('**/pulse.json',route=>route.fulfill({json:{...real,edges:[{from:real.articles[0].route,to:real.articles[1].route}]}}))
 await page.goto('/projects/simpyll-pulse')
 await (await destination(page,'Pulse')).click()
 await expect(page.locator('.pulse-edge')).toHaveCount(1)
 await page.locator('.pulse-node').first().focus();await page.keyboard.press('Space')
 await expect(page.locator('.pulse-edge.active')).toHaveCount(1)
 await expect(page.locator('.pulse-inspector')).toContainText(real.articles[1].title)
 await page.getByLabel('Without contextual inbound links').check()
 await expect(page.locator('.pulse-node')).toHaveCount(real.articles.length-1)
})
