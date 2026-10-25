import assert from 'node:assert/strict'
import { test } from 'node:test'
import { evaluate } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import * as runtime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import { parseHTML } from 'linkedom'
import { citationDiagnostics } from './remark-citations.mjs'
import { remarkHeadingIds } from './remark-heading-ids.mjs'
import { convertBlocks } from './notion/publisher.mjs'
import { block, rt } from './notion/fixtures/api.mjs'

async function render(source) {
  const { default: Content } = await evaluate(source, { ...runtime, remarkPlugins: [remarkGfm, remarkHeadingIds, () => tree => {
    const errors = citationDiagnostics(tree)
    if (errors.length) throw new Error(errors[0].message)
  }] })
  return renderToStaticMarkup(runtime.jsx(Content, {}))
}
test('GFM repeated citations have unique deterministic IDs and bidirectional static anchors', async () => {
  const source = 'Claim.[^one] Again.[^one] Other.[^two]\n\n[^one]: React. *hydrateRoot*. https://react.dev/reference/react-dom/client/hydrateRoot\n\n[^two]: Author (2025). *Journal*. https://doi.org/10.1000/example'
  const html = await render(source)
  assert.equal(await render(source), html)
  const { document } = parseHTML(html)
  const ids = [...document.querySelectorAll('[id]')].map(el => el.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(document.querySelectorAll('[data-footnote-ref]').length, 3)
  assert.equal(document.querySelectorAll('[data-footnote-backref]').length, 3)
  for (const anchor of document.querySelectorAll('a[href^="#"]')) assert.ok(document.getElementById(anchor.getAttribute('href').slice(1)))
  assert.match(html, /Back to reference 1-2/)
  assert.match(html, /https:\/\/doi.org\/10.1000\/example/)
})
test('unresolved and duplicate footnotes fail actionably; code markers remain literal', async () => {
  await assert.rejects(render('Missing.[^missing]'), /Unresolved footnote/)
  await assert.rejects(render('X.[^x]\n\n[^x]: One\n\n[^x]: Two'), /Duplicate footnote/)
  await render('`[^example]`')
  await assert.rejects(render('<div id="user-content-fn-x" />'), /reserved/)
})
test('bibliographies remain author controlled and Notion hyperlinks survive deterministically', async () => {
  const blocks = [block('heading_1', 'References'), block('numbered_list_item', 'React Documentation')]
  blocks[1].numbered_list_item.rich_text = [rt('hydrateRoot', {}, 'https://react.dev/reference/react-dom/client/hydrateRoot')]
  // Model the actual rich-text API hyperlink contract explicitly.
  blocks[1].numbered_list_item.rich_text[0].href = 'https://doi.org/10.1000/example'
  const generated = await convertBlocks(blocks, async () => '')
  assert.equal(await convertBlocks(blocks, async () => ''), generated)
  assert.match(await render(generated), /https:\/\/doi.org\/10.1000\/example/)
  assert.doesNotMatch(await render('## References'), /data-footnotes/)
  assert.match(await render('## References\n\n1. Author (2025). *Journal*. https://doi.org/10.1000/example'), /<em>Journal<\/em>/)
})
