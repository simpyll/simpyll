import { HelmetProvider } from 'react-helmet-async'
import { StaticRouter } from 'react-router-dom/server'
import { renderToString } from 'react-dom/server'
import { siteConfig } from './config/site'
import App from './App'
import index from '../public/search-index.json'
import { DiscoveryData } from './lib/discovery-data'

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
              <DiscoveryData.Provider value={index}><App /></DiscoveryData.Provider>
            </StaticRouter>
          </HelmetProvider>
        </div>
      </body>
    </html>
  )
}

export { getSiteUrl, siteConfig } from './config/site'
