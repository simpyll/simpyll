import test from 'node:test'
import assert from 'node:assert/strict'
import { compile } from '@mdx-js/mdx'
import { parseAst } from 'vite'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { articleTextChunks, articleTextChunkName } from './article-text-chunks.mjs'

test('large MDX prose stays literal, ordered and complete across bounded static imports', async t => {
  const prose = Array.from({ length: 100 }, (_, i) => `Passage ${i}: ${'Literal <script> {notCode} \\" & multilingual café. '.repeat(7)}`)
  const source = 'export const metadata = { title: "Fixture" }\n\n' + prose.map(value => `<p>{${JSON.stringify(value)}}</p>`).join('\n\n')
  const code = String(await compile(source))
  const plugin = articleTextChunks()
  const result = plugin.transform.call({ parse: parseAst }, code, '/fixture/src/content/blog/example.mdx')
  assert.ok(result)
  const imports = parseAst(result.code).body.filter(node => node.type === 'ImportDeclaration' && node.source.value.startsWith('\0article-text:'))
  const recovered = []
  const root = await mkdtemp(resolve('node_modules/.article-chunks-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  let executable = result.code
  for (const entry of imports) {
    const id = plugin.resolveId(entry.source.value)
    assert.match(articleTextChunkName(id), /^article-text-/)
    const values = parseAst(plugin.load(id)).body[0].declaration.elements.map(node => node.value)
    assert.ok(Buffer.byteLength(JSON.stringify(values)) < 8_100)
    recovered.push(...values)
    const file = `text-${recovered.length}.mjs`
    await writeFile(join(root, file), plugin.load(id))
    executable = executable.replace(JSON.stringify(id), JSON.stringify('./' + file))
  }
  assert.deepEqual(recovered, prose)
  await writeFile(join(root, 'before.mjs'), code)
  await writeFile(join(root, 'after.mjs'), executable)
  const before = await import(pathToFileURL(join(root, 'before.mjs')).href)
  const after = await import(pathToFileURL(join(root, 'after.mjs')).href)
  assert.equal(renderToStaticMarkup(createElement(after.default)), renderToStaticMarkup(createElement(before.default)), 'React output is identical, including escaping and paragraph order')
  assert.match(result.code, /export const metadata/)
  assert.equal(plugin.transform.call({ parse: parseAst }, 'export default 1', '/unrelated.js'), undefined)
  assert.equal(plugin.transform.call({ parse: parseAst }, String(await compile('Small article')), '/fixture/src/content/blog/small.mdx'), undefined)
})
