import { generateLinkPreviews } from './link-previews.mjs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { generateRedirects, collectArticles, readMetadata } from './redirects.mjs'
import { createArticleAdjacency } from '../src/lib/article-adjacency.ts'
import { createRelatedArticles } from '../src/lib/related-articles.ts'
await generateRedirects(process.cwd())
// Reuse the identity registry, excluding withdrawn Notion pages and aliases.
const articles = []
for (const article of await collectArticles(process.cwd(), { history: new Map() })) {
  if (article.status !== 'published') continue
  const metadata = await readMetadata(await readFile(join('src/content/blog', `${article.slug}.mdx`), 'utf8'))
  if (metadata.articleId !== article.id) throw new Error(`Article identity mismatch: ${article.slug}`)
  articles.push({ slug: article.slug, metadata })
}
const adjacent = createArticleAdjacency(articles)
const navigation = Object.fromEntries(articles.map(article => {
  const { previous, next } = adjacent(article.metadata.articleId)
  return [article.metadata.articleId, { previous: previous?.metadata.articleId, next: next?.metadata.articleId }]
}))
await writeFile('src/generated/article-navigation.json', JSON.stringify(navigation, null, 2) + '\n')

const related = createRelatedArticles(articles)
await writeFile('src/generated/related-articles.json', JSON.stringify(Object.fromEntries(articles.map(article =>
  [article.metadata.articleId, related(article.metadata.articleId).map(post => post.metadata.articleId)]
)), null, 2) + '\n')

await generateLinkPreviews()
