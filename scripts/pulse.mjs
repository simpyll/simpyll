/** Public export is a projection, never a serialization of the audit objects. */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { auditSeo } from './seo-audit.mjs'
import { collectArticles, readMetadata } from './redirects.mjs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const compare = (a,b) => a < b ? -1 : a > b ? 1 : 0
const severity = value => value === 'Critical' ? 'critical' : value === 'High' || value === 'Medium' ? 'warning' : 'informational'
const category = code => /title|description|social|registry/.test(code) ? 'Metadata' : /canonical|redirect/.test(code) ? 'Canonicals' : /sitemap|robots/.test(code) ? 'Sitemap & indexing' : /schema|jsonld/.test(code) ? 'Structured data' : /heading|h1|static/.test(code) ? 'Content structure' : /image/.test(code) ? 'Images' : 'Internal links'
/** @returns {import('../src/pulse/data').PulseSnapshot} */
export function projectPublic(audit, registry, reportDate) {
  const pages = audit.pages.filter(p => p.indexable)
  const publicRoutes = new Set(pages.map(p => p.route))
  const articles = registry.filter(a => a.status === 'published' && publicRoutes.has(`/blog/${a.slug}`)).map(a => {
    const m = a.metadata
    return { route: `/blog/${a.slug}`, title: m.title, category: m.category ?? 'Uncategorized', tags: [...new Set(m.tags ?? [])].sort(compare), published: m.date, updates: [...new Set([...(m.revisions ?? []).map(r => r.date), ...(m.corrections ?? []).map(r => r.date), ...(m.updatedAt && m.updatedAt > m.date ? [m.updatedAt] : [])])].filter(d => d >= m.date).sort(compare) }
  }).sort((a,b) => compare(a.route,b.route))
  const routes = new Set(articles.map(a => a.route))
  const edges = pages.filter(p => routes.has(p.route)).flatMap(p => p.contextualOutbound.filter(to => routes.has(to) && to !== p.route).map(to => ({ from: p.route, to }))).sort((a,b) => compare(a.from,b.from) || compare(a.to,b.to))
  const categories = ['Metadata','Canonicals','Sitemap & indexing','Structured data','Content structure','Images','Internal links'].map(name => ({ name, critical: 0, warning: 0, informational: 0 }))
  for (const issue of audit.issues.filter(i => publicRoutes.has(i.route))) categories.find(c => c.name === category(issue.code))[severity(issue.severity)]++
  const snapshot = { schemaVersion: 1, reportDate, indexablePages: pages.length, articles, edges, health: categories, analytics: { searchConsole: { status: 'unavailable' }, ga4: { status: 'unavailable' } } }
  validatePublic(snapshot)
  return snapshot
}
export function validatePublic(s) {
  const keys = (o, allowed) => { if (!o || typeof o !== 'object' || Array.isArray(o) || Object.keys(o).sort().join() !== [...allowed].sort().join()) throw new Error('Unexpected public fields') }
  const count = n => { if (!Number.isSafeInteger(n) || n < 0) throw new Error('Invalid public count') }
  const date = d => { if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Date.parse(d)) || new Date(d).toISOString().slice(0,10) !== d) throw new Error('Invalid public date') }
  keys(s,['schemaVersion','reportDate','indexablePages','articles','edges','health','analytics'])
  if (s.schemaVersion !== 1) throw new Error('Unsupported Pulse schema')
  date(s.reportDate); count(s.indexablePages)
  const routes = new Set()
  for (const a of s.articles) {
    keys(a,['route','title','category','tags','published','updates'])
    if (!/^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.route) || routes.has(a.route)) throw new Error('Invalid public article route')
    routes.add(a.route)
    if (![a.title,a.category,...a.tags].every(t => typeof t === 'string' && t.trim())) throw new Error('Invalid public article text')
    date(a.published); a.updates.forEach(date)
  }
  for (const e of s.edges) { keys(e,['from','to']); if (!routes.has(e.from) || !routes.has(e.to) || e.from === e.to) throw new Error('Invalid public edge') }
  for (const h of s.health) { keys(h,['name','critical','warning','informational']); if (typeof h.name !== 'string') throw new Error('Invalid health name'); [h.critical,h.warning,h.informational].forEach(count) }
  keys(s.analytics,['searchConsole','ga4'])
  for (const a of Object.values(s.analytics)) { keys(a,['status']); if (a.status !== 'unavailable') throw new Error('Google data requires a new reviewed schema') }
  return s
}
const fixes = code => /title|description|registry/.test(code) ? 'Correct the authoritative MDX/Notion metadata or shared SEO template; rebuild and inspect rendered output.' : /fragment/.test(code) ? 'Update the source anchor to an existing target ID; preserve established heading permalinks.' : /link|orphan/.test(code) ? 'Review source links against canonical public routes. Add contextual links only when useful to readers.' : /schema|jsonld/.test(code) ? 'Correct shared structured-data generation to match visible page content and authoritative metadata.' : /sitemap|robots|canonical|redirect/.test(code) ? 'Correct the route inventory, redirect registry or shared indexing configuration, then regenerate output.' : 'Inspect the rendered element and its source template; correct the reported structure and rerun the audit.'
/** @returns {import('../src/pulse/audit').PrivatePulseReport} */
export function privateReport(audit, baseline = null) {
  const previous = new Set((baseline?.findings ?? []).map(i => i.id))
  const findings = audit.issues.map(i => ({ id: createHash('sha256').update(JSON.stringify([i.route,i.code,i.evidence])).digest('hex').slice(0,16), rule: i.code, severity: severity(i.severity), route: i.route, field: i.code, gate: i.level ?? 'warning', explanation: i.evidence, remediation: fixes(i.code), status: baseline ? undefined : 'baseline' })).map(i => ({ ...i, status: baseline ? previous.has(i.id) ? 'existing' : 'new' : 'baseline' })).sort((a,b) => ['critical','warning','informational'].indexOf(a.severity)-['critical','warning','informational'].indexOf(b.severity) || compare(a.id,b.id))
  return { schemaVersion: 1, findings, resolved: (baseline?.findings ?? []).filter(i => !findings.some(f => f.id === i.id)).map(i => i.id), routes: audit.pages.filter(p => p.indexable).map(p => {
    const contextualInbound = [...new Set(audit.pages.filter(a => a.indexable && a.pageType === 'article' && a.route !== p.route && a.contextualOutbound.includes(p.route)).map(a => a.route))].sort(compare)
    const destinations = new Map()
    for (const link of p.links.filter(l => l.contextual)) {
      try { const url = new URL(link.href, `https://simpyll.com${p.route}`); if (url.origin === 'https://simpyll.com') { const destination = url.pathname.replace(/\/$/,'') || '/'; destinations.set(destination,(destinations.get(destination) ?? 0)+1) } } catch { /* Shared validator reports malformed links. */ }
    }
    return { route:p.route, crawlDepth:p.crawlDepth, siteNavigationOrphan:p.route !== '/' && p.crawlDepth === null,
      contextualLinkOrphan:p.pageType === 'article' && !contextualInbound.length, contextualInbound,
      duplicateContextualDestinations:[...destinations].filter(([,count]) => count > 1).sort(([a],[b]) => compare(a,b)).map(([destination,count]) => ({destination,count})),
      links:p.links, outbound:p.outbound }
  }) }

}
export async function generatePulse({ directory = 'dist', expectedRoutes, reportDate, baselinePath } = {}) {
  const registry = await collectArticles(process.cwd(), { history: new Map() })
  for (const a of registry.filter(a => a.status === 'published')) a.metadata = await readMetadata(await readFile(`src/content/blog/${a.slug}.mdx`, 'utf8'))
  reportDate ??= execFileSync('git',['show','-s','--format=%cs','HEAD'],{encoding:'utf8'}).trim()
  const audit = await auditSeo({ directory, expectedRoutes, articles: registry })
  const snapshot = projectPublic(audit, registry, reportDate)
  const baseline = baselinePath ? JSON.parse(await readFile(baselinePath,'utf8')) : null
  const report = privateReport(audit,baseline)
  await mkdir('artifacts/pulse',{recursive:true})
  await writeFile('artifacts/pulse/report.json',JSON.stringify(report,null,2)+'\n')
  await writeFile('artifacts/pulse/report.md',`# Pulse technical audit\n\n${report.findings.length} findings. Offline automated checks; not a ranking assessment.\n\n`+report.findings.map(i => `## ${i.severity}: ${i.rule}\n\nRoute: ${i.route}\n\nID: ${i.id} (${i.status})\n\nEvidence: ${i.explanation}\n\nRemediation: ${i.remediation}\n`).join('\n'))
  await writeFile(`${directory}/pulse.json`,JSON.stringify(snapshot)+'\n')
  return snapshot
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await generatePulse({ baselinePath: process.argv[2] })
