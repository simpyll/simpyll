// Read-only GitHub timing evidence; never executes downloaded workflow content.
// node scripts/ci-timings.mjs RUN_ID... > timings.json
import { writeFile } from 'node:fs/promises'
const ids = process.argv.slice(2)
if (!ids.length) throw new Error('Usage: node scripts/ci-timings.mjs RUN_ID...')
const headers = { Accept: 'application/vnd.github+json' }
if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`
async function get(path) {
  const response = await fetch(`https://api.github.com/repos/simpyll/simpyll/${path}`, { headers })
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${path}`)
  return response.json()
}
const seconds = (a, b) => (Date.parse(b) - Date.parse(a)) / 1000
const evidence = []
for (const id of ids) {
  if (!/^\d+$/.test(id)) throw new Error('Run IDs must be numeric')
  const run = await get(`actions/runs/${id}`)
  const jobs = []
  for (let page = 1; ; page++) {
    const batch = await get(`actions/runs/${id}/attempts/${run.run_attempt}/jobs?per_page=100&page=${page}`)
    jobs.push(...batch.jobs)
    if (batch.jobs.length < 100) break
  }
  if (run.status !== 'completed') throw new Error(`Run ${id} is still ${run.status}`)
  const start = jobs.map(j => j.started_at).filter(Boolean).sort()[0]
  const end = jobs.map(j => j.completed_at).filter(Boolean).sort().at(-1)
  evidence.push({ id: run.id, attempt: run.run_attempt, url: run.html_url,
    workflow: run.name, event: run.event, sha: run.head_sha, conclusion: run.conclusion,
    created_at: run.created_at, started_at: start, completed_at: end,
    // Includes queue/gaps; don't sum parallel job durations to measure feedback.
    wall_seconds: seconds(run.created_at, end),
    initial_queue_seconds: seconds(run.created_at, start),
    execution_span_seconds: seconds(start, end),
    jobs: jobs.map(j => ({ name: j.name, conclusion: j.conclusion,
      started_at: j.started_at, completed_at: j.completed_at,
      seconds: seconds(j.started_at, j.completed_at),
      steps: j.steps.map(s => ({ name: s.name, conclusion: s.conclusion,
        started_at: s.started_at, completed_at: s.completed_at,
        seconds: seconds(s.started_at, s.completed_at) })) })) })
}
const output = JSON.stringify(evidence, null, 2) + '\n'
process.stdout.write(output)
if (process.env.GITHUB_STEP_SUMMARY) {
  await writeFile(process.env.GITHUB_STEP_SUMMARY,
    '| Run | Result | Wall seconds | Initial queue | Execution span |\n|---|---|---:|---:|---:|\n' +
    evidence.map(r => `| [${r.id}](${r.url}) | ${r.conclusion} | ${r.wall_seconds} | ${r.initial_queue_seconds} | ${r.execution_span_seconds} |`).join('\n') + '\n', { flag: 'a' })
}
