import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { measureAssets, violations } from './assets.mjs'
import { projectHead } from './route-assets.mjs'

const limits = { initialJS: 1000, pageJS: 1000, routeJS: 1000, css: 1000, images: 1000, fonts: 1000, total: 5000, mediaTotal: 5000, individualImage: 1000, individualAsset: 5000 }
test('budgets measure gzip text, raw media and deferred imports from manifest without hashed names', async () => {
  const root = await mkdtemp(join(tmpdir(), 'perf-budget-'))
  try {
    await mkdir(join(root, '.vite'))
    await mkdir(join(root, 'projects/example'), { recursive: true })
    const manifest = { 'index.html': { isEntry: true, file: 'entry-123.js', css: ['style.css'], dynamicImports: ['src/pages/ProjectDetail.tsx'] }, 'src/pages/ProjectDetail.tsx': { file: 'detail-456.js', imports: ['index.html'], css: ['detail.css'] } }
    const files = { '.vite/manifest.json': JSON.stringify(manifest), 'entry-123.js': 'a'.repeat(3000), 'detail-456.js': 'b'.repeat(2000), 'style.css': '@font-face{src:url(/font.woff2)}', 'detail.css': '.case{color:red}', 'font.woff2': 'f'.repeat(400), 'small.png': 'i'.repeat(120), 'large.png': 'i'.repeat(600), 'index.html': '<script type="module" src="/entry-123.js"></script><img src="/small.png" srcset="/small.png 320w,/large.png 1600w">', 'projects/example/index.html': '<script type="module" src="/entry-123.js"></script><main>Case</main>' }
    for (const [name, value] of Object.entries(files)) await writeFile(join(root, name), value)
    const report = await measureAssets(root)
    assert.ok(report.initialJS < 100)
    assert.equal(report.routeChunks.length, 1)
    assert.equal(report.pages[0].images, 600)
    assert.equal(report.pages[0].fonts, 400)
    assert.ok(report.pages[1].initialJS > report.pages[0].initialJS)
    assert.deepEqual(violations(report, limits), [])
    for (const key of ['initialJS', 'pageJS', 'routeJS', 'css', 'images', 'fonts', 'total', 'mediaTotal', 'individualImage', 'individualAsset']) assert.ok(violations(report, { ...limits, [key]: 1 }).some(message => message.includes('bytes > 1 bytes')), key)
    assert.throws(() => violations(report, { ...limits, css: 0 }), /Invalid budget/)
    const head = projectHead(manifest, '/projects/example')
    assert.match(head, /modulepreload.*detail-456.js/)
    assert.match(head, /stylesheet.*detail.css/)
    assert.equal(projectHead(manifest, '/'), '')
    await rm(join(root, 'large.png'))
    await assert.rejects(measureAssets(root), /ENOENT/)
  } finally { await rm(root, { recursive: true, force: true }) }
})
test('Lighthouse reports remain advisory and reuse the exact validated artifact outside required gate', async () => {
  const workflow = await readFile('.github/workflows/validate.yml', 'utf8')
  assert.match(workflow, /Run deterministic performance budget tests/)
  assert.match(workflow, /PERF_ROUTES:.*github.event_name == 'pull_request'/)
  assert.match(workflow, /needs: build/)
  assert.match(workflow, /npm run perf:lighthouse/)
  assert.match(workflow, /needs: \[build, browser, fixtures\]/)
  const runner = await readFile('scripts/performance/lighthouse.mjs', 'utf8')
  assert.match(runner, /fieldINP: null/)
})
