export type BreadcrumbItem = Readonly<{ label: string; path: string }>

// Call only after resolving a public canonical content record. No route guessing,
// aliases or separate title registry: the page owns the authoritative metadata.
export function contentBreadcrumbs(kind: 'blog' | 'projects', title: string, path: string | undefined): readonly BreadcrumbItem[] {
  if (!title.trim() || !path || !new RegExp(`^/${kind}/[^/?#]+$`).test(path)) return []
  return [
    { label: 'Home', path: '/' },
    { label: kind === 'blog' ? 'Blog' : 'Projects', path: `/${kind}` },
    { label: title, path },
  ]
}

export function breadcrumbSchema(items: readonly BreadcrumbItem[], absoluteUrl: (path: string) => string) {
  if (items.length < 2) return undefined
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.label, item: absoluteUrl(item.path),
    })),
  }
}
