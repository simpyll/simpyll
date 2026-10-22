import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkMdx from 'remark-mdx'
import { readFile, readdir } from 'node:fs/promises'
import { resolve, basename } from 'node:path'
export async function descriptions(root) {
  const result = new Map()
  for (const file of (await readdir(resolve(root, 'src/content/blog'))).filter(f => f.endsWith('.mdx')).sort()) {
    const tree = unified().use(remarkParse).use(remarkMdx).parse(await readFile(resolve(root, 'src/content/blog', file), 'utf8'))
    let sequence = 0
    function walk(node) {
      const attrs = Object.fromEntries((node.attributes ?? []).filter(a => a.type === 'mdxJsxAttribute').map(a => {
        let value = a.value
        if (value?.type === 'mdxJsxAttributeValueExpression') { try { value = JSON.parse(value.value) } catch { value = undefined } }
        return [a.name, value]
      }))
      const source = node.type === 'image' ? node.url : attrs.src
      if (typeof source === 'string') {
        sequence++
        if (!result.has(source)) result.set(source, { name: attrs.imageName, caption: typeof attrs.caption === 'string' ? attrs.caption : undefined, alt: node.alt ?? attrs.alt, article: basename(file, '.mdx'), sequence })
      }
      node.children?.forEach(walk)
    }
    walk(tree)
  }
  return result
}
