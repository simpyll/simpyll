
import type { ComponentType } from 'react'

export type BlogPostMetadata = {
  articleId?: string
  redirectFrom?: string[]
  status?: 'published'
  title: string
  description: string
  date: string
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
  Content: ComponentType
}

type MDXModule = {
  readingTimeMinutes: number
  headings: ArticleHeading[]
  default: ComponentType
  metadata: BlogPostMetadata
}

const modules = import.meta.glob<MDXModule>(
  '../content/blog/*.mdx',
  { eager: true }
)

export const posts: BlogPost[] = Object.entries(modules)
  .map(([path, module]) => {
    const slug = path
      .split('/')
      .pop()!
      .replace(/\.mdx$/, '')

    return {
      slug,
      sourcePath: path.replace('../', 'src/'),
      metadata: module.metadata,
      Content: module.default,
      headings: module.headings,
      readingTimeMinutes: module.readingTimeMinutes,
    }
  })
  .sort(
    (a, b) =>
      new Date(b.metadata.date).getTime() -
      new Date(a.metadata.date).getTime()
  )

export function getPostBySlug(slug: string) {
  return posts.find((post) => post.slug === slug)
}
