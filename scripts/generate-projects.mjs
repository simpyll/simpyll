import { readFile, writeFile, mkdir, realpath, stat, rm } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { validateProjects } from '../src/projects/schema.ts'
export async function generateProjects(root = process.cwd()) {
  const output = resolve(root, 'src/generated/projects.json')
  await rm(output, { force: true })
  const input = JSON.parse(await readFile(resolve(root, 'content/projects.json'), 'utf8'))
  const assets = new Set()
  const publicRoot = await realpath(resolve(root, 'public'))
  if (Array.isArray(input)) for (const p of input) for (const image of [p?.cover, ...(Array.isArray(p?.screenshots) ? p.screenshots : [])]) {
    if (typeof image?.src !== 'string') continue
    try {
      const path = await realpath(resolve(publicRoot, '.' + image.src))
      if (path.startsWith(publicRoot + sep) && (await stat(path)).isFile()) assets.add(image.src)
    } catch { /* Schema diagnostics report missing assets. */ }
  }
  const result = validateProjects(input, src => assets.has(src))
  if (result.errors.length) throw new Error(result.errors.join('\n'))
  await mkdir(resolve(root, 'src/generated'), { recursive: true })
  await writeFile(output, JSON.stringify(result.projects.filter(p => p.visibility === 'public'), null, 2) + '\n')
  return result
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await generateProjects(); console.log('Project metadata validated; public manifest generated.') }
  catch (error) { console.error(error.message); process.exitCode = 1 }
}
