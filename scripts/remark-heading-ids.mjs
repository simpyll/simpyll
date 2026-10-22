/** Deterministic heading IDs in both prerender and client MDX compilation. */
export function remarkHeadingIds() {
  return tree => {
    const used = new Set()
    const text = node => node.value ?? (node.children || []).map(text).join('')
    const walk = node => {
      if (node.type === 'heading') {
        const base = text(node).toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-') || 'section'
        let id = base
        let suffix = 0
        while (used.has(id)) id = `${base}-${++suffix}`
        used.add(id)
        node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } }
      }
      node.children?.forEach(walk)
    }
    walk(tree)
  }
}
