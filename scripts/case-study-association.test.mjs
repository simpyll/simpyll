import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validateProjects, getCaseStudyPath } from '../src/projects/schema.ts'
import { generateProjects } from './generate-projects.mjs'
const base = JSON.parse(await readFile('content/projects.json','utf8'))[0]
test('publication and canonical destination are independent of workflow stage', () => {
  for (const workflowStage of ['ideas','on-deck','in-progress','shipped','archived']) {
    assert.equal(getCaseStudyPath({...base,workflowStage}),'/projects/simpyll')
  }
  assert.equal(getCaseStudyPath({...base,slug:'second-unique'}),'/projects/second-unique')
  assert.equal(getCaseStudyPath({...base,caseStudy:undefined}),undefined)
  for (const visibility of ['draft','private']) {
    assert.equal(getCaseStudyPath({...base,visibility}),undefined)
    assert.equal(getCaseStudyPath({...base,caseStudy:{contentKey:'story',visibility}}),undefined)
  }
  for (const caseStudy of [{contentKey:'../escape'},{contentKey:'story',visibility:'typo'},{}]) assert.ok(validateProjects([{...base,caseStudy}]).errors.length)
  assert.ok(validateProjects([{...base,slug:'Invalid Slug'}]).errors.length)
})
test('missing or invalid public editorial fails closed; unpublished association stays out of manifests', async () => {
  const root=await mkdtemp(join(tmpdir(),'association-'))
  try {
    await mkdir(join(root,'public'))
    await mkdir(join(root,'content/case-studies'),{recursive:true})
    const record={...base,cover:undefined,screenshots:undefined,caseStudy:{contentKey:'missing'}}
    await writeFile(join(root,'content/projects.json'),JSON.stringify([record]))
    await assert.rejects(generateProjects(root),/ENOENT/)
    await writeFile(join(root,'content/case-studies/missing.json'),'{}')
    await assert.rejects(generateProjects(root),/requires sections/)
    for (const visibility of ['draft','private']) {
      record.caseStudy={contentKey:'missing',visibility}
      await writeFile(join(root,'content/projects.json'),JSON.stringify([record]))
      await generateProjects(root)
      assert.equal(JSON.parse(await readFile(join(root,'src/generated/projects.json'),'utf8'))[0].caseStudy,undefined)
      assert.deepEqual(JSON.parse(await readFile(join(root,'src/generated/case-studies.json'),'utf8')), {})
    }
  } finally { await rm(root,{recursive:true,force:true}) }
})
