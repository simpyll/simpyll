// Explicit relationship between a route template and its deferred client entry.
// Read filenames from Vite's manifest; hashed output names are never configured.
export function projectAssets(manifest, route) {
  const entry = manifest['src/pages/ProjectDetail.tsx']
  if (!route.startsWith('/projects/') || !entry) return []
  const seen = new Set()
  function visit(key) {
    if (seen.has(key)) return []
    seen.add(key)
    const item = manifest[key]
    if (!item) throw new Error(`Missing route manifest entry ${key}`)
    return [item.file, ...(item.css || []), ...(item.assets || []), ...(item.imports || []).flatMap(visit)]
  }
  return [...new Set(visit('src/pages/ProjectDetail.tsx'))]
}
export function projectHead(manifest, route) {
  return projectAssets(manifest, route).filter(f => /\.(js|css)$/.test(f)).map(f => f.endsWith('.css') ? `<link rel="stylesheet" href="/${f}"/>` : `<link rel="modulepreload" href="/${f}"/>`).join('')
}
