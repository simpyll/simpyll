import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { synchronize, sourceRevision, id } from './publisher.mjs'
import { manifest } from './manifest.mjs'

export const digest = bytes => createHash('sha256').update(bytes).digest('hex')
export const incidentKey = (source, page) => digest(`simpyll-publishing-v1:${id(source)}:${id(page)}`)
export const categories = ['unknown', 'notion-access-query', 'eligibility-configuration', 'conversion-content-media', 'build-budget', 'commit-push', 'deployment', 'execution-stalled', 'monitor-evidence']
export const states = ['missing', 'outdated', 'verified', 'unknown']
export const DEFAULT_GRACE_HOURS = 6
export const LEDGER = '<!-- simpyll-publishing-ledger:v1 -->'
const marker = key => `<!-- simpyll-publishing-incident:v1:${key} -->`
const system = name => digest(`simpyll-system-v1:${name}`)
const finite = value => Number.isFinite(value) && value >= 0
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const exact = (value, keys) => value && typeof value === 'object' && Object.keys(value).every(key => keys.includes(key))

// The only boundary into public artifacts/issues. Reject arbitrary strings and
// unknown properties; never serialize API errors, content, source IDs or slugs.
export function validateReport(value) {
  if (!exact(value, ['version', 'at', 'complete', 'articles', 'systems', 'run', 'lastSuccess']) || value.version !== 1 || !finite(value.at) || typeof value.complete !== 'boolean' || !Array.isArray(value.articles) || value.articles.length > 10000 || !Array.isArray(value.systems) || value.systems.length > 10 || !Number.isSafeInteger(value.run) || value.run < 1 || !(value.lastSuccess === null || finite(value.lastSuccess))) throw new Error('Invalid sanitized report')
  const keys = new Set()
  for (const row of [...value.articles, ...value.systems]) {
    if (!exact(row, ['key', 'revision', 'state', 'category']) || !hash(row.key) || !hash(row.revision) || !states.includes(row.state) || !categories.includes(row.category) || keys.has(row.key)) throw new Error('Invalid sanitized observation')
    keys.add(row.key)
  }
  return value
}

// Same conversion, gates, ownership, media and content validation as publishing.
// Compare desired output with the immutable remote-main checkout, not local writes.
export async function reconcileArticles(options) {
  let plan
  const oldSynchronize = options.synchronize ?? synchronize
  const old = manifest(await readFile(join(options.root, '.notion/published.json')))
  let rows = [], complete = false, category = 'eligibility-configuration'
  try {
    await oldSynchronize({ ...options, dryRun: true,
      observe: async ({ sourceId, pages }) => {
        complete = true
        rows = pages.map(page => ({ key: incidentKey(sourceId, page.id), revision: sourceRevision(page), state: old.articles[id(page.id)]?.status === 'published' ? 'outdated' : 'missing', category: 'unknown' }))
        for (const page of pages) {
          const previous = old.articles[id(page.id)]
          const row = rows.find(row => row.key === incidentKey(sourceId, page.id))
          if (previous?.status !== 'published' || previous.sourceRevision !== row.revision) continue
          const paths = [`src/content/blog/${previous.slug}.mdx`, ...Object.values(previous.assets ?? {}).map(asset => asset.path)]
          const intact = await Promise.all(paths.map(async path => {
            const bytes = await readFile(join(options.root, path)).catch(error => { if (error.code === 'ENOENT') return null; throw error })
            return bytes && digest(bytes) === old.files[path]
          }))
          if (intact.every(Boolean)) row.state = 'unknown'
        }
        category = 'conversion-content-media'
      },
      planned: value => { plan = value },
      stage: value => { category = value },
    })
    if (!plan) throw new Error('Incomplete plan')
    const byKey = new Map(rows.map(row => [row.key, row]))
    for (const [page, article] of Object.entries(plan.manifest.articles)) {
      if (article.status !== 'published') continue
      const row = byKey.get(incidentKey(plan.manifest.sourceId, page))
      const previous = old.articles[page]
      const paths = [`src/content/blog/${article.slug}.mdx`, ...Object.values(article.assets ?? {}).map(asset => asset.path)]
      let matches = previous?.status === 'published' && previous.sourceRevision === article.sourceRevision
      for (const path of paths) {
        const bytes = await readFile(join(options.root, path)).catch(error => { if (error.code === 'ENOENT') return null; throw error })
        matches &&= Boolean(bytes && digest(bytes) === plan.manifest.files[path] && old.files[path] === plan.manifest.files[path])
      }
      row.revision = digest(JSON.stringify({ source: article.sourceRevision, files: paths.map(path => plan.manifest.files[path]) }))
      row.state = matches ? 'verified' : previous?.status === 'published' ? 'outdated' : 'missing'
    }
    return { version: 1, at: options.now ?? Date.now(), complete, articles: rows, systems: [], run: options.run, lastSuccess: null }
  } catch {
    return { version: 1, at: options.now ?? Date.now(), complete, articles: rows.map(row => ({ ...row, category: row.state === 'verified' ? 'unknown' : category })), systems: [{ key: system('source'), revision: system('source'), state: 'missing', category }], run: options.run, lastSuccess: null }
  }
}

export function addHealth(report, health) {
  const stage = health.checks.find(row => row.check === 'Latest publisher stage evidence')?.details ?? ''
  const failure = stage.includes('Post-import site validation failed') ? 'build-budget' : stage.includes('Commit/push stage failed') ? 'commit-push' : 'unknown'
  for (const row of report.articles) if (row.state !== 'verified' && row.category === 'unknown') row.category = failure
  report.lastSuccess = health.checks.find(row => row.check === 'Last successful Notion sync')?.details.match(/^([^;]+);/)?.[1]
  report.lastSuccess = Number.isFinite(Date.parse(report.lastSuccess)) ? Date.parse(report.lastSuccess) : null
  for (const row of health.checks.filter(row => ['Action Required', 'Unknown'].includes(row.status))) {
    const deployment = /deployment|Pages|deploy verification/i.test(row.check)
    const category = deployment ? 'deployment' : /schedule|Pending/.test(row.check) ? 'execution-stalled' : 'monitor-evidence'
    report.systems.push({ key: system(row.check), revision: system(row.check), state: 'missing', category })
  }
  return validateReport(report)
}

export function graceHours(value = DEFAULT_GRACE_HOURS) {
  const hours = Number(value)
  if (!Number.isFinite(hours) || hours < 1 || hours > 168) throw new Error('Grace must be 1–168 hours')
  return hours
}
export function transition(previous, report, hours = DEFAULT_GRACE_HOURS) {
  validateReport(report)
  const state = structuredClone(previous)
  const seen = new Set()
  for (const row of [...report.articles, ...report.systems]) {
    seen.add(row.key)
    let entry = state[row.key]
    if (row.state === 'unknown') continue
    if (row.state === 'verified') {
      if (entry) Object.assign(entry, { active: false, resolution: report.systems.some(system => system.key === row.key) ? 'system-evidence-recovered' : 'remote-verified', checked: report.at })
      continue
    }
    if (!entry || !entry.active) entry = state[row.key] = { first: report.at, checked: report.at, revision: row.revision, category: row.category, active: true, generation: (entry?.generation ?? 0) + 1, resolution: 'pending', lastSuccess: report.lastSuccess }
    Object.assign(entry, { checked: report.at, revision: row.revision, category: row.category, lastSuccess: report.lastSuccess })
    entry.due = report.at - entry.first >= graceHours(hours) * 3600000
  }
  // Only a complete eligible inventory may withdraw a transfer expectation.
  // System recovery requires a complete, healthy read too.
  if (report.complete) for (const [key, entry] of Object.entries(state)) if (entry.active && !seen.has(key)) Object.assign(entry, { active: false, resolution: 'eligibility-withdrawn-or-system-recovered', checked: report.at })
  return state
}

export function renderIncident(key, entry, report, repository, hours) {
  return `${marker(key)}\n\nOpaque incident: \`${key}\`\n\nFirst observed: ${new Date(entry.first).toISOString()}\nLast checked: ${new Date(entry.checked).toISOString()}\nDelay: ${Math.floor((entry.checked - entry.first) / 60000)} minutes; threshold: ${graceHours(hours)} hours.\nCategory: **${entry.category}**\nLast successful scheduled reconciliation: ${entry.lastSuccess === null ? 'unknown' : new Date(entry.lastSuccess).toISOString()}\n\nGitHub transfer: **${entry.category === 'deployment' ? 'tracked separately in article reconciliation' : entry.active ? 'not verified / action required' : entry.resolution}**.\nWebsite deployment: **${entry.category === 'deployment' ? entry.active ? 'action required' : 'system evidence recovered; verify live release separately' : 'separate; not established by transfer'}**.\nOccurrence: ${entry.generation}.\n\n[Monitor run](https://github.com/${repository}/actions/runs/${report.run}) · [Publisher](https://github.com/${repository}/actions/workflows/notion-publish.yml) · [Deployment](https://github.com/${repository}/actions/workflows/deploy.yml)\n\nInspect trusted-main stage metadata. Run the main publisher dry-run, fix the classified failure, then retry ordinary publishing. Verify remote expected revision and owned-file digests before resolving transfer; verify the exact content SHA deployment and live revision separately. A no-op publisher does not redeploy. Never change editorial gates to clear an alert.\n\n[Runbook](https://github.com/${repository}/blob/main/docs/PUBLISHING-HEALTH.md). Assignment requests GitHub notification; email/push delivery requires owner notification settings and acceptance.\n`
}

export function parseLedger(body) {
  if (!body.startsWith(LEDGER)) throw new Error('Invalid ledger')
  let state
  try { state = JSON.parse(body.slice(LEDGER.length).trim()) } catch { throw new Error('Invalid ledger') }
  if (!state || Array.isArray(state) || typeof state !== 'object' || Object.keys(state).length > 10000) throw new Error('Invalid ledger')
  for (const [key, entry] of Object.entries(state)) {
    if (!hash(key) || !exact(entry, ['first', 'checked', 'revision', 'category', 'active', 'generation', 'resolution', 'lastSuccess', 'due']) || !finite(entry.first) || !finite(entry.checked) || !hash(entry.revision) || !categories.includes(entry.category) || typeof entry.active !== 'boolean' || !Number.isSafeInteger(entry.generation) || entry.generation < 1 || !['pending', 'remote-verified', 'system-evidence-recovered', 'eligibility-withdrawn-or-system-recovered'].includes(entry.resolution) || !(entry.lastSuccess === null || finite(entry.lastSuccess)) || (entry.due !== undefined && typeof entry.due !== 'boolean')) throw new Error('Invalid ledger')
  }
  return state
}

export async function updateIncidents({ api, repository, report, hours = DEFAULT_GRACE_HOURS }) {
  validateReport(report)
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid repository')
  const repo = await api('')
  const owner = repo.owner
  if (owner?.type !== 'User' || owner.login !== repository.split('/')[0] || owner.id !== 8688524 || owner.login !== 'simpyll') throw new Error('Repository owner requires review')
  await api(`assignees/${owner.login}`) // 204: verify assignment eligibility before writes.
  const issues = []
  for (let page = 1; ; page++) {
    if (page > 100) throw new Error('Issue inventory limit')
    const batch = await api(`issues?state=all&per_page=100&page=${page}`)
    if (!Array.isArray(batch)) throw new Error('Invalid issue inventory')
    issues.push(...batch.filter(issue => !issue.pull_request && [owner.id, 41898282].includes(issue.user?.id)))
    if (batch.length < 100) break
  }
  const ledgers = issues.filter(issue => issue.body?.startsWith(LEDGER))
  if (ledgers.length > 1) throw new Error('Duplicate ledger; manual reconciliation required')
  const ledger = ledgers[0]
  const state = transition(ledger ? parseLedger(ledger.body) : {}, report, hours)
  const ledgerBody = LEDGER + '\n' + JSON.stringify(state)
  if (Buffer.byteLength(ledgerBody) > 60000) throw new Error('Ledger capacity; manual archival required')
  // Save first observation BEFORE issue creation. A lost API response is recovered
  // by fully paginated marker lookup next run. Never retry an ambiguous POST.
  if (!ledger) await api('issues', 'POST', { title: 'Publishing incident state — do not edit', body: ledgerBody })
  else if (ledger.body !== ledgerBody) await api(`issues/${ledger.number}`, 'PATCH', { body: ledgerBody, state: 'open' })
  for (const [key, entry] of Object.entries(state)) {
    const matches = issues.filter(issue => issue.body?.startsWith(marker(key)))
    if (matches.length > 1) throw new Error('Duplicate incident; manual reconciliation required')
    const issue = matches[0]
    if (entry.active && !entry.due) continue
    if (!issue && !entry.active) continue
    const body = renderIncident(key, entry, report, repository, hours)
    const title = `Publishing incident ${key.slice(0, 12)} — ${entry.category}`
    if (!issue) await api('issues', 'POST', { title, body, assignees: [owner.login] })
    else {
      // No repetitive comments. Refresh daily or on lifecycle/category/assignment
      // changes. Ledger retains exact last-check time on every run.
      const refresh = issue.state !== (entry.active ? 'open' : 'closed') || issue.title !== title || !issue.assignees?.some(person => person.login === owner.login) || report.at - Date.parse(issue.updated_at) >= 86400000 || !issue.body.includes(`Occurrence: ${entry.generation}.`)
      if (refresh) await api(`issues/${issue.number}`, 'PATCH', { title, body, state: entry.active ? 'open' : 'closed', assignees: [owner.login] })
    }
  }
  return state
}

// Availability workflow is the independent watchdog for this monitor. It shares
// the same issue writer/ledger and concurrency group, never Notion credentials.
export async function monitorWatchdog(get, { now = Date.now(), run }) {
  const key = digest('simpyll-monitor-reader-failure')
  let state = 'missing'
  try {
    const workflow = await get('actions/workflows/publishing-health.yml')
    const payload = await get('actions/workflows/publishing-health.yml/runs?branch=main&status=success&per_page=1')
    const latest = payload.workflow_runs?.[0]
    if (workflow.state === 'active' && latest?.head_branch === 'main' && latest.conclusion === 'success' && Number.isFinite(Date.parse(latest.updated_at)) && now - Date.parse(latest.updated_at) <= 6 * 3600000) state = 'verified'
  } catch { /* Unknown evidence stays actionable; no provider payload escapes. */ }
  return validateReport({ version: 1, at: now, complete: false, articles: [], systems: [{ key, revision: key, state, category: 'monitor-evidence' }], run, lastSuccess: null })
}
