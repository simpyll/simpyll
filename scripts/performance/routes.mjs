import { readFile } from 'node:fs/promises'
export async function representativeRoutes(dist = 'dist') {
  const { routes } = JSON.parse(await readFile(`${dist}/deployment.json`, 'utf8'))
  const paths = routes.map(r => r.path).sort()
  const article = paths.find(p => p.startsWith('/blog/'))
  const project = paths.includes('/projects/simpyll') ? '/projects/simpyll' : paths.find(p => p.startsWith('/projects/'))
  const selected = ['/', '/blog', article, '/projects', project, '/about']
  if (selected.some(p => !p || !paths.includes(p))) throw new Error('Missing representative performance route in deployment.json')
  return selected
}
