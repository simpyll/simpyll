import { HelmetProvider } from 'react-helmet-async'
import { StaticRouter } from 'react-router-dom/server'
import { renderToString } from 'react-dom/server'
import { siteConfig } from './config/site'
import App from './App'

export function render(url: string) {
  // Rendering the document lets React 19 hoist metadata into <head> while
  // keeping ordinary scripts (including JSON-LD) in the hydrated tree.
  return '<!doctype html>' + renderToString(
    <html lang={siteConfig.language}>
      <head />
      <body>
        <div id="root">
          <HelmetProvider>
            <StaticRouter location={url}>
              <App />
            </StaticRouter>
          </HelmetProvider>
        </div>
      </body>
    </html>
  )
}
