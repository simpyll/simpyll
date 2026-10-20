
import type { ComponentType } from 'react'

export type BlogPostMetadata = {
  title: string
  description: string
  date: string
  category: string
  author: string
  tags: string[]
}

export type BlogPost = {
  slug: string
  metadata: BlogPostMetadata
  Content: ComponentType
}

type MDXModule = {
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
      metadata: module.metadata,
      Content: module.default,
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
