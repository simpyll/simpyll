export type EditorialEntry = { date: string; description: string; id?: string }
export type EditorialMetadata = { date: string; updatedAt?: string; revisions?: EditorialEntry[]; corrections?: EditorialEntry[] }
export function validEditorialDate(value: unknown): value is string
export function formatArticleDate(date: string, month?: 'long' | 'short'): string
export function correctionId(entry: EditorialEntry): string
export function editorialErrors(metadata: EditorialMetadata): string[]
export function normalizeEditorial<T extends EditorialMetadata>(metadata: T): T
