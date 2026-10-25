import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { validateProjects, createProjectSelectors } from '../src/projects/schema.ts'
const data = JSON.parse(await readFile('content/projects.json','utf8'))
test('owner assignments, honest destinations, and deterministic inventory',()=>{
 const {projects,errors}=validateProjects(data)
 assert.deepEqual(errors,[])
 assert.equal(projects.length,21)
 assert.deepEqual(projects.filter(p=>p.workflowStage==='in-progress').map(p=>p.id),['simpyll','ai-engineering'])
 assert.deepEqual(projects.filter(p=>p.workflowStage==='on-deck').map(p=>p.id),['rntonp-database','medical-calculators'])
 assert.equal(projects.filter(p=>p.workflowStage==='ideas').length,17)
 assert.equal(projects.filter(p=>['shipped','archived'].includes(p.workflowStage)).length,0)
 assert.equal(projects.find(p=>p.id==='ai-engineering').links[0].url,'https://github.com/simpyll/ai-engineering-learning')
 assert.deepEqual(projects.flatMap(p=>p.links.map(l=>l.url)),['https://simpyll.com/','https://github.com/simpyll/simpyll','https://github.com/simpyll/ai-engineering-learning','https://rntonp.com/'])
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
 assert.equal(createProjectSelectors(validateProjects([...data,privateRecord]).projects).getPublicProjects().length,21)
})

test('all canonical workflow/lifecycle values are independent and require canonical labels', async () => {
 const {workflowStages,lifecycleStatuses}=await import('../src/projects/schema.ts')
 assert.deepEqual(Object.values(workflowStages),['Ideas','On Deck','In Progress','Shipped','Archived'])
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
