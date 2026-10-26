import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compile } from '@mdx-js/mdx'
import { safeContentUrl } from '../src/components/mdx/urls.ts'
import { remarkRichContent } from './remark-rich-content.mjs'
import { remarkHeadingIds } from './remark-heading-ids.mjs'
import { convertBlocks } from './notion/publisher.mjs'
import { block, rt } from './notion/fixtures/api.mjs'

test('content URLs reject executable schemes, credentials, controls and backslashes', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,<script>', 'vbscript:x', 'https://user:pass@example.com', 'java\nscript:x', '\\example.com', 'file:///etc/passwd', 'https://example.com/\u0000']) assert.equal(safeContentUrl(value), undefined)
  for (const value of ['/blog/hello-world', '#section', 'https://example.com', '//example.com', 'mailto:a@example.com', 'tel:123', '../hello-world']) assert.equal(safeContentUrl(value), value)
  assert.equal(safeContentUrl('mailto:a@example.com', true), undefined)
})
test('literal Notion code normalizes safely, while executable expressions are never evaluated', async () => {
  const mdx = await convertBlocks([block('code', '<script>{danger}</script>\n  indent')], async () => '')
  const compiled = String(await compile(mdx, { remarkPlugins: [remarkRichContent] }))
  assert.match(compiled, /language-plaintext/)
  assert.match(compiled, /indent/)
  globalThis.mdxExecutionSentinel = false
  await compile('<pre><code>{globalThis.mdxExecutionSentinel = true}</code></pre>', { remarkPlugins: [remarkRichContent] })
  assert.equal(globalThis.mdxExecutionSentinel, false)
  delete globalThis.mdxExecutionSentinel
})
test('Markdown and publisher headings share deterministic duplicate-safe IDs', async () => {
  const generated = await convertBlocks([block('heading_1', 'Same heading'), block('heading_1', 'Same heading')], async () => '')
  const compiled = String(await compile('## Same heading\n\n' + generated, { remarkPlugins: [remarkHeadingIds] }))
  for (const value of ['same-heading', 'same-heading-1', 'same-heading-2']) assert.ok(compiled.includes(`id: "${value}"`))
})
test('Notion tables preserve row and column headers, rich text and reject malformed rows', async () => {
  const table = { type: 'table', table: { table_width: 2, has_column_header: true, has_row_header: true }, children: [
    { type: 'table_row', table_row: { cells: [[rt('Name')], [rt('Value')]] } },
    { type: 'table_row', table_row: { cells: [[rt('Setting')], [rt('<img onerror=evil>', { bold: true })]] } },
  ] }
  const content = await convertBlocks([table], async () => '')
  assert.match(content, /<thead><tr><th scope="col">/)
  assert.match(content, /<tbody><tr><th scope="row">/)
  assert.match(content, /<strong>/)
  assert.doesNotMatch(content, /<img onerror/)
  await compile(content)
  await assert.rejects(convertBlocks([{ ...table, table: { table_width: 3 } }], async () => ''), /Invalid Notion table/)
  await assert.rejects(convertBlocks([block('embed', 'private input')], async () => ''), /Notion block embed .*Unsupported Notion block type/)
})

test('publisher headings use the shared heading components after ID generation', async () => {
  const source = '## **Rich** `code` [link](https://example.com)\n\n<h2 id="qué/manual">Explicit <em>title</em></h2>\n\n<h4>{"Notion detail"}</h4>'
  const result = String(await compile(source, { remarkPlugins: [remarkHeadingIds, remarkRichContent] }))
  assert.match(result, /MdxH2/)
  assert.match(result, /MdxH4/)
  assert.match(result, /qué\/manual/)
  assert.match(result, /rich-code-link/)
  assert.match(result, /notion-detail/)
})
