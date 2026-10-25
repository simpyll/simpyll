import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeEditorial, editorialErrors, correctionId, formatArticleDate } from '../src/lib/editorial.mjs'
import { readMetadata } from './redirects.mjs'
import { renderRss } from './generate-rss.mjs'

const base = { date: '2026-10-10' }
const correction = { date: '2026-10-24', description: 'Corrected the hydration explanation.' }
test('backward compatibility, same-day updates, UTC display and manual MDX literals', async () => {
  assert.deepEqual(normalizeEditorial(base), base)
  assert.deepEqual(normalizeEditorial({ ...base, updatedAt: base.date }), { ...base, updatedAt: base.date })
  assert.equal(formatArticleDate('2026-10-10'), 'October 10, 2026')
  const data = { ...base, updatedAt: '2026-10-25', corrections: [correction], revisions: [{ date: '2026-10-25', description: 'Updated examples.' }] }
  assert.deepEqual(normalizeEditorial(await readMetadata(`export const metadata = ${JSON.stringify(data)}\n\nAn article.`)), data)
})
for (const [metadata, message] of [
  [{}, /metadata.date/], [{ date: '2026-02-30' }, /calendar date/],
  [{ ...base, updatedAt: '2026-10-09' }, /must not precede/],
  [{ ...base, updatedAt: '2026-10-25T00:00:00Z' }, /updatedAt.*calendar/],
  [{ ...base, corrections: {} }, /must be an array/],
  [{ ...base, revisions: [null] }, /must be an object/],
  [{ ...base, corrections: [{ ...correction, date: '2026-02-29' }] }, /calendar date/],
  [{ ...base, revisions: [{ ...correction, date: '2026-10-09' }] }, /precede publication/],
  [{ ...base, revisions: [{ ...correction, description: ' ' }] }, /description/],
  [{ ...base, corrections: [{ date: '2026-10-24' }] }, /description/],
  [{ ...base, corrections: [{ ...correction, id: 'Invalid ID' }] }, /identifier/],
  [{ ...base, corrections: [correction, correction] }, /Duplicate correction/],
  [{ ...base, corrections: [{ ...correction, id: 'same' }, { ...correction, description: 'Other', id: 'same' }] }, /Duplicate correction/],
  [{ ...base, updatedAt: '2026-10-20', corrections: [correction] }, /must not follow/],
]) test(`rejects invalid editorial metadata: ${JSON.stringify(metadata)}`, () => assert.match(editorialErrors(metadata).join(';'), message))

test('sorting and permalinks survive unrelated additions and reordering; explicit IDs survive edits', () => {
  const older = { date: '2026-10-22', description: 'Older correction.' }
  const input = { ...base, corrections: [older, correction] }
  const before = JSON.stringify(input)
  assert.deepEqual(normalizeEditorial(input).corrections, [correction, older])
  assert.equal(JSON.stringify(input), before)
  assert.equal(JSON.stringify(normalizeEditorial(input)), JSON.stringify(normalizeEditorial({ ...base, corrections: [correction, older] })))
  assert.equal(correctionId(normalizeEditorial(input).corrections[0]), correctionId(correction))
  assert.equal(correctionId({ ...correction, id: 'hydration' }), correctionId({ ...older, id: 'hydration' }))
})
test('editorial metadata leaves RSS GUID, pubDate, canonical URL and order unchanged', () => {
  const site = { name: 'Simpyll', url: 'https://simpyll.com', description: 'Journal', language: 'en' }
  const article = { id: 'manual:fixture', slug: 'fixture', status: 'published', metadata: { ...base, title: 'Fixture', description: 'Example.', author: 'David', category: 'Journal', tags: [] } }
  const original = renderRss([article], site)
  const changed = renderRss([{ ...article, metadata: { ...article.metadata, updatedAt: '2026-10-25', corrections: [correction] } }], site)
  for (const tag of ['guid', 'pubDate', 'link']) assert.deepEqual(changed.match(new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'g')), original.match(new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'g')))
  assert.match(changed, /Sun, 25 Oct 2026 00:00:00 GMT/)
  assert.equal(changed, renderRss([{ ...article, metadata: { ...article.metadata, updatedAt: '2026-10-25', corrections: [correction] } }], site))
})
