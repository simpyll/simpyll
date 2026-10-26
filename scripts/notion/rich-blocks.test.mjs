import assert from 'node:assert/strict'
import { test } from 'node:test'
import { evaluate } from '@mdx-js/mdx'
import * as runtime from 'react/jsx-runtime'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { convertBlocks, readBlocks, imageAccessibility } from './publisher.mjs'
import { block, rt, PAGE, CHILD } from './fixtures/api.mjs'

const html = async blocks => {
  const source = await convertBlocks(blocks, async () => '/images/fixture.png')
  const module = await evaluate(source, runtime)
  return renderToStaticMarkup(createElement(module.default, { components: { Callout: 'aside' } }))
}

test('rich blocks compile to literal safe semantic HTML without executing prose', async () => {
  const payload = '<script>alert(1)</script>{process.env.TOKEN} | * _ \\ Unicode α 🩺'
  const rows = [
    { type: 'table_row', table_row: { cells: [[rt('Heading')], [rt('Column')]] } },
    { type: 'table_row', table_row: { cells: [[rt('Row', { bold: true })], [rt(payload, { italic: true, underline: true, strikethrough: true }, 'https://example.com')]] } },
    { type: 'table_row', table_row: { cells: [[rt('Empty')], []] } },
  ]
  const result = await html([
    { type: 'table', table: { table_width: 2, has_column_header: true, has_row_header: true }, children: rows },
    { type: 'bookmark', bookmark: { url: 'https://example.com/article', caption: [rt('Read the article', { bold: true })] } },
    { type: 'file', file: { type: 'external', external: { url: 'https://example.com/report.pdf' }, caption: [rt('Annual report')] } },
    { type: 'image', image: { caption: [rt('Alt: A flow diagram\n'), rt('Source: author', {}, 'https://example.com')] } },
    block('toggle', 'Details', { children: [block('paragraph', payload)] }),
    block('callout', 'Note'),
    block('bulleted_list_item', 'Outer', { children: [block('numbered_list_item', 'Inner')] }),
    block('to_do', 'Complete', { to_do: { checked: true, rich_text: [rt('Complete')] } }),
    { type: 'equation', equation: { expression: 'x^{2} < y' } },
    block('paragraph', '', { paragraph: { rich_text: [{ type: 'equation', equation: { expression: 'E=mc^2' } }, rt('', { bold: true }), rt(payload, { code: true })] } }),
    block('code', payload),
  ])
  for (const expected of ['<thead>', 'scope="col"', 'scope="row"', '<td></td>', '<strong>Row</strong>', '<u><del>', 'alt="A flow diagram"', '<figcaption>', 'Source: author', 'report.pdf (PDF)', '<details><summary>', '<ul>', '<ol>', '☑', 'Equation (TeX)', '&lt;script&gt;', '{process.env.TOKEN}', 'α 🩺']) assert.ok(result.includes(expected), expected)
  assert.doesNotMatch(result, /<script>|<iframe/)
})

test('image alt is explicitly authored independently of caption; decorative is explicit', () => {
  const image = caption => ({ type: 'image', image: { caption: [rt(caption)] } })
  assert.deepEqual(imageAccessibility(image('Decorative\n')).alt, '')
  for (const caption of ['', 'file.png', 'Caption only', 'Alt: \nCaption']) assert.throws(() => imageAccessibility(image(caption)), /caption must start/)
})

test('unsafe bookmarks, private/signed/executable attachments and malformed tables fail closed', async () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,secret', 'https://user:secret@example.com']) {
    await assert.rejects(html([{ type: 'bookmark', bookmark: { url } }]), /bookmark requires/)
  }
  for (const url of ['https://example.com/app.exe', 'https://example.com/report.pdf?token=secret', 'https://secure.notion-static.com/report.pdf', 'https://example.com/a%2Fb.pdf', 'https://example.com/..%2Freport.pdf', 'https://example.com/secret%00.pdf', 'file:///tmp/a.pdf']) {
    await assert.rejects(html([{ type: 'file', file: { type: 'external', external: { url } } }]), /attachment|Attachment|URL/)
  }
  await assert.rejects(html([{ type: 'file', file: { type: 'file', file: { url: 'https://secure.notion-static.com/secret.pdf' } } }]), /private Notion/)
  await assert.rejects(html([{ type: 'table', table: { table_width: 2 }, children: [{ type: 'table_row', table_row: { cells: [[]] } }] }]), /Invalid Notion table/)
  for (const type of ['embed', 'video', 'table_of_contents', 'unknown', 'synced_block', 'child_page', 'child_database']) await assert.rejects(html([{ id: CHILD, type }]), new RegExp(type))
})

test('privacy boundaries are rejected before fetching sources or children, even cyclic synced blocks', async () => {
  for (const type of ['synced_block', 'child_page', 'child_database']) {
    let calls = 0
    const api = async () => { calls++; return { results: [{ id: PAGE, type, has_children: true, [type]: { synced_from: { block_id: PAGE } } }], has_more: false } }
    await assert.rejects(readBlocks(api, PAGE), /privacy boundary/)
    assert.equal(calls, 1)
  }
})

test('cycles, excessive depth, total blocks and paginated results are bounded', async () => {
  const result = results => ({ results, has_more: false })
  await assert.rejects(readBlocks(async () => result([block('paragraph', 'x', { id: PAGE, has_children: true })]), PAGE), /cycle/)
  await assert.rejects(readBlocks(async () => result([]), PAGE, 31), /nesting limit/)
  await assert.rejects(readBlocks(async () => result([block('paragraph', 'x')]), PAGE, 0, { count: 10000, ancestors: new Set() }), /total block limit/)
  let cursor = 0
  await assert.rejects(readBlocks(async () => ({ results: Array.from({ length: 100 }, () => block('paragraph', 'x')), has_more: true, next_cursor: String(++cursor) }), PAGE), /pagination block\/result limit/)
})

 test('code captions and linked bookmark captions remain safe and meaningful', async () => {
  const result = await html([
    block('code', 'example', { code: { rich_text: [rt('example')], caption: [rt('Code source')] } }),
    { type: 'bookmark', bookmark: { url: 'https://example.com', caption: [rt('Caption source', {}, 'https://example.org')] } },
    { type: 'bookmark', bookmark: { url: 'https://example.net' } },
  ])
  assert.match(result, /<figcaption>Code source<\/figcaption>/)
  assert.match(result, /<a href="https:\/\/example.com\/">https:\/\/example.com\/<\/a> — <a href="https:\/\/example.org\/">Caption source<\/a>/)
  await assert.rejects(html([{ type: 'bookmark', bookmark: { url: 'https://secure.notion-static.com/private.pdf?token=secret' } }]), /bookmark requires/)
  await assert.rejects(html([{ type: 'equation', equation: {} }]), /conversion failed/)
})
