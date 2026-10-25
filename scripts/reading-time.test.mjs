import { test } from 'node:test'
import assert from 'node:assert/strict'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkMdx from 'remark-mdx'
import remarkGfm from 'remark-gfm'
import { compile } from '@mdx-js/mdx'
import { readingTime, remarkReadingTime } from './reading-time.mjs'
import { searchDocument } from './generate-search.mjs'
import { readFile } from 'node:fs/promises'
import { parseHTML } from 'linkedom'
const parse = source => unified().use(remarkParse).use(remarkMdx).use(remarkGfm).parse(source)
const minutes = source => readingTime(parse(source))
const words = count => Array(count).fill('word').join(' ')
for (const [count, expected] of [[0, 1], [1, 1], [225, 1], [226, 2], [450, 2], [451, 3], [2250, 10]]) {
  test(`rounding and minimum: ${count} words`, () => assert.equal(minutes(words(count)), expected))
}
const syntax = [
  ['headings', '# Heading\n\n## Heading'],
  ['formatting', '**bold** *italic* ~~deleted~~'],
  ['lists and quotes', '- first\n- second\n\n> quoted'],
  ['link labels', '[visible label](https://example.org/' + 'long/'.repeat(500) + ')'],
  ['tables', '| First | Second |\n| --- | --- |\n| one | two |'],
  ['inline code', '`someIdentifier` and prose'],
  ['Unicode', 'café naïve 日本語 β患者 clinical-terminology'],
  ['components', '<Callout title="' + words(500) + '">\n\nVisible prose.\n\n</Callout>'],
  ['Notion prose', '<p>{"Visible prose."}</p>'],
]
for (const [label, source] of syntax) test(`counts ${label} without syntax inflation`, () => {
  assert.equal(minutes(source + '\n\n' + words(224)), 2)
  assert.equal(minutes(source), 1)
})
for (const [label, source] of [
  ['fenced code', '```typescript\n' + words(1000) + '\n```'],
  ['Notion code', '<pre><code>{' + JSON.stringify(words(1000)) + '}</code></pre>'],
  ['exports', 'export const metadata = { title: ' + JSON.stringify(words(1000)) + ' }'],
  ['imports', 'import Component from "./component"'],
  ['comments', '{/* ' + words(1000) + ' */}'],
  ['expressions', '{(() => "' + words(1000) + '")()}'],
  ['hidden content', '<div hidden>\n\n' + words(1000) + '\n\n</div>'],
  ['attributes', '<a href="https://example.org" title="' + words(1000) + '">label</a>'],
]) test(`excludes ${label}`, () => assert.equal(minutes(source + '\n\n' + words(224)), 1))
test('frontmatter nodes, whitespace and deterministic calls', () => {
  assert.equal(readingTime({ type: 'root', children: [{ type: 'yaml', value: words(1000) }] }), 1)
  assert.equal(minutes(' \n\t '), 1)
  const tree = parse(words(451))
  assert.equal(readingTime(tree), readingTime(tree))
})
test('static module and search metadata share calculator and refresh on edits', async () => {
  const metadata = 'export const metadata = {title:"Fixture",tags:[],status:"published"}\n\n'
  for (const prose of [words(225), words(226), '<p>{' + JSON.stringify(words(451)) + '}</p>']) {
    const source = metadata + prose
    const expected = minutes(source)
    const result = await compile(source, { remarkPlugins: [remarkGfm, remarkReadingTime] })
    assert.match(String(result), new RegExp(`export const readingTimeMinutes = ${expected}`))
    assert.equal((await searchDocument(source, 'fixture')).readingTimeMinutes, expected)
  }
})
test('all published cards, discovery previews and prerendered articles agree', async () => {
  const records = JSON.parse(await readFile('dist/search-index.json', 'utf8'))
  const blog = parseHTML(await readFile('dist/blog/index.html', 'utf8')).document
  const explore = parseHTML(await readFile('dist/explore/index.html', 'utf8')).document
  for (const article of records) {
    const expected = minutes(await readFile(`src/content/blog/${article.slug}.mdx`, 'utf8'))
    assert.equal(article.readingTimeMinutes, expected)
    const label = `${expected} min read`
    for (const doc of [blog, explore]) {
      const link = doc.querySelector(`article a[href="/blog/${article.slug}"]`)
      assert.ok(link, article.slug)
      assert.ok(link.closest('article').textContent.includes(label))
    }
    const doc = parseHTML(await readFile(`dist/blog/${article.slug}/index.html`, 'utf8')).document
    assert.ok(doc.querySelector('article').textContent.includes(label))
    assert.equal(doc.querySelectorAll('article span').filter(s => s.textContent === label).length, 1)
  }
})
