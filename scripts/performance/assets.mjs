import { projectAssets } from './route-assets.mjs'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'
import { gzipSync } from 'node:zlib'
import { parseHTML } from 'linkedom'
import { pathToFileURL } from 'node:url'

const media = /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i
const font = /\.(woff2?|ttf|otf)$/i
export async function measureAssets(dist = 'dist') {
  const root = resolve(dist)
  const manifest = JSON.parse(await readFile(resolve(root, '.vite/manifest.json'), 'utf8'))
  const entries = Object.keys(manifest).filter(k => manifest[k].isEntry)
  if (!entries.length) throw new Error('Build manifest has no client entry')
  const closure = (keys, dynamic = false, seen = new Set()) => {
    for (const key of keys) {
      if (seen.has(key)) continue
      const item = manifest[key]
      if (!item) throw new Error(`Missing manifest entry: ${key}`)
      seen.add(key)
      closure([...(item.imports || []), ...(dynamic ? item.dynamicImports || [] : [])], dynamic, seen)
    }
    return seen
  }
  const initial = closure(entries)
  const all = closure(entries, true)
  const sizes = new Map()
  const size = async path => {
    if (sizes.has(path)) return sizes.get(path)
    const file = resolve(root, '.' + path)
    if (!file.startsWith(root + sep)) throw new Error(`Resource escapes dist: ${path}`)
    const bytes = await readFile(file)
    const value = { path, raw: bytes.length, estimated: /\.(js|css|html|json|svg)$/i.test(path) ? gzipSync(bytes, { level: 9 }).length : bytes.length }
    sizes.set(path, value)
    return value
  }
  const filesFor = keys => new Set([...keys].flatMap(k => [manifest[k].file, ...(manifest[k].css || []), ...(manifest[k].assets || [])]).map(f => '/' + f))
  const initialFiles = filesFor(initial)
  const allFiles = filesFor(all)
  for (const path of allFiles) await size(path)
  const initialJS = [...initialFiles].filter(p => p.endsWith('.js')).reduce((n,p) => n + sizes.get(p).estimated, 0)
  const routeChunks = [...allFiles].filter(p => p.endsWith('.js') && !initialFiles.has(p)).map(p => sizes.get(p))
  const pages = []
  const htmlFiles = (await readdir(root, { recursive: true })).filter(p => p.endsWith('.html')).sort()
  for (const htmlFile of htmlFiles) {
    const html = await readFile(resolve(root, htmlFile), 'utf8')
    const { document } = parseHTML(html)
    // Redirect documents contain no application entry; recovery documents do.
    if (!document.querySelector('script[type="module"][src]')) continue
    const route = '/' + htmlFile.replace(/index\.html$/, '').replace(/\/$/, '')
    const files = new Set([...initialFiles, ...projectAssets(manifest, route).map(f => '/' + f)])
    const add = raw => {
      if (!raw || /^(data:|#)/.test(raw)) return
      const url = new URL(raw, `https://simpyll.com/${htmlFile}`)
      if (url.origin !== 'https://simpyll.com') throw new Error(`${htmlFile}: unbudgeted external resource ${url.href}`)
      files.add(decodeURIComponent(url.pathname))
    }
    for (const el of document.querySelectorAll('script[src],link[rel="stylesheet"],link[rel="modulepreload"],link[rel="preload"]')) add(el.getAttribute('src') || el.getAttribute('href'))
    const groups = [...document.querySelectorAll('picture'), ...[...document.querySelectorAll('img,source')].filter(el => !el.closest('picture'))]
    for (const group of groups) {
      const elements = group.tagName.toLowerCase() === 'picture' ? [...group.querySelectorAll('source,img')] : [group]
      const candidates = new Set()
      for (const el of elements) {
        // linkedom preserves React SSR's srcSet spelling; browsers normalize it.
        const set = el.getAttribute('srcset') || el.getAttribute('srcSet')
        const urls = [el.getAttribute('src'), ...(set ? set.split(',').map(v => v.trim().split(/\s+/)[0]) : [])]
        for (const raw of urls.filter(Boolean)) {
          if (raw.startsWith('data:')) continue
          const url = new URL(raw, `https://simpyll.com/${htmlFile}`)
          if (url.origin !== 'https://simpyll.com') throw new Error(`${htmlFile}: unbudgeted external image ${url.href}`)
          candidates.add(decodeURIComponent(url.pathname))
        }
      }
      // Inspect every variant for individual limits/missing output, but charge
      // one worst-case candidate per picture, never all alternative formats.
      const variants = await Promise.all([...candidates].map(size))
      const largest = variants.sort((a,b) => b.estimated - a.estimated)[0]
      if (largest) files.add(largest.path)
    }
    for (const path of [...files]) if (path.endsWith('.css')) {
      const css = await readFile(resolve(root, '.' + path), 'utf8')
      for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) add(new URL(match[1], `https://simpyll.com${path}`).href)
    }
    const resources = await Promise.all([...files].map(size))
    const sum = predicate => resources.filter(r => predicate(r.path)).reduce((n,r) => n + r.estimated, 0)
    pages.push({ route: '/' + htmlFile.replace(/index\.html$/, '').replace(/\/$/, ''), html: gzipSync(html, { level: 9 }).length, initialJS: sum(p => p.endsWith('.js')), css: sum(p => p.endsWith('.css')), images: sum(p => media.test(p)), fonts: sum(p => font.test(p)), total: sum(() => true) + gzipSync(html, { level: 9 }).length, resources: resources.map(r => r.path) })
  }
  if (!pages.length) throw new Error('No prerendered application pages found')
  return { initialJS, routeChunks, pages, assets: [...sizes.values()] }
}
export function violations(report, budget) {
  const errors = []
  const check = (label, value, limit) => { if (!Number.isFinite(limit) || limit <= 0) throw new Error(`Invalid budget ${label}`); if (value > limit) errors.push(`${label}: ${value} bytes > ${limit} bytes`) }
  check('shared initial JS (gzip)', report.initialJS, budget.initialJS)
  for (const chunk of report.routeChunks) check(`deferred JS ${chunk.path} (gzip)`, chunk.estimated, budget.routeJS)
  for (const page of report.pages) for (const category of ['initialJS','css','images','fonts','total']) check(`${page.route || '/'} ${category}`, page[category], category === 'initialJS' ? budget.pageJS : category === 'total' && page.images ? budget.mediaTotal : budget[category])
  for (const asset of report.assets) check(`asset ${asset.path} (raw)`, asset.raw, media.test(asset.path) ? budget.individualImage : budget.individualAsset)
  return errors
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const started = performance.now()
  const report = await measureAssets(process.env.PERF_DIST || 'dist')
  await mkdir('artifacts/performance', { recursive: true })
  await writeFile('artifacts/performance/assets.json', JSON.stringify(report, null, 2))
  console.table(report.pages.map(({resources, ...page}) => page))
  if (!process.argv.includes('--measure')) {
    const budget = JSON.parse(await readFile('performance-budgets.json', 'utf8'))
    const errors = violations(report, budget)
    for (const error of errors) console.error(`BUDGET FAILED: ${error}`)
    if (errors.length) process.exitCode = 1
  }
  console.log(`Asset audit completed in ${((performance.now()-started)/1000).toFixed(3)}s; estimated gzip text, raw media/font bytes.`)
}
