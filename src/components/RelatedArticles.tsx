import type { BlogPost } from '../lib/blog'
import { ArticleCard } from './ArticleCard'

export function RelatedArticles({ articles }: { articles: readonly BlogPost[] }) {
  if (!articles.length) return null
  return <section aria-labelledby="related-articles-heading" className="mt-12 border-t border-outline pt-8">
    <h2 id="related-articles-heading" className="text-2xl font-semibold tracking-tight">Related Articles</h2>
    <div className="mt-6 grid gap-6">
      {articles.slice(0, 3).map(post => <ArticleCard key={post.metadata.articleId} headingLevel={3} article={{
        ...post.metadata, id: post.metadata.articleId!, slug: post.slug, type: 'blog',
        url: `/blog/${post.slug}`, body: '', readingTimeMinutes: post.readingTimeMinutes,
      }} />)}
    </div>
  </section>
}
