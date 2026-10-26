import { createHash, verify } from 'node:crypto'
import { compile } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
export const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
export async function parse(source) {
  let tree
  await compile(source, { remarkPlugins: [remarkGfm, () => value => { tree = structuredClone(value) }] })
  return tree
}
// Only root paragraphs, or publisher <p> containing nothing but JSON strings.
// Mixed JSX, formatting, references and clinical passages are deliberately withheld.
export function passages(tree) {
  return tree.children.flatMap((node, index) => {
    if (tree.children.slice(Math.max(0,index-1),index+2).some(n => bodyLinks({children:[n]}).length)) return []
    let value
    if (node.type === 'paragraph' && node.children.every(c => c.type === 'text')) value = node.children.map(c => c.value).join('')
    if (node.type === 'mdxJsxFlowElement' && node.name === 'p' && !node.attributes.length && node.children.every(c => ['mdxTextExpression','mdxFlowExpression'].includes(c.type))) {
      try { const parts = node.children.map(c => JSON.parse(c.value)); if (parts.every(p => typeof p === 'string')) value = parts.join('') } catch { /* Never evaluate expressions. */ }
    }
    if (!value || /\b(patient|dose|dosage|treatment|diagnos\w*|contraindicat\w*|medication|mg|mcg)\b|\[\^|\[@/iu.test(value)) return []
    return [{ node, index, value, fingerprint: hash([index, value]) }]
  })
}
export function bodyLinks(tree) {
  const urls = new Set(), definitions = new Map()
  for (const n of tree.children) if (n.type === 'definition') definitions.set(n.identifier, n.url)
  function walk(n) {
    if (['heading','code','inlineCode','footnoteDefinition','mdxjsEsm'].includes(n.type)) return
    if (n.type === 'link') urls.add(n.url)
    if (n.type === 'linkReference' && definitions.has(n.identifier)) urls.add(definitions.get(n.identifier))
    for (const a of n.attributes ?? []) if (a.name === 'href') {
      if (typeof a.value === 'string') urls.add(a.value)
      else { try { const v = JSON.parse(a.value.value); if (typeof v === 'string') urls.add(v) } catch { /* nonliteral */ } }
    }
    n.children?.forEach(walk)
  }
  tree.children.forEach(walk)
  return [...urls].sort()
}
const stop = new Set('the and for with that this from into have has had was were are been being not but you your our their they about through every just working worked over primarily'.split(' '))
const words = s => new Set((s.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter(w=>!stop.has(w)))
const overlap = (a,b) => [...words(a)].filter(w => words(b).has(w)).length
export function discover(documents, decisions = []) {
  const suggestions = []
  for (const source of documents.filter(d => d.kind === 'article')) {
    const used = new Set(source.links), candidates = []
    for (const p of passages(source.tree)) for (const target of documents) {
      if (source.id === target.id || used.has(target.url)) continue
      const phrases = [target.title, ...(target.tags ?? [])].filter(s => typeof s === 'string' && s.trim().split(/\s+/u).length >= 2 && s.length >= 8 && !/^(simpyll|click here|read more)$/iu.test(s))
      for (const phrase of phrases) {
        const occurrences = [...p.value.matchAll(new RegExp('(?<![\\p{L}\\p{N}])' + phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}\\p{N}])', 'giu'))]
        const offset = occurrences.length === 1 ? occurrences[0].index : -1
        if (offset < 0) continue
        if (/[\p{L}\p{N}]/u.test(p.value[offset-1] ?? '') || /[\p{L}\p{N}]/u.test(p.value[offset+phrase.length] ?? '')) continue
        const sharedTags = (source.tags ?? []).filter(t => target.tags?.includes(t)).length
        const topic = overlap(p.value, `${target.title} ${target.description}`)
        const score = Math.min(0.99, 0.45 + Math.min(topic,5)*0.06 + Math.min(sharedTags,2)*0.08 + (source.category && source.category === target.category ? 0.05 : 0))
        if (topic < 2 || score < 0.73) continue
        const anchorText = p.value.slice(offset, offset + phrase.length)
        const item = { sourceId: source.id, targetId: target.id, sourceContextHash: p.fingerprint, anchorText }
        candidates.push({ ...item, id: hash(item), sourceArticle: source.slug, targetArticle: target.slug, targetCanonicalUrl: target.url, paragraphIndex: p.index, sourceExcerpt: p.value, before: p.value, after: p.value.slice(0,offset)+`[${anchorText}](${target.url})`+p.value.slice(offset+anchorText.length), score, confidence: score >= 0.85 ? 'high' : 'medium', reason: `${topic} passage/topic terms; ${sharedTags} shared tags; exact destination-specific phrase.`, existingLinks: source.links, status: 'pending' })
      }
    }
    const occupied = new Set()
    for (const s of candidates.sort((a,b) => b.score-a.score || a.id.localeCompare(b.id))) {
      if (used.has(s.targetCanonicalUrl) || occupied.has(s.paragraphIndex) || occupied.has(s.paragraphIndex-1) || occupied.has(s.paragraphIndex+1)) continue
      if (decisions.some(d => d.id === s.id && ['rejected','approved'].includes(d.decision))) continue
      if (occupied.size >= 5) break
      suggestions.push(s); occupied.add(s.paragraphIndex); used.add(s.targetCanonicalUrl)
    }
  }
  return suggestions.sort((a,b) => a.id.localeCompare(b.id))
}
export function validateManifest(m) {
  if (m?.schemaVersion !== 1 || !Array.isArray(m.decisions) || m.decisions.length > 1000) throw new Error('Invalid decision schema')
  const ids = new Set()
  for (const d of m.decisions) {
    if (!/^[a-f0-9]{64}$/.test(d.id) || ids.has(d.id) || !['approved','rejected','pending'].includes(d.decision)) throw new Error('Invalid or duplicate decision')
    ids.add(d.id)
    if (d.id !== hash({sourceId:d.sourceId,targetId:d.targetId,sourceContextHash:d.sourceContextHash,anchorText:d.anchorText})) throw new Error('Decision identity mismatch')
  }
  return m
}
export function authorizedDecisions(envelope, publicKey) {
  validateManifest(envelope.manifest)
  if (!envelope.manifest.decisions.length) return []
  if (!publicKey || !envelope.authorization?.reviewer || !verify(null, Buffer.from(JSON.stringify({manifest:envelope.manifest,authorization:envelope.authorization})), publicKey, Buffer.from(envelope.signature ?? '', 'base64'))) throw new Error('Unsigned or unauthorized internal-link decisions')
  return envelope.manifest.decisions
}
export function apply(tree, source, documents, decisions) {
  const results = [], used = new Set(bodyLinks(tree)), occupied = new Set()
  for (const d of decisions.filter(d => d.sourceId === source.id && d.decision === 'approved')) {
    const target = documents.find(t => t.id === d.targetId)
    const p = passages(tree).find(p => p.fingerprint === d.sourceContextHash)
    if (!target || source.id === target.id) { results.push({id:d.id,status:'invalid',reason:'Destination unavailable'}); continue }
    if (!p) { results.push({id:d.id,status:'stale',reason:'Exact paragraph changed or moved'}); continue }
    const matches = [...p.value.matchAll(new RegExp('(?<![\\p{L}\\p{N}])' + d.anchorText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}\\p{N}])', 'gu'))]
    const offset = matches.length === 1 ? matches[0].index : -1
    if (!d.anchorText || offset < 0 || used.has(target.url) || [...occupied].some(i => Math.abs(i-p.index) <= 1)) { results.push({id:d.id,status:'stale',reason:'Ambiguous anchor or link cluster'}); continue }
    p.node.type = 'paragraph'
    p.node.children = [{type:'text',value:p.value.slice(0,offset)}, {type:'link',url:target.url,children:[{type:'text',value:d.anchorText}]}, {type:'text',value:p.value.slice(offset+d.anchorText.length)}]
    delete p.node.name; delete p.node.attributes; delete p.node.data
    used.add(target.url); occupied.add(p.index)
    results.push({id:d.id,status:'applied',target:target.url})
  }
  return results
}
