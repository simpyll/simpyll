import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { validateProjects, createProjectSelectors } from '../src/projects/schema.ts'
const data = JSON.parse(await readFile('content/projects.json','utf8'))
test('owner assignments, honest destinations, and deterministic inventory',()=>{
 const {projects,errors}=validateProjects(data)
 assert.deepEqual(errors,[])
 assert.equal(projects.length,24)
 assert.deepEqual(projects.filter(p=>p.workflowStage==='in-progress').map(p=>p.id),['simpyll','cortex'])
 assert.deepEqual(projects.filter(p=>p.workflowStage==='on-deck').map(p=>p.id),['rntonp-database','medical-calculators'])
 assert.equal(projects.filter(p=>p.workflowStage==='ideas').length,17)
 assert.equal(projects.filter(p=>['shipped','archived'].includes(p.workflowStage)).length,2)
 assert.equal(projects.find(p=>p.id==='ai-engineering').links[0].url,'https://github.com/simpyll/ai-engineering-learning')
 assert.deepEqual(projects.flatMap(p=>p.links.map(l=>l.url)),['https://simpyll.com/','https://github.com/simpyll/simpyll','/blog/the-art-of-reading-code','https://github.com/simpyll/ai-engineering-learning','/blog/001-python-fundamentals','https://rntonp.com/','/pulse','https://github.com/simpyll/simpyll','/tools/lipidpath','https://github.com/simpyll/simpyll/blob/main/docs/projects/LIPIDPATH.md'])
 assert.deepEqual(createProjectSelectors(projects.toReversed()).getPublicProjects(),projects)
 assert.deepEqual(createProjectSelectors(projects).getFeaturedProjects().map(p=>p.id),['simpyll','ai-engineering'])
})
test('stage and lifecycle validate independently; hidden records stay hidden',()=>{
 for(const key of ['workflowStage','lifecycleStatus','projectType']) {
  const invalid=structuredClone(data); delete invalid[0][key]
  assert.ok(validateProjects(invalid).errors.length)
 }
 for(const key of ['workflowStage','lifecycleStatus']) {
  const invalid=structuredClone(data); invalid[0][key]='invalid'
  assert.ok(validateProjects(invalid).errors.length)
 }
 const privateRecord={...data[0],id:'private-test',slug:'private-test',visibility:'private'}
 assert.equal(createProjectSelectors(validateProjects([...data,privateRecord]).projects).getPublicProjects().length,24)
})

test('all canonical workflow/lifecycle values are independent and require canonical labels', async () => {
 const {workflowStages,lifecycleStatuses}=await import('../src/projects/schema.ts')
 assert.deepEqual(Object.values(workflowStages),['Ideas','On Deck','In Progress','On Hold','Shipped','Archived'])
 assert.deepEqual(Object.values(lifecycleStatuses),['Planned','Active','Maintained','Paused','Retired'])
 for(const workflowStage of Object.keys(workflowStages)) for(const lifecycleStatus of Object.keys(lifecycleStatuses)) {
  const result=validateProjects([{...data[0],workflowStage,lifecycleStatus}])
  assert.deepEqual(result.errors,[])
  assert.equal(result.projects[0].workflowStage,workflowStage)
  assert.equal(result.projects[0].lifecycleStatus,lifecycleStatus)
 }
 for(const key of ['workflowStage','lifecycleStatus']) for(const value of [null,42,'Active','completed','toString','']) {
  assert.match(validateProjects([{...data[0],[key]:value}]).errors.join('\n'),new RegExp(`${key} must use a canonical value`))
 }
})

test('static Home, Hub and every case study share registry status without publication overrides', async () => {
 const {parseHTML}=await import('linkedom')
 const {workflowStages,lifecycleStatuses}=await import('../src/projects/schema.ts')
 const doc=async path=>parseHTML(await readFile(path,'utf8')).document
 const home=await doc('dist/index.html'), hub=await doc('dist/projects/index.html')
 const assertStatus=(node,p)=>{
  assert.ok(node, p.id)
  assert.deepEqual([...node.querySelectorAll('dt')].map(e=>e.textContent),['Workflow stage','Lifecycle'])
  assert.deepEqual([...node.querySelectorAll('dd')].map(e=>e.textContent),[workflowStages[p.workflowStage],lifecycleStatuses[p.lifecycleStatus]])
  assert.equal(node.querySelectorAll('button,a,[tabindex],[role="status"],[aria-live]').length,0)
 }
 const featured=createProjectSelectors(validateProjects(data).projects).getFeaturedProjects()
 for(const [index,p] of featured.entries()) assertStatus(home.querySelectorAll('#work .project-status')[index],p)
 for(const p of data.filter(p=>p.visibility==='public')) {
  assertStatus(hub.querySelector(`[data-project="${p.id}"] .project-status`),p)
  if(p.caseStudy) assertStatus((await doc(`dist/projects/${p.slug}/index.html`)).querySelector('.case-metadata .project-status'),p)
 }
})

test('On Hold pause/resume preserves project identity and content', () => {
 const original = data.find(p => p.id === 'ai-engineering')
 assert.equal(original.workflowStage, 'on-hold')
 assert.equal(original.lifecycleStatus, 'paused')
 for (const [workflowStage, lifecycleStatus] of [['in-progress','active'], ['on-hold','paused']]) {
  const changed = {...original, workflowStage, lifecycleStatus}
  assert.deepEqual(validateProjects([changed]).errors, [])
  const {workflowStage: _stage, lifecycleStatus: _life, ...content} = changed
  const {workflowStage: _oldStage, lifecycleStatus: _oldLife, ...before} = original
  assert.deepEqual(content, before)
 }
})

test('Cortex is an in-progress public case study and LipidPath is shipped', async () => {
 const {parseHTML}=await import('linkedom')
 const hub=parseHTML(await readFile('dist/projects/index.html','utf8')).document
 assert.ok(hub.querySelector('[data-stage="in-progress"] [data-project="cortex"] a[href="/projects/cortex"]'))
 assert.ok(hub.querySelector('[data-stage="shipped"] [data-project="lipidpath"]'))
 const cortex=parseHTML(await readFile('dist/projects/cortex/index.html','utf8')).document
 assert.equal(cortex.querySelector('h1').textContent,'Cortex.')
 assert.equal(cortex.querySelector('link[rel="canonical"]').getAttribute('href'),'https://simpyll.com/projects/cortex')
 assert.match(cortex.querySelector('main').textContent,/research and architecture/)
 assert.match(cortex.querySelector('main').textContent,/rather than released capabilities/)
 assert.ok((await readFile('dist/sitemap.xml','utf8')).includes('https://simpyll.com/projects/cortex'))
 assert.match(await readFile('dist/projects/lipidpath/index.html','utf8'),/Independent qualified clinical review is pending/)
})
