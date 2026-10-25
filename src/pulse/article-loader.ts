import { createElement, type ComponentType } from 'react'
let loaded: ComponentType | undefined
let pending: Promise<{ default: ComponentType }> | undefined
export function registerArticle(component: ComponentType) { loaded = component }
export function preloadArticle() { return pending ??= import('../pages/BlogPost').then(m => { loaded = m.BlogPost; return { default: m.BlogPost } }) }
export function loadedArticle() { return loaded ? createElement(loaded) : undefined }
