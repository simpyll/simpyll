// Route explicit publisher JSX through the same components as Markdown.
// Only JSON string literals are decoded; no MDX expressions are evaluated here.
export function remarkRichContent() {
  return tree => {
    function walk(node) {
      if (node.type === 'mdxJsxFlowElement' && node.name === 'pre' && node.children?.length === 1) {
        const code = node.children[0]
        if (code.name === 'code' && code.children?.length === 1 && code.children[0].type === 'mdxTextExpression') {
          try {
            const value = JSON.parse(code.children[0].value)
            if (typeof value === 'string') {
              const language = code.attributes?.find(a => a.name === 'className')?.value
              Object.assign(node, { type: 'code', value, lang: typeof language === 'string' ? language.replace(/^language-/, '') : null })
              delete node.children
              return
            }
          } catch { /* Trusted manual MDX may contain nonliteral expressions. */ }
        }
      }
      if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
        const names = { table: 'MdxTable', th: 'MdxTh', a: 'MdxLink', img: 'MdxImage', figure: 'MdxFigure', figcaption: 'MdxCaption', details: 'MdxDetails', summary: 'MdxSummary', pre: 'MdxPre', code: 'MdxCode' }
        if (names[node.name]) node.name = names[node.name]
      }
      node.children?.forEach(walk)
    }
    walk(tree)
  }
}
