import { preloadArticle } from './lib/article-loader'
import { LipidPath } from './features/lipidpath/LipidPath'
import { registerLipidPath } from './features/lipidpath/loader'
registerLipidPath(LipidPath)
import { ProjectDetail } from './pages/ProjectDetail'
import { registerProjectDetail } from './projects/detail-loader'
registerProjectDetail(ProjectDetail)
import { HelmetProvider } from 'react-helmet-async'
import { StaticRouter } from 'react-router-dom/server'
import { renderToString } from 'react-dom/server'
import { siteConfig } from './config/site'
import App from './App'
import index from '../public/search-index.json'
import { DiscoveryData } from './lib/discovery-data'

import { Pulse } from './pages/Pulse'
import { registerPulse } from './pulse/loader'
import { PulseData, type PulseSnapshot } from './pulse/data'
registerPulse(Pulse)

export async function render(url: string, pulse: PulseSnapshot | null = null) {
  await preloadArticle(url)
  // Rendering the document lets React 19 hoist metadata into <head> while
  // keeping ordinary scripts (including JSON-LD) in the hydrated tree.
  return '<!doctype html>' + renderToString(
    <html lang={siteConfig.language}>
      <head />
      <body>
        <div id="root">
          <HelmetProvider>
            <StaticRouter location={url}>
              <PulseData.Provider value={pulse}><DiscoveryData.Provider value={index}><App /></DiscoveryData.Provider></PulseData.Provider>
            </StaticRouter>
          </HelmetProvider>
        </div>
      </body>
    </html>
  )
}

export { getSiteUrl, siteConfig } from './config/site'
