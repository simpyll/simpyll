import { readFile } from 'node:fs/promises'
export async function caseStudyRoutes() {
  const projects = JSON.parse(await readFile(new URL('../src/generated/projects.json', import.meta.url), 'utf8'))
  const routes = []
  for (const p of projects.filter(p => p.caseStudy)) {
    const study = JSON.parse(await readFile(new URL(`../src/projects/studies/${p.caseStudy.contentKey}.json`, import.meta.url), 'utf8'))
    if (!Array.isArray(study.sections) || !study.sections.length) throw new Error(`Missing sections: ${p.slug}`)
    const ids = new Set()
    for (const s of study.sections) {
      if (!/^[a-z][a-z0-9-]*$/.test(s.id) || ids.has(s.id) || !s.title?.trim() || !s.paragraphs?.length || s.paragraphs.some(p => typeof p !== 'string' || !p.trim())) throw new Error(`Invalid case study section: ${p.slug}`)
      ids.add(s.id)
    }
    routes.push(`/projects/${p.slug}`)
  }
  return routes
}
