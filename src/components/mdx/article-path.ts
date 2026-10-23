import { createContext } from 'react'

/** Canonical path from the resolved post, independent of location/search/aliases. */
export const ArticlePath = createContext<string | null>(null)
