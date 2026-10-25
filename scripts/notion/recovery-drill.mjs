import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { appendFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { fixture, first, post, image, manual, hash } from './recovery-fixture.mjs'
import { recover } from './recovery.mjs'

// Hash tracked and untracked source bytes, not just porcelain status: this also
// proves existing uncommitted edits were not changed by the drill.
function checkoutFingerprint() {
  const args = { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  const paths = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], args).split('\0').filter(Boolean)
  return execFileSync('git', ['hash-object', '--stdin-paths'], { ...args, input: paths.map(p => JSON.stringify(p)).join('\n') + '\n' })
}
const checks = new Map([
  ['Historical article recovered', 'Unknown'], ['Manifest restored consistently', 'Unknown'],
  ['Immutable article identity preserved', 'Unknown'], ['Historical slug aliases preserved', 'Unknown'],
  ['Publisher-owned images validated', 'Unknown'], ['Manual articles protected', 'Unknown'],
  ['Production repository unchanged', 'Unknown'],
])
let f, failure, ref = 'public-fixture-v1'
const original = checkoutFingerprint()
try {
  f = await fixture(); ref += ` (${f.ref})`
  const manualBytes = await f.read(manual), config = await f.read('private-configuration.txt')
  await unlink(join(f.root, post)); await unlink(join(f.root, image)); await f.put('.notion/published.json', '{corrupt')
  const before = f.git(['status', '--porcelain'])
  await recover({ root: f.root, ref: f.ref, all: true })
  assert.equal(f.git(['status', '--porcelain']), before)
  await recover({ root: f.root, ref: f.ref, all: true, apply: true })
  assert.equal(hash(await f.read(post)), hash(f.files.get(post)))
  checks.set('Historical article recovered', 'Passed')
  const m = JSON.parse(await f.read('.notion/published.json'))
  assert.deepEqual(m, f.m); checks.set('Manifest restored consistently', 'Passed')
  assert.equal(m.articles[first].slug, 'recovered'); assert.match((await f.read(post)).toString(), new RegExp(`notion:${first}`))
  checks.set('Immutable article identity preserved', 'Passed')
  assert.deepEqual(m.articles[first].history, ['original']); assert.deepEqual(m.articles[first].redirectFrom, ['legacy'])
  checks.set('Historical slug aliases preserved', 'Passed')
  assert.equal(hash(await f.read(image)), m.files[image]); checks.set('Publisher-owned images validated', 'Passed')
  assert.deepEqual(await f.read(manual), manualBytes); assert.deepEqual(await f.read('private-configuration.txt'), config)
  // Prove the refusal path as well as preservation of an unrelated manual post.
  await f.put(post, manualBytes)
  await assert.rejects(recover({ root: f.root, ref: f.ref, articles: [first], apply: true }), /Manual article identity/)
  checks.set('Manual articles protected', 'Passed')
} catch (e) { failure = e; process.exitCode = 1 }
finally {
  await f?.cleanup()
  try { assert.equal(checkoutFingerprint(), original); checks.set('Production repository unchanged', 'Passed') }
  catch (e) { failure ??= e; process.exitCode = 1; checks.set('Production repository unchanged', 'Failed') }
  const report = `# Simpyll — Monthly Publishing Recovery Drill\n\nDate: ${new Date().toISOString().slice(0, 10)}\nStatus: ${failure ? 'Failed' : 'Passed'}\nFixture: ${ref}\n\nCheck | Result\n--- | ---\n${[...checks].map(([k, v]) => `${k} | ${v}`).join('\n')}\n\n${failure ? 'Diagnostic: ' + failure.message.replace(/[\r\n|]/g, ' ').slice(0, 500) + '\nInspect the failed check and run npm run drill:recovery locally. No production restoration was attempted.' : 'Dry-run preserved the fixture; explicit apply recovered public fixture content. No production restoration was performed.'}\n`
  console.log(report)
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report)
}
