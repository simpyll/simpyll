/** Resolve metadata only; never rewrite the anchor's query, fragment or destination. */
export function previewRoute(href, current, base, canonicalOrigin, records, aliases) {
  if (!href || href.startsWith('#') || /[\\\s]/u.test(href) || /%2f|%5c|%25/i.test(href)) return undefined
  try {
    const url = new URL(href, current)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || ![new URL(current).origin, new URL(canonicalOrigin).origin].includes(url.origin)) return undefined
    const prefix = '/' + base.replace(/^\/+|\/+$/g, '')
    let path = decodeURIComponent(url.pathname)
    if (prefix !== '/') {
      if (!path.startsWith(prefix + '/')) return undefined
      path = path.slice(prefix.length)
    }
    path = path.replace(/\/$/, '')
    if (!/^\/(?:blog|projects)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)) return undefined
    if (path.startsWith('/blog/')) path = `/blog/${aliases[path.slice(6)] ?? path.slice(6)}`
    return Object.hasOwn(records, path) ? path : undefined
  } catch { return undefined }
}
