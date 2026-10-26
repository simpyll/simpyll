import {test,expect} from '@playwright/test'
test('analytics requires consent in either build mode and Pulse hydrates without Google requests',async({page})=>{
 const errors:string[]=[],google:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 page.on('request',r=>{if(/google-analytics\.com|googletagmanager\.com|analyticsdata\.googleapis\.com|webmasters\/v3/.test(r.url()))google.push(r.url())})
 await page.goto('/privacy')
 // Production may enable the opt-in UI; that must not itself collect analytics.
 await page.addInitScript(()=>localStorage.removeItem('simpyll-analytics-consent'))
 await page.reload()
 const disabled=page.getByText('Optional Google Analytics tracking is currently disabled.')
 const allow=page.getByRole('button',{name:'Allow analytics',exact:true})
 await expect(disabled.or(allow)).toBeVisible()
 if(await allow.isVisible()) {
  await expect(page.getByText('Choice: denied.',{exact:false})).toBeVisible()
  await page.getByRole('button',{name:'Decline or withdraw analytics',exact:true}).click()
  await expect(page.getByText('Choice: denied.',{exact:false})).toBeVisible()
 }
 await expect(page.locator('#simpyll-google-tag')).toHaveCount(0)
 await page.goto('/pulse?secret=do-not-send#pulse-google')
 await expect(page.getByRole('heading',{name:'Search & audience',exact:true})).toBeVisible()
 await page.getByLabel('Analytics period').selectOption('90')
 await page.getByText('View google search performance daily data',{exact:false}).click()
 await expect(page.getByRole('table').filter({has:page.getByRole('columnheader',{name:'Search clicks',exact:true})})).toBeVisible()
 expect(google).toEqual([]);expect(errors).toEqual([])
})
