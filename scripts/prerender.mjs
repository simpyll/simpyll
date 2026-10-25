import { projectHead } from './performance/route-assets.mjs'
import { readFileSync } from 'node:fs'
const policyRoutes = JSON.parse(readFileSync(new URL('../src/content/policies.json', import.meta.url), 'utf8')).map(({ slug }) => `/${slug}`)
import { caseStudyRoutes } from './project-routes.mjs'

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { removeInactiveMedia } from './publishing-media.mjs'
import { redirectHtml } from './redirects.mjs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { generatePulse } from './pulse.mjs'
const root = process.cwd()
const distDirectory = join(root, 'dist')
const blogDirectory = join(root, 'src/content/blog')
const serverEntry = join(root, 'dist-server/entry-server.js')

async function prerender() {
  await removeInactiveMedia(root)
  const { render, getSiteUrl, siteConfig } = await import(pathToFileURL(serverEntry).href)
  const template = await readFile(
    join(distDirectory, 'index.html'),
    'utf8'
  )

  const clientManifest = JSON.parse(await readFile(join(distDirectory, '.vite/manifest.json'), 'utf8'))
  const templateHead = template.match(/<head>([\s\S]*?)<\/head>/)?.[1]
  if (!templateHead || !/<body>\s*<div id="root"><\/div>\s*<\/body>/.test(template)) {
    throw new Error('Expected a fresh Vite client build. Run npm run build before prerendering.')
  }

  const files = await readdir(blogDirectory)

  const blogRoutes = files
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => `/blog/${file.replace(/\.mdx$/, '')}`)

  const routes = [...policyRoutes, '/', '/blog', '/about', '/explore', '/projects', ...blogRoutes, ...await caseStudyRoutes()]

  for (const route of routes) {
    const pageHtml = render(route).replace('<head>', `<head>${templateHead}${projectHead(clientManifest, route)}`)

    const outputDirectory =
      route === '/'
        ? distDirectory
        : join(distDirectory, route.slice(1))

    await mkdir(outputDirectory, { recursive: true })

    await writeFile(
      join(outputDirectory, 'index.html'),
      pageHtml,
      'utf8'
    )

    console.log(`Prerendered: ${route}`)
  }

  const redirects = JSON.parse(await readFile(join(root, 'src/generated/redirects.json'), 'utf8'))
  for (const [alias, target] of Object.entries(redirects)) {
    if (routes.includes(`/blog/${alias}`) || !routes.includes(`/blog/${target}`)) throw new Error(`Invalid redirect output: ${alias}`)
    const directory = join(distDirectory, 'blog', alias)
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'index.html'), redirectHtml(getSiteUrl(`/blog/${target}`), siteConfig.language, siteConfig.url))
  }

  await writeFile(join(distDirectory, '404.html'), render('/404').replace('<head>', `<head>${templateHead}`), 'utf8')

  await mkdir(join(distDirectory, 'pulse'), { recursive: true })
  await writeFile(join(distDirectory, 'pulse/index.html'), render('/pulse').replace('<head>', `<head>${templateHead}${projectHead(clientManifest, '/pulse')}`))
  const pulse = await generatePulse({ expectedRoutes: [...routes, '/pulse'], directory: distDirectory })
  await mkdir(join(distDirectory, 'pulse'), { recursive: true })
  await writeFile(join(distDirectory, 'pulse/index.html'), render('/pulse', pulse).replace('<head>', `<head>${templateHead}${projectHead(clientManifest, '/pulse')}`))

  console.log(`Successfully prerendered ${routes.length} pages and 404.html.`)
}

prerender().catch((error) => {
  console.error('Prerendering failed:', error)
  process.exitCode = 1
})
