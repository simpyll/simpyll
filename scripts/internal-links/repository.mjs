import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { collectArticles, resolveRegistry, readMetadata } from '../redirects.mjs'
import { parse, bodyLinks, authorizedDecisions, discover, apply } from './core.mjs'
import { validateProjects, getCaseStudyPath } from '../../src/projects/schema.ts'
const json = async p => JSON.parse(await readFile(p,'utf8'))
export async function load(root = process.cwd()) {
  const registry = await collectArticles(root, {history:new Map()})
  const aliases = resolveRegistry(registry)
  const normalize = url => {
    try { const u = new URL(url,'https://simpyll.com'); if(u.origin !== 'https://simpyll.com') return url; const slug=u.pathname.replace(/^\/blog\//,''); return aliases[slug] ? `/blog/${aliases[slug]}` : u.pathname } catch { return url }
  }
  const documents = []
  for (const a of registry.filter(a => a.status === 'published')) {
    const source = await readFile(resolve(root,`src/content/blog/${a.slug}.mdx`),'utf8'), m = await readMetadata(source)
    if (m.draft || m.published === false || m.noindex || m.test || m.robots?.includes?.('noindex') || m.status && m.status !== 'published') continue
    const tree = await parse(source)
    documents.push({...m,...a,kind:'article',url:`/blog/${a.slug}`,tree,links:bodyLinks(tree).map(normalize)})
  }
  const result = validateProjects(await json(resolve(root,'content/projects.json'))); if(result.errors.length) throw new Error(result.errors.join('\n')); const projects=result.projects
  for (const p of projects.filter(getCaseStudyPath)) documents.push({...p,id:`project:${p.id}`,kind:'project',url:`/projects/${p.slug}`,tags:p.technologies,description:p.summary,links:[]})
  const envelope = await json(resolve(root,'content/internal-links/decisions.json'))
  const key = await readFile(resolve(root,'content/internal-links/public-key.pem'),'utf8').catch(e => {if(e.code==='ENOENT') return ''; throw e})
  const decisions = authorizedDecisions(envelope,key)
  return {documents, decisions}
}
export function remarkInternalLinks(state) {
  return () => tree => {
    // Metadata identity is read from literal exports by the existing metadata reader at load.
    const source = state.documents.find(d => d.kind === 'article' && d.tree.children.find(n=>n.type==='mdxjsEsm')?.value === tree.children.find(n=>n.type==='mdxjsEsm')?.value)
    if (source) apply(tree,source,state.documents,state.decisions)
  }
}
export async function report(root=process.cwd()) {
  const state=await load(root), suggestions=discover(state.documents,state.decisions), outcomes=[]
  const inbound=Object.fromEntries(state.documents.map(d=>[d.url,0]))
  for(const d of state.documents.filter(d=>d.kind==='article')) {
    const applied=apply(d.tree,d,state.documents,state.decisions); outcomes.push(...applied)
    for(const url of new Set([...d.links,...applied.filter(a=>a.status==='applied').map(a=>a.target)])) if(url in inbound) inbound[url]++
  }
  const coverage={schemaVersion:1,inbound,orphans:Object.keys(inbound).filter(u=>!inbound[u]),lowInbound:Object.keys(inbound).filter(u=>inbound[u]===1),approved:outcomes.filter(o=>o.status==='applied').length,pending:suggestions.length,rejected:state.decisions.filter(d=>d.decision==='rejected').length,outcomes}
  const manifest={schemaVersion:1,decisions:[...state.decisions,...suggestions.filter(s=>!state.decisions.some(d=>d.id===s.id)).map(s=>({...s,decision:'pending'}))]}
  const lines=['# Editorial Review: Internal Linking Suggestions','',`${suggestions.length} pending suggestions. Merging this report approves nothing.`, '', 'Edit each entry’s `decision` in review.json to approved, rejected, or pending. Merge the review PR, then the owner runs “Authorize internal links” on main. See docs/internal-links.md.','']
  for(const s of suggestions) lines.push(`## ${s.id}`, '', `**${s.sourceArticle} → ${s.targetCanonicalUrl}** · ${s.confidence} (${s.score})`, '', `Before: ${s.before}`, '', `After: ${s.after}`, '', s.reason, '', `Existing body links: ${s.existingLinks.join(', ') || 'none'}. Target inbound: ${inbound[s.targetCanonicalUrl] ?? 0}.`, '')
  lines.push('## Coverage','', '```json',JSON.stringify(coverage,null,2),'```','')
  const dir=resolve(root,'content/internal-links'); await mkdir(dir,{recursive:true})
  await writeFile(resolve(dir,'suggestions.json'),JSON.stringify({schemaVersion:1,suggestions},null,2)+'\n')
  await writeFile(resolve(dir,'review.json'),JSON.stringify(manifest,null,2)+'\n')
  await writeFile(resolve(dir,'report.md'),lines.join('\n'))
  await writeFile(resolve(dir,'coverage.json'),JSON.stringify(coverage,null,2)+'\n')
  return state
}
