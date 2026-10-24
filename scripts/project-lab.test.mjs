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
