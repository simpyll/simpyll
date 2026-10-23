import manifest from '../generated/projects.json'
import { createProjectSelectors } from './schema'
import type { Project } from './schema'
// The generated file is validated before dev, production compilation and CI.
export const { getAllProjects, getPublicProjects, getFeaturedProjects, getProjectBySlug, getProjectById } = createProjectSelectors(manifest as Project[])
export { projectStatuses, technologies } from './schema'
export type { Project, ProjectInput, ProjectImage, ProjectLink, ProjectStatus, Technology } from './schema'
