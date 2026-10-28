// Shared taxonomy identity retains punctuation and the established URL normalization.
export const tagId = value => value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase()
// Display policy: canonical lowercase for every tag, including acronyms/proper names.
export const normalizeTags = values => [...new Set(values.map(tagId).filter(Boolean))].sort()
