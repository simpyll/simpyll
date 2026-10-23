import { readFile, writeFile, readdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { inspectHtml, normalize, requireCheck } from './core.mjs'
const routes = []
for (const path of ['/', '/blog', '/about', ...(await readdir('src/content/blog')).filter(x => x.endsWith('.mdx')).map(x => `/blog/${x.slice(0, -4)}`)]) {
  const doc = inspectHtml(await readFile(`dist${path === '/' ? '' : path}/index.html`, 'utf8'))
  const body = normalize(doc.querySelector('article .prose')?.textContent ?? '')
  if (path.startsWith('/blog/')) requireCheck(body.length > 0, `${path} rendered article body`, 'empty')
  routes.push({ path, title: normalize(doc.querySelector('h1').textContent), ...(body ? { body: body.slice(0, 100), date: (doc.querySelector('time')?.getAttribute('dateTime') ?? doc.querySelector('time')?.getAttribute('datetime')) } : {}) })
}
let sha
try { sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() }
catch { sha = process.env.SMOKE_BUILD_SHA } // Isolated fixture copies have no .git directory.
requireCheck(/^[a-f0-9]{40}$/.test(sha ?? ''), 'checked-out SHA or explicit fixture SMOKE_BUILD_SHA', sha ?? 'unversioned source')
const metadata = { sha, builtAt: new Date().toISOString(), buildId: process.env.GITHUB_RUN_ID ?? 'local', origin: 'https://simpyll.com', rss: null, routes }
await writeFile('dist/deployment.json', JSON.stringify(metadata, null, 2) + '\n')
