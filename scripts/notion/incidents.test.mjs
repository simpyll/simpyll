import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, mkdir, writeFile, readFile, rm, cp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { compile } from '@mdx-js/mdx'
import { synchronize, sourceRevision } from './publisher.mjs'
import { fixture, ROOT, SOURCE, PAGE, page, block, rt } from './fixtures/api.mjs'
import { digest, incidentKey, reconcileArticles, transition, validateReport, updateIncidents, LEDGER, parseLedger, renderIncident, addHealth, monitorWatchdog, writerReport } from './incidents.mjs'
const key = incidentKey(SOURCE, PAGE), revision = digest('expected revision'), H = 3600000, at = Date.parse('2026-10-28T12:00Z')
const report = (time = at, articles = [{ key, revision, state: 'missing', category: 'unknown' }], complete = true) => ({ version: 1, at: time, complete, articles, systems: [], run: 123, lastSuccess: null })
async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'incident-fixture-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'src/content/blog'), { recursive: true })
  await mkdir(join(root, '.notion'), { recursive: true })
  await writeFile(join(root, '.notion/published.json'), JSON.stringify({ version: 1, sourceId: SOURCE, articles: {}, files: {} }))
  const opts = { root, pageId: ROOT, api: fixture({ content: [block('paragraph', 'Non-sensitive isolated fixture')] }).api, validate: compile, run: 123, now: at }
  return { root, opts }
}
test('missing new article, remote transfer, clean checkout, unchanged synchronization, and outdated edit', async t => {
  const { root, opts } = await setup(t)
  assert.equal((await reconcileArticles(opts)).articles[0].state, 'missing')
  // Dry plan cannot count as transfer or write a manifest.
  assert.deepEqual(JSON.parse(await readFile(join(root, '.notion/published.json'))).articles, {})
  await synchronize(opts)
  assert.equal((await reconcileArticles(opts)).articles[0].state, 'verified')
  assert.equal((await synchronize(opts)).changed, false)
  const clone = root + '-clone'; t.after(() => rm(clone, { recursive: true, force: true })); await cp(root, clone, { recursive: true })
  assert.equal((await reconcileArticles({ ...opts, root: clone })).articles[0].state, 'verified')
  const changed = page(); changed.properties.Name.title = [rt('Edited fixture')]
  // Metadata fingerprint changes even when provider timestamp is identical.
  assert.notEqual(sourceRevision(changed), sourceRevision(page()))
  assert.equal((await reconcileArticles({ ...opts, api: fixture({ pages: [changed], content: [block('paragraph', 'Edited fixture')] }).api })).articles[0].state, 'outdated')
  // Same metadata timestamp with changed body still fails desired-output digest.
  assert.equal((await reconcileArticles({ ...opts, api: fixture({ content: [block('paragraph', 'Body edit')] }).api })).articles[0].state, 'outdated')
})
test('failed push: local generated result never substitutes for remote snapshot', async t => {
  const { opts, root } = await setup(t)
  const local = root + '-local'; t.after(() => rm(local, { recursive: true, force: true })); await cp(root, local, { recursive: true })
  await synchronize({ ...opts, root: local })
  assert.equal((await reconcileArticles(opts)).articles[0].state, 'missing')
})
test('draft, archived, trashed and intentional unpublish withdraw eligibility; dates are not scheduling gates', async t => {
  const { opts } = await setup(t)
  for (const patch of [{ archived: true }, { in_trash: true }, { properties: { ...page().properties, Status: { status: { name: 'Draft' } } } }]) {
    assert.deepEqual((await reconcileArticles({ ...opts, api: fixture({ pages: [page(patch)] }).api })).articles, [])
  }
  const future = page(); future.properties['Published Date'].date.start = '2099-01-01'
  assert.equal((await reconcileArticles({ ...opts, api: fixture({ pages: [future], content: [] }).api })).articles[0].state, 'missing')
  const state = transition(transition({}, report()), report(at + H, []))
  assert.equal(state[key].resolution, 'eligibility-withdrawn-or-system-recovered')
})
test('query access loss and incomplete pagination preserve pending article state; conversion failure is classified', async t => {
  const { opts } = await setup(t)
  const pending = transition({}, report())
  const lost = await reconcileArticles({ ...opts, api: async () => { throw new Error('private title token https://signed.invalid') } })
  assert.equal(lost.complete, false); assert.equal(lost.articles.length, 0)
  assert.equal(transition(pending, lost)[key].active, true)
  const f = fixture()
  const incomplete = await reconcileArticles({ ...opts, api: async (path, body) => path.endsWith('/query') ? { results: [page()], has_more: true, next_cursor: null } : f.api(path, body) })
  assert.equal(incomplete.complete, false); assert.deepEqual(incomplete.articles, [])
  const malformed = await reconcileArticles({ ...opts, api: async (path, body) => path.endsWith('/query') ? { results: [page()] } : f.api(path, body) })
  assert.equal(malformed.complete, false)
  const failed = await reconcileArticles({ ...opts, validate: () => { throw new Error('private compiler excerpt') } })
  assert.equal(failed.complete, true); assert.equal(failed.articles[0].category, 'conversion-content-media')
  assert.doesNotMatch(JSON.stringify(failed), /private|signed.invalid|compiler/)
})
test('transient versus sustained delay, revision churn cannot reset clock, recovery and recurrence', () => {
  let state = transition({}, report())
  state = transition(state, report(at + 5 * H)); assert.equal(state[key].due, false)
  state = transition(state, report(at + 6 * H, [{ key, revision: digest('new edit'), state: 'outdated', category: 'build-budget' }]))
  assert.equal(state[key].due, true); assert.equal(state[key].first, at)
  state = transition(state, report(at + 7 * H, [{ key, revision, state: 'verified', category: 'unknown' }]))
  assert.equal(state[key].active, false); assert.equal(state[key].resolution, 'remote-verified')
  state = transition(state, report(at + 8 * H)); assert.equal(state[key].generation, 2); assert.equal(state[key].due, false)
  assert.deepEqual(parseLedger(LEDGER + '\n' + JSON.stringify(state)), state)
})
test('deployment-only failures stay actionable after verified article transfer', () => {
  const r = report(at, [{ key, revision, state: 'verified', category: 'unknown' }])
  addHealth(r, { checks: [{ check: 'Content deployment', status: 'Action Required', details: '' }] })
  const state = transition({}, r)
  assert.equal(Object.values(state)[0].category, 'deployment')
  assert.equal(Object.values(state)[0].active, true)
})
test('healthy article inventory cannot clear watchdog grace; only its own heartbeat recovers it', async () => {
  const missing = await monitorWatchdog(async () => { throw new Error('unavailable') }, { now: at, run: 123 })
  const watchdog = missing.systems[0].key
  let state = transition({}, missing)
  state = transition(state, report(at + 5 * H, []))
  assert.equal(state[watchdog].active, true)
  state = transition(state, { ...missing, at: at + 6 * H })
  assert.equal(state[watchdog].due, true)
  assert.equal(state[watchdog].first, at)
  state = transition(state, { ...missing, at: at + 7 * H, systems: [{ ...missing.systems[0], state: 'verified' }] })
  assert.equal(state[watchdog].active, false)
  assert.equal(state[watchdog].resolution, 'system-evidence-recovered')
})
test('Notion inventory success with unavailable GitHub metadata preserves deployment incidents', () => {
  const failed = report(at, [])
  addHealth(failed, { checks: [{ check: 'Content deployment', status: 'Action Required', details: '' }] })
  let state = transition({}, failed)
  const deployment = Object.keys(state)[0]
  const unknown = report(at + H, [])
  addHealth(unknown, { checks: [{ check: 'GitHub metadata', status: 'Unknown', details: '' }] })
  state = transition(state, unknown)
  assert.equal(state[deployment].active, true)
  const recovered = report(at + 2 * H, [])
  addHealth(recovered, { checks: [{ check: 'Content deployment', status: 'Healthy', details: '' }] })
  state = transition(state, recovered)
  assert.equal(state[deployment].active, false)
  assert.equal(state[deployment].resolution, 'system-evidence-recovered')
})
test('public boundary rejects injected fields, private IDs/URLs/errors and unsafe enum values', () => {
  for (const value of [{ ...report(), title: 'PRIVATE' }, report(at, [{ key, revision, state: 'missing', category: 'private error' }]), report(at, [{ key: PAGE, revision, state: 'missing', category: 'unknown' }])]) assert.throws(() => validateReport(value))
  const state = transition({}, report()); const body = renderIncident(key, state[key], report(), 'simpyll/simpyll', 6)
  assert.doesNotMatch(body, new RegExp(`${PAGE}|${SOURCE}|notion.so|PRIVATE|signature=`))
  assert.match(body, /Website deployment.*separate/)
})
test('missing, malformed, stale and wrong-run artifacts produce system evidence instead of suppressing the writer', () => {
  for (const value of [undefined, { private: 'payload' }, report(at - 2 * H), report(at + 2 * H), { ...report(), run: 999 }]) {
    const result = writerReport(value, { now: at, run: 123 })
    assert.equal(result.complete, false)
    assert.deepEqual(result.articles, [])
    assert.equal(result.systems[0].state, 'missing')
    assert.equal(result.systems[0].category, 'monitor-evidence')
    assert.doesNotMatch(JSON.stringify(result), /private|payload/)
  }
  assert.deepEqual(writerReport(report(), { now: at, run: 123 }), report())
})
function fakeGithub() {
  const issues = [], calls = []; let failCreate = false, failPatch = false
  const api = async (path, method = 'GET', body) => {
    calls.push({ path, method, body })
    if (path === '') return { owner: { id: 8688524, login: 'simpyll', type: 'User' } }
    if (path.startsWith('assignees/')) return null
    if (method === 'GET') return structuredClone(issues)
    if (method === 'POST') {
      issues.push({ ...structuredClone(body), number: issues.length + 1, state: 'open', user: { id: 41898282 }, assignees: body.assignees?.map(login => ({ login })) ?? [], updated_at: new Date(at).toISOString() })
      if (failCreate && !body.body.startsWith(LEDGER)) { failCreate = false; throw new Error('Lost POST response') }
      return issues.at(-1)
    }
    if (failPatch) { failPatch = false; throw new Error('Rejected PATCH') }
    Object.assign(issues.find(issue => issue.number === Number(path.split('/')[1])), structuredClone(body), { assignees: body.assignees?.map(login => ({ login })) ?? [] })
  }
  return { api, issues, calls, failCreate: () => { failCreate = true }, failPatch: () => { failPatch = true } }
}
test('durable issue lifecycle, ambiguous POST response recovery, repeated checks without comments, reopening same incident', async () => {
  const g = fakeGithub(), options = { api: g.api, repository: 'simpyll/simpyll' }
  await updateIncidents({ ...options, report: report() }); assert.equal(g.issues.length, 1)
  g.failCreate()
  await assert.rejects(updateIncidents({ ...options, report: report(at + 6 * H) }))
  assert.equal(g.issues.length, 2)
  await updateIncidents({ ...options, report: report(at + 6 * H) }); assert.equal(g.issues.length, 2)
  const writes = g.calls.filter(call => call.method !== 'GET').length
  await updateIncidents({ ...options, report: report(at + 6 * H) })
  assert.equal(g.calls.filter(call => call.method !== 'GET').length, writes)
  await updateIncidents({ ...options, report: report(at + 7 * H, [{ key, revision, state: 'verified', category: 'unknown' }]) })
  assert.equal(g.issues[1].state, 'closed')
  await updateIncidents({ ...options, report: report(at + 8 * H) })
  // Recurrence gets a fresh grace before reopening.
  assert.equal(g.issues[1].state, 'closed')
  await updateIncidents({ ...options, report: report(at + 14 * H) })
  assert.equal(g.issues.length, 2); assert.equal(g.issues[1].state, 'open')
  assert.deepEqual(g.issues[1].assignees, [{ login: 'simpyll' }])
  assert.ok(!g.calls.some(call => call.path.includes('comments')))
})
test('partial ledger update failure prevents incident mutation; duplicate ledger fails closed', async () => {
  const g = fakeGithub(), options = { api: g.api, repository: 'simpyll/simpyll' }
  await updateIncidents({ ...options, report: report() }); g.failPatch()
  await assert.rejects(updateIncidents({ ...options, report: report(at + 6 * H) })); assert.equal(g.issues.length, 1)
  g.issues.push({ ...g.issues[0], number: 99 })
  await assert.rejects(updateIncidents({ ...options, report: report(at + 6 * H) }), /Duplicate ledger/)
})
test('race boundary: serialized workflow writer and trusted-only main jobs without PR secrets', async () => {
  const yaml = await readFile('.github/workflows/publishing-health.yml', 'utf8')
  assert.match(yaml, /group: publishing-incident-writer\n  cancel-in-progress: false/)
  assert.match(yaml, /cron: '37 \* \* \* \*'/)
  assert.doesNotMatch(yaml, /pull_request_target|pull_request:/)
  assert.doesNotMatch(yaml.split('  incidents:')[1], /secrets\./)
})

test('independent watchdog detects missing, disabled, cancelled/stale monitor and recovers without clearing article incidents', async () => {
  for (const patch of [{ missing: true }, { workflow: 'disabled_manually' }, { hours: 25 }, { conclusion: 'cancelled' }]) {
    const get = async path => path.endsWith('publishing-health.yml') ? { state: patch.workflow ?? 'active' } : { workflow_runs: patch.missing ? [] : [{ head_branch: 'main', conclusion: patch.conclusion ?? 'success', updated_at: new Date(at - (patch.hours ?? 1) * H).toISOString() }] }
    const r = await monitorWatchdog(get, { now: at, run: 123 })
    assert.equal(r.systems[0].state, 'missing')
  }
  const get = async path => path.endsWith('publishing-health.yml') ? { state: 'active' } : { workflow_runs: [{ head_branch: 'main', conclusion: 'success', updated_at: new Date(at).toISOString() }] }
  const healthy = await monitorWatchdog(get, { now: at, run: 123 })
  assert.equal(healthy.systems[0].state, 'verified')
  assert.equal(transition(transition({}, report()), healthy)[key].active, true)
  const yaml = await readFile('.github/workflows/monitor.yml', 'utf8')
  assert.match(yaml, /--watchdog --write/); assert.match(yaml, /group: publishing-incident-writer/)
})
test('same provider revision never clears incident on failed conversion; expected output evidence is hashed', async t => {
  const { opts } = await setup(t)
  await synchronize(opts)
  const before = await reconcileArticles(opts)
  const failed = await reconcileArticles({ ...opts, validate: () => { throw new Error('compiler private excerpt') } })
  assert.equal(failed.articles[0].state, 'unknown')
  const pending = transition({}, report(at, [{ ...before.articles[0], state: 'outdated' }]))
  assert.equal(transition(pending, failed)[key].active, true)
  const edited = await reconcileArticles({ ...opts, api: fixture({ content: [block('paragraph', 'Changed expected output')] }).api })
  assert.notEqual(edited.articles[0].revision, before.articles[0].revision)
})
test('staged build and commit failures use fixed categories without leaking error dumps', () => {
  for (const [details, expected] of [['Post-import site validation failed', 'build-budget'], ['Commit/push stage failed', 'commit-push']]) {
    const r = report()
    addHealth(r, { checks: [{ check: 'Latest publisher stage evidence', details, status: 'Informational' }] })
    assert.equal(r.articles[0].category, expected)
  }
})
test('untrusted public issue markers are ignored; lost ledger creation response is recovered', async () => {
  const g = fakeGithub(), options = { api: g.api, repository: 'simpyll/simpyll' }
  g.issues.push({ number: 80, body: LEDGER + '\nPRIVATE', user: { id: 12345 } })
  let lost = true
  const api = async (...args) => {
    const result = await g.api(...args)
    if (lost && args[1] === 'POST') { lost = false; throw new Error('accepted but lost response') }
    return result
  }
  await assert.rejects(updateIncidents({ ...options, api, report: report() }))
  assert.equal(g.issues.length, 2)
  await updateIncidents({ ...options, report: report(at + 6 * H) })
  assert.equal(g.issues.length, 3)
  assert.equal(g.issues.filter(issue => issue.user?.id === 41898282 && issue.body.startsWith(LEDGER)).length, 1)
})
test('closed deployment incident never claims website remains failed or an article transferred', () => {
  const r = report(); r.articles = []; r.systems = [{ key, revision, state: 'missing', category: 'deployment' }]
  let state = transition({}, r)
  state = transition(state, { ...r, at: at + H, systems: [{ ...r.systems[0], state: 'verified' }] })
  const body = renderIncident(key, state[key], r, 'simpyll/simpyll', 6)
  assert.match(body, /system evidence recovered/)
  assert.doesNotMatch(body, /Website deployment: \*\*action required/)
  assert.match(body, /tracked separately in article reconciliation/)
})
test('paginated issue inventory finds durable markers beyond first page', async () => {
  const g = fakeGithub(), options = { api: g.api, repository: 'simpyll/simpyll' }
  await updateIncidents({ ...options, report: report() })
  await updateIncidents({ ...options, report: report(at + 6 * H) })
  const existing = g.issues.splice(0)
  g.issues.push(...Array.from({ length: 100 }, (_, index) => ({ number: 1000 + index, user: { id: 12345 }, body: '' })), ...existing)
  const api = async (path, ...rest) => {
    if (path.startsWith('issues?')) {
      const page = Number(new URLSearchParams(path.split('?')[1]).get('page'))
      return structuredClone(g.issues.slice((page - 1) * 100, page * 100))
    }
    return g.api(path, ...rest)
  }
  await updateIncidents({ ...options, api, report: report(at + 6 * H) })
  assert.equal(g.issues.length, 102)
})
