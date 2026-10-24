import publishedStudies from '../generated/case-studies.json'
export interface CaseStudy {
  sections: { id: string; title: string; paragraphs: string[]; links?: { label: string; url: string }[]; flow?: { title: string; description: string; steps: { title: string; text: string }[] } }[]
  timeline?: { date: string; title: string; text: string; url: string }[]
}
// Only validated public editorial content enters the browser bundle.
export const caseStudies: Record<string, CaseStudy> = publishedStudies
