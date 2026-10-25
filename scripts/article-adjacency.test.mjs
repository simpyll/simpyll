import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createArticleAdjacency } from '../src/lib/article-adjacency.ts'
import { readFileSync } from 'node:fs'
import { parseHTML } from 'linkedom'

const article = (id, date = '2026-01-01', extra = {}) => ({ slug: id, metadata: {
  articleId: id, title: id, description: id, date, category: 'Code', author: 'David', tags: [], ...extra,
} })

test('empty, single, missing and two-article boundaries', () => {
  assert.deepEqual(createArticleAdjacency([])('missing'), {})
  const a = article('a'), b = article('b', '2026-02-01')
  assert.deepEqual(createArticleAdjacency([a])('a'), { previous: undefined, next: undefined })
  const get = createArticleAdjacency([b, a])
  assert.deepEqual(get('a'), { previous: undefined, next: b })
  assert.deepEqual(get('b'), { previous: a, next: undefined })
  assert.deepEqual(get('missing'), {})
})

test('unsorted equal dates use identity, ignore edits, remain deterministic and do not mutate', () => {
  const a = article('a'), b = article('b', undefined, { updated: '2030-01-01' }), c = article('c', '2026-02-01')
  const input = [c, b, a], snapshot = structuredClone(input)
  for (let i = 0; i < 3; i++) {
    const get = createArticleAdjacency(input)
    assert.deepEqual(get('b'), { previous: a, next: c })
    assert.equal(get('a').next, b)
    assert.equal(get('c').previous, b)
  }
  assert.deepEqual(input, snapshot)
})

test('private, withdrawn, invalid and duplicate entries cannot become destinations', () => {
  const a = article('a'), b = article('b', '2026-02-01')
  const invalid = [article('draft', undefined, { status: 'draft' }), article('withdrawn', undefined, { status: 'unpublished' }),
    article('preview', undefined, { published: false }), article('hidden', undefined, { draft: true }),
    article('invalid', '2026-02-30'), article('missing', undefined, { title: '' }), article('identity', undefined, { articleId: undefined })]
  const get = createArticleAdjacency([a, ...invalid, b, structuredClone(a)])
  assert.deepEqual(get('a'), { previous: undefined, next: b })
  invalid.forEach(post => assert.deepEqual(get(post.metadata.articleId), {}))
})

test('immutable identity follows the canonical slug after migration', () => {
  const a = article('a'), b = { ...article('b'), slug: 'new-address' }
  assert.equal(createArticleAdjacency([a, b])('a').next.slug, 'new-address')
  assert.equal(createArticleAdjacency([a, b])('b').previous, a)
})

test('all static article pages contain reciprocal canonical navigation and correct boundaries', () => {
  const routes = JSON.parse(readFileSync('dist/deployment.json', 'utf8'))
  // Use the generated sitemap as the public route inventory (aliases are absent).
  const sitemap = readFileSync('dist/sitemap.xml', 'utf8')
  const slugs = [...sitemap.matchAll(/<loc>https:\/\/simpyll.com\/blog\/([^<]+)<\/loc>/g)].map(match => match[1])
  assert.ok(routes)
  assert.ok(slugs.length > 1)
  let previousCount = 0, nextCount = 0
  for (const slug of slugs) {
    const { document } = parseHTML(readFileSync(`dist/blog/${slug}/index.html`, 'utf8'))
    const nav = document.querySelector('nav[aria-label="Article navigation"]')
    assert.ok(nav, slug)
    for (const link of nav.querySelectorAll('a')) {
      const target = link.getAttribute('href').replace('/blog/', '')
      assert.ok(slugs.includes(target))
      const { document: destination } = parseHTML(readFileSync(`dist/blog/${target}/index.html`, 'utf8'))
      assert.ok(link.textContent.includes(destination.querySelector('h1').textContent))
      const rel = link.getAttribute('rel')
      if (rel === 'prev') previousCount++; else nextCount++
      assert.equal(destination.querySelector(`nav[aria-label="Article navigation"] a[rel="${rel === 'prev' ? 'next' : 'prev'}"]`).getAttribute('href'), `/blog/${slug}`)
    }
  }
  assert.equal(previousCount, slugs.length - 1)
  assert.equal(nextCount, slugs.length - 1)
})
