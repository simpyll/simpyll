import { mkdtemp, cp, rm, writeFile, mkdir, readFile, realpath, stat, chmod } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep, extname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createServer } from 'node:http'
import { compile } from '@mdx-js/mdx'
import { id, notionClient, readBlocks, metadataFor, convertBlocks, downloadImage, safeUrl, notionImageHost } from './publisher.mjs'
import { collectArticles, resolveRegistry } from '../redirects.mjs'
const exec = promisify(execFile)
const status = page => page?.properties?.Status?.status?.name ?? page?.properties?.Status?.select?.name
const eligible = page => page && !page.archived && !page.in_trash && ['Draft', 'Ready'].includes(status(page))
const cleanEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => ['PATH', 'HOME', 'TMPDIR', 'SYSTEMROOT'].includes(key)))

export function options(args, env = process.env) {
  if (env.CI || env.GITHUB_ACTIONS) throw new Error('Draft preview is local-only; CI is forbidden')
  if (args.length !== 3 || args[0] !== '--page' || args[2] !== '--allow-unpublished') throw new Error('Usage: npm run preview:notion -- --page PAGE_ID --allow-unpublished')
  return { pageId: id(args[1]) }
}

export async function prepare({ root, api, pageId, workspace, imageDownloader = downloadImage }) {
  const key = id(pageId)
  let page
  try { page = await api(`pages/${key}`) } catch (error) { throw new Error(error.status ? `Preview authorization/read failed (HTTP ${error.status})` : 'Preview page read failed') }
  if (!eligible(page) || id(page.id) !== key) throw new Error('Select an accessible, active Draft or Ready article')
  // Do not invent an intended route or publication date for incomplete drafts.
  if (!page.properties?.Slug?.rich_text?.length || !page.properties?.['Published Date']?.date?.start) throw new Error('Preview requires Slug and Published Date; set intended metadata in Notion')
  const blocks = await readBlocks(api, key)
  const metadata = metadataFor(page, undefined, blocks)
  const claims = await collectArticles(root)
  resolveRegistry([...claims, { id: `preview:${key}`, slug: metadata.slug, status: 'published', aliases: [] }])
  metadata.articleId = `preview:${key}` // Local identity only; never touches the publisher manifest.
  let sequence = 0
  const assets = []
  const content = await convertBlocks(blocks, async block => {
    const image = block.image
    if (!['external', 'file'].includes(image.type)) throw new Error('Unsupported image type')
    const url = safeUrl(image[image.type]?.url, true)
    // Reuse production host/type/size checks. Ordinary external images stay remote.
    if (image.type === 'external' && !notionImageHost(new URL(url).hostname)) return url
    const { bytes, extension } = await imageDownloader(url)
    if (!['png', 'jpg', 'gif', 'webp', 'avif'].includes(extension)) throw new Error('Unsupported image format')
    const path = `images/preview/${++sequence}.${extension}`
    assets.push([path, bytes])
    return `/${path}`
  })
  const latest = await api(`pages/${key}`)
  if (!eligible(latest) || id(latest.id) !== key || status(latest) !== status(page) || latest.last_edited_time !== page.last_edited_time) throw new Error('Article changed during preview; retry')
  const literal = JSON.stringify(metadata).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026')
  const mdx = `export const metadata = ${literal}\n\n${content}\n`
  try { await compile(mdx) } catch { throw new Error('Preview MDX compilation failed; inspect Notion block formatting') }
  // Only the isolated copy is writable. The caller owns cleanup even on failure.
  for (const [path, bytes] of assets) {
    await mkdir(join(workspace, 'public', 'images/preview'), { recursive: true })
    await writeFile(join(workspace, 'public', path), bytes, { mode: 0o600 })
  }
  await writeFile(join(workspace, 'src/content/blog', `${metadata.slug}.mdx`), mdx, { mode: 0o600, flag: 'wx' })
  // An isolated source-only banner preserves production components and hydration.
  const component = join(workspace, 'src/pages/BlogPost.tsx')
  await writeFile(component, (await readFile(component, 'utf8')).replace('<>','<>\n      <p role="status" className="mx-auto max-w-3xl px-6 pt-24">Draft Preview — Not Published</p>'))
  return { slug: metadata.slug }
}

export async function copyWorkspace(root, workspace) {
  // A separate Git database supplies production slug history. No writable links to source.
  await exec('git', ['clone', '--local', '--no-hardlinks', '--no-checkout', root, workspace], { env: cleanEnv() })
  for (const path of ['content', 'src', 'public', 'scripts', '.notion', 'package.json', 'package-lock.json', 'performance-budgets.json', 'index.html', 'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json']) {
    await cp(join(root, path), join(workspace, path), { recursive: true, filter: async source => {
      const info = await import('node:fs/promises').then(fs => fs.lstat(source))
      if (info.isSymbolicLink()) throw new Error('Preview inputs must not contain symbolic links')
      return true
    } })
  }
  // Copy dependencies instead of exposing the source tree through a dev server.
  await cp(join(root, 'node_modules'), join(workspace, 'node_modules'), { recursive: true })
}

export function previewServer(directory) {
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2' }
  return createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'none'; frame-src 'none'; frame-ancestors 'none'; form-action 'none'")
    if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host ?? '') || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(403).end(); return }
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
      if (pathname.includes('\\') || pathname.split('/').some(p => p.startsWith('.'))) throw new Error()
      let file = resolve(directory, '.' + pathname)
      if (file !== resolve(directory) && !file.startsWith(resolve(directory) + sep)) throw new Error()
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
      file = await realpath(file)
      if (!file.startsWith(await realpath(directory) + sep)) throw new Error()
      res.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream')
      res.end(req.method === 'HEAD' ? undefined : await readFile(file))
    } catch { res.writeHead(404).end('Not found') }
  })
}

export async function privateWorkspace(operation) {
  const workspace = await mkdtemp(join(tmpdir(), 'simpyll-private-preview-'))
  try {
    await chmod(workspace, 0o700)
    return await operation(workspace)
  } finally { await rm(workspace, { recursive: true, force: true }) }
}

export async function run(args = process.argv.slice(2)) {
  const config = options(args)
  const api = notionClient(process.env.NOTION_API_TOKEN)
  const root = process.cwd()
  return privateWorkspace(async workspace => {
  let server, child
  const abort = new AbortController()
  const stop = () => { abort.abort(); if (child?.pid) { try { process.kill(-child.pid, 'SIGTERM') } catch { /* Already exited. */ } } server?.closeAllConnections(); server?.close() }
  process.once('SIGINT', stop); process.once('SIGTERM', stop)
  try {
    await copyWorkspace(root, workspace)
    if (abort.signal.aborted) return
    const { slug } = await prepare({ root, workspace, api, ...config })
    if (abort.signal.aborted) return
    const build = exec('npm', ['run', 'build'], { cwd: workspace, env: cleanEnv(), maxBuffer: 8e6, detached: true, signal: abort.signal })
    child = build.child
    try { await build; child = undefined } catch { throw new Error('Private build failed. Check metadata, links, media and block compatibility in Notion; build output is withheld to protect draft text.') }
    if (abort.signal.aborted) return
    server = previewServer(join(workspace, 'dist'))
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
    console.log(`Draft Preview — Not Published\nhttp://127.0.0.1:${server.address().port}/blog/${slug}/\nCtrl+C to stop and delete temporary content.`)
    await new Promise(resolve => server.once('close', resolve))
  } finally {
    stop()
    process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop)
  }
  })
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run().catch(error => { const safe = /^(NOTION_API_TOKEN is required|Invalid Notion ID|Preview authorization\/read failed \(HTTP \d+\)|Preview page read failed|Draft preview is local-only; CI is forbidden|Usage:)/.test(error.message) ? error.message + '. ' : ''; console.error(safe + 'Private preview failed. Verify credentials, explicit page selection, Draft/Ready status, required Slug/Published Date, metadata, route conflicts and supported blocks. No draft output was published.'); process.exitCode = 1 })
}
