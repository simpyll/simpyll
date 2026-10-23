export interface CaseStudy {
  sections: { id: string; title: string; paragraphs: string[] }[]
  timeline?: { date: string; title: string; text: string; commit: string }[]
}
// Editorial content only. Identity, status, technologies and links belong to projects.json.
const files = import.meta.glob<CaseStudy>('./studies/*.json', { eager: true, import: 'default' })
export const caseStudies: Record<string, CaseStudy> = Object.fromEntries(Object.entries(files).map(([path, study]) => [path.split('/').pop()!.replace(/\.json$/, ''), study]))
