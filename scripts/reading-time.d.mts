import type { Plugin } from 'unified'
import type { Root } from 'mdast'
export const WORDS_PER_MINUTE: number
export function readingTime(tree: Root): number
export const remarkReadingTime: Plugin<[], Root>
