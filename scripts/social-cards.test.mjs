import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { parseHTML } from 'linkedom'
import { renderSocialCard } from './social-cards.mjs'
import { socialCard } from '../src/lib/social-card.mjs'

test('cards render short, long, unbroken and escaped titles without optional fields', async () => {
  const images = []
  for (const title of ['Hello', 'A long article title about building reliable software and learning from the things that go wrong along the way '.repeat(3), 'LongWord'.repeat(50), '<Testing> & "escaping"']) {
    const bytes = await renderSocialCard({ title })
    const info = await sharp(bytes).metadata()
    assert.equal(info.width, 1200)
    assert.equal(info.height, 630)
    assert.equal(info.format, 'png')
    images.push(bytes)
  }
  assert.notDeepEqual(images[0], images[1])
})

test('every prerendered article has matching canonical and absolute social image metadata', async () => {
  const articles = JSON.parse(await readFile('src/generated/articles.json', 'utf8'))
  for (const { slug, metadata } of articles) {
    const { document } = parseHTML(await readFile(`dist/blog/${slug}/index.html`, 'utf8'))
    const meta = key => document.querySelector(`meta[property="${key}"],meta[name="${key}"]`)?.getAttribute('content')
    const canonical = document.querySelector('link[rel="canonical"]').href
    assert.equal(meta('og:url'), canonical)
    assert.equal(meta('og:title'), `${metadata.title} | Simpyll`)
    assert.equal(meta('og:description'), metadata.description)
    const image = new URL(meta('og:image'))
    assert.equal(image.protocol, 'https:')
    assert.ok(image.pathname.endsWith(socialCard(slug)))
    assert.equal(meta('twitter:image'), image.href)
    assert.equal(meta('twitter:card'), 'summary_large_image')
    assert.equal(meta('og:image:width'), '1200')
    assert.equal(meta('og:image:height'), '630')
    assert.equal(meta('og:image:type'), 'image/png')
    assert.equal(meta('og:image:alt'), metadata.title)
    assert.equal(meta('twitter:image:alt'), metadata.title)
    assert.equal((await sharp(`dist${socialCard(slug)}`).metadata()).width, 1200)
  }
})

test('canonical article and image URLs respect a configured Pages base', async () => {
  const { createServer } = await import('vite')
  const server = await createServer({ configFile: false, base: '/simpyll/', server: { ws: false }, appType: 'custom' })
  try {
    const { getSiteUrl } = await server.ssrLoadModule('/src/config/site.ts')
    assert.equal(getSiteUrl('/blog/hello-world'), 'https://simpyll.com/simpyll/blog/hello-world')
    assert.equal(getSiteUrl(socialCard('hello-world')), 'https://simpyll.com/simpyll/social-cards/hello-world.png')
    assert.equal(getSiteUrl('https://example.com/card.png'), 'https://example.com/card.png')
  } finally { await server.close() }
})
