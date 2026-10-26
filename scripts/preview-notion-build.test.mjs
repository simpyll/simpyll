import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyWorkspace, prepare } from './notion/preview.mjs'
import { fixture, page, PAGE, png } from './notion/fixtures/api.mjs'
const exec = promisify(execFile)
async function snapshot(root, paths) {
  const result = {}
  async function walk(path) {
    let entries
    try { entries = await readdir(join(root, path), { withFileTypes: true }) } catch (e) { if (e.code === 'ENOENT') return; throw e }
    for (const entry of entries) {
      const name = `${path}/${entry.name}`
      if (entry.isDirectory()) await walk(name)
      else if (entry.isFile()) result[name] = createHash('sha256').update(await readFile(join(root, name))).digest('hex')
    }
  }
  for (const path of paths) await walk(path)
  return result
}
test('private preview uses real production build; source inputs and public artifacts remain byte-identical', { timeout: 240_000 }, async t => {
  const root = process.cwd()
  const paths = ['src', 'public', '.notion', 'dist', 'dist-server', 'content']
  const before = await snapshot(root, paths)
  const workspace = await mkdtemp(join(tmpdir(), 'private-build-test-'))
  t.after(() => rm(workspace, { recursive: true, force: true }))
  await copyWorkspace(root, workspace)
  const draft = page(); draft.properties.Status.status.name = 'Draft'
  await prepare({ root, workspace, pageId: PAGE, api: fixture({ pages: [draft] }).api, imageDownloader: async () => ({ bytes: png, extension: 'png' }) })
  try { await exec('npm', ['run', 'build'], { cwd: workspace, maxBuffer: 8e6 }) } catch (e) { throw new Error(e.stdout + e.stderr) }
  const html = await readFile(join(workspace, 'dist/blog/notion-fixture/index.html'), 'utf8')
  for (const text of ['Draft Preview', 'Not Published', 'Fixture intro', '<picture>', '<figcaption>Fixture image</figcaption>', 'First heading']) assert.ok(html.includes(text), text)
  assert.doesNotMatch(html, /signature=one|<script> &/)
  assert.deepEqual(await snapshot(root, paths), before)
  await rm(workspace, { recursive: true, force: true })
  await assert.rejects(readFile(join(workspace, 'dist/blog/notion-fixture/index.html')), { code: 'ENOENT' })
})
