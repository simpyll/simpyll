import { createContext } from 'react'
export interface PulseArticle { route: string; title: string; category: string; tags: string[]; published: string; updates: string[] }
export interface PulseSnapshot {
  schemaVersion: 1; reportDate: string; indexablePages: number; articles: PulseArticle[]
  edges: { from: string; to: string }[]
  health: { name: string; critical: number; warning: number; informational: number }[]
  analytics: { searchConsole: { status: 'unavailable' }; ga4: { status: 'unavailable' } }
}
/** #157 must extend the reviewed serializer before enabling these separate measurements. */
export interface SearchConsoleDay { date: string; clicks: number; impressions: number; ctr: number; averagePosition: number }
export interface GA4Day { date: string; users: number; sessions: number; pageViews: number; engagedSessions: number }
export const PulseData = createContext<PulseSnapshot | null>(null)
export function readPulse(): PulseSnapshot | null {
  const raw = document.getElementById('pulse-data')?.textContent
  return raw ? JSON.parse(raw) : null
}
