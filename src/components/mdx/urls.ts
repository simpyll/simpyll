import redirects from '../../generated/redirects.json' with { type: 'json' }

/** Content destinations only. Untrusted content never controls scripts or frames. */
export function safeContentUrl(value: string | undefined, image = false): string | undefined {
  if (!value || [...value].some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127 || char === '\\')) return undefined
  try {
    const url = new URL(value, 'https://simpyll.com')
    if (url.username || url.password) return undefined
    if (!(image ? ['https:', 'http:'] : ['https:', 'http:', 'mailto:', 'tel:']).includes(url.protocol)) return undefined
    if (!image && url.origin === 'https://simpyll.com') {
      const slug = url.pathname.match(/^\/blog\/([^/]+)\/?$/)?.[1]
      const target = slug && Object.hasOwn(redirects, slug) ? (redirects as Record<string, string>)[slug] : undefined
      if (target) return `/blog/${target}${url.search}${url.hash}`
    }
    return value
  } catch { return undefined }
}

