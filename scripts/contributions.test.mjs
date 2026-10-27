import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

test('contribution resolver uses authoritative public sources and safe fallbacks', async () => {
  // server.ws:false disables Vite 8's standalone WebSocket transport, which otherwise
  // binds the default port 24678 and collides across parallel node:test files.
  const server = await createServer({ server: { middlewareMode: true, ws: false } })
  try {
    const { contributionForPage: resolve } = await server.ssrLoadModule('/src/lib/contributions.ts')
    const { posts } = await server.ssrLoadModule('/src/lib/blog.ts')
    for (const post of posts) {
      const result = resolve(`/blog/${post.slug}/`)
      const url = new URL(result.href)
      if (post.metadata.articleId?.startsWith('notion:')) {
        assert.equal(url.pathname, '/simpyll/simpyll/issues/new')
        assert.equal(url.searchParams.get('page-url'), `https://simpyll.com/blog/${post.slug}`)
        assert.ok(url.searchParams.get('title').includes(post.metadata.title))
        assert.ok(!result.href.includes(post.metadata.articleId.slice(7)))
      } else assert.equal(url.pathname, `/simpyll/simpyll/edit/main/${post.sourcePath}`)
    }
    assert.ok(resolve('/projects/simpyll').href.endsWith('/content/case-studies/simpyll.json'))
    assert.ok(resolve('/projects/ai-engineering').href.endsWith('/content/case-studies/ai-engineering.json'))
    for (const path of ['/', '/about', '/blog', '/projects', '/explore']) assert.ok(resolve(path).href.includes('/edit/main/src/'))
    for (const path of ['/missing', '/blog/missing', '/projects/missing']) {
      const url = new URL(resolve(path).href)
      assert.equal(url.pathname, '/simpyll/simpyll/issues/new')
      assert.equal(url.searchParams.get('page-url'), `https://simpyll.com${path}`)
    }
  } finally { await server.close() }
})
