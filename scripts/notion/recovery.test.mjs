import test from 'node:test'
import assert from 'node:assert/strict'
import { unlink, symlink, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { recover, parseArgs } from './recovery.mjs'
import { fixture, first, second, post, image, manual, hash } from './recovery-fixture.mjs'
async function setup(t) { const f = await fixture(); t.after(f.cleanup); return f }
const options = f => ({ root: f.root, ref: f.ref, articles: [first] })

test('single article restores MDX, identity, aliases and image without touching other articles; dry-run/idempotence', async t => {
  const f = await setup(t)
  const other = await f.read('src/content/blog/untouched.mdx'), manualBytes = await f.read(manual)
  await unlink(join(f.root, post)); await unlink(join(f.root, image))
  const before = f.git(['status', '--porcelain'])
  const plan = await recover(options(f))
  assert.equal(plan.mode, 'dry-run'); assert.ok(plan.writes.includes(post)); assert.ok(plan.writes.includes(image))
  assert.equal(f.git(['status', '--porcelain']), before)
  f.git(['add', '-A']); f.git(['commit', '-qm', 'record damaged state'])
  await recover({ ...options(f), apply: true })
  assert.equal((await f.read(post)).toString(), f.files.get(post))
  const restored = JSON.parse(await f.read('.notion/published.json'))
  assert.deepEqual(restored.articles[first], f.m.articles[first])
  assert.deepEqual(await f.read(manual), manualBytes); assert.deepEqual(await f.read('src/content/blog/untouched.mdx'), other)
  assert.deepEqual((await recover({ ...options(f), apply: true })).writes, [])
})
test('consistent snapshot repairs corrupt manifest and files using committed ownership', async t => {
  const f = await setup(t)
  await f.put('.notion/published.json', '{broken'); await f.put(image, 'corrupt'); await unlink(join(f.root, post))
  await assert.rejects(recover(options(f)), /Corrupted/)
  f.git(['add', '-A']); f.git(['commit', '-qm', 'record damaged state'])
  const plan = await recover({ root: f.root, ref: f.ref, all: true, ownershipRef: f.ref, apply: true })
  assert.ok(plan.writes.includes('.notion/published.json'))
  assert.deepEqual(JSON.parse(await f.read('.notion/published.json')), f.m)
  for (const [p, bytes] of f.files) assert.equal(hash(await f.read(p)), hash(bytes))
  assert.equal(plan.writes.some(p => p === manual || p.includes('configuration')), false)
})
test('multiple selected IDs recover together', async t => {
  const f = await setup(t); await unlink(join(f.root, post))
  f.git(['add', '-A']); f.git(['commit', '-qm', 'record damaged state'])
  assert.deepEqual((await recover({ ...options(f), articles: [first, second], apply: true })).articles, [first, second])
})
test('accidental unpublish restores only selected mapping', async t => {
  const f = await setup(t), m = structuredClone(f.m)
  m.articles[first].status = 'unpublished'; delete m.files[post]
  await f.put('.notion/published.json', JSON.stringify(m)); await unlink(join(f.root, post))
  f.git(['add', '-A']); f.git(['commit', '-qm', 'record damaged state'])
  await recover({ ...options(f), apply: true })
  assert.deepEqual(JSON.parse(await f.read('.notion/published.json')).articles, f.m.articles)
})
test('slug rollback removes only current owned path and validates alias collisions', async t => {
  const f = await setup(t), m = structuredClone(f.m), newer = 'src/content/blog/newer.mdx'
  const source = f.files.get(post).replaceAll('recovered', 'newer')
  m.articles[first].slug = 'newer'; m.articles[first].history.push('recovered')
  delete m.files[post]; m.files[newer] = hash(source)
  await unlink(join(f.root, post)); await f.put(newer, source); await f.put('.notion/published.json', JSON.stringify(m))
  f.git(['add', '-A']); f.git(['commit', '-qm', 'record damaged state'])
  const plan = await recover({ ...options(f), apply: true })
  assert.deepEqual(plan.deletes, [newer]); await assert.rejects(f.read(newer), { code: 'ENOENT' })
})
test('manual/unowned file collision refuses even identical content', async t => {
  const f = await setup(t), m = structuredClone(f.m)
  m.articles[first].status = 'unpublished'; delete m.files[post]
  await f.put('.notion/published.json', JSON.stringify(m))
  await assert.rejects(recover({ ...options(f), apply: true }), /Manual\/unowned/)
})
test('manual identity replacing owned file is protected', async t => {
  const f = await setup(t); await f.put(post, await f.read(manual))
  await assert.rejects(recover({ ...options(f), apply: true }), /Manual article identity/)
})
test('manual route alias collision refuses before writing', async t => {
  const f = await setup(t)
  await f.put(manual, 'export const metadata = { articleId: "manual:fixture", redirectFrom: ["original"] }\n\nManual\n')
  await assert.rejects(recover(options(f)), /collision/)
})
test('invalid and unavailable revisions and options are rejected', async t => {
  const f = await setup(t)
  for (const ref of ['--help', 'HEAD:secret', '$(touch bad)', 'missing-revision']) await assert.rejects(recover({ ...options(f), ref }), /revision/)
  assert.throws(() => parseArgs(['--apply-please']), /Unknown/)
  assert.throws(() => parseArgs(['--revision']), /Missing/)
  await assert.rejects(recover({ ...options(f), all: true }), /Choose/)
})
test('historical missing assets, bad hashes, empty/incomplete snapshots fail closed', async t => {
  for (const mode of ['asset', 'hash', 'empty', 'mapping', 'identity', 'reference', 'private']) {
    const f = await setup(t), m = structuredClone(f.m)
    if (mode === 'asset') await unlink(join(f.root, image))
    if (mode === 'hash') await f.put(image, 'bad')
    if (mode === 'empty') { m.articles = {}; m.files = {} }
    if (mode === 'mapping') delete m.files[post]
    if (mode === 'private') {
      const source = f.files.get(post).replace('"articleId":', '"draft":true,"articleId":')
      await f.put(post, source); m.files[post] = hash(source)
    }
    if (mode === 'identity' || mode === 'reference') {
      const source = mode === 'identity' ? f.files.get(post).replace(first, second) : f.files.get(post).replace('cccccccc', 'eeeeeeee')
      await f.put(post, source); m.files[post] = hash(source)
    }
    await f.put('.notion/published.json', JSON.stringify(m)); f.git(['add', '-A']); f.git(['commit', '-qm', mode])
    await assert.rejects(recover({ ...options(f), ref: 'HEAD' }), /historical|hash|Empty|mapping|identity|image|nonpublic/i)
  }
})
test('unsafe manifest traversal, destination symlinks and historical symlinks are rejected', async t => {
  const f = await setup(t)
  await unlink(join(f.root, image)); await symlink(join(f.root, manual), join(f.root, image))
  await assert.rejects(recover({ ...options(f), apply: true }), /Unsafe filesystem/)
  f.git(['add', '-A']); f.git(['commit', '-qm', 'unsafe historical symlink'])
  await assert.rejects(recover({ ...options(f), ref: 'HEAD' }), /symbolic link/)
  const m = structuredClone(f.m); m.files['../outside'] = 'f'.repeat(64)
  await f.put('.notion/published.json', JSON.stringify(m)); f.git(['add', '.']); f.git(['commit', '-qm', 'unsafe manifest'])
  await assert.rejects(recover({ ...options(f), ref: 'HEAD' }), /Unsafe manifest/)
})
test('committed corrupt ownership requires explicit known-good ownership revision', async t => {
  const f = await setup(t); await f.put('.notion/published.json', '{}'); f.git(['add', '.']); f.git(['commit', '-qm', 'corrupt manifest'])
  await assert.rejects(recover({ root: f.root, ref: f.ref, all: true }), /ownership/)
  await recover({ root: f.root, ref: f.ref, all: true, ownershipRef: f.ref, apply: true })
})
test('monthly workflow is isolated, read-only and independent of publisher/audit schedules', async () => {
  const workflow = await readFile('.github/workflows/publishing-recovery.yml', 'utf8')
  assert.match(workflow, /cron: '17 4 3 \* \*'/)
  assert.match(workflow, /contents: read/); assert.match(workflow, /persist-credentials: false/)
  assert.doesNotMatch(workflow, /secrets\.|contents: write|pages:|git push|npm run build|workflow_call/)
  assert.match(await readFile('.github/workflows/notion-publish.yml', 'utf8'), /cron: '\*\/15 \* \* \* \*'/)
  assert.match(await readFile('.github/workflows/publishing-health.yml', 'utf8'), /cron: '37 \* \* \* \*'/)
})

test('full snapshot removes newer owned articles while preserving manual files and configuration', async t => {
  const f = await setup(t), m = structuredClone(f.m), third = 'e'.repeat(32), p = 'src/content/blog/new.mdx'
  const source = `export const metadata = { articleId: "notion:${third}", slug: "new", date: "2026-01-01" }\n\nNew content\n`
  m.articles[third] = { slug: 'new', date: '2026-01-01', status: 'published', history: [], assets: {} }
  m.files[p] = hash(source)
  await f.put(p, source); await f.put('.notion/published.json', JSON.stringify(m))
  const manualBytes = await f.read(manual), configBytes = await f.read('private-configuration.txt')
  f.git(['add', '-A']); f.git(['commit', '-qm', 'record damaged state'])
  const plan = await recover({ root: f.root, ref: f.ref, all: true, ownershipRef: f.ref, apply: true })
  assert.deepEqual(plan.deletes, [p]); await assert.rejects(f.read(p), { code: 'ENOENT' })
  assert.deepEqual(await f.read(manual), manualBytes); assert.deepEqual(await f.read('private-configuration.txt'), configBytes)
  assert.deepEqual(JSON.parse(await f.read('.notion/published.json')), f.m)
})

test('staged and unstaged recovery conflicts are reported without mutation and refuse apply', async t => {
  for (const staged of [false, true]) {
    const f = await setup(t)
    await f.put(image, 'local image work')
    if (staged) f.git(['add', image])
    const before = await f.read(image), status = f.git(['status', '--porcelain'])
    const plan = await recover(options(f))
    assert.deepEqual(plan.conflicts, [image])
    assert.ok(plan.untouched.includes(manual))
    await assert.rejects(recover({ ...options(f), apply: true }), /Uncommitted recovery conflicts/)
    assert.deepEqual(await f.read(image), before)
    assert.equal(f.git(['status', '--porcelain']), status)
  }
})

test('stale snapshot reports editorial rollback; unrelated local work remains untouched', async t => {
  const f = await setup(t), m = structuredClone(f.m)
  m.articles[first].redirectFrom.push('new-public-url')
  await f.put('.notion/published.json', JSON.stringify(m))
  f.git(['add', '-A']); f.git(['commit', '-qm', 'newer alias'])
  await f.put(manual, 'export const metadata = { articleId: "manual:fixture" }\n\nLocal manual edit\n')
  const before = await f.read(manual)
  const plan = await recover(options(f))
  assert.deepEqual(plan.articleChanges[0].before.redirectFrom, ['legacy', 'new-public-url'])
  assert.deepEqual(plan.articleChanges[0].after.redirectFrom, ['legacy'])
  assert.equal(plan.manifestChanged, true)
  await recover({ ...options(f), apply: true })
  assert.deepEqual(await f.read(manual), before)
  assert.deepEqual((await recover(options(f))).writes, [])
})

test('duplicate canonical routes, alias conflicts and out-of-allowlist media references refuse snapshots', async t => {
  for (const mode of ['slug', 'alias', 'media']) {
    const f = await setup(t), m = structuredClone(f.m)
    if (mode === 'slug') m.articles[second].slug = 'recovered'
    if (mode === 'alias') m.articles[second].redirectFrom = ['original']
    if (mode === 'media') {
      const source = f.files.get(post).replace(`/images/notion/${first}/`, '/images/../private/')
      await f.put(post, source); m.files[post] = hash(source)
    }
    await f.put('.notion/published.json', JSON.stringify(m))
    f.git(['add', '-A']); f.git(['commit', '-qm', 'invalid snapshot'])
    await assert.rejects(recover({ ...options(f), ref: 'HEAD' }), /collision|Orphan|image/i)
  }
})

test('ignored untracked recovery destinations are protected too', async t => {
  const f = await setup(t)
  f.git(['rm', '--cached', image])
  await f.put('.gitignore', image + '\n')
  f.git(['add', '.gitignore']); f.git(['commit', '-qm', 'image no longer tracked'])
  await f.put(image, 'ignored local image work')
  assert.equal(f.git(['status', '--porcelain']), '')
  assert.deepEqual((await recover(options(f))).conflicts, [image])
  await assert.rejects(recover({ ...options(f), apply: true }), /Uncommitted recovery conflicts/)
  assert.equal((await f.read(image)).toString(), 'ignored local image work')
})
