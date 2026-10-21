import { defineConfig, type Plugin } from 'vite'
import { existsSync, readFileSync } from 'node:fs'
import { extname, resolve, sep } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'

// Vite's SPA fallback otherwise serves the prerendered homepage at /blog.
function prerenderedRoutes(): Plugin {
  return {
    name: 'prerendered-routes',
    configurePreviewServer(server) {
      const dist = resolve(server.config.root, server.config.build.outDir)
      server.middlewares.use((req, res, next) => {
        if (req.method === 'GET' || req.method === 'HEAD') {
          const url = new URL(req.url || '/', 'http://localhost')
          let pathname: string
          try { pathname = decodeURIComponent(url.pathname) } catch { return next() }
          const index = resolve(dist, '.' + pathname, 'index.html')
          if (index.startsWith(dist + sep) && existsSync(index)) {
            req.url = url.pathname.replace(/\/$/, '') + '/index.html' + url.search
          } else if (!extname(pathname) && existsSync(resolve(dist, '404.html'))) {
            res.statusCode = 404
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(req.method === 'HEAD' ? undefined : readFileSync(resolve(dist, '404.html')))
            return
          }
        }
        next()
      })
    },
  }
}

export default defineConfig({
  // The custom domain serves this site at its origin, not under /simpyll/.
  base: '/',
  define: {
    // Keep cached HTML and its client bundle consistent across New Year.
    'import.meta.env.BUILD_YEAR': JSON.stringify(new Date().getUTCFullYear()),
  },
  plugins: [
    {
      name: 'theme-before-paint',
      transformIndexHtml: {
        order: 'pre',
        handler: html => html.replace('<!--theme-bootstrap-->', `<script>${readFileSync(new URL('./src/theme/bootstrap.js', import.meta.url), 'utf8')}</script>`),
      },
    },
    prerenderedRoutes(),
    { enforce: 'pre', ...mdx() },
    react(),
    tailwindcss(),
  ],
})
