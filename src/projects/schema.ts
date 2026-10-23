// This module is shared by Node 24 build tooling and TypeScript consumers.
export const projectStatuses = {
  'in-progress': 'In progress', exploration: 'Exploration', planned: 'Planned',
  active: 'Active', maintained: 'Maintained', completed: 'Completed', paused: 'Paused', archived: 'Archived',
} as const
export const technologies = {
  react: 'React', typescript: 'TypeScript', mdx: 'MDX', vite: 'Vite',
  tailwind: 'Tailwind CSS', python: 'Python', 'github-actions': 'GitHub Actions', 'notion-api': 'Notion API',
} as const
export type ProjectStatus = keyof typeof projectStatuses
export type Technology = keyof typeof technologies
export type ProjectLink = { kind: 'live' | 'repository' | 'documentation' | 'demo' | 'article' | 'resource'; label: string; url: string; external: boolean }
export type ProjectImage = { src: string; alt: string; decorative?: boolean; caption?: string; width?: number; height?: number; order: number; focalPoint?: { x: number; y: number } }
export interface Project {
  id: string; slug: string; title: string; summary: string; status: ProjectStatus
  visibility: 'public' | 'draft' | 'private'; technologies: Technology[]; links: ProjectLink[]
  featured: { enabled: boolean; order: number }; order: number
  subtitle?: string; description?: string; category?: string; tags?: string[]; role?: string
  startDate?: string; completionDate?: string; updatedDate?: string; seoDescription?: string
  cover?: ProjectImage; screenshots?: ProjectImage[]; relatedArticles?: string[]
  caseStudy?: { contentKey: string }
}
export type ProjectInput = Omit<Project, 'links'> & { links: Omit<ProjectLink, 'external'>[] }
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const nonempty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const rank = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
export function normalizeProjectUrl(value: unknown): { url: string; external: boolean } {
  if (!nonempty(value) || (/[\s\\]/u.test(value) || [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127))) throw new Error('expected a safe HTTP(S) URL or root-relative route')
  const decoded = decodeURIComponent(value)
  if ((/[\\]/u.test(decoded) || [...decoded].some(c => c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127)) || /%[0-9a-f]{2}/i.test(decoded)) throw new Error('unsafe encoded URL')
  if (value.startsWith('/') && !value.startsWith('//')) {
    if (decoded.startsWith('//') || decoded.split(/[/?#]/).includes('..') || decoded.split(/[/?#]/).includes('.')) throw new Error('unsafe internal route')
    return { url: value, external: false }
  }
  if (!/^https?:\/\//i.test(value)) throw new Error('only HTTP(S) and root-relative routes are supported')
  const url = new URL(value)
  if (!url.hostname || url.username || url.password) throw new Error('URL must have a hostname and no credentials')
  return { url: url.href, external: true }
}
export function validateProjects(input: unknown, assetExists?: (src: string) => boolean): { projects: Project[]; errors: string[] } {
  const errors: string[] = [], projects: Project[] = []
  if (!Array.isArray(input)) return { projects, errors: ['Projects: expected an array'] }
  const ids = new Set<string>(), slugs = new Set<string>()
  input.forEach((value, index) => {
    const context = `Project ${record(value) && nonempty(value.id) ? JSON.stringify(value.id) : `at index ${index}`}`
    const error = (field: string, message: string) => errors.push(`${context}: ${field} ${message}`)
    if (!record(value)) { error('', 'must be an object'); return }
    const p = structuredClone(value)
    const allowed = ['id','slug','title','summary','status','visibility','technologies','links','featured','order','subtitle','description','category','tags','role','startDate','completionDate','updatedDate','seoDescription','cover','screenshots','relatedArticles','caseStudy']
    Object.keys(p).filter(k => !allowed.includes(k)).forEach(k => error(k, 'is not a supported field'))
    for (const key of ['id','slug','title','summary']) if (!nonempty(p[key])) error(key, 'must be a nonempty string')
    for (const [key, seen] of [['id', ids], ['slug', slugs]] as const) {
      const v = p[key]
      if (typeof v === 'string') {
        if (v.length > 100 || !slugPattern.test(v)) error(key, 'must be 1–100 lowercase hyphen-separated characters')
        if (seen.has(v)) error(key, `duplicates ${JSON.stringify(v)}`)
        seen.add(v)
      }
    }
    if (['new','edit','index','about','blog','explore','projects','404'].includes(String(p.slug))) error('slug', 'is reserved')
    if ((typeof p.status !== 'string' || !Object.hasOwn(projectStatuses, p.status))) error('status', 'must use a canonical project status')
    if ((typeof p.visibility !== 'string' || !['public','private','draft'].includes(p.visibility))) error('visibility', 'must be public, draft, or private')
    if (!rank(p.order)) error('order', 'must be a nonnegative safe integer')
    if (!record(p.featured) || typeof p.featured.enabled !== 'boolean' || !rank(p.featured.order) || Object.keys(p.featured).some(k => !['enabled','order'].includes(k))) error('featured', 'requires enabled:boolean and order:nonnegative integer')
    const strings = (key: string, list: unknown, valid: (s: string) => boolean) => {
      if (!Array.isArray(list) || list.some(v => !nonempty(v) || !valid(v))) error(key, 'must be an array of valid nonempty values')
      else if (new Set(list.map(v => v.toLowerCase())).size !== list.length) error(key, 'contains duplicates')
    }
    strings('technologies', p.technologies, s => Object.hasOwn(technologies, s))
    for (const key of ['tags','relatedArticles']) if (p[key] !== undefined) strings(key, p[key], s => key !== 'relatedArticles' || slugPattern.test(s))
    for (const key of ['subtitle','description','category','role','seoDescription']) if (p[key] !== undefined && !nonempty(p[key])) error(key, 'must be a nonempty string')
    for (const key of ['startDate','completionDate','updatedDate']) {
      const date = p[key]
      if (date !== undefined && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date)) error(key, 'must be a real YYYY-MM-DD date')
    }
    for (const later of ['completionDate','updatedDate']) if (typeof p.startDate === 'string' && typeof p[later] === 'string' && p[later] < p.startDate) error(later, 'must not precede startDate')
    if (typeof p.completionDate === 'string' && typeof p.updatedDate === 'string' && p.updatedDate < p.completionDate) error('updatedDate', 'must not precede completionDate')
    const urls = new Set<string>()
    if (!Array.isArray(p.links)) error('links', 'must be an array (empty is allowed)')
    else p.links = p.links.map((link, i) => {
      const field = `links[${i}]`
      if (!record(link)) { error(field, 'must be an object'); return link }
      if (Object.keys(link).some(k => !['kind','label','url'].includes(k))) error(field, 'contains unsupported fields')
      if ((typeof link.kind !== 'string' || !['live','repository','documentation','demo','article','resource'].includes(link.kind))) error(`${field}.kind`, 'is invalid')
      if (!nonempty(link.label)) error(`${field}.label`, 'must be nonempty')
      try {
        const normalized = normalizeProjectUrl(link.url)
        if (urls.has(normalized.url)) error(field, 'duplicates a destination')
        urls.add(normalized.url)
        return { ...link, ...normalized }
      } catch (e) { error(`${field}.url`, e instanceof Error ? e.message : 'is invalid'); return link }
    })
    const sources = new Set<string>()
    const image = (v: unknown, field: string) => {
      if (!record(v)) { error(field, 'must be an image object'); return }
      if (Object.keys(v).some(k => !['src','alt','decorative','caption','width','height','order','focalPoint'].includes(k))) error(field, 'contains unsupported fields')
      if (typeof v.decorative !== 'boolean' && v.decorative !== undefined) error(`${field}.decorative`, 'must be boolean')
      if (v.decorative === true ? v.alt !== '' : !nonempty(v.alt)) error(`${field}.alt`, 'must describe the image; decorative images require empty alt')
      if (v.caption !== undefined && !nonempty(v.caption)) error(`${field}.caption`, 'must be nonempty')
      if (!rank(v.order)) error(`${field}.order`, 'must be a nonnegative integer')
      if ((v.width === undefined) !== (v.height === undefined) || ['width','height'].some(k => v[k] !== undefined && (!rank(v[k]) || v[k] === 0))) error(field, 'dimensions must be a positive integer pair')
      if (v.focalPoint !== undefined && (!record(v.focalPoint) || Object.keys(v.focalPoint).some(k => !['x','y'].includes(k)) || ['x','y'].some(k => typeof (v.focalPoint as Record<string, unknown>)[k] !== 'number' || Number((v.focalPoint as Record<string, unknown>)[k]) < 0 || Number((v.focalPoint as Record<string, unknown>)[k]) > 1 || !Number.isFinite((v.focalPoint as Record<string, unknown>)[k])))) error(`${field}.focalPoint`, 'requires x and y between 0 and 1')
      if (typeof v.src !== 'string' || !/^\/images\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|avif|gif|svg)$/.test(v.src)) error(`${field}.src`, 'must be a local original /images/ asset path')
      else {
        if (sources.has(v.src)) error(field, 'duplicates an image source')
        sources.add(v.src)
        if (assetExists && !assetExists(v.src)) error(`${field}.src`, 'asset is missing or escapes public/')
      }
      if (p.visibility !== 'public') error(field, 'unpublished media must stay outside public/; omit until publication')
    }
    if (p.cover !== undefined) image(p.cover, 'cover')
    if (p.screenshots !== undefined) {
      if (!Array.isArray(p.screenshots)) error('screenshots', 'must be an array')
      else p.screenshots.forEach((v,i) => image(v, `screenshots[${i}]`))
    }
    if (p.caseStudy !== undefined && (!record(p.caseStudy) || Object.keys(p.caseStudy).some(k => k !== 'contentKey') || typeof p.caseStudy.contentKey !== 'string' || !slugPattern.test(p.caseStudy.contentKey))) error('caseStudy', 'requires a hyphenated contentKey; it does not enable a route')
    // Only return typed records after the entire collection validates.
    projects.push(p as unknown as Project)
  })
  return { projects: errors.length ? [] : projects.sort((a,b) => a.order - b.order || compare(a.id,b.id)), errors }
}
export function createProjectSelectors(projects: readonly Project[]) {
  const sorted = [...projects].sort((a,b) => a.order - b.order || compare(a.id,b.id))
  const publicProjects = sorted.filter(p => p.visibility === 'public')
  return {
    getAllProjects: () => [...sorted],
    getPublicProjects: () => [...publicProjects],
    getFeaturedProjects: (limit = 2) => publicProjects.filter(p => p.featured.enabled).sort((a,b) => a.featured.order - b.featured.order || a.order - b.order || compare(a.id,b.id)).slice(0, Math.max(0, limit)),
    getProjectBySlug: (slug: string) => publicProjects.find(p => p.slug === slug),
    getProjectById: (id: string) => publicProjects.find(p => p.id === id),
  }
}
