export type SeriesMetadata = { id: string; title: string; order: number }
export type SeriesRecord = { id: string; title: string; installments: { order: number; articleId: string }[] }
export function validateSeries(value: unknown): void
export function buildSeries(articles: { slug: string; metadata: Record<string, unknown> }[]): SeriesRecord[]
