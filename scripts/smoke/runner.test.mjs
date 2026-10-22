import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
const origin = 'https://simpyll.com'
const sha = 'a'.repeat(40)
const routes = [{ path: '/', title: 'Home' }, { path: '/blog', title: 'Journal' }, { path: '/blog/new', title: 'New article', body: 'New article unique body' }]
function html(route) {
  return `<html><head><link rel="canonical" href="${origin}${route.path}"><script src="/assets/app.js"></script><link rel="stylesheet" href="/assets/app.css"></head><body><div id="root"><main><h1>${route.title}</h1><a href="/blog/new">New article</a>${route.body ? `<article><div class="prose">${route.body}</div></article>` : ''}</main></div></body></html>`
}
const script = fileURLToPath(new URL('./run.mjs', import.meta.url))
for (const scenario of ['healthy', 'unknown 200', 'home 500', 'blog 404', 'article 404', 'false 200', 'empty article', 'missing content', 'missing JS', 'missing script reference', 'JS is HTML', 'bad canonical', 'missing sitemap', 'invalid XML']) {
  test(`real HTTP runner: ${scenario}`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'simpyll-smoke-'))
    const server = createServer((req, res) => {
      const path = new URL(req.url, 'http://localhost').pathname
      let status = 200; let type = 'text/html'; let body
      if (path === '/deployment.json') { type = 'application/json'; body = JSON.stringify({ sha, origin, routes, rss: null }) }
      else if (path === '/sitemap.xml') { type = 'application/xml'; body = `<urlset>${routes.map(x => `<url><loc>${origin}${x.path}</loc></url>`).join('')}</urlset>`; if (scenario === 'missing sitemap') status = 404; if (scenario === 'invalid XML') body = '<urlset><url></urlset>' }
      else if (path === '/assets/app.js') { type = 'application/javascript'; body = 'console.log("ok")'; if (scenario === 'missing JS') status = 404; if (scenario === 'JS is HTML') { type = 'text/html'; body = html(routes[0]) } }
      else if (path === '/assets/app.css') { type = 'text/css'; body = 'body {color:black}' }
      else if (routes.some(x => x.path === path)) {
        body = html(routes.find(x => x.path === path))
        if (scenario === 'missing script reference') body = body.replace('<script src="/assets/app.js"></script>', '')
        if (scenario === 'home 500' && path === '/') status = 500
        if (scenario === 'blog 404' && path === '/blog') status = 404
        if (path === '/blog/new') {
          if (scenario === 'article 404') status = 404
          if (scenario === 'false 200') body = html(routes[0])
          if (scenario === 'empty article') body = body.replace('New article unique body', '')
          if (scenario === 'missing content') body = body.replace('New article unique body', 'Different article body')
          if (scenario === 'bad canonical') body = body.replace(origin + '/blog/new', origin)
        }
      } else { status = 404; body = '<html><head><meta name="robots" content="noindex"></head><body><h1>Page not found.</h1><a href="/blog">Journal</a></body></html>' }
      if (scenario === 'unknown 200' && path.includes('__production-smoke-missing__')) status = 200
      res.writeHead(status, { 'content-type': type }); res.end(body)
    })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    try {
      const child = spawn(process.execPath, [script], { cwd: directory, env: { ...process.env, GITHUB_STEP_SUMMARY: '', SMOKE_BASE_URL: `http://127.0.0.1:${server.address().port}`, SMOKE_EXPECTED_SHA: sha, SMOKE_INITIAL_DELAY_MS: '0', SMOKE_MANIFEST: '' }, stdio: 'ignore' })
      const code = await new Promise(resolve => child.on('exit', resolve))
      const report = JSON.parse(await readFile(join(directory, 'artifacts/production/http.json'), 'utf8'))
      assert.equal(code, ['healthy', 'unknown 200'].includes(scenario) ? 0 : 1, report.error)
      if (!['healthy', 'unknown 200'].includes(scenario)) {
        const failure = report.checks.find(x => x.result === 'failed')
        assert.ok(failure?.url); assert.match(failure.error, /Expected:.*Actual:/)
        assert.equal(report.observed, sha)
      }
    } finally { await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }) }
  })
}
