import { ProjectDetail } from './pages/ProjectDetail'
import { Projects } from './pages/Projects'
import { Explore } from './pages/Explore'
import { ErrorBoundary } from './recovery/ErrorBoundary'

import { Routes, Route, useLocation } from 'react-router-dom'

import { RouteNavigation } from './navigation/RouteNavigation'
import { Header } from './components/Header'
import { Footer } from './components/Footer'

import { AboutPage } from './pages/About'
import { Home } from './pages/Home'
import { Blog } from './pages/Blog'
import { NotFound } from './pages/NotFound'
import { BlogPost } from './pages/BlogPost'

export function AppContent() {
  const { pathname } = useLocation()
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Header />
      <RouteNavigation />

      <ErrorBoundary key={pathname} scope="route">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:slug" element={<ProjectDetail />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>

      <Footer />
    </>
  )
}

export default AppContent
