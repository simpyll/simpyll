import { test } from 'node:test'
import assert from 'node:assert/strict'
import { remarkHeadingIds } from './remark-heading-ids.mjs'

test('MDX heading IDs handle formatting, punctuation, Unicode and collisions deterministically', () => {
  const heading = children => ({ type: 'heading', depth: 2, children })
  const text = value => ({ type: 'text', value })
  const tree = { type: 'root', children: [
    heading([text('Installation')]),
    heading([{ type: 'emphasis', children: [text('Installation')] }]),
    heading([text('Installation-1')]),
    heading([text('¿Qué sigue?')]),
    heading([text('!!!')]),
  ] }
  const original = structuredClone(tree)
  remarkHeadingIds()(tree)
  assert.deepEqual(tree.children.filter(node => node.type === 'heading').map(node => node.data.hProperties.id), ['installation', 'installation-1', 'installation-1-1', 'qué-sigue', 'section'])
  remarkHeadingIds()(original)
  assert.deepEqual(tree, original)
})

test('registry exports ordered H2/H3 metadata, reserves explicit IDs and omits hidden headings', async () => {
  const { compile } = await import('@mdx-js/mdx')
  const { run } = await import('@mdx-js/mdx')
  const runtime = await import('react/jsx-runtime')
  const source = `### Orphan\n\n## **Architecture**\n\n### [Data](https://example.com) \`Flow\`\n\n## Architecture\n\n<h2 id={"architecture-1"}>Manual</h2>\n\n<h3>{"Qué sigue?"}</h3>\n\n## main-content\n\n<details>\n\n## Hidden\n\n</details>`
  const compiled = await compile(source, { remarkPlugins: [remarkHeadingIds], outputFormat: 'function-body' })
  const module = await run(String(compiled), runtime)
  assert.deepEqual(module.headings, [
    { id: 'orphan', title: 'Orphan', depth: 3 },
    { id: 'architecture', title: 'Architecture', depth: 2 },
    { id: 'data-flow', title: 'Data Flow', depth: 3 },
    { id: 'architecture-2', title: 'Architecture', depth: 2 },
    { id: 'architecture-1', title: 'Manual', depth: 2 },
    { id: 'qué-sigue', title: 'Qué sigue?', depth: 3 },
    { id: 'main-content-1', title: 'main-content', depth: 2 },
  ])
  const empty = await run(String(await compile('No headings.', { remarkPlugins: [remarkHeadingIds], outputFormat: 'function-body' })), runtime)
  assert.deepEqual(empty.headings, [])
})

test('duplicate manual IDs and reserved landmark IDs fail compilation', () => {
  for (const ids of [['same', 'same'], ['main-content']]) {
    const tree = { type: 'root', children: ids.map(id => ({ type: 'mdxJsxFlowElement', name: 'h2', attributes: [{ name: 'id', value: id }], children: [] })) }
    assert.throws(() => remarkHeadingIds()(tree), /Duplicate or reserved article ID/)
  }
})

test('editorial namespace cannot collide with body headings or explicit IDs', async () => {
  const { compile } = await import('@mdx-js/mdx')
  const result = await compile('## Editorial corrections heading', { remarkPlugins: [remarkHeadingIds] })
  assert.match(String(result), /article-editorial-corrections-heading/)
  await assert.rejects(compile('<h2 id="editorial-correction-hydration">Title</h2>', { remarkPlugins: [remarkHeadingIds] }), /reserved article ID/)
})
