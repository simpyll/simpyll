import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createTracker,measurementId} from '../../src/analytics/tracker.ts'
import {searchTotal,trafficTotal,change} from '../../src/analytics/summary.ts'
function fixture(enabled=true) {
 const scripts=[],host={location:{hostname:'simpyll.com'},navigator:{webdriver:false}},doc={cookie:'',getElementById:()=>null,createElement:()=>({}),head:{append:s=>scripts.push(s)}}
 return {scripts,host,tracker:createTracker(host,doc,enabled)}
}
test('manual initial and SPA page views deduplicate hydration; queries/private routes never sent',()=>{
 const {host,scripts,tracker}=fixture();tracker.page('/',true);assert.equal(scripts.length,0)
 tracker.consent(true);tracker.page('/',true);tracker.page('/',true);tracker.page('/blog/a',true);tracker.page('/blog/a/',true);tracker.page('/blog/draft',false);tracker.page('/blog/a?secret=patient',true)
 assert.equal(scripts.length,1);assert.match(scripts[0].src,new RegExp(measurementId))
 const events=host.dataLayer.filter(a=>a[0]==='event');assert.equal(events.length,2);assert.equal(events[1][2].page_location,'https://simpyll.com/blog/a');assert.equal(events[1][2].page_referrer,'')
 assert.equal(host.dataLayer.find(a=>a[0]==='config')[2].send_page_view,false)
 tracker.consent(false);tracker.page('/about',true);assert.equal(host.dataLayer.filter(a=>a[0]==='event').length,2)
 tracker.consent(true);tracker.page('/about',true);assert.equal(host.dataLayer.filter(a=>a[0]==='event').length,3)
})
test('disabled/development, local origins and automation never initialize; blocked scripts cannot throw',()=>{
 for(const mode of ['disabled','local','automation']) {const f=fixture(mode!=='disabled');if(mode==='local')f.host.location.hostname='localhost';if(mode==='automation')f.host.navigator.webdriver=true;f.tracker.consent(true);f.tracker.page('/',true);assert.equal(f.scripts.length,0)}
 const host={location:{hostname:'simpyll.com'},navigator:{webdriver:false}}
 const t=createTracker(host,{get cookie(){throw Error('blocked')}},true);assert.doesNotThrow(()=>{t.consent(false);t.consent(true);t.page('/',true)})
})
test('server imports are browser-global free; weighted metrics and comparisons are honest',()=>{
 assert.equal(typeof globalThis.window,'undefined')
 const total=searchTotal([{clicks:1,impressions:10,position:2},{clicks:9,impressions:90,position:4}]);assert.equal(total.ctr,.1);assert.equal(total.position,3.8)
 const traffic=trafficTotal([{activeUsers:10,sessions:10,views:20,engagedSessions:5,engagementSeconds:60},{activeUsers:10,sessions:30,views:40,engagedSessions:30,engagementSeconds:140}]);assert.equal(traffic.engagementRate,.875);assert.equal(traffic.engagementPerSession,5);assert.equal('activeUsers' in traffic,false)
 assert.deepEqual(change(10,0),{absolute:10,percent:null});assert.deepEqual(change(15,10),{absolute:5,percent:.5})
})
