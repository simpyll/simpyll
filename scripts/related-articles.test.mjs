import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseHTML } from 'linkedom'
import { createRelatedArticles } from '../src/lib/related-articles.ts'
const article = (id, extra = {}, slug = id) => ({ slug, metadata: { articleId: id, title: id, description: id,
  author: 'David', date: '2026-01-01', tags: [], category: 'Code', ...extra } })
const ids = posts => posts.map(post => post.metadata.articleId)

test('shared tags, category, normalization and duplicate tags determine relevance', () => {
  const current = article('current', { tags: [' React ', 'TypeScript', 'react'] })
  const two = article('two', { tags: ['react', 'typescript', 'REACT'], category: 'Other' })
  const one = article('one', { tags: ['react'], category: 'Other' })
  const category = article('category', { category: ' CODE ', date: '2026-10-01' })
  const fallback = article('fallback', { category: 'Other', date: '2026-10-02' })
  assert.deepEqual(ids(createRelatedArticles([current, fallback, category, one, two])('current')), ['two', 'one', 'category'])
})
test('equal scores use original publication date then immutable identity, never updates or slug', () => {
  const posts = [article('current'), article('z', { date: '2026-02-01' }, 'aaa'),
    article('b', { updated: '2030-01-01' }), article('a', {}, 'zzz')]
  assert.deepEqual(ids(createRelatedArticles(posts)('current')), ['z', 'a', 'b'])
})
test('fallback fills remaining slots; missing category and empty tags do not match', () => {
  const current = article('current', { category: undefined })
  const posts = [current, article('a', { category: undefined }), article('b', { date: '2026-02-01' }), article('c'), article('d')]
  assert.deepEqual(ids(createRelatedArticles(posts)('current')), ['b', 'a', 'c'])
  assert.deepEqual(createRelatedArticles([])('current'), [])
  assert.deepEqual(createRelatedArticles([current])('current'), [])
  assert.equal(createRelatedArticles(posts.slice(0, 3))('current').length, 2)
})
test('one topical match precedes recent fallback', () => {
  const current = article('current', { tags: ['react'] })
  const posts = [current, article('match', { tags: ['React'], category: 'Other' }),
    article('recent', { category: 'Other', date: '2026-02-01' }), article('older', { category: 'Other' })]
  assert.deepEqual(ids(createRelatedArticles(posts)('current')), ['match', 'recent', 'older'])
})
test('public canonical identity excludes drafts, withdrawals, previews, invalid data and aliases', () => {
  const current = article('current', { redirectFrom: ['old-current'] }, 'new-current')
  const valid = article('valid', { redirectFrom: ['old-valid'] }, 'new-valid')
  const invalid = [article('draft', { status: 'draft' }), article('withdrawn', { status: 'unpublished' }),
    article('preview', { published: false }), article('hidden', { draft: true }), article('test', { test: true }),
    article('invalid', { date: '2026-02-30' }), article('empty', { title: '' }), article('no-id', { articleId: undefined }),
    article('alias', {}, 'old-valid'), article('current', {}, 'old-current')]
  const posts = [current, valid, ...invalid, structuredClone(valid)]
  assert.deepEqual(createRelatedArticles(posts)('current'), [valid])
  assert.deepEqual(createRelatedArticles(posts)('valid'), [current])
})
test('rebuilds reflect publication, withdrawal, taxonomy, date and slug edits without mutation', () => {
  const current = article('current', { tags: ['react'] }), a = article('a'), b = article('b')
  const posts = [current, b, a], snapshot = structuredClone(posts)
  for (let i = 0; i < 3; i++) assert.deepEqual(ids(createRelatedArticles([...posts].reverse())('current')), ['a', 'b'])
  assert.deepEqual(posts, snapshot)
  assert.equal(createRelatedArticles([current, a, article('b', { tags: ['React'] })])('current')[0].metadata.articleId, 'b')
  assert.equal(createRelatedArticles([current, a, article('b', { category: 'Other' })])('current')[0], a)
  assert.equal(createRelatedArticles([current, a, article('b', { date: '2026-02-01' })])('current')[0].metadata.articleId, 'b')
  assert.deepEqual(ids(createRelatedArticles([current, a, article('b', { status: 'unpublished' })])('current')), ['a'])
  assert.equal(createRelatedArticles([current, article('a', {}, 'new-slug')])('current')[0].slug, 'new-slug')
})
test('prerendered recommendations match generated IDs and canonical titles, before chronological navigation', () => {
  const related = JSON.parse(readFileSync('src/generated/related-articles.json', 'utf8'))
  const records = JSON.parse(readFileSync('dist/search-index.json', 'utf8'))
  const sitemap = readFileSync('dist/sitemap.xml', 'utf8')
  const slugs = [...sitemap.matchAll(/<loc>https:\/\/simpyll.com\/blog\/([^<]+)<\/loc>/g)].map(match => match[1])
  const pages = slugs.map(slug => ({ slug, document: parseHTML(readFileSync(`dist/blog/${slug}/index.html`, 'utf8')).document }))
  for (const { slug, document } of pages) {
    const section = document.querySelector('section[aria-labelledby="related-articles-heading"]')
    assert.ok(section)
    const links = [...section.querySelectorAll('h3 a')]
    assert.equal(links.length, Math.min(3, pages.length - 1))
    const hrefs = links.map(link => link.getAttribute('href'))
    const current = records.find(record => record.slug === slug)
    assert.deepEqual(hrefs, related[current.id].map(id => records.find(record => record.id === id).url))
    assert.equal(new Set(hrefs).size, hrefs.length)
    assert.ok(!hrefs.includes(`/blog/${slug}`))
    for (const link of links) {
      const target = pages.find(page => `/blog/${page.slug}` === link.getAttribute('href'))
      assert.equal(link.textContent, target.document.querySelector('h1').textContent)
    }
    assert.ok(document.querySelector('article').innerHTML.indexOf('related-articles-heading') < document.querySelector('article').innerHTML.indexOf('aria-label="Article navigation"'))
  }
  assert.equal(Object.keys(related).length, pages.length)
})


test('the actual reusable component omits an empty section and preserves accessible card headings', async () => {
  const ts = (await import('typescript')).default
  const { createElement } = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { MemoryRouter } = await import('react-router-dom')
  function compile(path, replacements = {}) {
    let code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext,
    } }).outputText
    for (const [name, target] of Object.entries({
      'react/jsx-runtime': import.meta.resolve('react/jsx-runtime'),
      'react-router-dom': import.meta.resolve('react-router-dom'), ...replacements,
    })) code = code.replaceAll(`"${name}"`, JSON.stringify(target)).replaceAll(`'${name}'`, JSON.stringify(target))
    return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  }
  const taxonomy = compile('src/components/TaxonomyLink.tsx', { '../lib/discovery': new URL('../src/lib/discovery.ts', import.meta.url).href })
  const card = compile('src/components/ArticleCard.tsx', { './TaxonomyLink': taxonomy, '../lib/editorial.mjs': new URL('../src/lib/editorial.mjs', import.meta.url).href })
  const { RelatedArticles } = await import(compile('src/components/RelatedArticles.tsx', { './ArticleCard': card }))
  const render = articles => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(RelatedArticles, { articles })))
  assert.equal(render([]), '')
  const posts = ['a', 'b', 'c', 'd'].map(id => ({ ...article(id), readingTimeMinutes: 2 }))
  const { document } = parseHTML(render(posts))
  assert.equal(document.querySelectorAll('h2').length, 1)
  assert.equal(document.querySelectorAll('h3 a').length, 3)
  assert.equal(document.querySelector('h3 a').getAttribute('href'), '/blog/a')
  assert.equal(document.querySelector('a a'), null)
})
