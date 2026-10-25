// Shared by validation, the publisher and rendering. Never consult a clock.
export function validEditorialDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
export function formatArticleDate(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}
export function correctionId(entry) {
  // Content-derived fallback: unrelated additions/reordering cannot change a link.
  // Explicit IDs survive description edits as well. Collisions fail validation.
  let hash = 2166136261
  for (const character of entry.description.trim()) hash = Math.imul(hash ^ character.codePointAt(0), 16777619) >>> 0
  return `editorial-correction-${entry.id ?? `${entry.date}-${hash.toString(16)}`}`
}
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0
export function editorialErrors(metadata) {
  const errors = []
  if (!validEditorialDate(metadata.date)) errors.push('metadata.date must be a real calendar date in YYYY-MM-DD format')
  if (metadata.updatedAt !== undefined) {
    if (!validEditorialDate(metadata.updatedAt)) errors.push('metadata.updatedAt must be a real calendar date in YYYY-MM-DD format')
    else if (metadata.updatedAt < metadata.date) errors.push('metadata.updatedAt must not precede metadata.date')
  }
  for (const field of ['revisions', 'corrections']) {
    if (metadata[field] === undefined) continue
    if (!Array.isArray(metadata[field])) { errors.push(`metadata.${field} must be an array`); continue }
    const seen = new Set()
    metadata[field].forEach((entry, index) => {
      const path = `metadata.${field}[${index}]`
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) { errors.push(`${path} must be an object with date and description`); return }
      if (!validEditorialDate(entry.date)) errors.push(`${path}.date must be a real calendar date in YYYY-MM-DD format`)
      else {
        if (entry.date < metadata.date) errors.push(`${path}.date must not precede publication`)
        if (validEditorialDate(metadata.updatedAt) && entry.date > metadata.updatedAt) errors.push(`${path}.date must not follow updatedAt; advance the explicit update date`)
      }
      if (typeof entry.description !== 'string' || !entry.description.trim()) errors.push(`${path}.description must be a non-empty string`)
      if (entry.id !== undefined && (typeof entry.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id))) errors.push(`${path}.id must be a lowercase hyphenated identifier`)
      if (field === 'corrections' && typeof entry.description === 'string') {
        const key = correctionId(entry)
        if (seen.has(key)) errors.push(`${path}: Duplicate correction identifier ${key}; supply unique explicit ids`)
        seen.add(key)
      }
    })
  }
  return errors
}
export function normalizeEditorial(metadata) {
  const errors = editorialErrors(metadata)
  if (errors.length) throw new Error(errors.join('; '))
  const result = { ...metadata }
  for (const field of ['revisions', 'corrections']) {
    if (metadata[field] !== undefined) result[field] = metadata[field].map(entry => ({ date: entry.date, description: entry.description.trim(), ...(entry.id !== undefined ? { id: entry.id } : {}) }))
      .sort((a, b) => compare(b.date, a.date) || compare(a.id ?? a.description, b.id ?? b.description))
  }
  return result
}
