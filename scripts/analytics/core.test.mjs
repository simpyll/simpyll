import {test} from 'node:test'
import assert from 'node:assert/strict'
import {metrics,normalizeGsc,normalizeGa4,mergeDays,requestJson,emptySnapshot,serialize,validateSnapshot} from './core.mjs'
const start='2026-10-01',end='2026-10-02'
const ga=(rows=[])=>({dimensionHeaders:[{name:'date'}],metricHeaders:metrics.map(name=>({name})),metadata:{timeZone:'America/Chicago'},rows,rowCount:rows.length})
const row={dimensionValues:[{value:'20261001'}],metricValues:[2,3,4,2,60].map(value=>({value:String(value)}))}
test('GSC projects daily fields and strips queries, credentials and unexpected dimensions',()=>{
 assert.deepEqual(normalizeGsc({rows:[{keys:[start],clicks:2,impressions:20,ctr:.1,position:3,query:'private',secret:'secret'}]},start,end),[{date:start,clicks:2,impressions:20,position:3}])
 assert.throws(()=>normalizeGsc({rows:[{keys:[start,'query'],clicks:0,impressions:0,position:0}]},start,end))
 for(const n of [-1,NaN,Infinity]) assert.throws(()=>normalizeGsc({rows:[{keys:[start],clicks:n,impressions:20,position:3}]},start,end))
 assert.deepEqual(normalizeGsc({},start,end),[])
})
test('GA4 uses official metrics, property calendar date, validates metadata and empty results',()=>{
 const report=normalizeGa4(ga([row]),start,end)
 assert.equal(report.timezone,'America/Chicago');assert.equal(report.days[0].engagementSeconds,60);assert.equal(report.days[0].date,start)
 assert.deepEqual(normalizeGa4(ga(),start,end).days,[])
 for(const body of [{...ga([row]),rowCount:100},{...ga([row]),metadata:{timeZone:'UTC',subjectToThresholding:true}},{...ga([row]),metadata:{}},ga([row,row]),ga([{...row,dimensionValues:[{value:'20260230'}]}])]) assert.throws(()=>normalizeGa4(body,start,end))
})
test('merge replaces refreshed interval, preserves older history, never fabricates missing days',()=>{
 assert.deepEqual(mergeDays([{date:'2026-09-30'},{date:start},{date:end}],[{date:end,views:4}],start,end),[{date:'2026-09-30'},{date:end,views:4}])
})
test('strict recursive schema rejects accidental leaks and deterministic serialization',()=>{
 const s=emptySnapshot();s.ga4={status:'ok',updated:end,timezone:'UTC',days:normalizeGa4(ga([row]),start,end).days}
 assert.equal(serialize(s),serialize(structuredClone(s)))
 for(const modify of [x=>x.secret='key',x=>x.ga4.private='query',x=>x.ga4.days[0].clientId='id',x=>x.ga4.days[0].date='2026-02-30',x=>x.ga4.days.push(x.ga4.days[0]),x=>x.ga4.days[0].sessions=-1]){const copy=structuredClone(s);modify(copy);assert.throws(()=>validateSnapshot(copy))}
 assert.doesNotMatch(serialize(s),/clientId|query|private|credential|token|workspace/)
})
test('retries rate limits, transient errors and timeouts; permission failure is immediate and safely logged',async()=>{
 let calls=0;const waits=[]
 const result=await requestJson('https://example.test','secret',{}, {fetcher:async()=>{calls++;if(calls===1)throw Error('secret');return {ok:calls===3,status:429,headers:{get:()=>null},json:async()=>({rows:[]})}},wait:async n=>waits.push(n)})
 assert.deepEqual(result,{rows:[]});assert.equal(calls,3);assert.deepEqual(waits,[500,1000])
 await assert.rejects(()=>requestJson('x','secret',{}, {fetcher:async()=>({ok:false,status:403}),wait:async()=>{throw Error('must not retry')}}),/^Error: Reporting HTTP 403$/)
 await assert.rejects(()=>requestJson('x','secret',{}, {fetcher:async()=>{throw Error('PRIVATE KEY')},wait:async()=>{},attempts:2}),e=>!e.message.includes('PRIVATE'))
})
