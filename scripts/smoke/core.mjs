import { parseHTML } from 'linkedom'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
export const normalize = value => value.replace(/\s+/gu, ' ').trim()
export function requireCheck(condition, expected, actual) {
  if (!condition) throw new Error(`Expected: ${expected}; Actual: ${actual}`)
}
export function inspectHtml(html) {
  const { document } = parseHTML(html)
  return document
}
export function validateHtml(html, route, origin) {
  const doc = inspectHtml(html)
  requireCheck(doc.querySelector('#root main'), 'prerendered application main', 'missing/empty shell')
  const title = normalize(doc.querySelector('h1')?.textContent ?? '')
  requireCheck(title === route.title, `h1 ${route.title}`, title)
  const canonicals = [...doc.querySelectorAll('link[rel="canonical"]')].map(x => x.getAttribute('href'))
  requireCheck(canonicals.length === 1 && canonicals[0] === origin + route.path, `one canonical ${origin + route.path}`, canonicals.join(', '))
  if (route.body) {
    const body = normalize(doc.querySelector('article .prose')?.textContent ?? '')
    requireCheck(body.includes(route.body), `article-specific body: ${route.body}`, body.slice(0, 180) || 'empty article')
  }
  requireCheck(!/Something went wrong|Unable to load this page/i.test(doc.querySelector('main')?.textContent ?? ''), 'no fatal error screen', 'error screen')
  return doc
}
export function validateUnknown(html) {
  const doc = inspectHtml(html)
  requireCheck(normalize(doc.querySelector('h1')?.textContent ?? '') === 'Page not found.', 'Page not found.', 'incorrect fallback')
  requireCheck(!doc.querySelector('link[rel="canonical"]') && doc.querySelector('meta[name="robots"]')?.getAttribute('content')?.includes('noindex'), 'no canonical and noindex', 'incorrect missing-page SEO')
  requireCheck(doc.querySelector('a[href="/blog"]'), 'journal recovery link', 'missing recovery')
}
export function validateSitemap(xml, routes, origin) {
  requireCheck(XMLValidator.validate(xml) === true, 'valid sitemap XML', 'invalid XML')
  const parsed = new XMLParser().parse(xml)
  const entries = parsed.urlset?.url
  const urls = (Array.isArray(entries) ? entries : [entries]).filter(Boolean).map(x => x.loc)
  requireCheck(urls.length && urls.every(x => { try { return new URL(x).origin === origin && !/[\s<>]/.test(x) } catch { return false } }), 'production sitemap URLs', JSON.stringify(urls))
  for (const route of routes) requireCheck(urls.includes(origin + route.path), `sitemap includes ${route.path}`, 'missing URL')
}
export async function request(url, { fetcher = fetch, timeout = 10000, redirects = 5 } = {}) {
  const seen = new Set()
  const origin = new URL(url).origin
  const signal = AbortSignal.timeout(timeout)
  for (let i = 0; i <= redirects; i++) {
    requireCheck(!seen.has(url), 'no redirect loop', url)
    seen.add(url)
    const response = await fetcher(url, { redirect: 'manual', signal, headers: { 'cache-control': 'no-cache' } })
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      requireCheck(response.headers.get('location'), 'redirect Location header', 'missing')
      const next = new URL(response.headers.get('location'), url)
      requireCheck(next.origin === origin, `redirect stays on ${origin}`, next.href)
      url = next.href
      continue
    }
    return { status: response.status, type: response.headers.get('content-type') ?? '', text: await response.text(), url }
  }
  throw new Error(`Expected at most ${redirects} redirects; Actual: limit exceeded ${url}`)
}
export async function waitForIdentity(probe, expected, { attempts = 6, initial = 5000, cap = 30000, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), onAttempt = () => {} } = {}) {
  requireCheck(Number.isInteger(attempts) && attempts > 0 && attempts <= 10, '1–10 attempts', attempts)
  requireCheck(initial >= 0 && initial <= 30000 && cap >= 0 && cap <= 30000, 'backoff in 0–30000ms', `${initial}/${cap}`)
  let last
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      last = await probe()
      onAttempt({ attempt, observed: last.sha })
      if (!expected || last.sha === expected) return last
    } catch (error) {
      last = { error: `${error.message}${error.cause?.code ? ` (${error.cause.code})` : ''}` }; onAttempt({ attempt, ...last })
      if (error.fatal) throw error
    }
    if (attempt < attempts) await sleep(Math.min(cap, initial * 2 ** (attempt - 1)))
  }
  throw new Error(`Deployment identity exhausted ${attempts} attempts; expected ${expected ?? 'current published identity'}; actual ${JSON.stringify(last)}`)
}
export function browserError(type, message, sameOrigin = true) {
  return type === 'pageerror' || (sameOrigin && (type === 'resource' || type === 'console' && /hydration|hydrating|Minified React error|uncaught/i.test(message)))
}

// Shared by production Playwright and event fixtures: do not duplicate error policy.
export function collectBrowserErrors(page, origin) {
  const errors = []
  page.on('pageerror', error => errors.push(`Uncaught exception: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error' && browserError('console', message.text())) errors.push(message.text())
  })
  const critical = request => new URL(request.url()).origin === origin && ['script', 'stylesheet', 'image', 'font'].includes(request.resourceType())
  page.on('requestfailed', request => {
    if (critical(request) && !/ERR_ABORTED/.test(request.failure()?.errorText ?? '')) errors.push(`${request.url()}: ${request.failure()?.errorText}`)
  })
  page.on('response', response => {
    if (critical(response.request()) && (response.status() >= 400 || /text\/html/.test(response.headers()['content-type'] ?? ''))) errors.push(`${response.url()}: HTTP ${response.status()} ${response.headers()['content-type']}`)
  })
  return errors
}
