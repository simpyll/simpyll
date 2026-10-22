import { test } from 'node:test'
import assert from 'node:assert/strict'
import { searchDocument, generateSearch } from './generate-search.mjs'
import { prepareSearch } from '../src/lib/search.ts'

const source = `export const metadata = { title: 'Café React', description: 'Architecture', category: 'Engineering', tags: ['Unicode'] }

A paragraph about hydration.

<Callout title="Warning">\n\nReadable callout\n\n</Callout>
<Disclosure title={"Details"}><p>{"Notion disclosure"}</p></Disclosure>
<Figure caption="Useful caption" />

\`\`\`js
secretImplementation()
\`\`\`

{executeSecret()}
<script>hiddenScript</script>
`
test('AST extraction retains readable rich/Notion text and excludes executable MDX', async () => {
  const document = await searchDocument(source, 'cafe')
  assert.equal(document.title, 'Café React')
  for (const text of ['hydration', 'Readable callout', 'Details', 'Notion disclosure', 'Useful caption']) assert.ok(document.body.includes(text), text)
  for (const text of ['metadata', 'executeSecret', 'secretImplementation', 'hiddenScript', 'Callout']) assert.ok(!document.body.includes(text), text)
  const search = prepareSearch([document])
  for (const query of ['cafe', 'architecture', 'engineering', 'unicode', 'notion disclosure', 'hydr']) assert.equal(search(query).length, 1, query)
})
test('unpublished documents and marked fixtures are excluded', async () => {
  for (const flag of ['draft: true', 'published: false', 'test: true', 'status: "Draft"', 'status: "Ready"']) {
    assert.equal(await searchDocument(source.replace("title:", `${flag}, title:`), 'draft'), null)
  }
})
test('real index is deterministic, canonical, unique and excludes test content', async () => {
  const first = await generateSearch()
  assert.deepEqual(first, await generateSearch())
  assert.equal(new Set(first.map(item => item.slug)).size, first.length)
  assert.ok(!first.some(item => /test|fixture/.test(item.slug)))
  assert.ok(first.some(item => item.slug === '001-python-fundamentals'))
})
test('weighted ranking, multiword prefix matching, stable ties and deduplication', () => {
  const doc = (slug, title, extra = {}) => ({ slug, title, category: '', tags: [], description: '', body: '', ...extra })
  const docs = [doc('body', 'Other', { body: 'React architecture' }), doc('tags', 'Tags', { tags: ['React'] }), doc('title', 'React architecture'), doc('exact', 'React'), doc('prefix', 'React patterns'), doc('description', 'Description', { description: 'React' })]
  const search = prepareSearch([...docs, docs[0]])
  assert.deepEqual(search('react').map(item => item.slug), ['exact', 'prefix', 'title', 'tags', 'description', 'body'])
  assert.equal(search('react arch')[0].slug, 'title')
  assert.equal(search('react unknown').length, 0)
  assert.equal(search('').length, 0)
  assert.equal(search('!!!').length, 0)
  assert.deepEqual(search('REACT!'), search('react'))
})

test('Notion publisher output is searchable without evaluating expressions', async () => {
  const { convertBlocks } = await import('./notion/publisher.mjs')
  const { block } = await import('./notion/fixtures/api.mjs')
  const content = await convertBlocks([block('paragraph', 'Notion searchable paragraph'), block('callout', 'Published rich callout'), block('code', 'implementationSecret()')], async () => '')
  const document = await searchDocument(`export const metadata = { title: 'Published', tags: [] }\n\n${content}`, 'published')
  assert.ok(document.body.includes('Notion searchable paragraph'))
  assert.ok(document.body.includes('Published rich callout'))
  assert.ok(!document.body.includes('implementationSecret'))
  assert.equal(prepareSearch([document])('searchable')[0].slug, 'published')
})
