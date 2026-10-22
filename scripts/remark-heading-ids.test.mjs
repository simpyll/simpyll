import { test } from 'node:test'
import assert from 'node:assert/strict'
import { remarkHeadingIds } from './remark-heading-ids.mjs'

test('MDX heading IDs handle formatting, punctuation, Unicode and collisions deterministically', () => {
  const heading = children => ({ type: 'heading', children })
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
  assert.deepEqual(tree.children.map(node => node.data.hProperties.id), ['installation', 'installation-1', 'installation-1-1', 'qué-sigue', 'section'])
  remarkHeadingIds()(original)
  assert.deepEqual(tree, original)
})
