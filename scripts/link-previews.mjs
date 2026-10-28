import { collectArticles, readMetadata } from './redirects.mjs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getCaseStudyPath } from '../src/projects/schema.ts'

// Explicit public projection: never serialize registry identities or source paths.
export function previewRecords(articles, projects) {
  const records = {}
  for (const { slug, status, metadata: m } of articles) {
    if (status !== 'published' || !m || m.status && m.status !== 'published' || m.draft === true || m.published === false || m.test === true || m.noindex === true) continue
    records[`/blog/${slug}`] = { title: m.title, excerpt: m.description ?? '', type: 'Article' }
  }
  for (const p of projects) {
    const route = getCaseStudyPath(p)
    if (route) records[route] = { title: p.title, excerpt: p.summary, type: 'Project', ...(localThumbnail(p.cover?.src) ? { thumbnail: p.cover.src } : {}) }
  }
  return records
}
function localThumbnail(value) { return typeof value === 'string' && /^\/images\/(?:[\w-]+\/)*[\w-]+\.(?:png|jpe?g|webp|avif|gif|svg)$/.test(value) }
export async function generateLinkPreviews(root = process.cwd()) {
  const articles = await collectArticles(root, { history: new Map() })
  for (const a of articles.filter(a => a.status === 'published')) a.metadata = await readMetadata(await readFile(join(root, `src/content/blog/${a.slug}.mdx`), 'utf8'))
  const projects = JSON.parse(await readFile(join(root, 'src/generated/projects.json'), 'utf8'))
  await writeFile(join(root, 'src/generated/link-previews.json'), JSON.stringify(previewRecords(articles, projects)) + '\n')
}
