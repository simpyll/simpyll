import { lazy, Suspense } from 'react'
import { loadedArticle, preloadArticle } from './article-loader'
const Deferred = lazy(preloadArticle)
export function ArticleRoute() {
  return <Suspense fallback={<main id="main-content" tabIndex={-1}><p role="status">Loading article…</p></main>}>{loadedArticle() ?? <Deferred />}</Suspense>
}
