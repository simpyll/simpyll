import { readFile, mkdir, writeFile, appendFile } from 'node:fs/promises'
import { request, requireCheck, validateHtml, validateSitemap, validateUnknown, waitForIdentity } from './core.mjs'
const base = (process.env.SMOKE_BASE_URL ?? 'https://simpyll.com').replace(/\/$/, '')
requireCheck(new URL(base).protocol === 'https:' || /^http:\/\/(127\.0\.0\.1|localhost)(:|$)/.test(base), 'HTTPS or local fixture server', base)
const expected = process.env.SMOKE_EXPECTED_SHA
const report = { base, expected, timestamp: new Date().toISOString(), attempts: [], checks: [] }
async function check(path, label, validate) {
  const record = { url: base + path, check: label }
  report.checks.push(record)
  try {
    let response
    // One short retry for transient transport/gateway failures; content defects fail directly.
    for (let attempt = 1; attempt <= 2; attempt++) {
      record.attempts = attempt
      try {
        response = await request(record.url)
        if (attempt === 1 && [404, 408, 429, 500, 502, 503, 504].includes(response.status)) { await new Promise(resolve => setTimeout(resolve, 1000)); continue }
        break
      } catch (error) { if (attempt === 2) throw error; await new Promise(resolve => setTimeout(resolve, 1000)) }
    }
    record.status = response.status; await validate(response); record.result = 'passed'; return response
  }
  catch (error) { record.result = 'failed'; record.error = `${error.message}${error.cause?.code ? ` (${error.cause.code})` : ''}`; throw error }
}
function ok(response, type) {
  requireCheck(response.status === 200, 'HTTP 200', response.status)
  requireCheck(type.test(response.type), `content-type ${type}`, response.type)
  requireCheck(response.text.length > 0, 'nonempty response', 'empty')
}
try {
  const observed = await waitForIdentity(async () => {
    const response = await request(`${base}/deployment.json?verify=${Date.now()}`)
    if (response.status !== 200) {
      const error = new Error(`Expected deployment metadata HTTP 200; Actual: HTTP ${response.status}`)
      error.fatal = ![404, 408, 429, 500, 502, 503, 504].includes(response.status)
      throw error
    }
    try { ok(response, /application\/json/) } catch (error) { error.fatal = true; throw error }
    let identity
    try { identity = JSON.parse(response.text) } catch { const error = new Error('Expected deployment JSON; Actual: malformed metadata'); error.fatal = true; throw error }
    if (!/^[a-f0-9]{40}$/.test(identity.sha)) { const error = new Error(`Expected valid deployment SHA; Actual: ${identity.sha}`); error.fatal = true; throw error }
    return identity
  }, expected, { initial: Number(process.env.SMOKE_INITIAL_DELAY_MS ?? 5000), onAttempt: attempt => { report.attempts.push(attempt); if (attempt.observed) report.observed = attempt.observed; console.log('Identity', attempt) } })
  report.observed = observed.sha
  // Deploy checks use local build expectations, never trust stale public article metadata.
  const manifest = process.env.SMOKE_MANIFEST ? JSON.parse(await readFile(process.env.SMOKE_MANIFEST, 'utf8')) : observed
  requireCheck(manifest.origin === 'https://simpyll.com', 'production canonical origin https://simpyll.com', manifest.origin)
  requireCheck(!expected || manifest.sha === expected, `manifest SHA ${expected}`, manifest.sha)
  requireCheck(manifest.routes?.some(x => x.body), 'at least one published article', 'none')
  report.routes = manifest.routes
  const assets = new Map()
  for (const route of manifest.routes) {
    await check(route.path, 'rendered HTML / canonical / content', response => {
      ok(response, /text\/html/)
      const doc = validateHtml(response.text, route, manifest.origin)
      requireCheck(doc.querySelector('script[src]') && doc.querySelector('link[rel="stylesheet"]'), 'required JavaScript and CSS references', 'missing application assets')
      if (route.path === '/blog') for (const article of manifest.routes.filter(x => x.body)) requireCheck(doc.querySelector(`a[href="${article.path}"]`), `blog link ${article.path}`, 'missing')
      for (const node of doc.querySelectorAll('script[src],link[rel="stylesheet"],img[src]')) {
        const src = node.getAttribute('src') ?? node.getAttribute('href')
        const url = new URL(src, base)
        if (url.origin === base) assets.set(url.pathname, node.localName === 'script' ? /javascript/ : node.localName === 'link' ? /text\/css/ : /image\//)
      }
    })
  }
  await check('/sitemap.xml', 'sitemap XML and canonical routes', response => { ok(response, /xml/); validateSitemap(response.text, manifest.routes, manifest.origin) })
  if (manifest.rss) await check(manifest.rss, 'RSS', response => { ok(response, /xml|rss/); requireCheck(/<rss|<feed/.test(response.text), 'RSS/Atom feed', 'wrong document') })
  else report.rss = 'Not implemented; skipped'
  await check('/blog/__production-smoke-missing__', 'unknown route and recovery', response => { requireCheck([200, 404].includes(response.status), 'HTTP 404 or legitimate static fallback 200', response.status); validateUnknown(response.text) })
  // Bundles are few; unique article images are capped to keep probes lightweight.
  let images = 0
  for (const [path, type] of assets) {
    if (type.source === 'image\\/' && images++ >= 3) continue
    await check(path, 'required asset', response => { ok(response, type); requireCheck(!/^\s*(<!doctype html|<html)/i.test(response.text), 'asset bytes, not fallback HTML', 'HTML') })
  }
  await check('/deployment.json', 'identity remained stable throughout checks', response => { ok(response, /json/); requireCheck(JSON.parse(response.text).sha === observed.sha, `unchanged SHA ${observed.sha}`, 'deployment changed; rerun against current release') })
  report.result = 'passed'
} catch (error) {
  report.result = 'failed'; report.error = error.message; process.exitCode = 1
  if (!expected && report.observed) {
    // A scheduled read-only run must not blame a release replaced during its probe.
    try {
      const current = JSON.parse((await request(`${base}/deployment.json?final=${Date.now()}`)).text)
      if (current.sha !== report.observed && /^[a-f0-9]{40}$/.test(current.sha)) {
        report.result = 'superseded'; report.error = `Release changed from ${report.observed} to ${current.sha}; next scheduled/manual run verifies the replacement.`; process.exitCode = 0
      }
    } catch { /* Keep the original failure if release identity is unavailable. */ }
  }
}
await mkdir('artifacts/production', { recursive: true })
await writeFile('artifacts/production/http.json', JSON.stringify(report, null, 2))
const summary = `## Production verification: ${report.result}\n\nPages deployment and public verification are separate outcomes.\n\nDomain: ${base}\nExpected SHA: ${expected ?? 'scheduled current release'}\nObserved SHA: ${report.observed ?? 'unavailable'}\nTimestamp: ${report.timestamp}\nIdentity endpoint: ${base}/deployment.json\nIdentity attempts: ${report.attempts.length} (${report.attempts.map(x => `${x.attempt}: ${x.observed ?? x.error}`).join('; ')})\nRSS: ${report.rss ?? 'see checks'}\n\n| URL | Check | HTTP | Attempts | Result |\n|---|---|---|---|---|\n${report.checks.map(x => `| ${x.url} | ${x.check} | ${x.status ?? 'network error'} | ${x.attempts} | ${x.result}: ${(x.error ?? '').replaceAll('|', '/')} |`).join('\n')}\n\n${report.error ?? ''}\n`
console.log(summary)
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary)
