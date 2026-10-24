import { getPostBySlug } from './blog'
import { getProjectBySlug, getCaseStudyPath } from '../projects'

const repository = 'https://github.com/simpyll/simpyll'
// Canonical composition sources; About's editorial facts live in profile.ts.
const staticSources: Record<string, string> = {
  '/': 'src/pages/Home.tsx', '/about': 'src/content/profile.ts',
  '/blog': 'src/pages/Blog.tsx', '/projects': 'src/pages/Projects.tsx',
  '/explore': 'src/pages/Explore.tsx',
}
function edit(source: string, label: string) {
  return { label, href: `${repository}/edit/main/${source.split('/').map(encodeURIComponent).join('/')}` }
}
export function contributionForPage(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/'
  const segments = path.split('/')
  const post = segments.length === 3 && segments[1] === 'blog' ? getPostBySlug(segments[2]) : undefined
  const project = segments.length === 3 && segments[1] === 'projects' ? getProjectBySlug(segments[2]) : undefined
  if (post && !post.metadata.articleId?.startsWith('notion:')) return edit(post.sourcePath, 'Edit this article on GitHub')
  if (project && getCaseStudyPath(project)) return edit(`content/case-studies/${project.caseStudy!.contentKey}.json`, 'Edit this project on GitHub')
  if (staticSources[path]) return edit(staticSources[path], 'Edit this page on GitHub')
  const title = post?.metadata.title ?? path
  const params = new URLSearchParams({ template: 'content-correction.yml', title: `Content correction: ${title}`, 'page-url': `https://simpyll.com${path}`, description: post ? `Article: ${title}\n\nDescribe the suggested correction. This article is published from Notion; maintainers should apply accepted corrections in the editorial source.` : 'Describe the suggested correction to this page.' })
  return { label: post ? 'Suggest an edit to this article on GitHub' : 'Suggest an edit on GitHub', href: `${repository}/issues/new?${params}` }
}
