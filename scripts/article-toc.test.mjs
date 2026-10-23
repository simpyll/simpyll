import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { parseHTML } from 'linkedom'

test('all prerendered article TOC links resolve to unique static H2/H3 IDs', () => {
  for (const slug of readdirSync('dist/blog', { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name)) {
    const { document } = parseHTML(readFileSync(`dist/blog/${slug}/index.html`, 'utf8'))
    const headings = [...document.querySelectorAll('.article-content h2, .article-content h3')].filter(h => !h.closest('details') && h.id !== 'footnote-label')
    const links = [...document.querySelectorAll('.toc-desktop a')]
    if (headings.length < 2) { assert.equal(links.length, 0); continue }
    assert.equal(links.length, headings.length, slug)
    for (let index = 0; index < links.length; index++) {
      const id = decodeURIComponent(links[index].getAttribute('href').slice(1))
      assert.equal(id, headings[index].id, slug)
      assert.equal([...document.querySelectorAll('[id]')].filter(el => el.id === id).length, 1, id)
    }
  }
})
