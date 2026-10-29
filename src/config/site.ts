
export const siteConfig = {
  name: 'Simpyll',
  url: 'https://simpyll.com',
  description:
    'A critical care nurse learning software engineering and AI, documenting the journey through technical writing, experiments, and projects.',
  language: 'en-US',
  locale: 'en_US',
} as const

export function getSiteUrl(path = '/') {
  if (/^https?:\/\//.test(path)) return new URL(path).toString()
  const base = import.meta.env.BASE_URL
  return new URL(`${base}${path.replace(/^\//, '')}`, siteConfig.url).toString()
}
