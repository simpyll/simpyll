/** Deterministic heading IDs in both prerender and client MDX compilation. */
export function remarkHeadingIds() {
  return tree => {
    const used = new Set()
    const text = node => {
      if (node.type === 'mdxTextExpression' || node.type === 'mdxFlowExpression') {
        try { const value = JSON.parse(node.value); return typeof value === 'string' ? value : '' } catch { return '' }
      }
      return node.value ?? (node.children || []).map(text).join('')
    }
    const walk = node => {
      if (node.type === 'heading' || /^h[2-6]$/.test(node.name ?? '')) {
        const base = text(node).toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-') || 'section'
        let id = base
        let suffix = 0
        while (used.has(id)) id = `${base}-${++suffix}`
        used.add(id)
        if (node.name) {
          const existing = node.attributes?.find(a => a.name === 'id')
          if (existing) { used.add(existing.value); return }
          node.attributes ??= []
          node.attributes.push({ type: 'mdxJsxAttribute', name: 'id', value: id })
        }
        node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } }
      }
      node.children?.forEach(walk)
    }
    walk(tree)
  }
}
