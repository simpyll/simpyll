import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { auditSeo } from './seo-audit.mjs'
import { projectPublic, validatePublic, privateReport } from './pulse.mjs'
const page = (route, contextualOutbound = []) => ({ route,indexable:true,pageType:'article',contextualOutbound,links:[],outbound:[],crawlDepth:1 })
const article = (slug,status='published') => ({slug,status,metadata:{title:slug,category:'Engineering',tags:['React'],date:'2026-10-01',updatedAt:'2026-10-03',revisions:[{date:'2026-10-03',description:'PRIVATE EDITORIAL NOTES'}],secret:'PRIVATE',internalPath:'/workspace/private'}})
const audit = {pages:[page('/blog/a',['/blog/b','/blog/a']),page('/blog/b'),page('/blog/draft'),{...page('/blog/withdrawn'),indexable:false}],issues:[{route:'/blog/a',code:'description',severity:'High',evidence:'SECRET /workspace/private'}, {route:'/blog/a',code:'canonical',severity:'Critical',evidence:'wrong URL'}]}
test('public projection excludes private fields and all nonpublic articles, and has real directed relationships',()=>{
 const s=projectPublic(audit,[article('b'),article('draft','draft'),article('withdrawn','unpublished'),article('a')],'2026-10-25')
 assert.deepEqual(s.articles.map(a=>a.route),['/blog/a','/blog/b'])
 assert.deepEqual(s.edges,[{from:'/blog/a',to:'/blog/b'}])
 assert.deepEqual(s.articles[0].updates,['2026-10-03'])
 assert.doesNotMatch(JSON.stringify(s),/PRIVATE|SECRET|workspace|description|evidence|remediation/)
 assert.equal(s.health.find(h=>h.name==='Metadata').warning,1)
 assert.equal(s.health.find(h=>h.name==='Canonicals').critical,1)
 assert.deepEqual(projectPublic(audit,[article('b'),article('a')],'2026-10-25'),s)
})
test('public schema rejects unexpected fields recursively, malformed dates, counts, routes and future analytics',()=>{
 const original=projectPublic(audit,[article('a'),article('b')],'2026-10-25')
 for (const mutate of [s=>s.secret='no',s=>s.articles[0].evidence='no',s=>s.edges[0].secret='no',s=>s.health[0].evidence='no',s=>s.analytics.ga4.credentials='no',s=>s.reportDate='2026-02-30',s=>s.indexablePages=-1,s=>s.articles[0].route='/draft/private',s=>s.analytics.ga4.status='connected']) {
  const copy=structuredClone(original);mutate(copy);assert.throws(()=>validatePublic(copy))
 }
})
test('private findings have stable identifiers, severity, evidence, remediation and baseline comparison',()=>{
 const before=privateReport(audit)
 assert.equal(before.findings[0].severity,'critical')
 assert.ok(before.findings.every(f=>f.explanation&&f.remediation&&f.id&&f.status==='baseline'))
 assert.deepEqual(privateReport(audit),before)
 assert.ok(privateReport(audit,before).findings.every(f=>f.status==='existing'))
 const changed=privateReport({...audit,issues:[]},before)
 assert.equal(changed.resolved.length,2)
})
test('empty public snapshot is valid without fictional traffic',()=>{
 const s=projectPublic({pages:[],issues:[]},[],'2026-10-25')
 assert.equal(s.indexablePages,0);assert.deepEqual(s.articles,[]);assert.deepEqual(s.edges,[])
 assert.equal(s.analytics.ga4.status,'unavailable')
})
test('built snapshot and private reports remain separated; Pulse is useful without JS',async()=>{
 const snapshot=JSON.parse(await readFile('dist/pulse.json','utf8'));validatePublic(snapshot)
 const html=await readFile('dist/pulse/index.html','utf8')
 assert.match(html,/Simpyll Pulse/);assert.match(html,/Published articles/);assert.match(html,/pulse-data/)
 for(const a of snapshot.articles) assert.ok(html.includes(`href="${a.route}"`))
 const files=await (await import('node:fs/promises')).readdir('dist',{recursive:true})
 assert.ok(!files.some(f=>/report\.(json|md)|audit\.json|artifacts/.test(f)))
 assert.doesNotMatch(JSON.stringify(snapshot),/"(?:evidence|remediation|crawlDepth|articleText|canonicals)"\s*:|\/workspace\//)
 const full=await auditSeo()
 const publicRoutes=new Set(full.pages.filter(p=>p.indexable).map(p=>p.route))
 assert.equal(snapshot.health.reduce((n,h)=>n+h.critical+h.warning+h.informational,0),full.issues.filter(i=>publicRoutes.has(i.route)).length,'snapshot must describe final build, without bootstrap broken links')
 const report=privateReport(full)
 const p=report.routes.find(p=>p.route==='/pulse');assert.ok(p);assert.equal(p.siteNavigationOrphan,false)
 for(const page of full.pages.filter(p=>p.indexable)) assert.ok(page.links.every(l=>['contextual','breadcrumb','related','global','footer','navigation','previous-next','project','other'].includes(l.kind)))
})
test('private diagnostics distinguish contextual orphans and repeated anchor destinations',()=>{
 const fixture=structuredClone(audit)
 fixture.pages[0].links=[{href:'/blog/b#one',contextual:true},{href:'/blog/b#two',contextual:true},{href:'/blog/b',contextual:false}]
 const report=privateReport(fixture)
 const a=report.routes.find(p=>p.route==='/blog/a'),b=report.routes.find(p=>p.route==='/blog/b')
 assert.equal(a.contextualLinkOrphan,true)
 assert.equal(a.siteNavigationOrphan,false)
 assert.deepEqual(a.duplicateContextualDestinations,[{destination:'/blog/b',count:2}])
 assert.equal(b.contextualLinkOrphan,false)
 assert.deepEqual(b.contextualInbound,['/blog/a'])
})
test('repeated generation retains a real dated local snapshot without duplicate history or clock churn',async()=>{
 const {generatePulse}=await import('./pulse.mjs')
 const before=await generatePulse()
 assert.deepEqual(await generatePulse(),before)
 const retained=JSON.parse(await readFile(`artifacts/pulse/snapshots/${before.reportDate}.json`,'utf8'))
 assert.deepEqual(retained,before)
 const names=await (await import('node:fs/promises')).readdir('artifacts/pulse/snapshots')
 assert.ok(names.filter(n=>n.endsWith('.json')).length<=90)
 const initial=JSON.parse(await readFile('docs/pulse/initial-public-snapshot.json','utf8'))
 validatePublic(initial)
})
