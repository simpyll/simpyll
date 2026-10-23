import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseDiscovery, serializeDiscovery, discoveryUrl, taxonomyId, taxonomy, prepareDiscovery, defaultState } from '../src/lib/discovery.ts'
import { generateSearch, searchDocument } from './generate-search.mjs'
const state = value => parseDiscovery(new URLSearchParams(value))
const record = (slug, extra = {}) => ({ slug, id: `blog:${slug}`, url: `/blog/${slug}`, type: 'blog', title: slug, description: '', category: 'Engineering', tags: ['React'], body: 'Hydration details', date: '2026-01-01', ...extra })
const records = [record('a', { title: 'React architecture', date: '2026-03-01' }), record('b', { category: 'Learning', tags: ['Python'], date: '2026-02-01' }), record('c', { tags: ['TypeScript'], date: '' })]
const search = prepareDiscovery(records)
test('URL state round-trips Unicode, punctuation, query, multiple filters and sort deterministically', () => {
  const value = state('q=++Café+++%26+React+&category=Engineering&category=engineering&tag=C%2B%2B&tag=日本語&tag=C%23&sort=oldest&unknown=ignored')
  assert.equal(value.q, 'Café & React')
  assert.deepEqual(value.categories, ['engineering'])
  assert.deepEqual(parseDiscovery(new URLSearchParams(serializeDiscovery(value))), value)
  assert.equal(serializeDiscovery(value), 'q=Caf%C3%A9+%26+React&category=engineering&tag=c%23&tag=c%2B%2B&tag=%E6%97%A5%E6%9C%AC%E8%AA%9E&sort=oldest')
  assert.equal(discoveryUrl({ tags: ['React'] }), '/explore?tag=react')
  assert.equal(discoveryUrl({ q: 'React' }), '/explore?q=React')
  assert.notEqual(taxonomyId('C++'), taxonomyId('C#'))
})
test('safe defaults, unknown sorts, empty filters, repeated queries and malformed escapes', () => {
  assert.deepEqual(state('q=+&tag=+&category=&sort=__proto__'), defaultState)
  assert.equal(state('q=React&q=Python&sort=wrong').sort, 'relevance')
  assert.equal(state('sort=relevance').sort, 'newest')
  assert.equal(state('q=' + 'x'.repeat(300)).q.length, 160)
  assert.doesNotThrow(() => state('tag=%ZZ&q=%E0%A4%A'))
  assert.equal(serializeDiscovery(defaultState), '')
})
test('category/tag OR within dimensions, AND between dimensions and full-text terms', () => {
  for (const [params, expected] of [
    ['category=engineering', ['a', 'c']], ['tag=python', ['b']], ['tag=react&tag=typescript', ['a', 'c']],
    ['q=hydration', ['a', 'b', 'c']], ['q=hydration&category=learning', ['b']],
    ['q=hydration&tag=typescript', ['c']], ['q=hydration&tag=react&category=engineering', ['a']],
    ['category=unknown', []], ['q=no-such-prose', []], ['tag=unknown', []],
  ]) assert.deepEqual(search(state(params)).map(item => item.slug), expected, params)
})
test('sorting is stable, missing dates are safe, reset and removal restore results', () => {
  assert.deepEqual(search(state('sort=oldest')).map(item => item.slug), ['c', 'b', 'a'])
  assert.deepEqual(search(defaultState).map(item => item.slug), ['a', 'b', 'c'])
  const selected = state('q=hydration&tag=react&category=engineering&sort=oldest')
  assert.deepEqual(search({ ...selected, tags: [], categories: [] }).map(item => item.slug), ['c', 'b', 'a'])
  const ties = prepareDiscovery([record('z'), record('a'), record('a')])
  assert.deepEqual(ties(defaultState).map(item => item.slug), ['a', 'z'])
  assert.deepEqual(prepareDiscovery([])(defaultState), [])
  assert.equal(taxonomy(records, 'category').length, 2)
})
test('discovery searches every match before filtering instead of the nav eight-result cap', () => {
  const many = Array.from({ length: 15 }, (_, i) => record(`article-${String(i).padStart(2, '0')}`, { tags: [i === 14 ? 'Last' : 'First'] }))
  const discover = prepareDiscovery(many)
  assert.equal(discover(state('q=hydration')).length, 15)
  assert.equal(discover(state('q=hydration&tag=last'))[0].slug, 'article-14')
})
test('production records have stable canonical identity, dates, no fixtures/aliases and only public metadata', async () => {
  const documents = await generateSearch()
  const redirects = JSON.parse(await (await import('node:fs/promises')).readFile('src/generated/redirects.json', 'utf8'))
  for (const record of documents) {
    assert.ok(record.id && record.date && record.title)
    assert.equal(record.url, `/blog/${record.slug}`)
    assert.equal(record.type, 'blog')
    assert.ok(!Object.hasOwn(redirects, record.slug))
    assert.ok(!/test|fixture/.test(record.slug))
  }
  for (const flags of ['draft: true', 'published: false', "status: 'private'", 'test: true']) {
    assert.equal(await searchDocument(`export const metadata = { title: 'Private', ${flags} }`, 'private'), null)
  }
  assert.equal(await searchDocument("export const metadata = { tags: [] }", 'invalid'), null)
  assert.equal((await searchDocument("export const metadata = { title: 'Minimal' }", 'minimal')).date, '')
})
