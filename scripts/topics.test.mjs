import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parseHTML } from 'linkedom'
import { topics, topicArticles, hubEligible } from '../src/lib/topics.ts'
import { projectsForArticle } from '../src/lib/project-articles.ts'
import { collectArticles } from './redirects.mjs'
import { generateSearch } from './generate-search.mjs'
import { inventory } from './topical-inventory.mjs'

test('curation resolves stable identity to canonical slug, excluding nonpublic and duplicate entries', () => {
  const topic = { articleIds: ['id:one', 'id:one', 'id:draft', 'id:hidden', 'id:test', 'id:withdrawn', 'id:bad', 'missing'] }
  const post = (id, slug, extra = {}) => ({ slug, metadata: { articleId: id, ...extra } })
  const articles = [post('id:one','renamed-canonical'),post('id:draft','draft',{draft:true}),post('id:hidden','hidden',{published:false}),post('id:test','test',{test:true}),post('id:withdrawn','withdrawn',{status:'unpublished'}),post('id:bad','/blog/alias/')]
  assert.deepEqual(topicArticles(topic,articles).map(a=>a.slug),['renamed-canonical'])
  assert.equal(hubEligible(2,true),false)
  assert.equal(hubEligible(3,false),false)
  assert.equal(hubEligible(3,true),true)
})

test('explicit project relationships only accept public projects and canonical article paths', () => {
  const project = {visibility:'public', links:[{kind:'article',url:'/blog/example'}]}
  assert.equal(projectsForArticle([project,{...project,visibility:'private'}],'/blog/example').length,1)
  for (const path of ['/blog/example/','https://simpyll.com/blog/example','/blog/example?tag=x','/blog/../example']) assert.equal(projectsForArticle([project],path).length,0)
  assert.equal(projectsForArticle([{...project,links:[{kind:'resource',url:'/blog/example'}]}],'/blog/example').length,0)
})

test('repository assignments and reciprocal links resolve to published canonical content', async () => {
  const registry = await collectArticles(process.cwd(), {history:new Map()})
  const docs = await generateSearch()
  const published = docs.filter(d=>registry.some(r=>r.status==='published' && r.id===d.id && r.slug===d.slug))
  for (const topic of topics) {
    const resolved = topicArticles(topic, published.map(d=>({slug:d.slug,metadata:{articleId:d.id,status:'published'}})))
    for (const article of resolved) assert.ok(published.some(d=>d.slug===article.slug))
  }
  const projects = JSON.parse(await readFile('content/projects.json','utf8'))
  for (const project of projects.filter(p=>p.visibility==='public')) for (const link of project.links.filter(l=>l.kind==='article')) assert.ok(published.some(d=>d.url===link.url),`noncanonical project article: ${link.url}`)
  assert.equal(await inventory(),await inventory(),'Inventory generation must be deterministic')
})

test('built Journal and article relationships are useful without JavaScript; no extra index routes', async () => {
  const { document } = parseHTML(await readFile('dist/blog/index.html','utf8'))
  const section = document.querySelector('[aria-labelledby="reading-paths"]')
  assert.ok(section)
  const hrefs = [...section.querySelectorAll('a')].map(a=>a.getAttribute('href'))
  assert.equal(new Set(hrefs).size,hrefs.length)
  for (const href of hrefs.filter(h=>h.startsWith('/blog/'))) assert.ok((await readFile(`dist${href}/index.html`,'utf8')).includes('canonical'))
  const article = parseHTML(await readFile('dist/blog/the-art-of-reading-code/index.html','utf8')).document
  assert.equal(article.querySelector('[aria-labelledby="supporting-projects"] a').getAttribute('href'),'/projects/simpyll')
  const project = parseHTML(await readFile('dist/projects/simpyll/index.html','utf8')).document
  assert.ok(project.querySelector('a[href="/blog/the-art-of-reading-code"]'))
  const sitemap = await readFile('dist/sitemap.xml','utf8')
  assert.doesNotMatch(sitemap,/<loc>[^<]*\/(?:tools|topics|resources)(?:\/|<)/)
  assert.match(sitemap,/<loc>https:\/\/simpyll.com\/blog<\/loc>/)
})
