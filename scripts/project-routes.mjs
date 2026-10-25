import { getCaseStudyPath } from '../src/projects/schema.ts'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
export async function caseStudyRoutes(root = process.cwd()) {
  const projects = JSON.parse(await readFile(resolve(root, 'src/generated/projects.json'), 'utf8'))
  return projects.map(getCaseStudyPath).filter(Boolean)
}
