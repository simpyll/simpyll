
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const distDirectory = join(root, 'dist')
const blogDirectory = join(root, 'src/content/blog')
const serverEntry = join(root, 'dist-server/entry-server.js')

async function prerender() {
  const { render } = await import(pathToFileURL(serverEntry).href)
  const template = await readFile(
    join(distDirectory, 'index.html'),
    'utf8'
  )

  const templateHead = template.match(/<head>([\s\S]*?)<\/head>/)?.[1]
  if (!templateHead || !/<body>\s*<div id="root"><\/div>\s*<\/body>/.test(template)) {
    throw new Error('Expected a fresh Vite client build. Run npm run build before prerendering.')
  }

  const files = await readdir(blogDirectory)

  const blogRoutes = files
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => `/blog/${file.replace(/\.mdx$/, '')}`)

  const routes = ['/', '/blog', ...blogRoutes]

  for (const route of routes) {
    const pageHtml = render(route).replace('<head>', `<head>${templateHead}`)

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

  await writeFile(join(distDirectory, '404.html'), render('/404').replace('<head>', `<head>${templateHead}`), 'utf8')

  console.log(`Successfully prerendered ${routes.length} pages and 404.html.`)
}

prerender().catch((error) => {
  console.error('Prerendering failed:', error)
  process.exitCode = 1
})
