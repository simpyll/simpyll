import { createElement, type ComponentType } from 'react'
let loaded: ComponentType | undefined
let pending: Promise<{ default: ComponentType }> | undefined
export function registerPulse(component: ComponentType) { loaded = component }
export function preloadPulse() { return pending ??= import('../pages/Pulse').then(m => { loaded = m.Pulse; return { default: m.Pulse } }) }
export function loadedPulse() { return loaded ? createElement(loaded) : undefined }
