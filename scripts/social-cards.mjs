import sharp from 'sharp'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { socialCard, socialCardWidth as width, socialCardHeight as height } from '../src/lib/social-card.mjs'

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c])

// Pango wraps using actual glyph metrics, including long words. Shrink only when
// needed; the bounded title area leaves optional context clear of the title.
export async function renderSocialCard({ title, category, author } = {}) {
  const text = String(title || 'Journal').trim() || 'Journal'
  let heading
  for (let size = 64; size >= 12; size -= 2) {
    heading = await sharp({ text: { text: `<span foreground="#f5f5f4">${escape(text)}</span>`, font: `sans bold ${size}`, width: 1040, rgba: true, wrap: 'word-char' } }).png().toBuffer({ resolveWithObject: true })
    if (heading.info.height <= 320) break
  }
  if (heading.info.height > 320) throw new Error('Article title exceeds social-card capacity')
  const context = [category, author].filter(Boolean).join(' · ').slice(0, 50)
  const backdrop = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="630" fill="#090b10"/><rect x="0" y="0" width="12" height="630" fill="#9be8cb"/><text x="80" y="95" font-family="sans-serif" font-size="32" font-weight="bold" fill="#9be8cb">Simpyll / Journal</text><path d="M80 510H1120" stroke="#292d36"/><text x="80" y="565" font-family="sans-serif" font-size="18" fill="#a1a1aa">${escape(context)}</text></svg>`)
  return sharp(backdrop).composite([{ input: heading.data, left: 80, top: 160 }]).png().toBuffer()
}

export async function generateSocialCards(root = process.cwd()) {
  const articles = JSON.parse(await readFile(resolve(root, 'src/generated/articles.json'), 'utf8'))
  await mkdir(resolve(root, 'dist/social-cards'), { recursive: true })
  for (const { slug, metadata } of articles) {
    await writeFile(resolve(root, `dist${socialCard(slug)}`), await renderSocialCard(metadata))
  }
  console.log(`Generated ${articles.length} article social cards`)
}
