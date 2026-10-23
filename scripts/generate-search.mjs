import { compile } from '@mdx-js/mdx'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { literal } from './validate-content.mjs'

export async function searchDocument(source, slug) {
  let tree
  await compile(source, { remarkPlugins: [() => node => { tree = node }] })
  let metadata
  for (const node of tree.children.filter(node => node.type === 'mdxjsEsm')) {
    for (const statement of node.data.estree.body) {
      for (const declaration of statement.declaration?.declarations ?? []) {
        if (declaration.id.name === 'metadata') metadata = literal(declaration.init)
      }
    }
  }
  if (!metadata || typeof metadata.title !== 'string' || !metadata.title.trim() ||
    metadata.tags !== undefined && (!Array.isArray(metadata.tags) || metadata.tags.some(tag => typeof tag !== 'string')) || metadata.draft === true || metadata.published === false || metadata.test === true
    || ['description', 'category', 'date'].some(key => metadata[key] !== undefined && typeof metadata[key] !== 'string')
    || metadata.status !== undefined && (typeof metadata.status !== 'string' || metadata.status.toLowerCase() !== 'published')) return null
  const prose = []
  function visit(node) {
    if (['mdxjsEsm', 'code', 'inlineCode'].includes(node.type)) return
    if (['script', 'style', 'pre', 'code'].includes(node.name?.toLowerCase())) return
    if (node.type === 'text') prose.push(node.value)
    if (['mdxTextExpression', 'mdxFlowExpression'].includes(node.type)) {
      // Notion emits JSON string literals. Never evaluate other expressions.
      try { const value = literal(node.data.estree.body[0]?.expression); if (typeof value === 'string') prose.push(value) } catch { /* executable expression */ }
    }
    for (const attribute of node.attributes ?? []) {
      if (!['title', 'caption', 'alt'].includes(attribute.name)) continue
      let value = attribute.value
      if (value?.type === 'mdxJsxAttributeValueExpression') {
        try { value = literal(value.data.estree.body[0]?.expression) } catch { continue }
      }
      if (typeof value === 'string') prose.push(value)
    }
    for (const child of node.children ?? []) visit(child)
  }
  visit(tree)
  return { slug, title: metadata.title, description: metadata.description ?? '', category: metadata.category ?? '',
    tags: metadata.tags ?? [], date: metadata.date ?? '', id: typeof metadata.articleId === 'string' && metadata.articleId ? metadata.articleId : `blog:${slug}`, type: 'blog', url: `/blog/${slug}`, body: prose.join(' ').replace(/\s+/gu, ' ').trim() }
}

export async function generateSearch(root = process.cwd()) {
  const directory = resolve(root, 'src/content/blog')
  const documents = []
  for (const filename of (await readdir(directory)).sort()) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.mdx$/.test(filename) || /(?:^|-)(?:test|fixture)(?:-|\.)/.test(filename)) continue
    const document = await searchDocument(await readFile(resolve(directory, filename), 'utf8'), filename.slice(0, -4))
    if (document) documents.push(document)
  }
  return documents
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const documents = await generateSearch()
  await writeFile('public/search-index.json', JSON.stringify(documents) + '\n')
  console.log(`Indexed ${documents.length} published articles`)
}
