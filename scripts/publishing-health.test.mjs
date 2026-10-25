import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { audit, collect, evaluate, githubClient, render } from './publishing-health.mjs'

const now = Date.parse('2026-10-25T09:37:00Z')
const iso = hours => new Date(now - hours * 3_600_000).toISOString()
const sha = 'a'.repeat(40)
function run(hours = 0.25, conclusion = 'success', id = 1) {
  return { id, head_sha: sha, head_branch: 'main', created_at: iso(hours), status: 'completed', conclusion,
    event: 'schedule', jobs: [{ name: 'sync', status: 'completed', conclusion, completed_at: iso(hours) }] }
}
function fixture(publisher = [run()]) {
  return { publisher, deployRuns: [deploymentRun(47, 'success')], content: { sha, date: iso(48) }, deployment: { sha, date: iso(47) }, covered: true }
}
function deploymentRun(hours, conclusion) {
  const r = run(hours, conclusion, 90)
  r.jobs = ['build', 'deploy', 'verify'].map(name => ({ name, status: 'completed', conclusion, completed_at: iso(hours) }))
  return r
}
test('recent sync and successful no-op are healthy without weekly content', () => {
  const report = evaluate(fixture(), now)
  assert.equal(report.status, 'Healthy')
  assert.match(render(report, 'simpyll/simpyll'), /Successful no-change syncs count/)
  assert.match(render(report, 'simpyll/simpyll'), /actions\/runs\/1/)
})
test('failed sync followed by recovery is healthy', () => {
  assert.equal(evaluate(fixture([run(), run(1, 'failure', 2)]), now).status, 'Healthy')
})
test('single recent failure warns; three over an hour escalate', () => {
  assert.equal(evaluate(fixture([run(0.2, 'failure'), run(1, 'success', 2)]), now).status, 'Warning')
  assert.equal(evaluate(fixture([run(0.1, 'failure'), run(0.8, 'failure', 2), run(1.5, 'failure', 3), run(2, 'success', 4)]), now).status, 'Action Required')
})
test('stale successful sync warns after 6h and fails after 24h', () => {
  assert.equal(evaluate(fixture([run(7)]), now).status, 'Warning')
  assert.equal(evaluate(fixture([run(25)]), now).status, 'Action Required')
})
test('manual execution cannot mask missed scheduled executions', () => {
  const manual = run(); manual.event = 'workflow_dispatch'
  assert.equal(evaluate(fixture([manual, run(25, 'success', 2)]), now).status, 'Action Required')
})
test('cancellations alone do not escalate', () => {
  assert.equal(evaluate(fixture([run(0.1, 'cancelled'), run(0.2, 'success', 2)]), now).status, 'Healthy')
})
test('sync success survives overall workflow deployment failure', () => {
  const publisher = run(); publisher.conclusion = 'failure'
  publisher.jobs.push({ name: 'deploy / build', status: 'completed', conclusion: 'failure', completed_at: iso(0.2) })
  assert.equal(evaluate(fixture([publisher]), now).checks[0].status, 'Healthy')
  assert.equal(evaluate(fixture([publisher]), now).status, 'Warning')
})
test('unresolved deployment failure escalates and later verification recovers', () => {
  const data = fixture(); data.deployRuns = [deploymentRun(2, 'failure')]
  assert.equal(evaluate(data, now).status, 'Action Required')
  data.deployRuns.unshift(deploymentRun(0.2, 'success'))
  assert.equal(evaluate(data, now).status, 'Healthy')
})
test('pending deployment gets grace; stale undeployed manifest escalates', () => {
  const data = fixture(); data.covered = false; data.content.date = iso(0.1)
  assert.equal(evaluate(data, now).status, 'Warning')
  data.content.date = iso(7)
  assert.equal(evaluate(data, now).status, 'Action Required')
})
test('no run history and missing deployment are unknown, never healthy', () => {
  assert.equal(evaluate(fixture([]), now).status, 'Unknown')
  const data = fixture(); data.deployment = null
  assert.equal(evaluate(data, now).status, 'Unknown')
})
function api(overrides = {}) {
  return async path => {
    if (path in overrides) return overrides[path]
    if (path.includes('/runs?')) return { workflow_runs: path.includes('notion-publish') ? [run()] : [deploymentRun(47, 'success')] }
    if (path.includes('/jobs?')) return path.includes('/90/') ? { total_count: 3, jobs: deploymentRun(47, 'success').jobs } : { total_count: 1, jobs: run().jobs }
    if (path.startsWith('commits?')) return [{ sha, commit: { committer: { date: iso(48) } } }]
    if (path.startsWith('deployments?')) return [{ id: 5, sha }]
    if (path.startsWith('deployments/')) return [{ state: 'inactive', created_at: iso(2) }, { state: 'success', created_at: iso(47) }]
    if (path.startsWith('compare/')) return { status: 'identical' }
    throw new Error('Unexpected fixture route')
  }
}
test('collector checks jobs and actual successful deployment status, including inactive releases', async () => {
  const data = await collect(api())
  assert.equal(data.deployment.date, iso(47))
  assert.equal((await audit(api(), now)).status, 'Healthy')
})
test('malformed, missing, partial job and invalid commit metadata fail closed', async () => {
  for (const [path, value] of [
    ['actions/workflows/notion-publish.yml/runs?branch=main&per_page=20', {}],
    ['actions/runs/1/jobs?per_page=100&filter=latest', { total_count: 2, jobs: run().jobs }],
    ['actions/runs/1/jobs?per_page=100&filter=latest', { total_count: 0, jobs: [] }],
    ['commits?sha=main&path=.notion%2Fpublished.json&per_page=1', [{ sha: 'bad' }]],
    [`compare/${sha}...${sha}`, { status: 'nonsense' }],
  ]) assert.equal((await audit(api({ [path]: value }), now)).status, 'Unknown')
})
test('permission, rate limit, server, network and JSON errors never leak responses', async () => {
  for (const status of [401, 403, 429, 500]) {
    const get = githubClient({ repository: 'simpyll/simpyll', token: 'SECRET', fetcher: async () => ({ ok: false, status }) })
    const report = await audit(get, now)
    assert.equal(report.status, 'Unknown')
    assert.doesNotMatch(render(report, 'simpyll/simpyll'), /SECRET/)
  }
  for (const fetcher of [async () => { throw new Error('SECRET') }, async () => ({ ok: true, json: async () => { throw new Error('SECRET') } })]) {
    assert.equal((await audit(githubClient({ repository: 'simpyll/simpyll', token: 'SECRET', fetcher }), now)).status, 'Unknown')
  }
})
test('workflow stays weekly, read-only and dependency free; tests join existing validation', () => {
  const workflow = readFileSync('.github/workflows/publishing-health.yml', 'utf8')
  assert.match(workflow, /37 9 \* \* 0/)
  assert.match(workflow, /workflow_dispatch:/)
  assert.match(workflow, /actions: read/)
  assert.match(workflow, /deployments: read/)
  assert.doesNotMatch(workflow, /npm ci|npm run build|playwright|secrets\.|write|pull_request_target/)
  assert.match(readFileSync('.github/workflows/notion-publish.yml', 'utf8'), /cron: '\*\/15 \* \* \* \*'/)
  assert.match(readFileSync('.github/workflows/validate.yml', 'utf8'), /node --test scripts\/publishing-health.test.mjs/)
})

test('missing verification evidence remains unknown even with a Pages success', () => {
  const data = fixture(); data.deployRuns = []
  assert.equal(evaluate(data, now).status, 'Unknown')
})
test('slow active runs warn without pretending they are completed failures', () => {
  const active = run(2); active.status = 'in_progress'; active.conclusion = null
  active.jobs = [{ name: 'sync', status: 'in_progress', conclusion: null, completed_at: null }]
  const report = evaluate(fixture([active, run(3, 'success', 2)]), now)
  assert.equal(report.status, 'Warning')
  assert.equal(report.checks.find(row => row.check === 'Recent synchronization failures').status, 'Healthy')
})
test('API client bounds requests and uses read-only authenticated GitHub endpoint', async () => {
  let options
  const get = githubClient({ repository: 'simpyll/simpyll', token: 'fixture', fetcher: async (url, init) => {
    assert.equal(url, 'https://api.github.com/repos/simpyll/simpyll/example')
    options = init
    return { ok: true, json: async () => ({ fixture: true }) }
  } })
  assert.deepEqual(await get('example'), { fixture: true })
  assert.equal(options.redirect, 'error')
  assert.ok(options.signal)
})
