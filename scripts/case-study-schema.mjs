import { normalizeProjectUrl } from '../src/projects/schema.ts'
const text = v => typeof v === 'string' && v.trim().length > 0
export function validateCaseStudy(study) {
  if (!Array.isArray(study?.sections) || !study.sections.length) throw new Error('Case study requires sections')
  const ids = new Set(['timeline'])
  const link = l => {
    if (!text(l?.label)) throw new Error('Source link requires label')
    normalizeProjectUrl(l.url)
  }
  for (const s of study.sections) {
    if (!/^[a-z][a-z0-9-]*$/.test(s.id) || ids.has(s.id) || !text(s.title) || !Array.isArray(s.paragraphs) || !s.paragraphs.length || s.paragraphs.some(p => !text(p))) throw new Error('Invalid case study section')
    ids.add(s.id)
    if (s.links !== undefined) { if (!Array.isArray(s.links)) throw new Error('Invalid source links'); s.links.forEach(link) }
    if (s.flow !== undefined && (!text(s.flow.title) || !text(s.flow.description) || !Array.isArray(s.flow.steps) || !s.flow.steps.length || s.flow.steps.some(step => !text(step.title) || !text(step.text)))) throw new Error('Invalid flow diagram')
  }
  if (study.timeline !== undefined) {
    if (!Array.isArray(study.timeline)) throw new Error('Invalid timeline')
    for (const m of study.timeline) {
      if (!text(m.title) || !text(m.text) || !/^\d{4}-\d{2}-\d{2}$/.test(m.date) || !Number.isFinite(Date.parse(m.date)) || new Date(m.date).toISOString().slice(0,10) !== m.date) throw new Error('Invalid timeline milestone')
      normalizeProjectUrl(m.url)
    }
  }
  return study
}
