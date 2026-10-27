import { normalizeEditorial } from './editorial.mjs'
import type { EditorialMetadata } from './editorial.mjs'
import related from '../generated/related-articles.json' with { type: 'json' }
import navigation from '../generated/article-navigation.json' with { type: 'json' }

import articles from '../generated/articles.json' with { type: 'json' }

export type BlogPostMetadata = EditorialMetadata & {
  articleId?: string
  redirectFrom?: string[]
  status?: 'published'
  title: string
  description: string
  category: string
  author: string
  tags: string[]
}

export type ArticleHeading = { id: string; title: string; depth: 2 | 3 }

export type BlogPost = {
  slug: string
  sourcePath: string
  metadata: BlogPostMetadata
  readingTimeMinutes: number
  headings: ArticleHeading[]
}

export const posts: BlogPost[] = articles.map(article => ({
  ...article,
  metadata: normalizeEditorial(article.metadata as BlogPostMetadata),
  headings: article.headings as ArticleHeading[],
})).sort((a, b) => new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime())

export function getPostBySlug(slug: string) {
  return posts.find((post) => post.slug === slug)
}

// The build emits only immutable IDs. Resolve current canonical posts without sorting.
const postsById = new Map(posts.map(post => [post.metadata.articleId, post]))
export function getAdjacentArticles(id: string) {
  const neighbors = (navigation as Record<string, { previous?: string; next?: string }>)[id]
  return {
    previous: neighbors?.previous ? postsById.get(neighbors.previous) : undefined,
    next: neighbors?.next ? postsById.get(neighbors.next) : undefined,
  }
}

export function getRelatedArticles(id: string): BlogPost[] {
  return ((related as Record<string, string[]>)[id] ?? []).flatMap(id => {
    const post = postsById.get(id)
    return post ? [post] : []
  })
}
