// Explicit relationship between a route template and its deferred client entry.
// Read filenames from Vite's manifest; hashed output names are never configured.
export function projectAssets(manifest, route) {
  const key = (route === '/blog' || route.startsWith('/blog/')) ? 'src/pages/article-style.ts' : route === '/tools/lipidpath' ? 'src/features/lipidpath/LipidPath.tsx' : route === '/pulse' ? 'src/pages/Pulse.tsx' : route.startsWith('/projects/') ? 'src/pages/ProjectDetail.tsx' : ''
  const article = route.match(/^\/blog\/([^/]+)\/?$/)
  const articleKey = article ? `src/content/blog/${article[1]}.mdx` : ''
  const keys = [key, articleKey].filter(k => k && manifest[k])
  if (!keys.length) return []
  const seen = new Set()
  function visit(key) {
    if (seen.has(key)) return []
    seen.add(key)
    const item = manifest[key]
    if (!item) throw new Error(`Missing route manifest entry ${key}`)
    return [item.file, ...(item.css || []), ...(item.assets || []), ...(item.imports || []).flatMap(visit)]
  }
  return [...new Set(keys.flatMap(visit))]
}
export function projectHead(manifest, route) {
  return projectAssets(manifest, route).filter(f => /\.(js|css)$/.test(f)).map(f => f.endsWith('.css') ? `<link rel="stylesheet" href="/${f}"/>` : `<link rel="modulepreload" href="/${f}"/>`).join('')
}
