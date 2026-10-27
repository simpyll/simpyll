import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { extractArticle, deduplicate, normalize, check, compare, requestOnce, keyFor } from './core.mjs'

export async function run({ root = process.cwd(), checker = check, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), timeout = Number(process.env.LINK_TIMEOUT_MS ?? 10000) } = {}) {
if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 30000) throw new Error('LINK_TIMEOUT_MS must be between 1000 and 30000')
const output = resolve(root, 'artifacts/external-links'), stateFile = resolve(root, '.external-link-state/state.json')
const readJson = async (path, fallback) => { try { return JSON.parse(await readFile(path, 'utf8')) } catch (error) { if (error.code === 'ENOENT') return fallback; throw error } }
const candidates = []
for (const entry of (await readdir(resolve(root, 'src/content/blog'), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
  if (!entry.isFile()) continue
  const file = entry.name
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.mdx$/.test(file) || /(?:^|-)(?:test|fixture)(?:-|\.)/.test(file)) continue
  candidates.push(...await extractArticle(await readFile(resolve(root, 'src/content/blog', file), 'utf8'), `src/content/blog/${file}`, file.slice(0, -4)))
}
const projects = await readJson(resolve(root, 'content/projects.json'), [])
for (const project of projects.filter(p => p.visibility === 'public')) {
  for (const link of project.links ?? []) {
    const url = normalize(link.url)
    if (url) candidates.push({ url, source: 'content/projects.json', slug: /^[a-z0-9-]+$/.test(project.slug) ? project.slug : 'project', line: 0 })
  }
  const key = project.caseStudy?.contentKey
  if (key && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key) && (project.caseStudy.visibility ?? 'public') === 'public') {
    const file = `content/case-studies/${key}.json`, study = await readJson(resolve(root, file), {})
    for (const link of [...(study.sections ?? []).flatMap(section => section.links ?? []), ...(study.timeline ?? [])]) {
      const url = normalize(link.url)
      if (url) candidates.push({ url, source: file, slug: /^[a-z0-9-]+$/.test(project.slug) ? project.slug : 'project', line: 0 })
    }
  }
}
const suppressed = await readJson(resolve(root, 'scripts/external-links/suppressions.json'), [])
if (!Array.isArray(suppressed) || suppressed.some(value => !/^[a-f0-9]{64}$/.test(value))) throw new Error('Invalid suppression list')
const links = deduplicate(candidates).filter(item => !suppressed.includes(keyFor(item.url))), results = [], lastHost = new Map()
const delay = sleep
async function politeRequest(url, address, method, timeout) {
  const host = new URL(url).hostname, now = Date.now(), wait = Math.max(0, (lastHost.get(host) ?? 0) + 1000 - now)
  if (wait) await delay(wait)
  lastHost.set(host, Date.now())
  return requestOnce(url, address, method, timeout)
}
for (const link of links) {
  let result = await checker(link.url, { request: politeRequest, timeout })
  // Recheck suspected failures once, but never retry 403/429 or timeouts.
  if (['broken', 'potential'].includes(result.status)) { await delay(1000); result = await checker(link.url, { request: politeRequest, timeout }) }
  results.push({ ...link, result })
}
const previous = await readJson(stateFile, {})
const compared = compare(results, previous)
await mkdir(output, { recursive: true }); await mkdir(resolve(root, '.external-link-state'), { recursive: true })
await writeFile(stateFile, JSON.stringify(compared.state) + '\n')
const counts = Object.fromEntries(['healthy', 'broken', 'potential', 'inconclusive', 'redirect'].map(s => [s, compared.results.filter(r => r.result.status === s).length]))
const findings = compared.results.filter(r => r.persistent)
const lines = ['# External link health', '', `Checked ${results.length} distinct destinations. Healthy: ${counts.healthy}; broken: ${counts.broken}; potential: ${counts.potential}; inconclusive: ${counts.inconclusive}; permanent redirects: ${counts.redirect}.`, '', 'Only findings observed on two consecutive runs are actionable. Paths are omitted from this report; inspect the source location to find the destination. DOI links require bibliographic verification, not automatic replacement.', '']
for (const item of compared.results.filter(r => r.result.status !== 'healthy' || r.recovered)) {
  const u = new URL(item.url), host = u.hostname.replace(/[^a-zA-Z0-9.:-]/g, ''), category = item.recovered ? 'recovered' : item.result.status
  const destination = item.result.destination ? `; redirects to ${new URL(item.result.destination).hostname.replace(/[^a-zA-Z0-9.:-]/g, '')}` : ''
  lines.push(`- **${category}**${item.persistent ? ' (persistent)' : ''}: ${host}/[path redacted]${u.hostname === 'doi.org' ? ' (DOI)' : ''}; ${item.result.detail}${destination}. Sources: ${item.sources.map(s => `\`${s.source}${s.line ? ':' + s.line : ''}\` (${s.slug})`).join(', ')}. ${category === 'redirect' ? 'Review the destination before updating.' : category === 'recovered' ? 'No action needed.' : 'Review the original link and retry manually.'}`)
}
if (!results.length) lines.push('No eligible links found.')
const report = lines.join('\n') + '\n'
await writeFile(resolve(output, 'report.md'), report)
await writeFile(resolve(output, 'issue.json'), JSON.stringify({ actionable: findings.length > 0, body: report }) + '\n')
return { report, actionable: findings.length > 0, count: results.length }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await run()
  console.log(`Checked ${result.count} links; ${result.actionable ? 'persistent findings found' : 'no persistent findings'}. See artifact report.`)
}
