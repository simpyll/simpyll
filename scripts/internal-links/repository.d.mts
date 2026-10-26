import type { Plugin } from 'unified'
import type { Root } from 'mdast'
export function load(root?: string): Promise<unknown>
export function remarkInternalLinks(state: unknown): Plugin<[], Root>
