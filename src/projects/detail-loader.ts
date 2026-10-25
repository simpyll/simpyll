import { createElement, type ComponentType } from 'react'

let loaded: ComponentType | undefined
let pending: Promise<{ default: ComponentType }> | undefined
export function registerProjectDetail(component: ComponentType) { loaded = component }
export function loadProjectDetail() {
  return pending ??= import('../pages/ProjectDetail').then(module => {
    loaded = module.ProjectDetail
    return { default: module.ProjectDetail }
  })
}
export function loadedProjectDetail() { return loaded ? createElement(loaded) : undefined }
export async function preloadProjectDetail(pathname: string) {
  if (/^\/projects\/[^/]+\/?$/.test(pathname)) await loadProjectDetail()
}
