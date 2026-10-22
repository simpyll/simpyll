export type SearchDocument = { slug: string; title: string; description: string; category: string; tags: string[]; body: string }
export const normalize = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
export function prepareSearch(documents: SearchDocument[]) {
  const unique = [...new Map(documents.map(document => [document.slug, document])).values()]
  const entries = unique.map(document => ({ document, fields: [document.title, [document.category, ...document.tags].join(' '), document.description, document.body].map(normalize) })).map(entry => ({ ...entry, words: entry.fields.map(field => field.split(' ')) }))
  return (query: string) => {
    const normalized = normalize(query)
    if (!normalized) return []
    const terms = [...new Set(normalized.split(' '))]
    return entries.map(({ document, fields, words }) => {
      let score = 0
      for (const term of terms) {
        const field = words.findIndex(field => field.some(word => word.startsWith(term)))
        if (field < 0) return { document, score: 0 }
        score += [100, 30, 10, 1][field]
      }
      if (fields[0] === normalized) score += 10000
      else if (fields[0].startsWith(normalized)) score += 5000
      return { document, score }
    }).filter(result => result.score > 0).sort((a, b) => b.score - a.score || a.document.slug.localeCompare(b.document.slug)).slice(0, 8).map(result => result.document)
  }
}
