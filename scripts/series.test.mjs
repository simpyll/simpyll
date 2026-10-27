import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSeries, validateSeries } from '../src/lib/series.mjs'
import { metadataFor } from './notion/publisher.mjs'
const article = (slug, order, id = 'learn', title = 'Learn') => ({ slug, metadata: { articleId: `manual:${slug}`, series: { id, title, order } } })
test('explicit order, gaps, multiple and single series, withdrawal and stable identities', () => {
  const a = article('renamed', 5), b = article('first', 1), c = article('single', 3, 'other', 'Other')
  const withdrawn = article('withdrawn', 2); withdrawn.metadata.status = 'withdrawn'
  assert.deepEqual(buildSeries([a, withdrawn, c, b]), [
    { id: 'learn', title: 'Learn', installments: [{ order: 1, articleId: 'manual:first' }, { order: 5, articleId: 'manual:renamed' }] },
    { id: 'other', title: 'Other', installments: [{ order: 3, articleId: 'manual:single' }] },
  ])
  assert.deepEqual(buildSeries([{ slug: 'plain', metadata: {} }]), [])
})
test('invalid, partial, conflicting and duplicate metadata fail', () => {
  for (const invalid of [{ id: '../unsafe', title: 'X', order: 1 }, { id: 'x', title: 'X' }, { id: 'x', title: 'X', order: 0 }, { id: 'x', title: 'X', order: 1.5 }]) assert.throws(() => validateSeries(invalid), /metadata.series/)
  assert.throws(() => buildSeries([article('a', 1), article('b', 1)]), /duplicate installment/)
  assert.throws(() => buildSeries([article('a', 1), article('b', 2, 'learn', 'Different')]), /conflicting titles/)
})
test('Notion optional fields normalize to the manual contract', () => {
  const text = value => ({ type: 'rich_text', rich_text: [{ plain_text: value }] })
  const page = { id: '123', created_time: '2026-01-01', properties: { Name: { title: [{ plain_text: 'Test' }] }, 'Series ID': text('learn'), 'Series Title': text('Learn'), 'Series Order': { type: 'number', number: 5 } } }
  assert.deepEqual(metadataFor(page, undefined, []).series, { id: 'learn', title: 'Learn', order: 5 })
  delete page.properties['Series Order']
  assert.throws(() => metadataFor(page, undefined, []), /order/)
})
