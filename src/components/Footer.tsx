import { useLocation } from 'react-router-dom'
import { Container } from './Container'
import { contributionForPage } from '../lib/contributions'
import './footer.css'

const socials = [
  { name: 'GitHub', url: 'https://github.com/simpyll', path: 'M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.7-1.3-1.7-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.4-5.5-6A4.7 4.7 0 0 1 5.7 8.7c-.1-.3-.6-1.6.1-3.3 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 3 .1 3.3a4.7 4.7 0 0 1 1.3 3.3c0 4.6-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.1c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/in/david-becker-rn-ccrn', path: 'M20.45 0H3.55A3.55 3.55 0 0 0 0 3.55v16.9A3.55 3.55 0 0 0 3.55 24h16.9A3.55 3.55 0 0 0 24 20.45V3.55A3.55 3.55 0 0 0 20.45 0ZM7.12 20.45H3.56V9h3.56ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM20.45 20.45H16.9v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05a3.75 3.75 0 0 1 3.37-1.85c3.6 0 4.26 2.37 4.26 5.45Z' },
  { name: 'X (Twitter)', url: 'https://x.com/simpyll', path: 'M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.59-6.64 7.59H.47l8.6-9.83L0 1.15h7.6l5.24 6.93ZM17.61 20.65h2.04L6.49 3.24H4.3Z' },
]
export function Footer() {
  const { pathname } = useLocation()
  const contribution = contributionForPage(pathname)
  return (
    <footer className="border-t border-outline bg-canvas">
      <Container>
        <div className="site-footer">
          <a href="/" className="font-display text-xl font-semibold tracking-display text-foreground">simpyll<span className="text-accent">.</span></a>
          <div className="footer-connect">
            <h2 className="text-sm font-medium text-muted">Let's Connect</h2>
            <div className="footer-socials">
              {socials.map(social => <a key={social.name} href={social.url} aria-label={social.name} target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false"><path d={social.path} /></svg></a>)}
            </div>
          </div>
          <a className="footer-contribution text-sm text-muted" href={contribution.href} target="_blank" rel="noopener noreferrer">{contribution.label} <span aria-hidden="true">↗</span></a>
          <p className="footer-copyright text-xs text-subtle">© {import.meta.env.BUILD_YEAR} Simpyll. All rights reserved.</p>
        </div>
      </Container>
    </footer>
  )
}
