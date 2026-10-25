import { preloadProjectDetail } from './projects/detail-loader'
import { ErrorBoundary } from './recovery/ErrorBoundary'

import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'

import App from './App'
import { DiscoveryData, readDiscoveryData } from './lib/discovery-data'
import './index.css'

const container = document.getElementById('root')!

const app = (
  <React.StrictMode>
    <ErrorBoundary scope="application">
      <HelmetProvider>
        <BrowserRouter>
          <DiscoveryData.Provider value={readDiscoveryData()}><App /></DiscoveryData.Provider>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
)

async function start() {
  await preloadProjectDetail(window.location.pathname)
  if (container.hasChildNodes()) {
    hydrateRoot(container, app)
  } else {
    createRoot(container).render(app)
  }
}
// A failed startup chunk leaves the readable static page and native links intact.
void start().catch(error => console.error('Unable to start project navigation', error))
