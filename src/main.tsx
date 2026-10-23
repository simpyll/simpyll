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

if (container.hasChildNodes()) {
  hydrateRoot(container, app)
} else {
  createRoot(container).render(app)
}
