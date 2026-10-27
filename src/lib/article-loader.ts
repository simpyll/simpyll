import { createElement, lazy, type ComponentType } from 'react'

type Module = { default: ComponentType }
const modules = import.meta.glob<Module>('../content/blog/*.mdx')
const loaded = new Map<string, ComponentType>()
const pending = new Map<string, Promise<Module>>()

export function loadArticle(slug: string) {
  return () => {
    const importer = modules[`../content/blog/${slug}.mdx`]
    if (!importer) return Promise.reject(new Error('Article unavailable'))
    let promise = pending.get(slug)
    if (!promise) {
      promise = importer().then(module => { loaded.set(slug, module.default); return module }, error => { pending.delete(slug); throw error })
      pending.set(slug, promise)
    }
    return promise
  }
}
const deferred = new Map(Object.keys(modules).map(path => {
  const slug = path.split('/').pop()!.replace(/\.mdx$/, '')
  return [slug, lazy(loadArticle(slug))] as const
}))
export function articleElement(slug: string) {
  const component = loaded.get(slug) ?? deferred.get(slug)
  return component ? createElement(component) : null
}
export async function preloadArticle(pathname: string) {
  const match = pathname.match(/^\/blog\/([^/]+)\/?$/)
  if (match && modules[`../content/blog/${match[1]}.mdx`]) await loadArticle(match[1])()
}
