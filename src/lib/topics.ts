// Editorial assignments use immutable article IDs; categories/tags remain author-owned.
export const topics = [
  { id: 'healthcare-software', title: 'Healthcare software & clinical tools', description: 'Practical software for healthcare learning and workflows.', articleIds: [] as string[] },
  { id: 'nursing-informatics', title: 'Nursing informatics & healthcare technology', description: 'Start with a bedside perspective on systems, workflows, and the people using them.', articleIds: ['notion:402b3577d26a804cbe45c6ce88398aa3'] },
  { id: 'nursing-education', title: 'Nursing & advanced practice education', description: 'Evidence-based learning resources for nurses and students.', articleIds: [] as string[] },
  { id: 'healthcare-ai', title: 'Artificial intelligence in healthcare', description: 'Evaluation, privacy, and human oversight in healthcare AI.', articleIds: [] as string[] },
  { id: 'software-engineering', title: 'Software engineering & development', description: 'Explore Python foundations, the journal’s implementation, and the design philosophy behind Simpyll.', articleIds: ['manual:001-python-fundamentals', 'manual:the-art-of-reading-code', 'notion:403b3577d26a801eb8cde1e5aeef1347'] },
] as const

type Article = { slug: string; metadata: { articleId?: string; status?: string; draft?: boolean; published?: boolean; test?: boolean } }
export function topicArticles<T extends Article>(topic: { articleIds: readonly string[] }, articles: readonly T[]): T[] {
  const seen = new Set<string>()
  return topic.articleIds.flatMap(id => {
    const article = articles.find(a => a.metadata.articleId === id &&
      (a.metadata.status === undefined || a.metadata.status === 'published') &&
      !a.metadata.draft && a.metadata.published !== false && !a.metadata.test && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug))
    if (!article || seen.has(article.slug)) return []
    seen.add(article.slug)
    return [article]
  })
}
// An editorial review is required even when the minimum supporting corpus exists.
export function hubEligible(articleCount: number, originalGuideApproved: boolean) {
  return articleCount >= 3 && originalGuideApproved
}
