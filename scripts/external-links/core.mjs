import { compile } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import { literal } from '../validate-content.mjs'
import { lookup as dnsLookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'
import http from 'node:http'
import https from 'node:https'
import { createHash } from 'node:crypto'

// Queries are excluded entirely: redacting only reports would still transmit secrets.
export function normalize(value) {
  if (typeof value !== 'string' || /[\s\\\u0000-\u001f\u007f]/u.test(value)) return null
  try {
    const u = new URL(value)
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.search || u.port || u.hostname === 'simpyll.com' || u.hostname.endsWith('.simpyll.com')) return null
    u.hash = ''
    return u.href
  } catch { return null }
}
export async function extractArticle(source, file, slug) {
  let tree
  await compile(source, { remarkPlugins: [remarkGfm, () => node => { tree = node }] })
  let metadata
  for (const node of tree.children.filter(n => n.type === 'mdxjsEsm')) for (const statement of node.data.estree.body) {
    if (statement.type === 'ExportNamedDeclaration') for (const declaration of statement.declaration?.declarations ?? []) if (declaration.id.name === 'metadata') metadata = literal(declaration.init)
  }
  if (!metadata || metadata.draft === true || metadata.published === false || metadata.test === true || (metadata.status && metadata.status !== 'published')) return []
  const definitions = new Map(), result = []
  function walk(node, fn) { fn(node); for (const child of node.children ?? []) walk(child, fn) }
  walk(tree, n => { if (n.type === 'definition') definitions.set(n.identifier, n.url) })
  walk(tree, n => {
    let value
    if (n.type === 'link') value = n.url
    if (n.type === 'linkReference') value = definitions.get(n.identifier)
    if (['mdxJsxFlowElement', 'mdxJsxTextElement'].includes(n.type)) {
      const attribute = n.attributes?.find(a => ['href', 'to'].includes(a.name) || (a.name === 'src' && ['Embed', 'Video'].includes(n.name)))
      value = attribute?.value
      if (value?.type === 'mdxJsxAttributeValueExpression') { try { value = literal(value.data.estree.body[0]?.expression) } catch { value = null } }
    }
    const url = normalize(value)
    if (url) result.push({ url, source: file, slug, line: n.position?.start?.line ?? 0 })
  })
  return result
}
export function deduplicate(items) {
  const map = new Map()
  for (const item of items) { if (!map.has(item.url)) map.set(item.url, []); map.get(item.url).push({ source: item.source, slug: item.slug, line: item.line }) }
  return [...map].sort(([a], [b]) => a.localeCompare(b)).map(([url, sources]) => ({ url, sources }))
}
const blocked4 = new BlockList(), blocked6 = new BlockList()
for (const [address, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]]) blocked4.addSubnet(address, prefix, 'ipv4')
for (const [address, prefix] of [['::',128],['::1',128],['::ffff:0:0',96],['64:ff9b::',96],['64:ff9b:1::',48],['100::',64],['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20],['fc00::',7],['fe80::',10],['ff00::',8]]) blocked6.addSubnet(address, prefix, 'ipv6')
const globalV6 = new BlockList(); globalV6.addSubnet('2000::', 3, 'ipv6')
export function publicAddress(address) {
  const family = isIP(address)
  if (!family) return false
  const type = family === 4 ? 'ipv4' : 'ipv6'
  return !(family === 4 ? blocked4 : blocked6).check(address, type) && (family === 4 || globalV6.check(address, 'ipv6'))
}
export async function resolvePublic(hostname, resolver = dnsLookup) {
  const host = hostname.replace(/^\[|\]$/g, '')
  const answers = isIP(host) ? [{ address: host, family: isIP(host) }] : await resolver(host, { all: true, verbatim: true })
  if (!answers.length || answers.some(a => !publicAddress(a.address))) throw new Error('non-public destination')
  return answers[0]
}
export function requestOnce(url, address, method, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url), request = (u.protocol === 'https:' ? https : http).request(u, {
      method, agent: false, family: address.family, timeout, headers: { 'User-Agent': 'Simpyll-Link-Monitor/1.0 (+https://simpyll.com)', Accept: '*/*' },
      lookup: (_host, _options, callback) => callback(null, address.address, address.family),
    }, response => {
      clearTimeout(deadline)
      const result = { status: response.statusCode, location: response.headers.location, retryAfter: response.headers['retry-after'] }
      response.destroy(); resolve(result)
    })
    const deadline = setTimeout(() => request.destroy(new Error('timeout')), timeout)
    request.on('timeout', () => request.destroy(new Error('timeout')))
    request.on('error', error => { clearTimeout(deadline); reject(error) }); request.end()
  })
}
export async function check(url, options = {}) {
  const resolveHost = options.resolveHost ?? resolvePublic, request = options.request ?? requestOnce
  const seen = new Set(); let current = url, permanent = false
  try {
    for (let hop = 0; hop <= 5; hop++) {
      if (seen.has(current)) return { status: 'potential', detail: 'redirect loop' }
      seen.add(current)
      const u = new URL(current)
      let address
      try {
        let timer
        try { address = await Promise.race([resolveHost(u.hostname), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('dns timeout')), options.timeout ?? 10000) })]) } finally { clearTimeout(timer) }
      } catch (error) { return { status: error.message === 'non-public destination' || error.message === 'dns timeout' ? 'inconclusive' : 'potential', detail: error.message === 'non-public destination' ? 'blocked destination' : 'DNS failure or timeout' } }
      let response = await request(current, address, 'HEAD', options.timeout)
      if ([405, 501].includes(response.status)) response = await request(current, address, 'GET', options.timeout)
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (!response.location || hop === 5) return { status: 'potential', detail: 'invalid or excessive redirects' }
        const target = normalize(new URL(response.location, current).href)
        if (!target) return { status: 'potential', detail: 'unsafe or excluded redirect' }
        permanent ||= [301, 308].includes(response.status); current = target; continue
      }
      const code = response.status
      if (code >= 200 && code < 300) return { status: permanent ? 'redirect' : 'healthy', detail: `HTTP ${code}`, destination: permanent ? current : undefined }
      if ([404, 410].includes(code)) return { status: 'broken', detail: `HTTP ${code}` }
      if (code === 403 || code === 429 || code === 408) return { status: 'inconclusive', detail: `HTTP ${code}` }
      return { status: code >= 500 ? 'potential' : 'inconclusive', detail: `HTTP ${code}` }
    }
  } catch (error) { return { status: 'inconclusive', detail: error.message === 'non-public destination' ? 'blocked destination' : 'network error or timeout' } }
}
export const keyFor = url => createHash('sha256').update(url).digest('hex')
export function compare(items, previous = {}) {
  const state = {}, results = []
  for (const item of items) {
    const key = keyFor(item.url), actionable = ['broken', 'potential', 'redirect'].includes(item.result.status)
    const count = actionable && previous[key]?.status === item.result.status ? Math.min(100, previous[key].count + 1) : actionable ? 1 : 0
    state[key] = { status: item.result.status, count }
    results.push({ ...item, persistent: count >= 2, recovered: !!previous[key]?.count && !actionable })
  }
  return { state, results }
}
