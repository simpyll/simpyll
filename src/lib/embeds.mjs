/** Return a canonical YouTube player built only from a validated video ID. */
export function approvedEmbed(value) {
  if (typeof value !== 'string' || !/^https:\/\//i.test(value) || /[\u0000-\u0020\u007f\\]/.test(value)) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return null
    let id
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname) && url.pathname === '/watch') {
      if ([...url.searchParams.keys()].some(key => key !== 'v') || url.searchParams.getAll('v').length !== 1) return null
      id = url.searchParams.get('v')
    } else if (url.hostname === 'youtu.be' && !url.search) {
      id = url.pathname.slice(1)
    } else if (['www.youtube-nocookie.com', 'youtube-nocookie.com'].includes(url.hostname) && !url.search && url.pathname.startsWith('/embed/')) {
      id = url.pathname.slice(7)
    }
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null
    return { provider: 'YouTube', src: `https://www.youtube-nocookie.com/embed/${id}` }
  } catch { return null }
}
