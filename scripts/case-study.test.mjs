import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { caseStudyRoutes } from './project-routes.mjs'
test('only published case studies produce routes and meaningful static SEO',async()=>{
 assert.deepEqual(await caseStudyRoutes(),['/projects/simpyll','/projects/ai-engineering','/projects/simpyll-pulse','/projects/lipidpath','/projects/cortex'])
 const html=await readFile('dist/projects/simpyll/index.html','utf8')
 for(const text of ['A place to build in public','In Progress','Active','Static rendering and hydration','https://simpyll.com/projects/simpyll','og:image']) assert.ok(html.includes(text),text)
 assert.ok((await readFile('public/sitemap.xml','utf8')).includes('https://simpyll.com/projects/simpyll'))
 assert.ok(!html.includes('case-gallery'))
})
test('optional timeline and gallery are omitted by the shared layout',async()=>{
 const { createServer }=await import('vite')
 // server.ws:false disables Vite 8's standalone WebSocket transport, which
 // otherwise binds the default port 24678 and collides across parallel
 // node:test files. This suite only needs ssrLoadModule, never live reloading.
 const server=await createServer({server:{middlewareMode:true,ws:false}})
 try {
  const {ProjectDetailLayout}=await server.ssrLoadModule('/src/pages/ProjectDetail.tsx')
  const {createElement}=await import('react')
  const {renderToStaticMarkup}=await import('react-dom/server')
  const {MemoryRouter}=await import('react-router-dom')
  const {HelmetProvider}=await import('react-helmet-async')
  const p=JSON.parse(await readFile('src/generated/projects.json','utf8'))[0]
  const html=renderToStaticMarkup(createElement(HelmetProvider,{},createElement(MemoryRouter,{},createElement(ProjectDetailLayout,{project:p,study:{sections:[]}}))))
  assert.ok(!html.includes('case-timeline'))
  assert.ok(!html.includes('case-gallery'))
 } finally {await server.close()}
})
test('editorial validation rejects missing sections, duplicate IDs, unsafe links and false dates',async()=>{
 const {validateCaseStudy}=await import('./case-study-schema.mjs')
 const valid={sections:[{id:'overview',title:'Overview',paragraphs:['Text']}]}
 assert.deepEqual(validateCaseStudy(valid),valid)
 for (const invalid of [{sections:[]},{sections:[...valid.sections,...valid.sections]},{sections:[{...valid.sections[0],paragraphs:[]}]},{sections:[{...valid.sections[0],links:[{label:'Source',url:'javascript:alert(1)'}]}]},{...valid,timeline:[{date:'2026-02-30',title:'False',text:'False',url:'/'}]}]) assert.throws(()=>validateCaseStudy(invalid))
})


test('shared Hub card preserves optional disclosures and independent resource links', async () => {
 const { createServer } = await import('vite')
 const server = await createServer({server:{middlewareMode:true, ws:false}})
 try {
  const { ProjectCard } = await server.ssrLoadModule('/src/pages/Projects.tsx')
  const { createElement } = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { MemoryRouter } = await import('react-router-dom')
  const { parseHTML } = await import('linkedom')
  const project = JSON.parse(await readFile('src/generated/projects.json','utf8'))[0]
  const html = renderToStaticMarkup(createElement(MemoryRouter,{},createElement(ProjectCard,{project:{...project,description:'Isolated disclosure fixture'}})))
  const doc = parseHTML(html).document
  assert.equal(doc.querySelector('details summary').textContent,'More about Simpyll')
  assert.equal(doc.querySelector('details p').textContent,'Isolated disclosure fixture')
  assert.equal(doc.querySelectorAll('a[href="/projects/simpyll"]').length,1)
  assert.ok(doc.querySelector('a[href="https://github.com/simpyll/simpyll"]'))
  assert.equal(doc.querySelectorAll('a a, a button, button a').length,0)
 } finally { await server.close() }
})
