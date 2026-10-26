import {test} from 'node:test'
import assert from 'node:assert/strict'
import {refresh} from './refresh.mjs'
import {emptySnapshot,serialize} from './core.mjs'
test('all connection states, failure preservation, empty success and same-day idempotence',async()=>{
 const env={GOOGLE_ACCESS_TOKEN:'PRIVATE',GSC_SITE_URL:'sc-domain:simpyll.com',GA4_PROPERTY_ID:'1234'},today='2026-10-25'
 const request=async(url)=>{if(url.includes('analyticsdata'))throw Error('PRIVATE SECRET');return {rows:[{keys:['2026-10-20'],clicks:1,impressions:10,position:2}]}}
 const s=await refresh(emptySnapshot(),env,{today,request});assert.equal(s.ga4.status,'error');assert.equal(s.searchConsole.status,'ok');assert.equal(s.searchConsole.days.length,1)
 assert.equal(serialize(await refresh(s,env,{today,request})),serialize(s))
 const failed=await refresh(s,env,{today,request:async()=>{throw Error('timeout')}});assert.deepEqual(failed.searchConsole.days,s.searchConsole.days);assert.equal(failed.searchConsole.updated,s.searchConsole.updated)
 const empty=await refresh(s,{...env,GA4_PROPERTY_ID:''},{today,request:async()=>({})});assert.deepEqual(empty.searchConsole.days,[])
 assert.deepEqual(await refresh(emptySnapshot(),{},{today,request:async()=>{throw Error('must not call')}}),emptySnapshot())
 const missing=await refresh(s,{...env,GOOGLE_ACCESS_TOKEN:''},{today,request:async()=>{throw Error('must not call')}});assert.equal(missing.searchConsole.status,'error');assert.deepEqual(missing.searchConsole.days,s.searchConsole.days)
 assert.doesNotMatch(serialize(failed),/PRIVATE|SECRET|1234|sc-domain|timeout/)
})
test('GA4-only and both connected reports retain source-specific clocks',async()=>{
 const {metrics}=await import('./core.mjs')
 const request=async url=>url.includes('analyticsdata')?{dimensionHeaders:[{name:'date'}],metricHeaders:metrics.map(name=>({name})),metadata:{timeZone:'America/New_York'},rowCount:0}:{}
 const opts={today:'2026-10-25',request},env={GOOGLE_ACCESS_TOKEN:'PRIVATE',GA4_PROPERTY_ID:'123'}
 let s=await refresh(emptySnapshot(),env,opts);assert.equal(s.ga4.status,'ok');assert.equal(s.searchConsole.status,'unavailable');assert.equal(s.ga4.timezone,'America/New_York')
 s=await refresh(s,{...env,GSC_SITE_URL:'https://simpyll.com/'},opts);assert.equal(s.searchConsole.status,'ok');assert.equal(s.searchConsole.timezone,'America/Los_Angeles')
})
