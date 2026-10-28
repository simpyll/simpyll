import { createHash } from 'node:crypto'

const prefix = '\0article-text:'

// MDX turns prose into JavaScript string literals. Keep long articles' prose in
// bounded data modules rather than one indivisible render-function chunk. These
// are static imports: route preloading, SSR and hydration load the complete body.
// The existing page-JS budget still charges every imported data module.
export function articleTextChunks() {
  const modules = new Map()
  return {
    name: 'article-text-chunks',
    apply: 'build',
    enforce: 'pre',
    resolveId(id) { if (id.startsWith(prefix)) return id },
    load(id) { if (modules.has(id)) return modules.get(id) },
    transform(code, id) {
      if (!/\/src\/content\/blog\/[^/]+\.mdx$/.test(id)) return
      const program = this.parse(code)
      const content = program.body.find(node => node.type === 'FunctionDeclaration' && node.id?.name === '_createMdxContent')
      if (!content) return
      const strings = []
      function walk(node) {
        if (!node || typeof node !== 'object') return
        if (node.type === 'Literal' && typeof node.value === 'string' && node.value.length >= 80) strings.push(node)
        for (const [key, child] of Object.entries(node)) {
          if (key === 'parent') continue
          if (Array.isArray(child)) child.forEach(walk)
          else if (child && typeof child === 'object') walk(child)
        }
      }
      walk(content.body)
      // Small articles retain their existing single route chunk.
      if (strings.reduce((size, node) => size + Buffer.byteLength(node.value), 0) < 16_000) return
      const key = createHash('sha256').update(id.slice(id.lastIndexOf('/src/content/blog/'))).digest('hex').slice(0, 12)
      let binding = '_articleText'
      while (code.includes(binding)) binding += '_'
      const groups = []
      let size = 0
      for (const node of strings) {
        const bytes = Buffer.byteLength(JSON.stringify(node.value))
        if (!groups.length || size + bytes > 8_000) { groups.push([]); size = 0 }
        const group = groups.at(-1)
        node.replacement = `${binding}${groups.length - 1}[${group.length}]`
        group.push(node.value)
        size += bytes
      }
      // Apply source offsets backwards so escaping and all non-prose AST nodes
      // remain exactly as emitted by MDX. Never reinterpret content as markup.
      for (const node of strings.sort((a, b) => b.start - a.start)) code = code.slice(0, node.start) + node.replacement + code.slice(node.end)
      const imports = groups.map((values, index) => {
        const virtual = `${prefix}${key}:${index}`
        modules.set(virtual, `export default ${JSON.stringify(values)};`)
        return `import ${binding}${index} from ${JSON.stringify(virtual)};`
      })
      return { code: imports.join('\n') + '\n' + code, map: null }
    },
  }
}

export function articleTextChunkName(id) {
  if (id.startsWith(prefix)) return `article-text-${id.slice(prefix.length).replace(':', '-')}`
}
