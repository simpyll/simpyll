import { readFile } from 'node:fs/promises'
export async function caseStudyRoutes() {
  const projects = JSON.parse(await readFile(new URL('../src/generated/projects.json', import.meta.url), 'utf8'))
  return projects.filter(p => p.caseStudy).map(p => `/projects/${p.slug}`)
}
