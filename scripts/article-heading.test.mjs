import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const source = await readFile('src/components/mdx/ArticleHeading.tsx', 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext } }).outputText
// Resolve React's runtime before importing the isolated component module.
const code = compiled.replaceAll('"react/jsx-runtime"', JSON.stringify(import.meta.resolve('react/jsx-runtime')))
const { ArticleHeading } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
for (const level of [2, 3, 4]) {
  test(`H${level} preserves compiler ID, rich children and attributes without controls`, () => {
    const html = renderToStaticMarkup(createElement(ArticleHeading, { level, id: 'qué/manual-2', className: 'authored' }, 'Long heading with ', createElement('code', null, 'inline code')))
    assert.equal(html, `<h${level} class="authored" id="qué/manual-2">Long heading with <code>inline code</code></h${level}>`)
    assert.doesNotMatch(html, /button|svg|input|role="status"|title=|tabindex|heading-actions|heading-feedback/)
  })
}
test('headings have no clipboard API, event handlers or client state', () => {
  assert.doesNotMatch(source, /navigator|clipboard|onClick|onKey|useState|useRef|useContext/)
})
