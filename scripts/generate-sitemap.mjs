import { readFileSync } from 'node:fs'
const policyRoutes = JSON.parse(readFileSync(new URL('../src/content/policies.json', import.meta.url), 'utf8')).map(({ slug }) => `/${slug}`)
import { caseStudyRoutes } from './project-routes.mjs'

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = process.cwd()

const configFile = join(root, 'src/config/site.ts')
const blogDirectory = join(root, 'src/content/blog')
const outputFile = join(root, 'public/sitemap.xml')

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

async function getSiteUrl() {
  const config = await readFile(configFile, 'utf8')

  const match = config.match(
    /url:\s*['"](https?:\/\/[^'"]+)['"]/
  )

  if (!match) {
    throw new Error('Site URL not found in src/config/site.ts')
  }

  return match[1].replace(/\/$/, '')
}

async function generateSitemap() {
  const siteUrl = await getSiteUrl()
  const files = await readdir(blogDirectory)

  const posts = await Promise.all(
    files
      .filter((file) => file.endsWith('.mdx'))
      .map(async (file) => {
        const content = await readFile(
          join(blogDirectory, file),
          'utf8'
        )

        const slug = file.replace(/\.mdx$/, '')

        const dateMatch = content.match(
          /date:\s*['"](\d{4}-\d{2}-\d{2})['"]/
        )

        return {
          path: `/blog/${slug}`,
          date: dateMatch?.[1],
        }
      })
  )

  const pages = [
    ...policyRoutes.map(path => ({ path })),
    { path: '/' },
    { path: '/blog' },
    { path: '/about' },
    { path: '/explore' },
    { path: '/projects' },
    ...posts,
    ...(await caseStudyRoutes()).map(path => ({ path })),
  ]

  const urls = pages
    .map(({ path, date }) => {
      const location = escapeXml(`${siteUrl}${path}`)

      return [
        '  <url>',
        `    <loc>${location}</loc>`,
        ...(date ? [`    <lastmod>${date}</lastmod>`] : []),
        '  </url>',
      ].join('\n')
    })
    .join('\n')

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n')

  await writeFile(outputFile, sitemap, 'utf8')

  console.log(
    `Sitemap generated with ${pages.length} URLs for ${siteUrl}.`
  )
}

generateSitemap().catch((error) => {
  console.error('Failed to generate sitemap:', error)
  process.exitCode = 1
})
