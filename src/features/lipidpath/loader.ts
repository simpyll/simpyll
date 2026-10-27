import { createElement, type ComponentType } from 'react'
let component: ComponentType | undefined
let pending: Promise<{default:ComponentType}> | undefined
export function registerLipidPath(value:ComponentType) {component=value}
export function preloadLipidPath() {return pending??=import('./LipidPath').then(m=>{component=m.LipidPath;return {default:m.LipidPath}})}
export function loadedLipidPath() {return component?createElement(component):undefined}
