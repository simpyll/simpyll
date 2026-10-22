import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile, mkdir, realpath, stat } from 'node:fs/promises'
import { resolve, basename, extname, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { imageName } from './names.mjs'
import { descriptions } from './references.mjs'

export const widths = [320, 480, 768, 1200, 1600]
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const config = `v1:${sharp.versions.sharp}:${sharp.versions.vips}:${widths}:lossless-webp:avif80`
export async function buildImages(root = process.cwd()) {
  const publicRoot = await realpath(resolve(root, 'public'))
  const out = resolve(publicRoot, 'images/optimized')
  await mkdir(out, { recursive: true })
  const manifest = {}, report = []
  const contexts = await descriptions(root)
  const files = (await readdir(publicRoot, { recursive: true, withFileTypes: true })).filter(f => f.isFile() && !f.parentPath.startsWith(out) && /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(f.name)).sort((a,b) => `${a.parentPath}/${a.name}`.localeCompare(`${b.parentPath}/${b.name}`))
  for (const file of files) {
    const path = await realpath(resolve(file.parentPath, file.name))
    if (!path.startsWith(publicRoot + sep)) throw new Error('Image path escapes public directory')
    const source = '/' + path.slice(publicRoot.length + 1).split(sep).join('/')
    const bytes = await readFile(path)
    if (bytes.length > 20 * 1024 * 1024) throw new Error(`Image exceeds 20 MiB: ${source}`)
    // SVG stays a trusted, external vector resource; never inline arbitrary SVG.
    if (extname(path).toLowerCase() === '.svg') { report.push({ source, status: 'preserved-vector' }); continue }
    let metadata
    try { metadata = await sharp(bytes, { limitInputPixels: 40_000_000, animated: true }).metadata() } catch { throw new Error(`Malformed image: ${source}`) }
    if (!['png','jpeg','webp','avif','heif','gif'].includes(metadata.format)) throw new Error(`Unsupported image: ${source}`)
    if ((metadata.pages ?? 1) > 1) {
      manifest[source] = { width: metadata.width, height: metadata.pageHeight ?? metadata.height, variants: [] }
      report.push({ source, status: 'preserved-animation' }); continue
    }
    const rotated = [5,6,7,8].includes(metadata.orientation)
    const width = rotated ? metadata.height : metadata.width, height = rotated ? metadata.width : metadata.height
    const fingerprint = digest(Buffer.concat([bytes, Buffer.from(config)]))
    const name = imageName({ filename: basename(path), article: 'article-media', sequence: files.indexOf(file) + 1, ...contexts.get(source) })
    const base = `${name}-${fingerprint.slice(0, 10)}`
    const cache = resolve(out, `${base}.json`)
    try {
      const saved = JSON.parse(await readFile(cache, 'utf8'))
      if (saved.fingerprint === fingerprint && await Promise.all(saved.variants.map(v => stat(resolve(publicRoot, '.' + v.src)).then(s => s.size === v.bytes).catch(() => false))).then(values => values.every(Boolean))) {
        manifest[source] = saved; report.push({ source, status: 'cached' }); continue
      }
    } catch { /* Missing/invalid cache is regenerated. */ }
    const candidates = [...new Set([...widths.filter(w => w < width), Math.min(width, 1600)])]
    const variants = []
    for (const w of candidates) {
      const pipeline = () => sharp(bytes, { limitInputPixels: 40_000_000 }).rotate().resize({ width: w, withoutEnlargement: true })
      for (const format of ['png', 'webp', 'avif']) {
        const output = await (format === 'png' ? pipeline().png() : format === 'webp' ? pipeline().webp({ lossless: true }) : pipeline().avif({ quality: 80, effort: 4 })).toBuffer({ resolveWithObject: true })
        // AVIF is optional: retain only a meaningful saving over lossless WebP.
        if (format === 'avif' && output.data.length >= variants.find(v => v.width === w && v.format === 'webp').bytes * .9) continue
        const src = `/images/optimized/${base}-${w}.${format}`
        await writeFile(resolve(publicRoot, '.' + src), output.data)
        variants.push({ src, format, mime: `image/${format}`, width: output.info.width, height: output.info.height, bytes: output.data.length })
      }
    }
    const entry = { fingerprint, name, width, height, variants }
    manifest[source] = entry
    await writeFile(cache, JSON.stringify(entry))
    report.push({ source, status: 'processed', originalBytes: bytes.length, largestWebpBytes: variants.filter(v => v.format === 'webp').at(-1).bytes })
  }
  await mkdir(resolve(root, 'src/generated'), { recursive: true })
  await writeFile(resolve(root, 'src/generated/images.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(JSON.stringify({ images: report }, null, 2))
  return manifest
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await buildImages()
