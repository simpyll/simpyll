import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, cp, symlink, rm, readFile, unlink, writeFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import sharp from 'sharp'
import { recover } from './notion/recovery.mjs'
const exec = promisify(execFile)

test('clean local clone recovers committed damage and completes production build', { timeout: 120_000 }, async t => {
  const root = await mkdtemp(join(tmpdir(), 'recovery-build-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await exec('git', ['clone', '--quiet', '--no-hardlinks', resolve('.'), root])
  const git = args => exec('git', args, { cwd: root })
  await git(['config', 'user.name', 'Recovery test'])
  await git(['config', 'user.email', 'recovery@example.invalid'])
  // Exercise the implementation under test, including changes not yet committed.
  await cp('scripts', join(root, 'scripts'), { recursive: true })
  // Keep this recovery fixture focused on content/build correctness. Full-size
  // large raster encoding is covered by the separate production build gate.
  for (const p of await readdir(join(root, 'public'), { recursive: true })) {
    if (!/\.(png|jpe?g|webp|avif)$/i.test(p) || p.startsWith('images/notion/')) continue
    const path = join(root, 'public', p)
    await writeFile(path, await sharp(await readFile(path)).resize({ width: 64, withoutEnlargement: true }).toBuffer())
  }
  await git(['add', 'scripts', 'public']); await git(['commit', '--allow-empty', '-qm', 'recovery implementation under test'])
  const ref = (await git(['rev-parse', 'HEAD'])).stdout.trim()
  const bytes = await readFile(join(root, '.notion/published.json'))
  const m = JSON.parse(bytes), paths = Object.keys(m.files)
  const manualPath = 'src/content/blog/hello-world.mdx'
  const manual = await readFile(join(root, manualPath))
  for (const p of paths) await unlink(join(root, p))
  await writeFile(join(root, '.notion/published.json'), '{corrupt')
  await git(['add', '-A']); await git(['commit', '-qm', 'synthetic committed publishing damage'])
  assert.equal((await git(['status', '--porcelain'])).stdout, '')
  const options = { root, ref, all: true, ownershipRef: ref }
  const preview = await recover(options)
  assert.ok(preview.writes.includes('.notion/published.json'))
  assert.equal((await git(['status', '--porcelain'])).stdout, '')
  await recover({ ...options, apply: true })
  assert.deepEqual(await readFile(join(root, '.notion/published.json')), bytes)
  assert.deepEqual(await readFile(join(root, manualPath)), manual)
  assert.deepEqual((await recover(options)).writes, [])
  await symlink(resolve('node_modules'), join(root, 'node_modules'), 'dir')
  try {
    await exec('npm', ['run', 'build'], { cwd: root, maxBuffer: 4 * 1024 * 1024 })
  } catch (error) { throw new Error(error.stdout + error.stderr) }
  for (const a of Object.values(m.articles).filter(a => a.status === 'published')) {
    assert.match(await readFile(join(root, `dist/blog/${a.slug}/index.html`), 'utf8'), /<article/)
  }
})
