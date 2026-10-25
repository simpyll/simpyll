/** Prose only: never evaluate MDX, and never count source/attributes as text. */
export const WORDS_PER_MINUTE = 225
export function readingTime(tree) {
  const text = node => {
    if (['code', 'mdxjsEsm', 'yaml', 'toml', 'html', 'definition'].includes(node.type)) return ''
    if (['script', 'style', 'pre', 'code'].includes(node.name?.toLowerCase())) return ''
    if (node.attributes?.some(a => a.name === 'hidden' || a.name === 'aria-hidden' && a.value === 'true')) return ''
    if (node.type === 'text' || node.type === 'inlineCode') return node.value
    if (['mdxTextExpression', 'mdxFlowExpression'].includes(node.type)) {
      // The Notion publisher represents visible prose as JSON string literals.
      try { const value = JSON.parse(node.value); return typeof value === 'string' ? value : '' } catch { return '' }
    }
    const separator = ['paragraph', 'heading', 'emphasis', 'strong', 'delete', 'link', 'linkReference', 'mdxJsxTextElement'].includes(node.type) ? '' : ' '
    return (node.children ?? []).map(text).join(separator)
  }
  const words = text(tree).match(/[\p{L}\p{N}]+(?:['’\-_][\p{L}\p{N}]+)*/gu)?.length ?? 0
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}

/** Add a static export during the existing MDX compilation pass. */
export function remarkReadingTime() {
  return tree => {
    const value = readingTime(tree)
    tree.children.push({ type: 'mdxjsEsm', value: `export const readingTimeMinutes = ${value}`, data: { estree: {
      type: 'Program', sourceType: 'module', body: [{ type: 'ExportNamedDeclaration', specifiers: [], source: null,
        declaration: { type: 'VariableDeclaration', kind: 'const', declarations: [{ type: 'VariableDeclarator',
          id: { type: 'Identifier', name: 'readingTimeMinutes' }, init: { type: 'Literal', value } }] } }],
    } } })
  }
}
