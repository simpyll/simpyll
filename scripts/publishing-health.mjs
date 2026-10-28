import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const HOUR = 3_600_000
const bad = new Set(['failure', 'timed_out', 'action_required', 'startup_failure'])
const time = value => Date.parse(value)
const newest = rows => [...rows].sort((a, b) => time(b.created_at) - time(a.created_at))
const age = (now, value) => now - time(value)

// Only allow fixed GitHub metadata fields into the report; never emit API bodies,
// job/step names, commit messages, inputs, Notion data or exception messages.
function validRun(run) {
  return run && Number.isSafeInteger(run.id) && /^[a-f0-9]{40}$/.test(run.head_sha) &&
    Number.isFinite(time(run.created_at)) && run.head_branch === 'main' &&
    typeof run.status === 'string' && (run.conclusion === null || typeof run.conclusion === 'string')
}
function syncJob(run) { return run.jobs.find(job => job.name === 'sync') }
function deployJobs(run) { return run.jobs.filter(job => /^(deploy \/ )?(build|deploy|verify)$/.test(job.name)) }

export function evaluate(data, now = Date.now()) {
  const checks = []
  const add = (check, status, details, runs = []) => checks.push({ check, status, details, runs })
  if (data.error) {
    add('GitHub metadata', 'Unknown', data.error)
    return { status: 'Unknown', now, checks }
  }
  const runs = newest(data.publisher)
  const scheduled = runs.filter(run => run.event === 'schedule')
  const latest = scheduled[0]
  const success = newest(scheduled.filter(run => syncJob(run)?.conclusion === 'success'))[0]
  const successfulAt = success && syncJob(success).completed_at
  add('Last successful Notion sync', !success ? 'Unknown' : age(now, successfulAt) > 24 * HOUR ? 'Action Required' : age(now, successfulAt) > 6 * HOUR ? 'Warning' : 'Healthy',
    success ? `${successfulAt}; checkout ${success.head_sha}. Successful no-change syncs count.` : 'No verified scheduled sync success in available history.', success ? [success] : [])
  const unresolved = scheduled.filter(run => bad.has(syncJob(run)?.conclusion) && (!success || time(syncJob(run).completed_at) > time(successfulAt)))
  const sustained = unresolved.length >= 3 && time(unresolved[0].created_at) - time(unresolved.at(-1).created_at) >= HOUR
  const failed = scheduled.filter(run => bad.has(syncJob(run)?.conclusion))
  const cancelled = scheduled.filter(run => syncJob(run)?.conclusion === 'cancelled').length
  add('Recent synchronization failures', sustained ? 'Action Required' : unresolved.length ? 'Warning' : 'Healthy',
    `${failed.length} failed syncs and ${cancelled} cancelled in bounded history; ${unresolved.length} failures since recovery. Cancellations alone do not escalate.`, unresolved.slice(0, 3))
  add('Publishing schedule', !latest ? 'Unknown' : age(now, latest.created_at) > 24 * HOUR ? 'Action Required' : age(now, latest.created_at) > 6 * HOUR ? 'Warning' : 'Healthy',
    latest ? `Last scheduled execution ${latest.created_at}; approximately every 15 minutes, with 6h warning / 24h escalation grace. Manual runs do not reset this clock.` : 'No scheduled execution available.', latest ? [latest] : [])
  const manual = runs.find(run => run.event === 'workflow_dispatch')
  add('Most recent publishing execution', 'Informational', runs[0] ? `${runs[0].created_at}; ${runs[0].event}; ${runs[0].status}/${runs[0].conclusion ?? 'pending'}. Manual runs may be read-only${manual ? ` (latest ${manual.created_at})` : ''}.` : 'Unavailable.', runs.slice(0, 1))
  const job = runs[0] && syncJob(runs[0])
  const steps = job?.steps ?? []
  const stage = name => steps.find(step => step.name === name)?.conclusion
  const imported = stage('Read Published articles and validate MDX')
  const validated = stage('Validate updated site before committing')
  const committed = stage('Commit only publisher-owned changes')
  let evidence = 'Stage metadata unavailable; inspect the sync job. A green run does not prove a specific article revision transferred.'
  if (imported === 'failure') evidence = 'Notion read/conversion/MDX validation failed; no successful reconciliation is established.'
  else if (imported === 'success') {
    evidence = 'Notion read/conversion/MDX validation succeeded.'
    if (validated === 'failure') evidence += ' Post-import site validation failed before commit; imported changes were not transferred.'
    else if (committed === 'failure') evidence += ' Commit/push stage failed; verify remote content identity before retrying.'
    else if (committed === 'success') evidence += ' Commit/push stage succeeded; verify the resulting content SHA and deployment separately.'
    else if (job.conclusion === 'success' && validated === 'skipped' && committed === 'skipped') evidence += ' No content commit was needed (or this was a read-only manual run); no new deployment is established.'
    else evidence += ' Content transfer is not yet established.'
  }
  add('Latest publisher stage evidence', 'Informational', evidence, runs.slice(0, 1))
  add('Last content-changing sync', 'Informational', data.content ? `${data.content.date}; ${data.content.sha}. Latest commit touching the publisher manifest; attribution to a sync is not guaranteed.` : 'Unavailable in bounded history; new articles are not required.')
  const deployment = data.deployment
  add('Latest successful Pages deployment', deployment ? 'Healthy' : 'Unknown', deployment ? `${deployment.date}; deployed ${deployment.sha}. Pages success alone does not prove public propagation.` : 'No successful Pages deployment could be verified.')
  if (data.content && deployment) {
    const waiting = age(now, data.content.date)
    add('Content deployment', data.covered ? 'Healthy' : waiting > 6 * HOUR ? 'Action Required' : 'Warning',
      data.covered ? 'Successful Pages revision contains the latest manifest commit.' : 'Latest manifest commit is not in the last verified Pages revision. Allow 1h for build, queue and propagation; after 6h investigate and redeploy.')
  }
  const candidates = [...runs, ...data.deployRuns]
  const verified = candidates.filter(run => deployJobs(run).some(job => /(^| \/ )verify$/.test(job.name) && job.conclusion === 'success'))
  const lastVerified = Math.max(0, ...verified.flatMap(run => deployJobs(run).filter(job => /(^| \/ )verify$/.test(job.name)).map(job => time(job.completed_at))))
  if (!verified.length) add('Post-deploy verification evidence', 'Unknown', 'No successful verification job in bounded history; inspect deployment and run the existing verification workflow.')
  const broken = candidates.filter(run => deployJobs(run).some(job => bad.has(job.conclusion) && time(job.completed_at) > lastVerified))
  add('Unresolved deployment / verification problems', broken.some(run => age(now, run.created_at) > HOUR) ? 'Action Required' : broken.length ? 'Warning' : 'Healthy',
    broken.length ? 'Build, Pages or post-deploy verification failed without a later verified recovery. Rerun deployment; a no-op sync does not redeploy.' : 'No unresolved failure observed in bounded deployment history.', broken.slice(0, 3))
  const pending = candidates.filter(run => run.status !== 'completed' && age(now, run.created_at) > HOUR)
  if (pending.length) add('Pending workflow executions', 'Warning', 'Execution has been queued or running for more than 1h; inspect queue and concurrency before retrying.', pending.slice(0, 3))
  const status = ['Action Required', 'Unknown', 'Warning'].find(status => checks.some(check => check.status === status)) ?? 'Healthy'
  return { status, now, checks }
}

export function render(report, repository) {
  const commits = text => text.replace(/\b[a-f0-9]{40}\b/g, sha => `[${sha.slice(0, 12)}](https://github.com/${repository}/commit/${sha})`)
  const link = run => `[run ${run.id}](https://github.com/${repository}/actions/runs/${run.id})`
  return `# Simpyll — Weekly Notion Publishing Audit\n\nAudit date: ${new Date(report.now).toISOString().slice(0, 10)} (UTC)\n\nOverall status: **${report.status}**\n\n| Check | Result | Details |\n|---|---|---|\n${report.checks.map(row => `| ${row.check} | ${row.status} | ${commits(row.details)} ${row.runs.map(link).join(', ')} |`).join('\n')}\n\nHistory is bounded, not a complete weekly failure count. Unknown is never healthy. Scheduled workflows can be delayed, skipped or disabled. This audit does not probe website availability.\n\nRecovery: inspect linked sync jobs, rerun the publisher on main (dry-run first), inspect its content commit, then rerun deployment if needed. Confirm recovery with a manual audit. See [runbook](https://github.com/${repository}/blob/main/docs/PUBLISHING-HEALTH.md).\n`
}

export function githubClient({ repository, token, fetcher = fetch }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || !token) throw new Error('configuration')
  return async path => {
    let response
    try {
      response = await fetcher(`https://api.github.com/repos/${repository}/${path}`, {
        headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        signal: AbortSignal.timeout(15_000), redirect: 'error',
      })
    } catch { throw new Error('network') }
    if (!response.ok) throw new Error([401, 403, 429].includes(response.status) ? 'permission-or-rate-limit' : 'api')
    try { return await response.json() } catch { throw new Error('malformed') }
  }
}

export async function collect(get) {
  const list = async (workflow, extra = '') => {
    const payload = await get(`actions/workflows/${workflow}/runs?branch=main&per_page=20${extra}`)
    if (!Array.isArray(payload.workflow_runs) || !payload.workflow_runs.every(validRun)) throw new Error('malformed')
    return payload.workflow_runs
  }
  const publisher = await list('notion-publish.yml')
  // An older successful scheduled run gives a stale-success timestamp even when
  // the latest twenty executions all failed. Its sync job is still inspected.
  const older = await list('notion-publish.yml', '&event=schedule&status=success')
  const map = new Map([...publisher, ...older.slice(0, 1)].map(run => [run.id, run]))
  const deployRuns = await list('deploy.yml')
  for (const run of [...map.values(), ...deployRuns]) {
    const payload = await get(`actions/runs/${run.id}/jobs?per_page=100&filter=latest`)
    if (!Array.isArray(payload.jobs) || payload.total_count !== payload.jobs.length || payload.jobs.some(job => typeof job.name !== 'string' || typeof job.status !== 'string' || (job.status === 'completed' && (!Number.isFinite(time(job.completed_at)) || typeof job.conclusion !== 'string')))) throw new Error('malformed')
    run.jobs = payload.jobs
    if (run.status === 'completed' && map.has(run.id) && !syncJob(run)) throw new Error('missing-sync-job')
  }
  const commits = await get('commits?sha=main&path=.notion%2Fpublished.json&per_page=1')
  if (!Array.isArray(commits)) throw new Error('malformed')
  const commit = commits[0]
  const content = commit ? { sha: commit.sha, date: commit.commit?.committer?.date } : null
  if (content && (!/^[a-f0-9]{40}$/.test(content.sha) || !Number.isFinite(time(content.date)))) throw new Error('malformed')
  const deployments = await get('deployments?environment=github-pages&per_page=20')
  if (!Array.isArray(deployments)) throw new Error('malformed')
  let deployment = null
  for (const item of deployments) {
    if (!Number.isSafeInteger(item.id) || !/^[a-f0-9]{40}$/.test(item.sha)) throw new Error('malformed')
    const statuses = await get(`deployments/${item.id}/statuses?per_page=100`)
    if (!Array.isArray(statuses) || !statuses[0] || typeof statuses[0].state !== 'string') throw new Error('malformed')
    // Older successful deployments are normally marked inactive by Pages.
    const successful = statuses.find(status => status.state === 'success')
    if (successful) {
      if (!Number.isFinite(time(successful.created_at))) throw new Error('malformed')
      deployment = { sha: item.sha, date: successful.created_at }
      break
    }
  }
  let covered = false
  if (content && deployment) {
    const comparison = await get(`compare/${content.sha}...${deployment.sha}`)
    if (!['identical', 'ahead', 'behind', 'diverged'].includes(comparison.status)) throw new Error('malformed')
    covered = ['identical', 'ahead'].includes(comparison.status)
  }
  return { publisher: [...map.values()], deployRuns, content, deployment, covered }
}

export async function audit(get, now = Date.now()) {
  try { return evaluate(await collect(get), now) } catch {
    return evaluate({ error: 'Unable to verify GitHub metadata (permissions, rate limit, network, empty job metadata or malformed response). Check actions:read / deployments:read and rerun; no API payload or credentials are logged.' }, now)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let report
  try { report = await audit(githubClient({ repository: process.env.GITHUB_REPOSITORY, token: process.env.GITHUB_TOKEN })) } catch {
    report = evaluate({ error: 'Missing or invalid audit configuration.' })
  }
  const markdown = render(report, /^[\w.-]+\/[\w.-]+$/.test(process.env.GITHUB_REPOSITORY ?? '') ? process.env.GITHUB_REPOSITORY : 'simpyll/simpyll')
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown)
  console.log(markdown)
  // Unknown must not produce a green check. Warnings intentionally remain green.
  process.exitCode = ['Action Required', 'Unknown'].includes(report.status) ? 1 : 0
}
