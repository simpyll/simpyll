import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { caseStudyRoutes } from './project-routes.mjs'
test('only published case studies produce routes and meaningful static SEO',async()=>{
 assert.deepEqual(await caseStudyRoutes(),['/projects/simpyll'])
 const html=await readFile('dist/projects/simpyll/index.html','utf8')
 for(const text of ['A place to build in public','In Progress','Active','Static rendering and hydration','https://simpyll.com/projects/simpyll','og:image']) assert.ok(html.includes(text),text)
 assert.ok((await readFile('public/sitemap.xml','utf8')).includes('https://simpyll.com/projects/simpyll'))
 assert.ok(!html.includes('case-gallery'))
})
test('optional timeline and gallery are omitted by the shared layout',async()=>{
 const { createServer }=await import('vite')
 const server=await createServer({server:{middlewareMode:true}})
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
