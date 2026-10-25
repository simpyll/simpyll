import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseHTML } from 'linkedom'
import { contentBreadcrumbs, breadcrumbSchema } from '../src/lib/breadcrumbs.ts'
const absolute = path => new URL(path, 'https://simpyll.com').href

test('canonical content metadata determines shared UI/schema hierarchy without mutation', () => {
  for (const kind of ['blog', 'projects']) {
    const title = 'Long title <script> & Unicode 日本語 '.repeat(10)
    const items = contentBreadcrumbs(kind, title, `/${kind}/canonical`)
    assert.deepEqual(items.map(i => i.label), ['Home', kind === 'blog' ? 'Blog' : 'Projects', title])
    assert.deepEqual(items.map(i => i.path), ['/', `/${kind}`, `/${kind}/canonical`])
    const schema = breadcrumbSchema(items, absolute)
    assert.equal(schema['@type'], 'BreadcrumbList')
    assert.deepEqual(schema.itemListElement, items.map((i, n) => ({ '@type': 'ListItem', position: n + 1, name: i.label, item: absolute(i.path) })))
    assert.deepEqual(JSON.parse(JSON.stringify(schema)), schema)
    assert.deepEqual(contentBreadcrumbs(kind, title, `/${kind}/canonical`), items)
    assert.equal(contentBreadcrumbs(kind, 'New title', `/${kind}/new-slug`)[2].label, 'New title')
  }
})
test('missing metadata, top-level, home and unsupported paths omit breadcrumbs', () => {
  for (const path of [undefined, '/', '/blog', '/unknown/x', '/notes/x', '/blog/x/y', '/blog/x?alias=1', '/blog/x#alias']) assert.deepEqual(contentBreadcrumbs('blog', 'Title', path), [])
  assert.deepEqual(contentBreadcrumbs('blog', ' ', '/blog/x'), [])
  assert.equal(breadcrumbSchema([], absolute), undefined)
})
test('all built nested pages have one matching canonical schema and accessible static UI', () => {
  const routes = JSON.parse(readFileSync('dist/deployment.json')).routes
  for (const { path } of routes) {
    const { document } = parseHTML(readFileSync(`dist${path === '/' ? '' : path}/index.html`, 'utf8'))
    const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent)).filter(s => s['@type'] === 'BreadcrumbList')
    const nested = /^\/(blog|projects)\/[^/]+$/.test(path)
    const nav = document.querySelector('nav[aria-label="Breadcrumb"]')
    assert.equal(schemas.length, nested ? 1 : 0, path)
    if (!nested) { assert.equal(nav, null, path); continue }
    const items = [...nav.querySelectorAll('li')]
    assert.equal(items.length, 3)
    assert.equal(nav.querySelectorAll('a').length, 2)
    assert.equal(nav.querySelector('[aria-current="page"]').tagName, 'SPAN')
    assert.deepEqual(schemas[0].itemListElement.map(i => i.name), items.map(i => i.querySelector('a, [aria-current]').textContent))
    assert.equal(schemas[0].itemListElement[2].item, document.querySelector('link[rel="canonical"]').href)
  }
  const aliases = JSON.parse(readFileSync('src/generated/redirects.json'))
  for (const alias of Object.keys(aliases)) assert.doesNotMatch(readFileSync(`dist/blog/${alias}/index.html`, 'utf8'), /BreadcrumbList|aria-label="Breadcrumb"/)
})

test('reusable component renders current-page semantics, hidden separators and safe JSON', async () => {
  const ts = (await import('typescript')).default
  const { createElement } = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { MemoryRouter } = await import('react-router-dom')
  const { HelmetProvider } = await import('react-helmet-async')
  let code = ts.transpileModule(readFileSync('src/components/Breadcrumbs.tsx', 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext } }).outputText
  code = code.replace("import './breadcrumbs.css';", '').replace('import "./breadcrumbs.css";', '')
  const site = `data:text/javascript,${encodeURIComponent('export const getSiteUrl = p => new URL(p, "https://simpyll.com").href')}`
  for (const [name, target] of Object.entries({
    'react/jsx-runtime': import.meta.resolve('react/jsx-runtime'),
    'react-router-dom': import.meta.resolve('react-router-dom'),
    'react-helmet-async': import.meta.resolve('react-helmet-async'),
    '../lib/breadcrumbs': new URL('../src/lib/breadcrumbs.ts', import.meta.url).href,
    '../config/site': site,
  })) code = code.replaceAll(`'${name}'`, JSON.stringify(target)).replaceAll(`"${name}"`, JSON.stringify(target))
  const { Breadcrumbs } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
  const context = {}
  const render = items => renderToStaticMarkup(createElement(HelmetProvider, { context }, createElement(MemoryRouter, null, createElement(Breadcrumbs, { items }))))
  assert.equal(render([]), '')
  const title = '</script><script>alert(1)</script>'
  const { document } = parseHTML(render(contentBreadcrumbs('blog', title, '/blog/canonical')))
  assert.equal(document.querySelector('[aria-current]').textContent, title)
  assert.equal(document.querySelectorAll('[aria-hidden="true"]').length, 2)
  assert.equal(document.querySelectorAll('a').length, 2)
  const script = document.querySelector('script').outerHTML
  assert.ok(script.includes('\\u003c/script>'))
  assert.equal((script.match(/<script/g) ?? []).length, 1)
})

test('static top-level policy/discovery pages and 404 omit breadcrumb metadata', () => {
  const policies = JSON.parse(readFileSync('src/content/policies.json'))
  for (const path of ['dist/404.html', 'dist/explore/index.html', ...policies.map(p => `dist/${p.slug}/index.html`)]) {
    assert.doesNotMatch(readFileSync(path, 'utf8'), /BreadcrumbList|aria-label="Breadcrumb"/, path)
  }
})
