import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import { chromium } from '@playwright/test'
import desktop from 'lighthouse/core/config/desktop-config.js'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { execFileSync, spawn } from 'node:child_process'
import { representativeRoutes } from './routes.mjs'

const origin = process.env.PERF_ORIGIN || 'http://127.0.0.1:4175'
const out = process.env.PERF_OUTPUT || 'artifacts/performance'
const runs = Number(process.env.PERF_RUNS || 3)
if (!Number.isInteger(runs) || runs < 1 || runs > 10) throw new Error('PERF_RUNS must be 1–10')
const routes = await representativeRoutes()
const selected = process.env.PERF_ROUTES ? process.env.PERF_ROUTES.split(',') : routes
if (selected.some(p => !routes.includes(p))) throw new Error('PERF_ROUTES must select representative routes')
await mkdir(out, { recursive: true })
let server, chrome
const results = []
const started = Date.now()
try {
  if (!process.env.PERF_ORIGIN) {
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], { stdio: 'inherit' })
    let ready = false
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw new Error('Preview server exited')
      try { if ((await fetch(origin)).ok) { ready = true; break } } catch { /* starting */ }
      await new Promise(r => setTimeout(r, 100))
    }
    if (!ready) throw new Error('Preview server did not become ready')
  }
  chrome = await launch({ chromePath: process.env.CHROME_PATH || chromium.executablePath(), chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'] })
  for (const route of selected) for (const profile of ['mobile', 'desktop']) for (let run = 1; run <= runs; run++) {
    const url = new URL(route, origin).href
    console.log(`${profile} ${url} run ${run}/${runs}`)
    const result = await lighthouse(url, { port: chrome.port, logLevel: 'error', output: ['json', 'html'], onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] }, profile === 'desktop' ? desktop : undefined)
    const lhr = result.lhr
    const file = `${profile}-${route.replace(/[^a-z0-9]/gi, '_')}-${run}`
    await writeFile(`${out}/${file}.json`, result.report[0])
    await writeFile(`${out}/${file}.html`, result.report[1])
    if (lhr.runtimeError) throw new Error(`${url}: ${lhr.runtimeError.message}`)
    const value = id => lhr.audits[id]?.numericValue ?? null
    const resources = Object.fromEntries((lhr.audits['resource-summary']?.details?.items || []).map(x => [x.resourceType, x.transferSize]))
    results.push({ route, profile, run, lighthouseVersion: lhr.lighthouseVersion, userAgent: lhr.userAgent, settings: lhr.configSettings, scores: Object.fromEntries(Object.entries(lhr.categories).map(([k,v]) => [k, v.score])), lcp: value('largest-contentful-paint'), cls: value('cumulative-layout-shift'), fcp: value('first-contentful-paint'), tbt: value('total-blocking-time'), speedIndex: value('speed-index'), jsExecution: value('bootup-time'), resources, warnings: lhr.runWarnings })
    await writeFile(`${out}/runs.json`, JSON.stringify(results, null, 2))
  }
} finally {
  await chrome?.kill()
  server?.kill()
}
const median = xs => { const a = xs.filter(x => x !== null).sort((a,b) => a-b); return a.length ? (a[Math.floor((a.length-1)/2)] + a[Math.ceil((a.length-1)/2)]) / 2 : null }
const summaries = []
for (const route of selected) for (const profile of ['mobile', 'desktop']) {
  const sample = results.filter(r => r.route === route && r.profile === profile)
  const metrics = Object.fromEntries(['lcp','cls','fcp','tbt','speedIndex','jsExecution'].map(k => [k, median(sample.map(r => r[k]))]))
  const scores = Object.fromEntries(Object.keys(sample[0].scores).map(k => [k, median(sample.map(r => r.scores[k]))]))
  const resources = Object.fromEntries(Object.keys(sample[0].resources).map(k => [k, median(sample.map(r => r.resources[k]))]))
  summaries.push({ route, profile, runs, scores, ...metrics, resources })
  if (scores.performance < (profile === 'mobile' ? .9 : .95) || metrics.lcp > 2500 || metrics.cls > .1) console.warn(`ADVISORY ${profile} ${route}: performance=${scores.performance}, LCP=${metrics.lcp}ms, CLS=${metrics.cls}; inspect HTML report`)
}
const deployment = JSON.parse(await readFile('dist/deployment.json', 'utf8'))
let productionSha = null
if (process.env.PERF_ORIGIN) {
  try {
    const response = await fetch(new URL('/deployment.json', origin))
    if (response.ok) productionSha = (await response.json()).sha ?? null
  } catch { /* Remote deployment identity may not be exposed. */ }
}
await writeFile(`${out}/summary.json`, JSON.stringify({ sha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), buildSha: deployment.sha, productionSha, origin, timestamp: new Date().toISOString(), elapsedSeconds: (Date.now()-started)/1000, environment: { node: process.version, platform: process.platform, arch: process.arch, ci: !!process.env.CI }, fieldINP: null, summaries }, null, 2))
console.table(summaries.map(s => ({ route: s.route, profile: s.profile, performance: s.scores.performance, LCP: s.lcp, CLS: s.cls, TBT: s.tbt })))
