import { readFile, rm, readdir } from 'node:fs/promises'
import { join } from 'node:path'

export async function inactiveNotionPages(root) {
  let manifest
  try { manifest = JSON.parse(await readFile(join(root, '.notion/published.json'), 'utf8')) } catch (error) { if (error.code === 'ENOENT') return new Set(); throw error }
  return new Set(Object.entries(manifest.articles).filter(([, article]) => article.status === 'unpublished').map(([id]) => {
    if (!/^[a-f0-9]{32}$/.test(id)) throw new Error('Unsafe inactive Notion page ID')
    return id
  }))
}

export async function removeInactiveMedia(root) {
  const dist = join(root, 'dist')
  for (const id of await inactiveNotionPages(root)) await rm(join(dist, 'images/notion', id), { recursive: true, force: true })
  // Transformation caches are build inputs, never public private-content archives.
  // Retain only the current public image manifest's variants in the artifact.
  const manifest = JSON.parse(await readFile(join(root, 'src/generated/images.json'), 'utf8'))
  const keep = new Set(Object.values(manifest).flatMap(image => image.variants.map(variant => variant.src.split('/').at(-1))))
  let files
  try { files = await readdir(join(dist, 'images/optimized')) } catch (error) { if (error.code === 'ENOENT') return; throw error }
  for (const file of files) if (!keep.has(file)) await rm(join(dist, 'images/optimized', file), { recursive: true, force: true })
}
