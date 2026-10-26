import type { Project } from '../projects/schema'
// Project links are the single source of truth for both navigation directions.
export function projectsForArticle(projects: readonly Project[], canonicalPath: string) {
  if (!/^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(canonicalPath)) return []
  return projects.filter(project => project.visibility === 'public' &&
    project.links.some(link => link.kind === 'article' && link.url === canonicalPath))
}
