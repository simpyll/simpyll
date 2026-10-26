import {test,expect} from '@playwright/test'
test('optional tracking stays disabled and Pulse analytics hydrate without Google requests',async({page})=>{
 const errors:string[]=[],google:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 page.on('request',r=>{if(/google-analytics\.com|googletagmanager\.com|analyticsdata\.googleapis\.com|webmasters\/v3/.test(r.url()))google.push(r.url())})
 await page.goto('/privacy')
 await expect(page.getByText('Optional Google Analytics tracking is currently disabled.')).toBeVisible()
 await page.goto('/pulse?secret=do-not-send#pulse-google')
 await expect(page.getByRole('heading',{name:'Search & audience',exact:true})).toBeVisible()
 await page.getByLabel('Analytics period').selectOption('90')
 await page.getByText('View google search performance daily data',{exact:false}).click()
 await expect(page.getByRole('table').filter({has:page.getByRole('columnheader',{name:'Search clicks',exact:true})})).toBeVisible()
 expect(google).toEqual([]);expect(errors).toEqual([])
})
