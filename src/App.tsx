import { LipidPathRoute } from './features/lipidpath/route'
import { Analytics } from './analytics/Analytics'
import { PulseRoute } from './pulse/route'
import { Policy } from './pages/Policy'
import policyLinks from './content/policies.json'
import { ProjectDetailRoute } from './projects/ProjectDetailRoute'
import { Projects } from './pages/Projects'
import { Explore } from './pages/Explore'
import { ErrorBoundary } from './recovery/ErrorBoundary'

import { Routes, Route, useLocation } from 'react-router-dom'

import { RouteNavigation } from './navigation/RouteNavigation'
import { Header } from './components/Header'
import { Footer } from './components/Footer'

import { AboutPage } from './pages/About'
import { Contact } from './pages/Contact'
import { Home } from './pages/Home'
import { Blog } from './pages/Blog'
import { NotFound } from './pages/NotFound'
import { BlogPost } from './pages/BlogPost'
import { useEffect } from 'react'

export function AppContent() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname === '/blog' || pathname.startsWith('/blog/')) {
      void import('./pages/article-style').catch(error => console.warn('Unable to load article styles', error))
    }
  }, [pathname])
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Header />
      <Analytics />
      <RouteNavigation />

      <ErrorBoundary key={pathname} scope="route">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:slug" element={<ProjectDetailRoute />} />
          <Route path="/tools/lipidpath" element={<LipidPathRoute />} />
          <Route path="/pulse" element={<PulseRoute />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          {policyLinks.map(({ slug }) => <Route key={slug} path={`/${slug}`} element={<Policy slug={slug} />} />)}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>

      <Footer />
    </>
  )
}

export default AppContent
