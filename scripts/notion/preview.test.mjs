import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, cp, rm, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { request } from 'node:http'
import { join } from 'node:path'
import { options, prepare, previewServer, privateWorkspace } from './preview.mjs'
import { fixture, page, PAGE, blocks, png } from './fixtures/api.mjs'
import { notionClient } from './publisher.mjs'

const root = process.cwd()
async function workspace(t) {
  const dir = await mkdtemp(join(tmpdir(), 'preview-test-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  for (const path of ['src', 'public']) await cp(join(root, path), join(dir, path), { recursive: true })
  return dir
}
test('explicit local intent, valid IDs and credentials required', () => {
  for (const args of [[], ['--page', PAGE], ['--page', '../bad', '--allow-unpublished']]) assert.throws(() => options(args, {}))
  assert.throws(() => options(['--page', PAGE, '--allow-unpublished'], { CI: 'true' }))
  assert.equal(options(['--page', PAGE, '--allow-unpublished'], {}).pageId, PAGE)
  assert.throws(() => notionClient(''), /required/)
})
for (const status of ['Draft', 'Ready']) test(`${status} uses production escaping and isolated MDX/media without writes to source`, async t => {
  const dir = await workspace(t)
  const before = await readFile('.notion/published.json')
  const names = await readdir('src/content/blog')
  const draft = page(); draft.properties.Status.status.name = status
  const { api, calls } = fixture({ pages: [draft] })
  const result = await prepare({ root, workspace: dir, api, pageId: PAGE, imageDownloader: async () => ({ bytes: png, extension: 'png' }) })
  assert.equal(result.slug, 'notion-fixture')
  const mdx = await readFile(join(dir, 'src/content/blog/notion-fixture.mdx'), 'utf8')
  assert.match(mdx, /preview:/); assert.match(mdx, /Fixture intro/); assert.match(mdx, /images\/preview\/1.png/)
  assert.doesNotMatch(mdx, /signature=one|<script>/)
  assert.equal(calls.filter(c => c.path.startsWith('pages/')).length, 2)
  assert.ok(calls.every(c => !c.body))
  assert.deepEqual(await readFile('.notion/published.json'), before)
  assert.deepEqual(await readdir('src/content/blog'), names)
})
for (const change of [{ archived: true }, { in_trash: true }, { properties: {} }]) test('ineligible pages rejected before content reads', async t => {
  const dir = await workspace(t)
  const { api, calls } = fixture({ pages: [page(change)] })
  await assert.rejects(prepare({ root, workspace: dir, api, pageId: PAGE }))
  assert.equal(calls.length, 1)
})
test('Published is never fetched as an unpublished preview; changed status and API errors fail closed', async t => {
  const dir = await workspace(t)
  await assert.rejects(prepare({ root, workspace: dir, api: fixture().api, pageId: PAGE }))
  const draft = page(); draft.properties.Status.status.name = 'Draft'
  await assert.rejects(prepare({ root, workspace: dir, api: fixture({ pages: [draft], latest: page() }).api, pageId: PAGE }))
  await assert.rejects(prepare({ root, workspace: dir, api: async () => { throw new Error('HTTP 404') }, pageId: PAGE }))
})
test('unsafe links and invalid slugs fail before workspace writes', async t => {
  const dir = await workspace(t)
  const draft = page(); draft.properties.Status.status.name = 'Draft'
  draft.properties.Slug.rich_text[0].text.content = '../escape'; draft.properties.Slug.rich_text[0].plain_text = '../escape'
  await assert.rejects(prepare({ root, workspace: dir, api: fixture({ pages: [draft] }).api, pageId: PAGE }), /Slug/)
  draft.properties.Slug.rich_text[0].plain_text = 'notion-fixture'
  const bad = structuredClone(blocks); bad[0].paragraph.rich_text[0].text.link = { url: 'javascript:alert(1)' }
  await assert.rejects(prepare({ root, workspace: dir, api: fixture({ pages: [draft], content: bad }).api, pageId: PAGE }))
})
test('static server rejects host rebinding, non-GET, hidden files and traversal; no-store headers', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'preview-http-')); t.after(() => rm(dir, { recursive: true, force: true }))
  await writeFile(join(dir, 'index.html'), '<p>Private fixture</p>')
  const server = previewServer(dir)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => { server.closeAllConnections(); server.close() })
  const url = `http://127.0.0.1:${server.address().port}`
  const response = await fetch(url)
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.match(response.headers.get('x-robots-tag'), /noindex/)
  assert.equal(await new Promise(resolve => { const req = request(url, { headers: { Host: 'evil.example' } }, res => { res.resume(); resolve(res.statusCode) }); req.end() }), 403)
  assert.equal((await fetch(url, { method: 'POST' })).status, 403)
  assert.equal((await fetch(url + '/.git/config')).status, 404)
  assert.equal((await fetch(url + '/%2e%2e%2fpackage.json')).status, 404)
})

test('private workspace enforces owner-only permissions and cleans successful and failed operations', async () => {
  for (const fail of [false, true]) {
    let path
    const operation = privateWorkspace(async workspace => {
      path = workspace
      const { stat } = await import('node:fs/promises')
      assert.equal((await stat(workspace)).mode & 0o777, 0o700)
      await writeFile(join(workspace, 'private.txt'), 'synthetic secret')
      if (fail) throw new Error('fixture failure')
    })
    if (fail) await assert.rejects(operation, /fixture failure/)
    else await operation
    await assert.rejects(readFile(join(path, 'private.txt')), { code: 'ENOENT' })
  }
})

test('deployment remains main-only and CI uses synthetic preview fixture without secrets', async () => {
  const deploy = await readFile('.github/workflows/deploy.yml', 'utf8')
  assert.match(deploy, /build:\n    if: github.ref == 'refs\/heads\/main'/)
  assert.match(deploy, /git merge-base --is-ancestor HEAD origin\/main/)
  const validate = await readFile('.github/workflows/validate.yml', 'utf8')
  assert.match(validate, /node --test scripts\/preview-notion-build.test.mjs/)
  assert.doesNotMatch(validate, /npm run preview:notion|NOTION_API_TOKEN/)
})

test('SIGINT during actual CLI preparation removes the private workspace', { timeout: 60_000 }, async () => {
  // The child loads the real CLI module graph before the 50ms SIGINT lands; under
  // a fully parallel local `npm test` run that preparation can exceed 30s on a
  // loaded machine. The assertion is unchanged: the workspace must be removed.
  // CI runs this in smaller batches and stays well inside either budget.
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const before = (await readdir(tmpdir())).filter(name => name.startsWith('simpyll-private-preview-')).sort()
  // Synthetic cancellation fixture: no live token, API call, build or CI artifact.
  const code = `import { run } from './scripts/notion/preview.mjs';
    delete process.env.CI; delete process.env.GITHUB_ACTIONS;
    process.env.NOTION_API_TOKEN = 'synthetic-never-sent';
    setTimeout(() => process.kill(process.pid, 'SIGINT'), 50);
    await run(['--page', '${PAGE}', '--allow-unpublished']);`
  await promisify(execFile)(process.execPath, ['--input-type=module', '-e', code], { cwd: root })
  const after = (await readdir(tmpdir())).filter(name => name.startsWith('simpyll-private-preview-')).sort()
  assert.deepEqual(after, before)
})
