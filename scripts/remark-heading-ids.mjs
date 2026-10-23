/** One registry supplies rendered IDs and statically exported TOC metadata. */
export function remarkHeadingIds() {
  return tree => {
    const used = new Set(['main-content', 'work', 'about', 'writing', 'footnote-label'])
    const headings = []
    const text = node => {
      if (node.type === 'mdxTextExpression' || node.type === 'mdxFlowExpression') {
        try { const value = JSON.parse(node.value); return typeof value === 'string' ? value : '' } catch { return '' }
      }
      return node.value ?? (node.children || []).map(text).join('')
    }
    const explicit = node => {
      const value = node.attributes?.find(a => a.name === 'id')?.value ?? node.data?.hProperties?.id
      if (value?.type === 'mdxJsxAttributeValueExpression') {
        try { const parsed = JSON.parse(value.value); if (typeof parsed === 'string') return parsed } catch { /* Not static JSON. */ }
        if (/^h[1-6]$/.test(node.name ?? '')) throw new Error('Article heading IDs must be literal strings')
        return undefined
      }
      return value
    }
    const reserve = node => {
      const id = explicit(node)
      if (typeof id === 'string') {
        if (used.has(id)) throw new Error(`Duplicate or reserved article ID: ${id}`)
        used.add(id)
      }
      node.children?.forEach(reserve)
    }
    reserve(tree)
    const walk = (node, hidden = false) => {
      const depth = node.type === 'heading' ? node.depth : /^h[1-6]$/.test(node.name ?? '') ? Number(node.name[1]) : 0
      if (depth) {
        const title = text(node)
        const base = title.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-') || 'section'
        let id = explicit(node)
        if (typeof id !== 'string') {
          id = base
          let suffix = 0
          while (used.has(id)) id = `${base}-${++suffix}`
          used.add(id)
          if (node.name) {
            node.attributes ??= []
            node.attributes.push({ type: 'mdxJsxAttribute', name: 'id', value: id })
          }
          node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } }
        }
        if (!hidden && (depth === 2 || depth === 3)) headings.push({ id, title: title.trim() || 'Section', depth })
      }
      node.children?.forEach(child => walk(child, hidden || node.name === 'details' || node.name === 'Disclosure'))
    }
    walk(tree)
    const literal = value => typeof value === 'object'
      ? Array.isArray(value) ? { type: 'ArrayExpression', elements: value.map(literal) }
        : { type: 'ObjectExpression', properties: Object.entries(value).map(([key, val]) => ({ type: 'Property', key: { type: 'Identifier', name: key }, value: literal(val), kind: 'init', method: false, shorthand: false, computed: false })) }
      : { type: 'Literal', value }
    tree.children.push({ type: 'mdxjsEsm', value: `export const headings = ${JSON.stringify(headings)}`, data: { estree: {
      type: 'Program', sourceType: 'module', body: [{ type: 'ExportNamedDeclaration', specifiers: [], source: null, declaration: { type: 'VariableDeclaration', kind: 'const', declarations: [{ type: 'VariableDeclarator', id: { type: 'Identifier', name: 'headings' }, init: literal(headings) }] } }],
    } } })
  }
}
