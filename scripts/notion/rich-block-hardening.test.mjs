import assert from 'node:assert/strict'
import { test } from 'node:test'
import { evaluate, compile } from '@mdx-js/mdx'
import * as runtime from 'react/jsx-runtime'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { convertBlocks, readBlocks, synchronize, imageDescription, safeUrl, downloadImage } from './publisher.mjs'
import { block, rt, ROOT, PAGE, fixture, png } from './fixtures/api.mjs'

async function html(blocks) {
  const source = await convertBlocks(blocks, async () => '/images/example.png')
  const module = await evaluate(source, runtime)
  return renderToStaticMarkup(createElement(module.default))
}
const file = (url, extra = {}) => ({ type: 'file', file: { type: 'external', external: { url }, ...extra } })

test('bookmarks preserve query URLs and formatted captions without nested anchors or fetching metadata', async () => {
  const output = await html([{ type: 'bookmark', bookmark: { url: 'https://example.com/?q=hello&lang=en', caption: [rt('Author title', { bold: true }), rt('Source', {}, 'https://example.org')] } }])
  assert.match(output, /href="https:\/\/example.com\/\?q=hello&amp;lang=en"/)
  assert.match(output, /<strong>Author title<\/strong>/)
  assert.doesNotMatch(output, /<a[^>]*>[^<]*<a|iframe|script/)
  assert.match(await html([{ type: 'bookmark', bookmark: { url: 'https://example.com/' } }]), />https:\/\/example.com\/<\/a>/)
})

test('attachments preserve public filenames, type and captions as static links', async () => {
  for (const ext of ['pdf', 'csv', 'txt']) {
    const output = await html([file(`https://example.com/guide.${ext}`, { caption: [rt('Read before use')] })])
    assert.match(output, new RegExp(`guide\\.${ext} \\(${ext.toUpperCase()}\\)`))
    assert.match(output, /Read before use/)
  }
  const output = await html([file('https://example.com/guide.pdf', { name: '<script>{danger}</script>' })])
  assert.match(output, /&lt;script&gt;/)
  assert.doesNotMatch(output, /<script>/)
})

test('unsafe resources fail with block location and without leaking URL, caption or signed credentials', async () => {
  const urls = ['javascript:secret', 'data:text/html,secret', 'file:///private/secret', 'https://user:secret@example.com/a.pdf', 'https://example.com/a.pdf?token=secret', 'https://secure.notion-static.com/secret.pdf', 'https://example.com/a.exe', 'https://example.com/%2e%2e/secret.pdf', 'https://example.com/a%2fsecret.pdf', 'https://example.com/%00secret.pdf', 'https://example.com/dir%2fsub/a.pdf', 'https://example.com/%252e%252e/a.pdf']
  for (const url of urls) {
    await assert.rejects(convertBlocks([{ id: PAGE, ...file(url) }]), error => {
      assert.match(error.message, new RegExp(PAGE)); assert.match(error.message, /file/)
      assert.doesNotMatch(error.message, /secret|token=/); return true
    })
  }
  await assert.rejects(convertBlocks([{ type: 'file', file: { type: 'file', file: { url: 'https://private/secret' } } }]), /private Notion/)
  for (const url of ['javascript:alert(1)', 'https://notion.so/private', 'https://notionusercontent.com/private', 'https://example.com/file.pdf?X-Amz-Signature=secret', 'https://prod-files-secure.s3.us-west-2.amazonaws.com/private?signature=secret']) {
    await assert.rejects(convertBlocks([{ type: 'bookmark', bookmark: { url } }]), /HTTPS|Unsafe/)
  }
  for (const url of ['https://example.com/\nsecret', 'https://example.com/\\secret', 'https://user:pass@example.com']) assert.throws(() => safeUrl(url), /Unsafe/)
})

test('image alt is explicit and distinct from visible rich caption and attribution', async () => {
  const caption = [rt('Alt: Workflow diagram\nFigure 1. '), rt('Source', { italic: true }, 'https://example.com/source')]
  assert.equal(imageDescription(caption).alt, 'Workflow diagram')
  const output = await html([{ type: 'image', image: { caption } }])
  assert.match(output, /alt="Workflow diagram"/)
  assert.match(output, /<figcaption>Figure 1. <a href="https:\/\/example.com\/source"><em>Source<\/em><\/a><\/figcaption>/)
  assert.doesNotMatch(output, />Alt:/)
  assert.match(await html([{ type: 'image', image: { caption: [rt('Decorative\nSection ornament')] } }]), /alt=""/)
  for (const caption of [[], [rt('photo123.png')], [rt('Alt: ')]]) await assert.rejects(html([{ type: 'image', image: { caption } }]), /image caption must start/)
})

test('rich text and code captions preserve Unicode, annotations and literal injection attempts', async () => {
  const attack = '<img onerror="alert(1)"> {globalThis.secret = true} import Evil from "x"; | * _ \\ 😀 β'
  const output = await html([
    { type: 'paragraph', paragraph: { rich_text: [rt('', {}), rt(attack, { bold: true, italic: true, underline: true, strikethrough: true, code: true }, 'https://example.com')] } },
    { type: 'code', code: { rich_text: [rt(attack)], language: 'javascript', caption: [rt('Literal example', { italic: true })] } },
  ])
  assert.match(output, /&lt;img/); assert.match(output, /😀 β/)
  assert.match(output, /<figcaption><em>Literal example<\/em><\/figcaption>/)
  assert.doesNotMatch(output, /<img|<script/)
  assert.match(await html([block('paragraph', 'First line\nSecond line')]), /First line<br\/>Second line/)
  for (const type of ['mention']) await assert.rejects(convertBlocks([{ type: 'paragraph', paragraph: { rich_text: [{ type, plain_text: 'private' }] } }]), /conversion failed/)
})

test('tables preserve ordered empty and linked cells; malformed cells fail instead of being discarded', async () => {
  const table = { type: 'table', table: { table_width: 3, has_column_header: true, has_row_header: true }, children: [
    { type: 'table_row', table_row: { cells: [[rt('Row')], [rt('Value')], [rt('Link')]] } },
    { type: 'table_row', table_row: { cells: [[rt('A | * {x}', { bold: true })], [], [rt('Read', { italic: true }, 'https://example.com')]] } },
  ] }
  const output = await html([table])
  assert.match(output, /<thead><tr><th scope="col">Row/)
  assert.match(output, /<th scope="row"><strong>A \| \* \{x\}<\/strong><\/th><td><\/td><td><a/)
  for (const cells of [null, [null], [[rt('missing columns')]]]) {
    const invalid = structuredClone(table); invalid.children[1].table_row.cells = cells
    await assert.rejects(html([invalid]), /table/)
  }
})

test('privacy boundaries reject original and referenced synced blocks, subpages and databases before child fetches', async () => {
  for (const type of ['synced_block', 'child_page', 'child_database']) {
    for (const has_children of [false, true]) {
      let calls = 0
      await assert.rejects(readBlocks(async () => {
        calls++; return { has_more: false, results: [block(type, 'PRIVATE TITLE', { has_children, synced_block: { synced_from: { block_id: PAGE } } })] }
      }, ROOT), error => {
        assert.match(error.message, /privacy boundary/); assert.doesNotMatch(error.message, /PRIVATE TITLE/); return true
      })
      assert.equal(calls, 1)
    }
  }
})

test('cycles, excessive recursion and aggregate block counts fail with bounded API calls', async () => {
  let calls = 0
  await assert.rejects(readBlocks(async () => { calls++; return { has_more: false, results: [block('paragraph', 'cycle', { id: ROOT, has_children: true })] } }, ROOT), /cycle/)
  assert.equal(calls, 1)
  const cyclic = block('paragraph', 'cycle'); cyclic.children = [cyclic]
  await assert.rejects(convertBlocks([cyclic]), /cycle/)
  let nested = block('paragraph', 'end')
  for (let i = 0; i < 32; i++) nested = { ...block('toggle', 'Nested'), children: [nested] }
  await assert.rejects(convertBlocks([nested]), /nesting limit/)
  const many = Array.from({ length: 10_001 }, () => block('paragraph', 'x'))
  await assert.rejects(convertBlocks(many), /block.*limit/)
  await assert.rejects(readBlocks(async () => ({ has_more: false, results: many }), ROOT), /limit/)
  let index = 1
  await assert.rejects(readBlocks(async () => ({ has_more: false, results: [block('toggle', 'x', { id: (++index).toString(16).padStart(32, '0'), has_children: true })] }), ROOT), /nesting limit/)
  let batch = 0
  await assert.rejects(readBlocks(async () => ({ has_more: false, results: batch++ === 0
    ? [block('paragraph', 'nested', { has_children: true }), ...many.slice(0, 5000)] : many.slice(0, 5000) }), ROOT), /block.*limit/)
})

test('partial conversion, unsupported blocks, expired media and API failures retain every last-known-good and manual byte', async t => {
  const root = await mkdtemp(join(tmpdir(), 'notion-rich-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'src/content/blog'), { recursive: true })
  await writeFile(join(root, 'src/content/blog/manual.mdx'), 'Manual content')
  const options = { root, pageId: ROOT, api: fixture().api, imageDownloader: async () => ({ bytes: png, extension: 'png' }), validate: compile }
  await synchronize(options)
  const snapshot = async () => {
    const paths = await readdir(root, { recursive: true, withFileTypes: true })
    return Promise.all(paths.filter(p => p.isFile()).map(async p => [join(p.parentPath, p.name), (await readFile(join(p.parentPath, p.name))).toString('base64')]))
  }
  const before = await snapshot()
  for (const type of ['embed', 'video', 'table_of_contents', 'unsupported', 'future_block']) {
    await assert.rejects(synchronize({ ...options, api: fixture({ content: [block('paragraph', 'Valid start'), block(type, 'DO NOT LOG')] }).api }), error => {
      assert.match(error.message, new RegExp(type)); assert.doesNotMatch(error.message, /DO NOT LOG/); return true
    })
    assert.deepEqual(await snapshot(), before)
  }
  await assert.rejects(synchronize({ ...options, imageDownloader: url => downloadImage(url, async () => new Response('private', { status: 403 })) }), /conversion failed/)
  const f = fixture()
  await assert.rejects(synchronize({ ...options, api: (path, body) => path.startsWith(`blocks/${PAGE}`) ? Promise.reject(new Error('Notion request failed (HTTP 503)')) : f.api(path, body) }), /503/)
  assert.deepEqual(await snapshot(), before)
})
