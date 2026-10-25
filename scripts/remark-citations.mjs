// Validate author-controlled references without inventing or rewriting source data.
export function citationDiagnostics(tree) {
  const errors = [], definitions = new Set()
  const walk = (node, visit) => { visit(node); node.children?.forEach(child => walk(child, visit)) }
  walk(tree, node => {
    if (node.type === 'footnoteDefinition') {
      if (definitions.has(node.identifier)) errors.push({ node, message: `Duplicate footnote definition: ${node.identifier}` })
      definitions.add(node.identifier)
    }
    if (node.type === 'text') {
      for (const match of node.value.matchAll(/\[\^([^\]\n]+)\]/g)) errors.push({ node, message: `Unresolved footnote syntax: ${match[1]}; add a definition or put illustrative syntax in inline code` })
    }
  })
  return errors
}
