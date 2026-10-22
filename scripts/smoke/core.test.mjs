import { test } from 'node:test'
import assert from 'node:assert/strict'
import { request, waitForIdentity, validateHtml, validateUnknown, validateSitemap, browserError } from './core.mjs'
const origin = 'https://simpyll.com'
const article = { path: '/blog/example', title: 'Example', body: 'Unique article text' }
const html = `<html><head><link rel="canonical" href="${origin}${article.path}"></head><body><div id="root"><main><article><h1>Example</h1><div class="prose">Unique article text</div></article></main></div></body></html>`
test('healthy prerendered article passes', () => validateHtml(html, article, origin))
for (const [name, value] of [
  ['homepage masquerading as article', html.replace('<h1>Example</h1>', '<h1>Home</h1>')],
  ['empty body', html.replace('Unique article text', '')],
  ['wrong article-specific content', html.replace('Unique article text', 'Other article text')],
  ['incorrect canonical', html.replace(`${origin}${article.path}`, origin)],
  ['empty shell', '<div id="root"></div>'],
]) test(name, () => assert.throws(() => validateHtml(value, article, origin), /Expected:.*Actual:/))
test('valid unknown-route fallback, including static host 200', () => validateUnknown('<head><meta name="robots" content="noindex"></head><h1>Page not found.</h1><a href="/blog">Journal</a>'))
test('homepage is rejected as unknown-route fallback', () => assert.throws(() => validateUnknown(html), /incorrect fallback/))
test('sitemap validates XML and required routes', () => {
  validateSitemap(`<urlset><url><loc>${origin}${article.path}</loc></url></urlset>`, [article], origin)
  for (const xml of ['<urlset><url></urlset>', '<html/>', '<urlset><url><loc>http://localhost/blog/example</loc></url></urlset>']) assert.throws(() => validateSitemap(xml, [article], origin), /Expected:/)
})
test('bounded same-host redirects and loops', async () => {
  assert.equal((await request(origin, { fetcher: async url => url.endsWith('/') ? new Response('ok') : new Response('', { status: 301, headers: { location: '/' } }) })).status, 200)
  await assert.rejects(request(origin, { fetcher: async () => new Response('', { status: 302, headers: { location: '/' } }) }), /redirect loop/)
  await assert.rejects(request(origin, { fetcher: async () => new Response('', { status: 302, headers: { location: 'https://elsewhere.com' } }) }), /redirect stays/)
})
test('request timeout signal is passed and network failures surface', async () => {
  await assert.rejects(request(origin, { timeout: 1, fetcher: async (_, options) => { assert.ok(options.signal); throw new Error('network timeout') } }), /network timeout/)
})
test('temporary stale release retries with capped exponential backoff', async () => {
  let calls = 0; const delays = []
  const result = await waitForIdentity(async () => ({ sha: ++calls < 4 ? 'old' : 'new' }), 'new', { initial: 2, cap: 3, sleep: async ms => delays.push(ms) })
  assert.equal(result.sha, 'new'); assert.deepEqual(delays, [2, 3, 3])
})
test('persistent stale release exhausts bounded retries', async () => {
  await assert.rejects(waitForIdentity(async () => ({ sha: 'old' }), 'new', { attempts: 2, sleep: async () => {} }), /exhausted 2.*new.*old/)
})
test('temporary network failure recovers; persistent failure reports evidence', async () => {
  let calls = 0
  assert.equal((await waitForIdentity(async () => { if (++calls === 1) throw new Error('TLS unavailable'); return { sha: 'new' } }, 'new', { sleep: async () => {} })).sha, 'new')
  await assert.rejects(waitForIdentity(async () => { throw new Error('DNS unavailable') }, 'new', { attempts: 2, sleep: async () => {} }), /exhausted 2.*DNS unavailable/)
})
test('fatal browser exceptions and hydration errors fail; harmless warnings do not', () => {
  assert.equal(browserError('pageerror', 'ReferenceError'), true)
  assert.equal(browserError('console', 'hydration failed'), true)
  assert.equal(browserError('warning', 'deprecated'), false)
  assert.equal(browserError('resource', 'third party', false), false)
})
test('permanent metadata failures do not consume propagation retries', async () => {
  let calls = 0
  await assert.rejects(waitForIdentity(async () => { calls++; throw Object.assign(new Error('HTTP 403 forbidden'), { fatal: true }) }, 'new', { sleep: async () => {} }), /403 forbidden/)
  assert.equal(calls, 1)
})
test('invalid retry configuration cannot create an unbounded wait', async () => {
  await assert.rejects(waitForIdentity(async () => ({}), 'new', { attempts: Infinity }), /1–10/)
  await assert.rejects(waitForIdentity(async () => ({}), 'new', { initial: Infinity }), /backoff/)
})
test('real browser event collector detects JS exceptions, hydration and missing required assets', async () => {
  const { EventEmitter } = await import('node:events')
  const { collectBrowserErrors } = await import('./core.mjs')
  const page = new EventEmitter()
  const errors = collectBrowserErrors(page, origin)
  page.emit('console', { type: () => 'warning', text: () => 'harmless browser warning' })
  const resource = (url, type) => ({ url: () => url, resourceType: () => type, failure: () => ({ errorText: 'ERR_CONNECTION_RESET' }) })
  page.emit('requestfailed', resource('https://third-party.example/analytics.js', 'script'))
  assert.equal(errors.length, 0)
  page.emit('pageerror', new Error('Fixture JS exception'))
  page.emit('console', { type: () => 'error', text: () => 'hydration failed' })
  page.emit('requestfailed', resource(`${origin}/assets/missing.js`, 'script'))
  page.emit('response', { request: () => resource(`${origin}/assets/app.js`, 'script'), status: () => 200, headers: () => ({ 'content-type': 'text/html' }), url: () => `${origin}/assets/app.js` })
  assert.equal(errors.length, 4)
  assert.match(errors[0], /Fixture JS exception/)
  assert.match(errors[2], /missing.js.*ERR_CONNECTION_RESET/)
  assert.match(errors[3], /app.js.*200 text\/html/)
})
test('stalled HTTP response is aborted by the real request deadline', async () => {
  const { createServer } = await import('node:http')
  const server = createServer(() => {})
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    await assert.rejects(request(`http://127.0.0.1:${server.address().port}/stalled`, { timeout: 25 }), /timeout|aborted/i)
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
})
test('redirect chain cannot exceed configured hop limit', async () => {
  let calls = 0
  await assert.rejects(request(origin, { redirects: 2, fetcher: async () => new Response('', { status: 302, headers: { location: `/hop-${++calls}` } }) }), /limit exceeded/)
  assert.equal(calls, 3)
})
