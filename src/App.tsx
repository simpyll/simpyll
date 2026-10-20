
import { Routes, Route } from 'react-router-dom'

import { Header } from './components/Header'
import { Footer } from './components/Footer'

import { Home } from './pages/Home'
import { Blog } from './pages/Blog'
import { NotFound } from './pages/NotFound'
import { BlogPost } from './pages/BlogPost'

export function AppContent() {
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Header />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <Footer />
    </>
  )
}

export default AppContent
