import { buildSeries } from '../src/lib/series.mjs'
import { compile } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { literal } from './validate-content.mjs'
import { remarkReadingTime } from './reading-time.mjs'
import { remarkHeadingIds } from './remark-heading-ids.mjs'

const directory = 'src/content/blog'
const articles = []
for (const file of (await readdir(directory)).filter(f => f.endsWith('.mdx')).sort()) {
  let tree
  await compile(await readFile(`${directory}/${file}`, 'utf8'), {
    remarkPlugins: [remarkGfm, remarkReadingTime, remarkHeadingIds, () => node => { tree = node }],
  })
  const exports = {}
  for (const node of tree.children.filter(node => node.type === 'mdxjsEsm')) {
    for (const statement of node.data.estree.body) {
      for (const declaration of statement.declaration?.declarations ?? []) {
        if (['metadata', 'headings', 'readingTimeMinutes'].includes(declaration.id.name)) exports[declaration.id.name] = literal(declaration.init)
      }
    }
  }
  if (!exports.metadata || !exports.headings || !exports.readingTimeMinutes) throw new Error(`Missing article metadata: ${file}`)
  articles.push({ slug: file.slice(0, -4), sourcePath: `${directory}/${file}`, ...exports })
}
await writeFile('src/generated/articles.json', JSON.stringify(articles) + '\n')

await writeFile('src/generated/series.json', JSON.stringify(buildSeries(articles)) + '\n')
