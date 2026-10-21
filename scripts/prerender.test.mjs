import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const pages = [
  ['/', 'From Bedside to Build | Simpyll'],
  ['/blog', 'Learning Journal | Simpyll'],
  ['/blog/hello-world', 'Hello, World. | Simpyll'],
]

for (const [route, title] of pages) {
  test(`static HTML and metadata: ${route}`, async () => {
    const html = await readFile(`dist${route === '/' ? '' : route}/index.html`, 'utf8')
    const head = html.split('</head>')[0]
    const body = html.split('<body>')[1]
    assert.ok(head.includes(`<title>${title}</title>`))
    assert.equal((head.match(/rel="canonical"/g) || []).length, 1)
    assert.ok(head.includes(`rel="canonical" href="https://simpyll.com${route}"`))
    assert.ok(head.includes(`property="og:url" content="https://simpyll.com${route}"`))
    assert.equal((head.match(/<title>/g) || []).length, 1)
    assert.equal((head.match(/name="description"/g) || []).length, 1)
    assert.ok(html.indexOf('charset="UTF-8"') < 1024)
    assert.match(head, /<noscript><style>\[data-reveal\]/)
    assert.match(head, /<meta name="description"/)
    assert.doesNotMatch(head, /<header|<main|application\/ld\+json/)
    assert.match(body, /^<div id="root"><a[^>]+class="skip-link"/)
    assert.equal((body.match(/<header/g) || []).length, 1)
    assert.match(body, /<main id="main-content"/)
    assert.equal((body.match(/<h1(?![^>]*role="presentation")/g) || []).length, 1)
    assert.match(body, /href="\/blog"/)
    assert.match(body, /href="\/#about"/)
    assert.match(body, /href="\/#work"/)
    assert.match(head, /type="module"[^>]*src="\/assets\//)
    if (route === '/blog/hello-world') {
      assert.match(body, /<script type="application\/ld\+json">/)
      const schema = JSON.parse(body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
      assert.equal(schema['@type'], 'BlogPosting')
      assert.match(body, /Every website starts somewhere/)
    }
    if (process.env.PREVIEW_URL) {
      for (const suffix of route === '/' ? ['', '?test=1'] : ['', '/', '?test=1']) {
        const response = await fetch(process.env.PREVIEW_URL + route + suffix)
        assert.equal(response.status, 200)
        assert.equal(await response.text(), html, `Wrong HTML served at ${route}${suffix}`)
      }
    }
  })
}

test('404 document is noindex and has no article metadata', async () => {
  const html = await readFile('dist/404.html', 'utf8')
  assert.match(html, /<title>Page not found \| Simpyll<\/title>/)
  assert.match(html, /name="robots" content="noindex"/)
  assert.doesNotMatch(html, /rel="canonical"|application\/ld\+json/)
  if (process.env.PREVIEW_URL) {
    for (const path of ['/blog/missing-post', '/missing', '/blog/missing/']) {
      const response = await fetch(process.env.PREVIEW_URL + path)
      assert.equal(response.status, 404)
      assert.equal(await response.text(), html)
    }
  }
})


test('sitemap and robots reference the canonical public pages', async () => {
  const { readdir } = await import('node:fs/promises')

  const sitemap = await readFile('dist/sitemap.xml', 'utf8')
  const robots = await readFile('dist/robots.txt', 'utf8')

  const blogFiles = await readdir('src/content/blog')
  const blogRoutes = blogFiles
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => `/blog/${file.replace(/\.mdx$/, '')}`)

  const expectedRoutes = ['/', '/blog', ...blogRoutes]
  const expectedUrls = expectedRoutes.map(
    (route) => `https://simpyll.com${route}`
  )

  const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map((match) => match[1])

  assert.deepEqual(locations.sort(), expectedUrls.sort())
  assert.match(robots, /User-agent: \*\s+Allow: \//)
  assert.match(robots, /Sitemap: https:\/\/simpyll.com\/sitemap.xml/)
})


test('Pages artifact includes the custom domain and root-relative assets', async () => {
  assert.equal((await readFile('dist/CNAME', 'utf8')).trim(), 'simpyll.com')
  const html = await readFile('dist/index.html', 'utf8')
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)].map(match => match[1])
  assert.ok(assets.length >= 2, 'Expected the production JS and CSS assets')
  for (const asset of assets) {
    assert.ok((await readFile(`dist${asset}`)).length > 0, `Missing asset: ${asset}`)
  }
})
