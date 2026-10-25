import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
export const first = 'a'.repeat(32), second = 'b'.repeat(32)
export const image = `public/images/notion/${first}/${'c'.repeat(64)}.png`
export const post = 'src/content/blog/recovered.mdx'
export const manual = 'src/content/blog/manual.mdx'
export const hash = bytes => createHash('sha256').update(bytes).digest('hex')
export async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'simpyll-recovery-'))
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z' }, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const put = async (p, bytes) => { await mkdir(dirname(join(root, p)), { recursive: true }); await writeFile(join(root, p), bytes) }
  const mdx = (id, slug, body) => `export const metadata = ${JSON.stringify({ articleId: `notion:${id}`, slug, date: '2026-01-01' })}\n\n${body}\n`
  const files = new Map([
    [post, mdx(first, 'recovered', `![public fixture](/${image.slice(7)})`)],
    ['src/content/blog/untouched.mdx', mdx(second, 'untouched', 'Other public article')],
    // Valid one-pixel PNG; fixture images do not require a remote service.
    [image, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64')],
  ])
  const m = { version: 1, sourceId: 'd'.repeat(32), articles: {
    [first]: { slug: 'recovered', date: '2026-01-01', status: 'published', history: ['original'], redirectFrom: ['legacy'], assets: { image: { path: image } } },
    [second]: { slug: 'untouched', date: '2026-01-01', status: 'published', history: [], redirectFrom: [], assets: {} },
  }, files: Object.fromEntries([...files].map(([p, bytes]) => [p, hash(bytes)])) }
  for (const [p, bytes] of files) await put(p, bytes)
  await put('.notion/published.json', JSON.stringify(m, null, 2) + '\n')
  await put(manual, 'export const metadata = { articleId: "manual:fixture", title: "Manual" }\n\nIndependent article\n')
  await put('private-configuration.txt', 'must remain untouched')
  git(['init', '-q']); git(['config', 'user.name', 'Recovery fixture']); git(['config', 'user.email', 'fixture@example.invalid'])
  git(['add', '.']); git(['commit', '-qm', 'deterministic public publishing snapshot'])
  const ref = git(['rev-parse', 'HEAD'])
  return { root, git, put, m, files, ref, read: p => readFile(join(root, p)), cleanup: () => rm(root, { recursive: true, force: true }) }
}
