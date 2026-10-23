import { createContext } from 'react'
import type { DiscoveryRecord } from './discovery'
// Only /explore's prerender includes data. Other routes reuse the lazy loader.
export const DiscoveryData = createContext<DiscoveryRecord[] | null>(null)
export function readDiscoveryData(): DiscoveryRecord[] | null {
  const script = document.getElementById('discovery-index')
  if (!script) return null
  try { return JSON.parse(script.textContent || 'null') } catch { return null }
}
