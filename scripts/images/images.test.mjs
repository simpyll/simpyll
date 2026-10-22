import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { mkdtemp, mkdir, writeFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { imageName } from './names.mjs'
import { buildImages } from './build.mjs'

test('naming prioritizes trustworthy metadata and normalizes unsafe/opaque names', () => {
  assert.equal(imageName({ name: 'Réact / Vite', caption: 'Other' }), 'react-vite')
  assert.equal(imageName({ caption: 'A clear diagram' }), 'a-clear-diagram')
  assert.equal(imageName({ filename: 'a'.repeat(64) + '.png', article: 'my-post', sequence: 2 }), 'my-post-image-02')
  assert.equal(imageName({ name: '../../Bad <script>' }), 'bad-script')
  assert.equal(imageName({ alt: '', filename: '中文.png', article: 'post' }), 'post-image-01')
})
test('processing reserves dimensions, preserves alpha, never upscales, caches and repairs missing output', async t => {
  const root = await mkdtemp(join(tmpdir(), 'images-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'public/images'), { recursive: true })
  await mkdir(join(root, 'src/content/blog'), { recursive: true })
  const bytes = await sharp({ create: { width: 400, height: 200, channels: 4, background: '#12345680' } }).png().toBuffer()
  await writeFile(join(root, 'public/images/123456789012345678901234567890.png'), bytes)
  await writeFile(join(root, 'src/content/blog/post.mdx'), '![A transparent technical diagram](/images/123456789012345678901234567890.png)')
  const first = await buildImages(root), entry = Object.values(first)[0]
  assert.equal(entry.name, 'a-transparent-technical-diagram')
  assert.equal(entry.width, 400)
  assert.equal(entry.height, 200)
  assert.ok(entry.variants.every(v => v.width <= 400 && v.height * 2 === v.width))
  const webp = entry.variants.find(v => v.format === 'webp')
  assert.equal((await sharp(join(root, 'public', webp.src)).metadata()).hasAlpha, true)
  const target = join(root, 'public', webp.src), before = (await stat(target)).mtimeMs
  assert.deepEqual(await buildImages(root), first)
  assert.equal((await stat(target)).mtimeMs, before)
  await rm(target)
  assert.deepEqual(await buildImages(root), first)
  await writeFile(join(root, 'public/images/broken.png'), 'not an image')
  await assert.rejects(buildImages(root), /Malformed image/)
})

test('same-caption assets cannot collide; SVG and animation stay intact', async t => {
  const root = await mkdtemp(join(tmpdir(), 'media-types-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'public/images'), { recursive: true })
  await mkdir(join(root, 'src/content/blog'), { recursive: true })
  const make = color => sharp({ create: { width: 8, height: 4, channels: 4, background: color } }).png().toBuffer()
  await writeFile(join(root, 'public/images/a.png'), await make('red'))
  await writeFile(join(root, 'public/images/b.png'), await make('blue'))
  await writeFile(join(root, 'public/images/vector.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="4"/>')
  await writeFile(join(root, 'src/content/blog/post.mdx'), '![Same caption](/images/a.png)\n\n![Same caption](/images/b.png)')
  const manifest = await buildImages(root)
  assert.notEqual(manifest['/images/a.png'].variants[0].src, manifest['/images/b.png'].variants[0].src)
  assert.equal(manifest['/images/a.png'].name, 'same-caption')
  assert.ok(!manifest['/images/vector.svg'])
})
