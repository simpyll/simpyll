import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { parseHTML } from 'linkedom'
import { validateProjects, getCaseStudyPath } from '../src/projects/schema.ts'

test('AI Engineering retains identity and publishes factual, navigable static content', async () => {
 const input = JSON.parse(await readFile('content/projects.json','utf8'))
 const {projects,errors} = validateProjects(input)
 assert.deepEqual(errors,[])
 const matches = projects.filter(p=>p.id==='ai-engineering')
 assert.equal(matches.length,1)
 const p = matches[0]
 assert.equal(p.slug,'ai-engineering')
 assert.equal(p.workflowStage,'in-progress')
 assert.equal(p.lifecycleStatus,'active')
 assert.equal(p.visibility,'public')
 assert.equal(p.featured.enabled,true)
 assert.deepEqual(p.technologies,[])
 assert.equal(getCaseStudyPath(p),'/projects/ai-engineering')
 assert.equal(p.links[0].url,'https://github.com/simpyll/ai-engineering-learning')
 const study = JSON.parse(await readFile(`content/case-studies/${p.caseStudy.contentKey}.json`,'utf8'))
 const workflow = study.sections.find(s=>s.id==='workflow')
 assert.equal(workflow.flow.steps.length,8)
 const current = study.sections.find(s=>s.id==='current-focus').paragraphs.join(' ')
 for(const phrase of ['October 24, 2026','Not Started','no demonstrated competencies','partial reported activity']) assert.ok((JSON.stringify(study)).includes(phrase),phrase)
 assert.ok(current.includes('not verified completion'))
 const html = await readFile('dist/projects/ai-engineering/index.html','utf8')
 const doc = parseHTML(html).document
 assert.equal(doc.querySelector('link[rel=canonical]').getAttribute('href'),'https://simpyll.com/projects/ai-engineering')
 assert.equal(doc.querySelectorAll('h1').length,1)
 for(const path of ['NOW.md','docs/11-first-12-weeks.md','']) {
  const url='https://github.com/simpyll/ai-engineering-learning'+(path?'/blob/main/'+path:'')
  assert.ok(doc.querySelector(`#start-here`).parentElement.querySelector(`a[href="${url}"]`))
 }
 for(const a of doc.querySelectorAll('a[href]')) {
  const href=a.getAttribute('href')
  if(href.startsWith('#')) assert.ok(doc.getElementById(href.slice(1)),href)
  else if(href.startsWith('/')) {
   const path=new URL(href,'https://simpyll.com').pathname
   await access(`dist${path==='/'?'/index.html':path+'/index.html'}`)
  }
 }
 const hub = parseHTML(await readFile('dist/projects/index.html','utf8')).document
 assert.ok(hub.querySelector('[data-project="ai-engineering"] a[href="/projects/ai-engineering"]'))
 assert.ok((await readFile('dist/sitemap.xml','utf8')).includes('https://simpyll.com/projects/ai-engineering'))
})
