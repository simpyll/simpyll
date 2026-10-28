import { readFile, writeFile } from 'node:fs/promises'
import { compile } from '@mdx-js/mdx'
import { notionClient } from './notion/publisher.mjs'
import { addHealth, digest, monitorWatchdog, graceHours, reconcileArticles, updateIncidents, validateReport } from './notion/incidents.mjs'
import { audit, githubClient } from './publishing-health.mjs'

const repository = process.env.GITHUB_REPOSITORY
const path = process.env.INCIDENT_REPORT ?? '/tmp/publishing-incidents.json'
try {
  const read = githubClient({ repository, token: process.env.GITHUB_TOKEN })
  if (process.argv.includes('--write')) {
    const api = async (route, method = 'GET', body) => {
      const response = await fetch(`https://api.github.com/repos/${repository}${route ? '/' + route : ''}`, {
        method, headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) throw new Error('GitHub issue API failed')
      return response.status === 204 ? null : response.json()
    }
    let report
    try { report = process.argv.includes('--watchdog') ? await monitorWatchdog(read, { run: Number(process.env.GITHUB_RUN_ID) }) : validateReport(JSON.parse(await readFile(path, 'utf8'))) } catch {
      // Reader failure cannot silently suppress the independent system incident.
      const key = digest('simpyll-monitor-reader-failure')
      report = { version: 1, at: Date.now(), complete: false, articles: [], systems: [{ key, revision: key, state: 'missing', category: 'monitor-evidence' }], run: Number(process.env.GITHUB_RUN_ID), lastSuccess: null }
    }
    if (Math.abs(Date.now() - report.at) > 3600000 || report.run !== Number(process.env.GITHUB_RUN_ID)) throw new Error('Stale report')
    await updateIncidents({ api, repository, report, hours: graceHours(process.env.PUBLISHING_GRACE_HOURS ?? 6) })
    console.log('Publishing incident state reconciled. Delivery acceptance is separate.')
    if (report.systems.some(row => row.state === 'missing')) process.exitCode = 1
  } else {
    const report = await reconcileArticles({ root: process.cwd(), api: notionClient(process.env.NOTION_API_TOKEN), pageId: process.env.NOTION_PAGE_ID, run: Number(process.env.GITHUB_RUN_ID), validate: mdx => compile(mdx) })
    addHealth(report, await audit(read))
    await writeFile(path, JSON.stringify(report))
    console.log('Sanitized publishing observation recorded; no source details emitted.')
    if (report.systems.some(row => row.state === 'missing')) process.exitCode = 1
  }
} catch {
  console.error('Publishing incident check failed. Inspect trusted configuration, API permissions and workflow metadata; private payloads are suppressed.')
  process.exitCode = 1
}
